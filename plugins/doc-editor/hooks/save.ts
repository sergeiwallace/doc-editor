import type { ProcessRunResult } from "claude-code";

/** A file's modification time and byte size, as `$.fs.stat` and the save helper report them. */
export interface FileStamp {
  mtimeMs: number;
  size: number;
}

/**
 * The engine as the safe-write path uses it: plain closures register.ts builds from `$`, so this
 * file never holds `$`.
 */
export interface SaveHost {
  /** `$.fs.stat`; rejects when the file is missing. */
  stat: (path: string) => Promise<FileStamp>;
  /** `$.fs.write`, the fallback when `node` is absent. */
  write: (path: string, text: string) => Promise<void>;
  /** `$.process.run` with `stdin`; rejects when the command cannot start or overruns. */
  run: (argv: readonly string[], stdin?: string) => Promise<ProcessRunResult>;
  /** `$.ui.ask`; rejects when the person dismisses it. */
  ask: (question: string, options: readonly string[]) => Promise<string>;
  /** `$.ui.status`. */
  status: (text: string) => void;
  /** The absolute path of the plugin's `bin/save.mjs`. */
  helper: string;
}

export type SaveResult =
  | { kind: "saved"; stamp: FileStamp }
  | { kind: "reload" }
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

export type Save = (path: string, text: string, read: FileStamp) => Promise<SaveResult>;

export const RELOAD = "Reload";
export const OVERWRITE = "Overwrite";
export const CANCEL = "Cancel";
export const NON_ATOMIC_TEXT =
  "node was not found, so saves write the file in place and are not atomic; an edit made at the same moment can be lost";

export const conflictQuestion = (path: string) =>
  `${path} changed on disk since it was read. Reload it, overwrite it, or cancel the save?`;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const lastLine = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .at(-1);

function stampOf(stdout: string): FileStamp | undefined {
  try {
    const value: unknown = JSON.parse(lastLine(stdout) ?? "");
    if (typeof value !== "object" || value === null) return undefined;
    const { mtimeMs, size } = value as Record<string, unknown>;
    return typeof mtimeMs === "number" && typeof size === "number" ? { mtimeMs, size } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The safe-write path (design D-12). One per session: `node` is detected on the first save and
 * the non-atomic risk of the fallback is stated once.
 *
 * The returned `save(path, text, read)` takes the stamp of the read the text was made from. When
 * the file's mtimeMs has moved since, it asks first: Reload returns `{ kind: "reload" }` for the
 * caller to re-read, Cancel or a dismissal returns `{ kind: "cancelled" }`, and Overwrite saves
 * over the file as it now stands. With `node` the helper writes and renames; without it
 * `$.fs.write` does. A failure leaves the target alone, shows its reason in the status row and
 * returns it.
 *
 * @param host the engine's closures
 * @returns the session's save
 */
export function createSaver(host: SaveHost): Save {
  let node: Promise<boolean> | undefined;
  let isRiskStated = false;
  const hasNode = () =>
    (node ??= host.run(["node", "--version"]).then(
      (result) => result.exitCode === 0,
      () => false,
    ));
  const failed = (reason: string): SaveResult => {
    host.status(reason);
    return { kind: "failed", reason };
  };

  return async (path, text, read) => {
    let now: FileStamp;
    try {
      now = await host.stat(path);
    } catch (error) {
      return failed(`cannot save ${path}: ${message(error)}`);
    }

    let expected = read;
    if (now.mtimeMs !== read.mtimeMs) {
      const choice = await host
        .ask(conflictQuestion(path), [RELOAD, OVERWRITE, CANCEL])
        .catch(() => CANCEL);
      if (choice === RELOAD) return { kind: "reload" };
      if (choice !== OVERWRITE) return { kind: "cancelled" };
      expected = now;
    }

    if (await hasNode()) {
      let result: ProcessRunResult;
      try {
        result = await host.run(
          ["node", host.helper, path, String(expected.mtimeMs), String(expected.size)],
          text,
        );
      } catch (error) {
        return failed(`save: ${message(error)}`);
      }
      if (result.exitCode !== 0) {
        return failed(lastLine(result.stderr) ?? `save: the helper exited ${result.exitCode}`);
      }
      const stamp = stampOf(result.stdout) ?? (await host.stat(path).catch(() => expected));
      return { kind: "saved", stamp };
    }

    if (!isRiskStated) {
      isRiskStated = true;
      host.status(NON_ATOMIC_TEXT);
    }
    try {
      await host.write(path, text);
      return { kind: "saved", stamp: await host.stat(path) };
    } catch (error) {
      return failed(`cannot save ${path}: ${message(error)}`);
    }
  };
}
