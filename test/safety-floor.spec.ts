// Runner: Vitest. The safety floor (design NFR-4 and NFR-9, task T-1.8): over the output of
// `claude plugin validate`, the plugin registers no tool.check hook and no tool.call hook that can
// answer, and makes no model or network call. Each failure case adds one to a copy of the shipped
// plugin AND declares it in the copy's README, so the floor fails even when the list allows it.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { claudeStatus } from "../scripts/claude-floor.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const pluginDir = join(repoRoot, "plugins/doc-editor");
const gate = join(repoRoot, "scripts/check-plugin-declared.mjs");
// What a session load writes into the plugin; a copy leaves it behind, as git does.
const SKIPPED = new Set(["node_modules", "types", "tsconfig.json"]);
const BEGIN = "<!-- validate-declared:begin -->";
const END = "<!-- validate-declared:end -->";
const ANCHOR = '  on("command.run",';
const MODULE = "./register.ts";

type Declared = Record<string, Record<string, string[]>>;

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

interface Change {
  /** Code added to register(), before its command.run hook. */
  code?: string;
  /** Values added to the module's declared list, by kind. */
  extra?: Record<string, string[]>;
  /** Files written into the copy, by path in the plugin. */
  files?: Record<string, string>;
  /** Text in register.ts replaced, [from, to]. */
  replace?: [string, string][];
}

/** A copy of the shipped plugin with one change, declared in its README's list. */
function pluginWith(change: Change): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-floor-"));
  scratch.push(dir);
  cpSync(pluginDir, dir, {
    recursive: true,
    filter: (path) => !relative(pluginDir, path).split("/").some((part) => SKIPPED.has(part)),
  });
  const register = join(dir, "hooks/register.ts");
  let source = readFileSync(register, "utf8");
  expect(source).toContain(ANCHOR);
  if (change.code !== undefined) source = source.replace(ANCHOR, `${change.code}\n\n${ANCHOR}`);
  for (const [from, to] of change.replace ?? []) {
    expect(source).toContain(from);
    source = source.replace(from, to);
  }
  writeFileSync(register, source);
  for (const [path, text] of Object.entries(change.files ?? {})) writeFileSync(join(dir, path), text);

  const readmePath = join(dir, "README.md");
  const readme = readFileSync(readmePath, "utf8");
  const from = readme.indexOf(BEGIN);
  const to = readme.indexOf(END);
  const block = /```json\n([\s\S]*?)\n```/.exec(readme.slice(from, to));
  expect(block?.[1]).toBeDefined();
  const declared = JSON.parse(block?.[1] ?? "{}") as Declared;
  const own = declared[MODULE] ?? {};
  for (const [kind, values] of Object.entries(change.extra ?? {})) {
    own[kind] = [...(own[kind] ?? []), ...values];
  }
  declared[MODULE] = own;
  const fence = "```json\n" + JSON.stringify(declared, null, 2) + "\n```\n";
  writeFileSync(readmePath, readme.slice(0, from + BEGIN.length) + "\n" + fence + readme.slice(to));
  return dir;
}

const PROBE = "command.run{command=probe}";
/** A /probe command hook whose body runs `body`, declared with its calls. */
const probe = (body: string, calls: string[] = []): Change => ({
  code: `  on("command.run", { command: "probe" }, async ($) => {\n    ${body}\n    return {};\n  });`,
  extra: { hooks: [PROBE], calls, "gating hook without .catch": [PROBE] },
});

const OBSERVED_BODY =
  "async (_$, e, next) => {\n    const result = await next(e);\n    void session.watcher?.check();\n\n    return result;\n  }";
const OBSERVED_CATCH = "void session.watcher?.check();\n\n    return result;\n  }).catch((_$, e, next) => next(e));";

const runGate = (dir: string) => spawnSync("node", [gate, dir], { cwd: repoRoot, encoding: "utf8" });

function validateNotes(dir: string): string[] {
  const result = spawnSync("claude", ["plugin", "validate", "--strict", "--json", dir], {
    encoding: "utf8",
  });
  const report = JSON.parse(result.stdout) as { contents?: { notes?: string[] }[] };
  return (report.contents ?? []).flatMap((content) => content.notes ?? []);
}

// Without a usable claude these cases are reported as skipped, with the reason, never as passed.
const claude = claudeStatus();

describe.skipIf(!claude.usable)(`the safety floor (claude ${claude.version ?? claude.reason})`, { timeout: 60_000 }, () => {
  it("should find no tool.check hook, no answering tool.call hook, no model call and no network call in the shipped plugin's validate output", () => {
    const notes = validateNotes(pluginDir);

    const hooks = notes.filter((note) => note.startsWith(`${MODULE} hooks: `));
    const calls = notes.filter((note) => note.startsWith(`${MODULE} calls: `));
    expect(hooks).toEqual([
      `${MODULE} hooks: session.start, command.run{command=doc}, prompt.autocomplete, tool.call{tool=Write|Edit}, ui.close{id=doc}, ui.scroll{requestId=doc}, ui.render{component=Pane}`,
    ]);
    expect(calls.join("\n")).not.toMatch(/\$\.(model\.|agent\.spawn|http\.|mcp\.)/);
    const result = runGate(pluginDir);
    expect(result.stdout).toContain(
      "check-plugin-declared: plugins/doc-editor keeps the safety floor: no tool.check hook, no tool.call hook that can answer, no model call, no network call",
    );
    expect(result.status).toBe(0);
  });

  it("should fail naming the hook when a declared tool.check hook is added", () => {
    const dir = pluginWith({
      code: '  on("tool.check", async (_$, e, next) => next(e));',
      extra: { hooks: ["tool.check"], "gating hook without .catch": ["tool.check"] },
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts registers the tool.check hook tool.check; the mod approves or denies no tool call",
    );
  });

  it("should fail naming the hook when a declared tool.call handler that returns a result is added", () => {
    const dir = pluginWith({
      code: '  on("tool.call", { tool: "Read" }, async () => ({ result: "answered" }) as never);',
      extra: { hooks: ["tool.call{tool=Read}"], "gating hook without .catch": ["tool.call{tool=Read}"] },
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts registers the tool.call hook tool.call{tool=Read}, which can answer a tool call",
    );
  });

  it("should fail naming the hook when a declared glob hook could catch tool calls", () => {
    const dir = pluginWith({
      code: '  on("tool.*", async (_$, e, next) => next(e));',
      extra: { hooks: ["tool.*"], "gating hook without .catch": ["tool.*"] },
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts registers the tool.check hook tool.*",
    );
  });

  for (const [call, code, kind] of [
    ["$.model.complete", 'await $.model.complete({ model: "haiku", prompt: "hi" } as never);', "model"],
    ["$.agent.spawn", 'await $.agent.spawn({ prompt: "hi" } as never);', "model"],
    ["$.http.fetch", 'await $.http.fetch("https://example.com/");', "network"],
    ["$.mcp.call", 'await $.mcp.call("server", "tool");', "network"],
  ] as const) {
    it(`should fail naming the call when a declared ${kind} call ${call} is added`, () => {
      const dir = pluginWith(probe(code, [call]));

      const result = runGate(dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(
        `check-plugin-declared: safety floor: ./register.ts makes the ${kind} call ${call}; the mod ${kind === "model" ? "calls no model" : "makes no network request"}`,
      );
    });
  }

  const SHOW = "tool.call{tool=mcp__doc-editor__show}";
  const showHook: Change = {
    code: '  on("tool.call", { tool: "mcp__doc-editor__show" }, async () => ({ result: "shown" }) as never);',
    extra: { hooks: [SHOW], "gating hook without .catch": [SHOW] },
  };

  it("should fail naming the hook when it answers an mcp__doc-editor__ tool the plugin never registers", () => {
    const result = runGate(pluginWith(showHook));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      `check-plugin-declared: safety floor: ./register.ts registers the tool.call hook ${SHOW}, but no $.tool.register names show`,
    );
  });

  it("should pass when a tool.call hook answers a tool the plugin registers", () => {
    const register = probe('await $.tool.register({ name: "show", description: "Open a file in the pane." });', [
      "$.tool.register",
    ]);
    const dir = pluginWith({
      code: `${showHook.code}\n\n${register.code}`,
      extra: {
        hooks: [SHOW, PROBE],
        calls: ["$.tool.register"],
        "gating hook without .catch": [SHOW, PROBE],
      },
    });

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });

  it("should fail naming the line when the observed Write and Edit handler returns its own result", () => {
    const dir = pluginWith({
      replace: [[OBSERVED_BODY, 'async (_$, e, next) => {\n    await next(e);\n    return { result: "answered" } as never;\n  }']],
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      /check-plugin-declared: safety floor: hooks\/register\.ts:\d+: the tool\.call\{tool=Write\|Edit\} handler returns `\{ result: [^`]*\} as never` rather than next\(\.\.\.\)'s result/,
    );
  });

  it("should fail naming the line when the observed hook's .catch handler answers the call", () => {
    const dir = pluginWith({
      replace: [[OBSERVED_CATCH, 'void session.watcher?.check();\n\n    return result;\n  }).catch(() => ({ deny: "refused" }));']],
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      /check-plugin-declared: safety floor: hooks\/register\.ts:\d+: the tool\.call\{tool=Write\|Edit\} \.catch handler takes no next, so it cannot pass the call on/,
    );
  });

  it("should pass when the observed handler returns next(e) as its whole body", () => {
    const dir = pluginWith({ replace: [[OBSERVED_BODY, "(_$, e, next) => next(e)"]] });

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });

  it("should fail naming the file and line when a source references fetch", () => {
    const dir = pluginWith({
      files: { "hooks/net.ts": "export const get = (url: string) =>\n  fetch(url);\n" },
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: hooks/net.ts:2: references fetch, a network API; the mod makes no network request",
    );
  });

  for (const api of ["WebSocket", "XMLHttpRequest", "EventSource"]) {
    it(`should fail naming the line when a source reaches ${api} through globalThis`, () => {
      const dir = pluginWith({ files: { "hooks/net.ts": `export const api = globalThis.${api};\n` } });

      const result = runGate(dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(
        `check-plugin-declared: safety floor: hooks/net.ts:1: references ${api}, a network API`,
      );
    });
  }

  it("should pass when fetch appears only in a comment or a string", () => {
    const dir = pluginWith({
      files: { "hooks/net.ts": '// This file does not fetch anything.\nexport const label = "fetch";\n' },
    });

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });

  const RUN_REFUSED = "; the mod runs only node --version or node on one of its own bin/*.mjs scripts";
  const runFails = (body: string, reason: string, files: Record<string, string> = {}) => {
    const result = runGate(pluginWith({ ...probe(body), files }));

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      new RegExp(
        `check-plugin-declared: safety floor: hooks/register\\.ts:\\d+: \\$\\.process\\.run ${reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${RUN_REFUSED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );
  };
  const runPasses = (body: string, files: Record<string, string> = {}) => {
    const result = runGate(pluginWith({ ...probe(body), files }));

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  };
  const EXTRA = { "bin/extra.mjs": 'import { readFileSync } from "node:fs";\nprocess.stdout.write(String(readFileSync(0)));\n' };

  it("should fail naming the binary when a literal argv runs something other than node", () => {
    runFails('await $.process.run(["git", "status"]);', 'runs `"git"` rather than node');
  });

  for (const flag of ["-e", "--eval", "-p", "--print", "--input-type", "-r", "--require", "--import", "--loader"]) {
    it(`should fail naming the flag when node is passed ${flag}`, () => {
      runFails(`await $.process.run(["node", "${flag}", "x"]);`, `passes node the flag ${flag}`);
    });
  }

  it("should fail when node runs a plain string path, even one ending in the plugin's bin/save.mjs", () => {
    runFails(
      'await $.process.run(["node", "/tmp/elsewhere/bin/save.mjs"]);',
      'runs node on "/tmp/elsewhere/bin/save.mjs", which is not a ${$.plugin.root}/bin/<name>.mjs path',
    );
  });

  it("should fail when node runs a plugin script the plugin does not ship", () => {
    runFails(
      "await $.process.run([\"node\", `${$.plugin.root}/bin/missing.mjs`]);",
      "runs node on bin/missing.mjs, which the plugin does not ship",
    );
  });

  it("should fail when the argv is not a literal array", () => {
    runFails('const argv = ["node", "-e", "x"];\n    await $.process.run(argv);', "takes an argv that is not a literal array");
  });

  it("should pass when node runs a script the plugin ships under bin, with arguments after it", () => {
    runPasses("await $.process.run([\"node\", `${$.plugin.root}/bin/extra.mjs`, \"-e\", \"x\"]);", EXTRA);
  });

  it("should pass when the argv is exactly node --version", () => {
    runPasses('await $.process.run(["node", "--version"]);');
  });

  it("should fail naming the call when $.process.spawn is added", () => {
    const result = runGate(pluginWith(probe('$.process.spawn({ argv: ["node", "--version"] });', ["$.process.spawn"])));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts makes the call $.process.spawn",
    );
  });

  for (const [form, line] of [
    ["a static import of node:https", 'import { request } from "node:https";'],
    ["a bare net import", 'import net from "net";'],
    ["a require of child_process", 'const { spawn } = require("child_process");'],
    ["a dynamic import of node:dns", 'const dns = await import("node:dns");'],
    ["a side-effect import of node:worker_threads", 'import "node:worker_threads";'],
  ] as const) {
    it(`should fail naming the line when a bin script holds ${form}`, () => {
      const dir = pluginWith({ files: { "bin/extra.mjs": `// a helper\n${line}\n` } });

      const result = runGate(dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(
        /check-plugin-declared: safety floor: bin\/extra\.mjs:2: imports \S+, which reaches the network or starts processes/,
      );
    });
  }

  it("should fail naming the line when a bin script references fetch", () => {
    const dir = pluginWith({ files: { "bin/extra.mjs": 'await fetch("https://example.com/");\n' } });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: bin/extra.mjs:1: references fetch, a network API",
    );
  });

  it("should pass when a bin script imports only node:fs and node:path", () => {
    const dir = pluginWith({
      files: { "bin/extra.mjs": 'import { readFileSync } from "node:fs";\nimport { join } from "node:path";\nreadFileSync(join(".", "x"));\n' },
    });

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });

  const OBSERVED_CHECK = "    void session.watcher?.check();\n";
  for (const [form, line] of [
    ["assigns to a property of next's result", '    (result as { result?: unknown }).result = "answered";\n'],
    ["merges into next's result with Object.assign", '    Object.assign(result, { result: "answered" });\n'],
    ["deletes from next's result", "    delete (result as { text?: string }).text;\n"],
    ["hands next's result to another function", "    console.log(result);\n"],
  ] as const) {
    it(`should fail naming the line when the observed handler ${form}`, () => {
      const dir = pluginWith({ replace: [[OBSERVED_CHECK, `${OBSERVED_CHECK}${line}`]] });

      const result = runGate(dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(
        /check-plugin-declared: safety floor: hooks\/register\.ts:\d+: the tool\.call\{tool=Write\|Edit\} handler uses next\(\.\.\.\)'s result `result` other than by returning it/,
      );
    });
  }

  it("should fail naming the line when the observed handler returns a spread copy of next's result", () => {
    const dir = pluginWith({ replace: [["    return result;\n  }", '    return { ...result, text: "answered" } as never;\n  }']] });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      /check-plugin-declared: safety floor: hooks\/register\.ts:\d+: the tool\.call\{tool=Write\|Edit\} handler returns `\{ \.\.\.result, text: [^`]*\} as never` rather than next\(\.\.\.\)'s result/,
    );
  });

  it("should pass when the observed handler does other work and returns next's result untouched", () => {
    const dir = pluginWith({ replace: [[OBSERVED_CHECK, `${OBSERVED_CHECK}    const seen = e.file_path;\n    void seen;\n`]] });

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });
});
