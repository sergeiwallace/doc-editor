import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Runner: Vitest. It spawns git, which the mod environment lacks.
const repoRoot = resolve(import.meta.dirname, "..");
const gate = join(repoRoot, "scripts/check-plugin-size.mjs");

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

// Inside the pre-commit hook git exports GIT_INDEX_FILE and friends for the outer repository;
// a scratch repository must not inherit them, or its `git add` would write the outer index.
const scratchEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

function git(dir: string, args: string[]) {
  const result = spawnSync("git", args, { cwd: dir, env: scratchEnv, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
}

// A scratch git repository holding `files` (name to byte count), each staged with `git add -f`
// unless listed in `untracked`, and a .gitignore that ignores node_modules/ and .turbo/.
function repoWith(files: Record<string, number>, untracked: string[] = []): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-size-"));
  scratch.push(dir);
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, ".gitignore"), "node_modules/\n.turbo/\n");
  for (const [name, bytes] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(path, Buffer.alloc(bytes, "a"));
    if (!untracked.includes(name)) git(dir, ["add", "-f", "--", name]);
  }
  return dir;
}

const runGate = (dir: string) =>
  spawnSync("node", [gate, dir], { cwd: repoRoot, env: scratchEnv, encoding: "utf8" });

const overLine = (dir: string, name: string, bytes: number) =>
  `check-plugin-size: ${join(dir, name)}: ${bytes} bytes, over the 1 MB limit (1000000 bytes)`;

describe("the plugin size gate", () => {
  it("should pass when run on the real plugin", () => {
    const result = spawnSync("node", [gate, "plugins/doc-editor"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.stdout).toMatch(
      /check-plugin-size: \d+ file\(s\) under plugins\/doc-editor, none over 1 MB/,
    );
    expect(result.status).toBe(0);
  });

  it("should fail naming the file when a file under the plugin exceeds 1 MB", () => {
    const dir = repoWith({ "hooks/register.ts": 10, "core/src/big.ts": 1_000_001 });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe(overLine(dir, "core/src/big.ts", 1_000_001));
  });

  it("should pass when a file is exactly 1 MB", () => {
    const dir = repoWith({ "core/src/edge.ts": 1_000_000 });

    expect(runGate(dir).status).toBe(0);
  });

  it("should fail naming each file when an oversized file is force-added under node_modules or .turbo", () => {
    const dir = repoWith({
      "hooks/register.ts": 10,
      "node_modules/pkg/big.js": 1_000_001,
      ".turbo/cache.log": 1_000_002,
    });

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout.trim().split("\n").sort()).toEqual(
      [
        overLine(dir, ".turbo/cache.log", 1_000_002),
        overLine(dir, "node_modules/pkg/big.js", 1_000_001),
      ].sort(),
    );
  });

  it("should measure the staged blob when the working tree file has since shrunk", () => {
    const dir = repoWith({ "core/src/big.ts": 1_000_001 });
    writeFileSync(join(dir, "core/src/big.ts"), "small\n");

    const result = runGate(dir);

    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe(overLine(dir, "core/src/big.ts", 1_000_001));
  });

  it("should refuse to pass when the directory is not inside a git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "doc-editor-size-"));
    scratch.push(dir);

    const result = runGate(dir);

    expect(result.status).toBe(2);
    expect(result.stdout).toContain("check-plugin-size: git ls-files failed");
  });
});
