// Runner: Vitest. It spawns the declared-list gate, which runs `claude plugin validate --json`.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { claudeStatus } from "../scripts/claude-floor.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const pluginDir = join(repoRoot, "plugins/doc-editor");
const gate = join(repoRoot, "scripts/check-plugin-declared.mjs");
// What a session load writes into the plugin (the mod types and a root tsconfig.json), and
// node_modules; a copy leaves them behind, as git does. The plugin's own types/ contract is kept.
const GENERATED = [".claude-plugin/types", "tsconfig.json"];
const isSkipped = (rel: string) =>
  rel.split("/").includes("node_modules") || GENERATED.some((path) => rel === path || rel.startsWith(`${path}/`));

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

// A copy of the real plugin, edited by `edit`, so each case is the shipped plugin plus one change.
function pluginWith(edit: (dir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-declared-"));
  scratch.push(dir);
  cpSync(pluginDir, dir, {
    recursive: true,
    filter: (path) => !isSkipped(relative(pluginDir, path)),
  });
  edit(dir);
  return dir;
}

function replaceIn(dir: string, file: string, from: string, to: string) {
  const path = join(dir, file);
  const source = readFileSync(path, "utf8");
  expect(source).toContain(from);
  writeFileSync(path, source.replace(from, to));
}

const runGate = (dir: string) =>
  spawnSync("node", [gate, dir], { cwd: repoRoot, encoding: "utf8" });

const REGISTER = "hooks/register.ts";
const SESSION_START = "    return next(e);\n  });";
const DECLARED_CALLS =
  '"calls": ["$.clock.every", "$.command.register", "$.fs.list", "$.fs.read", "$.fs.stat", "$.fs.write", "$.process.run", "$.tool.register", "$.ui.ask", "$.ui.close", "$.ui.focus", "$.ui.invalidate", "$.ui.open", "$.ui.resolve", "$.ui.status"],';

// Without a usable claude these cases are reported as skipped, with the reason, never as passed.
const claude = claudeStatus();

describe.skipIf(!claude.usable)(`the declared-list gate (claude ${claude.version ?? claude.reason})`, { timeout: 60_000 }, () => {
  it("should pass when validate reports exactly the hooks and calls the README declares", () => {
    const result = runGate(pluginDir);

    expect(result.stdout).toContain(
      "check-plugin-declared: plugins/doc-editor matches the list plugins/doc-editor/README.md declares",
    );
    expect(result.status).toBe(0);
  });

  it("should fail naming the call when the hooks module makes a $ call the README does not declare", () => {
    const dir = pluginWith((d) =>
      replaceIn(d, REGISTER, SESSION_START, `    await $.ui.toast("hi");\n${SESSION_START}`),
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: ./register.ts calls: $.ui.toast is not declared",
    );
  });

  it("should fail naming the hook when the hooks module registers a hook the README does not declare", () => {
    const dir = pluginWith((d) =>
      replaceIn(
        d,
        REGISTER,
        '  on("command.run",',
        '  on("tool.call", async ($, e, next) => next(e));\n\n  on("command.run",',
      ),
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: ./register.ts hooks: tool.call is not declared",
    );
  });

  it("should fail naming the entry when the README declares a call validate does not report", () => {
    const dir = pluginWith((d) =>
      replaceIn(
        d,
        "README.md",
        DECLARED_CALLS,
        '"calls": ["$.clock.every", "$.command.register", "$.fs.list", "$.fs.read", "$.fs.stat", "$.fs.write", "$.process.run", "$.tool.register", "$.ui.ask", "$.ui.close", "$.ui.focus", "$.ui.invalidate", "$.ui.open", "$.ui.resolve", "$.ui.status", "$.session.id"],',
      ),
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: ./register.ts calls: $.session.id is declared but not reported",
    );
  });

  it("should fail naming the README when it holds no declared block", () => {
    const dir = pluginWith((d) =>
      replaceIn(d, "README.md", "<!-- validate-declared:begin -->", "<!-- removed -->"),
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("has no <!-- validate-declared:begin --> ... ");
  });

  it("should fail naming the file and line when a helper outside the hooks module calls $", () => {
    const dir = pluginWith((d) =>
      writeFileSync(
        join(d, "hooks/helper.ts"),
        "export async function view(engine: unknown) {\n  return $.ui.open({ id: \"other\" });\n}\n",
      ),
    );

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-plugin-declared: hooks/helper.ts:2: a $ call outside the hooks module (./register.ts)",
    );
  });
});
