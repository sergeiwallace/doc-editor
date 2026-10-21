// Runner: Vitest. It runs the mod's gate scripts with a PATH that has no usable `claude`.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { CLAUDE_FLOOR } from "../scripts/claude-floor.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

// A PATH directory holding nothing, or a `claude` that reports `version`.
function binDir(version?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-floor-"));
  scratch.push(dir);
  if (version !== undefined) {
    const claude = join(dir, "claude");
    writeFileSync(claude, `#!/bin/sh\necho "${version} (Claude Code)"\n`);
    chmodSync(claude, 0o755);
  }
  return dir;
}

const GATES = [
  ["plugin-test", "scripts/plugin-test.mjs", ["plugins/doc-editor"], "claude plugin test plugins/doc-editor"],
  ["check-marketplace", "scripts/check-marketplace.mjs", [".", "./plugins/doc-editor"], "claude plugin validate ."],
  ["check-plugin-declared", "scripts/check-plugin-declared.mjs", ["plugins/doc-editor"], "claude plugin validate plugins/doc-editor"],
] as const;

const runWith = (path: string, script: string, args: readonly string[]) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PATH: path },
  });

describe("the mod's gates without a usable claude", () => {
  for (const [gate, script, args, what] of GATES) {
    it(`should say ${gate} did not run and why when claude is not on PATH`, () => {
      const result = runWith(binDir(), script, args);

      expect(result.stdout.trim()).toMatch(
        new RegExp(`^${gate}: did NOT run ${what.replace(/\./g, "\\.")}: claude is not on PATH \\(.*ENOENT.*\\)$`),
      );
      expect(result.status).toBe(0);
    });

    it(`should say ${gate} did not run and name both versions when claude is below the floor`, () => {
      const result = runWith(binDir("2.1.200"), script, args);

      expect(result.stdout.trim()).toBe(
        `${gate}: did NOT run ${what}: claude 2.1.200 is below the floor ${CLAUDE_FLOOR}`,
      );
      expect(result.status).toBe(0);
    });
  }
});
