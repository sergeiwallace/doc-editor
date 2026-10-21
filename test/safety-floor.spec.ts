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

/** A copy of the shipped plugin with `code` added to register() and `extra` added to its list. */
function pluginWith(code: string, extra: Record<string, string[]>): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-floor-"));
  scratch.push(dir);
  cpSync(pluginDir, dir, {
    recursive: true,
    filter: (path) => !relative(pluginDir, path).split("/").some((part) => SKIPPED.has(part)),
  });
  const register = join(dir, "hooks/register.ts");
  const source = readFileSync(register, "utf8");
  expect(source).toContain(ANCHOR);
  writeFileSync(register, source.replace(ANCHOR, `${code}\n\n${ANCHOR}`));

  const readmePath = join(dir, "README.md");
  const readme = readFileSync(readmePath, "utf8");
  const from = readme.indexOf(BEGIN);
  const to = readme.indexOf(END);
  const block = /```json\n([\s\S]*?)\n```/.exec(readme.slice(from, to));
  expect(block?.[1]).toBeDefined();
  const declared = JSON.parse(block?.[1] ?? "{}") as Declared;
  const own = declared[MODULE] ?? {};
  for (const [kind, values] of Object.entries(extra)) own[kind] = [...(own[kind] ?? []), ...values];
  declared[MODULE] = own;
  const fence = "```json\n" + JSON.stringify(declared, null, 2) + "\n```\n";
  writeFileSync(readmePath, readme.slice(0, from + BEGIN.length) + "\n" + fence + readme.slice(to));
  return dir;
}

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
      `${MODULE} hooks: session.start, command.run{command=doc}, tool.call{tool=Write|Edit}`,
    ]);
    expect(calls.join("\n")).not.toMatch(/\$\.(model\.|agent\.spawn|http\.|mcp\.)/);
    const result = runGate(pluginDir);
    expect(result.stdout).toContain(
      "check-plugin-declared: plugins/doc-editor keeps the safety floor: no tool.check hook, no tool.call hook that can answer, no model call, no network call",
    );
    expect(result.status).toBe(0);
  });

  it("should fail naming the hook when a declared tool.check hook is added", () => {
    const dir = pluginWith('  on("tool.check", async (_$, e, next) => next(e));', {
      hooks: ["tool.check"],
      "gating hook without .catch": ["tool.check"],
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts registers the tool.check hook tool.check; the mod approves or denies no tool call",
    );
  });

  it("should fail naming the hook when a declared tool.call handler that returns a result is added", () => {
    const dir = pluginWith(
      '  on("tool.call", { tool: "Read" }, async () => ({ result: "answered" }) as never);',
      { hooks: ["tool.call{tool=Read}"], "gating hook without .catch": ["tool.call{tool=Read}"] },
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: safety floor: ./register.ts registers the tool.call hook tool.call{tool=Read}, which can answer a tool call",
    );
  });

  it("should fail naming the hook when a declared glob hook could catch tool calls", () => {
    const dir = pluginWith('  on("tool.*", async (_$, e, next) => next(e));', {
      hooks: ["tool.*"],
      "gating hook without .catch": ["tool.*"],
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
      const probe = "command.run{command=probe}";
      const dir = pluginWith(
        `  on("command.run", { command: "probe" }, async ($) => {\n    ${code}\n    return {};\n  });`,
        { hooks: [probe], calls: [call], "gating hook without .catch": [probe] },
      );

      const result = runGate(dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(
        `check-plugin-declared: safety floor: ./register.ts makes the ${kind} call ${call}; the mod ${kind === "model" ? "calls no model" : "makes no network request"}`,
      );
    });
  }

  it("should pass when a declared tool.call hook answers the plugin's own registered tool", () => {
    const own = "tool.call{tool=mcp__doc-editor__show}";
    const dir = pluginWith(
      '  on("tool.call", { tool: "mcp__doc-editor__show" }, async () => ({ result: "shown" }) as never);',
      { hooks: [own], "gating hook without .catch": [own] },
    );

    const result = runGate(dir);

    expect(result.stdout).not.toContain("check-plugin-declared: safety floor:");
    expect(result.status).toBe(0);
  });
});
