import type { Args, On, RenderPropsOf } from "claude-code";
import type { Engine } from "claude-code/testing";
import { mock } from "claude-code/testing";

import { PANE_ID, PLUGIN_NAME } from "../register.ts";

// The world beneath the mod in the pane tests: a session in a repository whose files are held in
// memory, an engine that keeps what the mod asked of it (the panes opened, the status rows, the
// focus moves, the commands and tools registered), and a clock that moves only when a test moves it.

export const CWD = "/work/doc-editor";
export const SESSION = { surface: "terminal", isInteractive: true, cwd: CWD } as const;
export const START_MS = 1_800_000_000_000;

export const PANE_PROPS: RenderPropsOf["Pane"] = {
  title: "doc",
  isFocused: true,
  bodyColumns: 100,
  placement: "dock",
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
};

/** A file: its text, or raw bytes; a symlink names where it points. */
export type FileSpec = string | { bytes: Uint8Array } | { linkTo: string } | { size: number };

export interface PaneWorldOptions {
  files: Record<string, FileSpec>;
  /** Directories `$.fs.list` answers, by absolute path. */
  dirs?: Record<string, { name: string; kind: "file" | "dir" | "other" }[]>;
  /** What the session state holds per file before the mod reads it, as after a reload of the mod. */
  state?: Record<string, unknown>;
  /** Command names the engine refuses, with its reason, as for a name the person's own skill holds. */
  refuse?: Record<string, string>;
}

const encoder = new TextEncoder();
const base64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export function paneWorld(on: On, options: PaneWorldOptions) {
  const files = new Map<string, FileSpec>(Object.entries(options.files));
  const mtimes = new Map<string, number>();
  const opened: Args<"ui.open">[] = [];
  const closed: string[] = [];
  const statuses: (string | undefined)[] = [];
  const focused: string[] = [];
  const commands: string[] = [];
  const tools: string[] = [];
  const reads: string[] = [];

  const clock = mock.clock(on, { now: START_MS });
  const real = (path: string, hops = 0): string => {
    const file = files.get(path);
    return file !== undefined && typeof file === "object" && "linkTo" in file && hops < 8 ? real(file.linkTo, hops + 1) : path;
  };
  const bytesOf = (path: string): Uint8Array | undefined => {
    const file = files.get(real(path));
    if (file === undefined) return undefined;
    if (typeof file === "string") return encoder.encode(file);
    if ("bytes" in file) return file.bytes;
    if ("size" in file) return new Uint8Array(0);
    return undefined;
  };
  const sizeOf = (path: string): number => {
    const file = files.get(real(path));
    if (file !== undefined && typeof file === "object" && "size" in file) return file.size;
    return bytesOf(path)?.length ?? 0;
  };

  on("session.start", (_engine, e) => ({ cwd: e.cwd }));
  on("command.register", (_engine, e) => {
    const reason = options.refuse?.[e.name];
    if (reason !== undefined) return { deny: reason };
    commands.push(e.name);
    return { value: { command: e.name } };
  });
  on("tool.register", (_engine, e) => {
    tools.push(e.name);
    return { value: { tool: `mcp__${PLUGIN_NAME}__${e.name}` } };
  });
  on("fs.stat", (_engine, e) => {
    const isDir = e.path === CWD || [...files.keys()].some((path) => path.startsWith(`${e.path}/`));
    if (isDir) return { value: { kind: "dir", size: 0, mtimeMs: 0, isLink: false, ...(e.resolve ? { realPath: e.path } : {}) } };
    if (bytesOf(e.path) === undefined) return { deny: `ENOENT: no such file or directory, stat '${e.path}'` };
    const target = real(e.path);
    return {
      value: {
        kind: "file",
        size: sizeOf(e.path),
        mtimeMs: mtimes.get(target) ?? START_MS,
        isLink: target !== e.path,
        ...(e.resolve ? { realPath: target } : {}),
      },
    };
  });
  on("fs.read", (_engine, e) => {
    reads.push(e.path);
    const bytes = bytesOf(e.path);
    if (bytes === undefined) return { deny: `ENOENT: ${e.path}` };
    if (e.as === "bytes") return { value: { base64: base64(bytes) } };
    return { value: new TextDecoder().decode(bytes) };
  });
  on("fs.list", (_engine, e) => {
    const entries = options.dirs?.[e.path];
    return entries === undefined ? { deny: `ENOENT: ${e.path}` } : { value: entries.map((entry) => ({ ...entry, size: 0, mtimeMs: 0, isLink: false })) };
  });
  on("ui.open", (_engine, e) => {
    opened.push(e);
    return { value: { isPlaced: true } };
  });
  on("ui.close", (_engine, e) => {
    closed.push(e.id);
    return { value: undefined };
  });
  on("ui.status", (_engine, e) => {
    statuses.push(e.text);
    return { value: undefined };
  });
  on("prompt.autocomplete", () => ({ suggestions: [] }));
  on("ui.focus", (_engine, e) => {
    if (e.element !== undefined) focused.push(e.element);
    return {};
  });

  // The save helper as bin/save.mjs behaves: it writes only while the file's mtimeMs and size are
  // the ones the mod read, and prints the new stamp. node is on PATH.
  const saves: { path: string; text: string; expected: [number, number] }[] = [];
  let writes = 0;
  on("process.run", (_engine, e) => {
    const [cmd, script, path = "", mtime = "", size = ""] = e.argv;
    const result = (exitCode: number, stdout: string, stderr = "") => ({
      value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
    });
    if (cmd === "node" && script === "--version") return result(0, "v24.11.0\n");
    if (cmd !== "node" || !script?.endsWith("/bin/save.mjs")) return result(127, "", `unscripted: ${e.argv.join(" ")}`);
    const target = real(path);
    const mtimeMs = mtimes.get(target) ?? START_MS;
    if (Number(mtime) !== mtimeMs || Number(size) !== sizeOf(path)) {
      return result(1, "", `save: ${path} changed: mtimeMs ${mtimeMs}, size ${sizeOf(path)}`);
    }
    const text = e.init?.stdin ?? "";
    saves.push({ path, text, expected: [Number(mtime), Number(size)] });
    files.set(target, text);
    mtimes.set(target, START_MS + 10_000 + ++writes);
    return result(0, `${JSON.stringify({ mtimeMs: mtimes.get(target), size: sizeOf(target) })}\n`);
  });
  // The session state the mod keeps: each write it makes, and a value seeded for a read, as a
  // reload of the mod finds what the session held. The kit answers beneath.
  const stateWrites = new Map<string, unknown>();
  const seeded = new Map<string, unknown>(Object.entries(options.state ?? {}));
  const stateReads: string[] = [];
  on("state.set", (_engine, e, next) => {
    stateWrites.set(String(e.id), e.value);
    return next(e);
  });
  on("state.get", (_engine, e, next) => {
    const id = String(e.id);
    stateReads.push(id);
    return seeded.has(id) ? { value: { value: seeded.get(id) as never, version: 1 } } : next(e);
  });

  on("turn.start", (_engine, e) => ({ turnId: e.turnId }));
  on("turn.complete", (_engine, e) => ({ text: e.answer }));

  // Prompts the mod submits. While `busy` is set the engine holds each one, as it does while a
  // turn runs; `release` lets them through.
  const submits: { text: string; asUser: boolean }[] = [];
  let held: (() => void)[] = [];
  let busy = false;
  let drop: string | undefined;
  on("prompt.submit", async (_engine, e) => {
    submits.push({ text: e.text, asUser: e.origin.kind === "plugin" && e.origin.asUser === true });
    if (drop !== undefined) return { drop };
    if (busy) await new Promise<void>((resolve) => held.push(resolve));
    return { text: e.text };
  });

  /** Changes a file on disk, as an editor or Claude's Write would, with a later mtimeMs. */
  const edit = (path: string, text: string) => {
    files.set(path, text);
    mtimes.set(path, clock.now() + 1);
  };
  return {
    files,
    opened,
    closed,
    statuses,
    focused,
    commands,
    tools,
    reads,
    clock,
    edit,
    saves,
    submits,
    /** The last value the mod wrote to its session state for a file. */
    stateOf: (path: string) => stateWrites.get(path),
    stateReads,
    /** Holds every submitted prompt until `release`, as a busy session does. */
    hold: () => {
      busy = true;
    },
    release: () => {
      busy = false;
      for (const resolve of held.splice(0)) resolve();
    },
    /** Makes the next submits come back dropped with `reason`. */
    dropSubmits: (reason: string) => {
      drop = reason;
    },
  };
}

/** A main-loop turn of Claude's starting with `text`, as the engine raises it. */
export const startTurn = ($: Engine, turnId: string, text: string) => $.turn.start({ text, turnId });

/** The end of a main-loop turn, as the engine raises it. */
export const endTurn = ($: Engine, turnId: string) =>
  $.turn.complete({ answer: "", durationMs: 1, isAborted: false, turnId, reason: "answer" });

/** Starts the session, runs `/doc <args>` and mounts the pane at `props`. */
export async function openDoc($: Engine, on: On, options: PaneWorldOptions, args: string, props = PANE_PROPS) {
  const w = paneWorld(on, options);
  await $.session.start(SESSION);
  const result = await $.command.run({
    command: "doc",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 160 },
  });
  const ui = await mountPane($, props);
  return { w, ui, result };
}

export const mountPane = ($: Engine, props = PANE_PROPS) =>
  $.ui.mount({ plugin: PLUGIN_NAME, surface: "terminal", component: "Pane", props, requestId: PANE_ID });

export type MountedPane = Awaited<ReturnType<typeof mountPane>>;

/** The engine's `ui.scroll` on the pane: the person's arrow, page key or wheel. */
export const scrollPane = ($: Engine, by: number, bodyRows = PANE_PROPS.scroll.bodyRows) =>
  $.ui.scroll({
    component: "Pane",
    requestId: PANE_ID,
    offset: Math.max(0, by),
    by,
    bodyRows,
    contentRows: bodyRows,
    origin: { kind: "person" },
  });

/** Every element of a drawn tree, depth first. */
export function elementsOf(tree: unknown): { type: string; props: Record<string, unknown> }[] {
  const out: { type: string; props: Record<string, unknown> }[] = [];
  const walk = (node: unknown) => {
    if (typeof node !== "object" || node === null) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    const element = node as { type?: unknown; props?: Record<string, unknown>; children?: unknown };
    if (typeof element.type === "string") out.push({ type: element.type, props: element.props ?? {} });
    walk(element.props?.children);
    walk(element.children);
  };
  walk(tree);
  return out;
}

interface Node {
  type: string;
  props?: { key?: string; children?: unknown };
  children?: unknown[];
}

const pieceNodes = async (ui: MountedPane): Promise<Node[]> => {
  const body = await ui.find({ key: "body" });
  return ((body?.children ?? []) as Node[]).filter((node) => !(node.props?.key ?? "").startsWith("links:"));
};

/** The keys of the pane's pieces in drawing order: each piece is a keyed Box inside `body`. */
export async function pieceKeys(ui: MountedPane): Promise<string[]> {
  return (await pieceNodes(ui)).map((node) => node.props?.key ?? "");
}

/** The key of the piece drawn with the focus marker, or undefined when none is. */
export async function focusedKey(ui: MountedPane): Promise<string | undefined> {
  for (const node of await pieceNodes(ui)) {
    const marker = node.children?.[0] as Node | undefined;
    if (JSON.stringify(marker?.children ?? marker?.props?.children ?? "").includes("›")) return node.props?.key;
  }
  return undefined;
}

/** The header's two lines: the path and heading path, then the mode, read time and find state. */
export async function header(ui: MountedPane): Promise<{ title: string; status: string }> {
  const texts = await ui.findAll({ type: "Text" });
  return { title: texts[0]?.text ?? "", status: texts[1]?.text ?? "" };
}
