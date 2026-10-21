// Runner: Vitest. It reads the repository and spawns git, which the mod environment lacks.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const gate = join(repoRoot, "scripts/check-hygiene.mjs");
const FILES = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md", ".gitignore"];
const PRIVATE_SENTENCE =
  "The scaffold comes from a [Copier](https://copier.readthedocs.io/) template that is private";
const NO_TEMPLATE_LINE =
  "check-hygiene: README.md has no sentence saying the Copier template is private, and no link to a public template (https://github.com/sergeiwallace/project-template)";

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

// Inside the pre-commit hook git exports GIT_INDEX_FILE and friends for the outer repository;
// the scratch repository must not inherit them.
const scratchEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

// A scratch git repository holding the real root files, then `edit` applied.
function rootWith(edit: (dir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-hygiene-"));
  scratch.push(dir);
  spawnSync("git", ["init", "-q", dir], { env: scratchEnv });
  for (const file of FILES) cpSync(join(repoRoot, file), join(dir, file));
  edit(dir);
  return dir;
}

function replaceIn(dir: string, file: string, from: string, to: string) {
  const path = join(dir, file);
  const text = readFileSync(path, "utf8");
  expect(text).toContain(from);
  writeFileSync(path, text.replace(from, to));
}

const runGate = (root: string) =>
  spawnSync("node", [gate, root], { cwd: repoRoot, env: scratchEnv, encoding: "utf8" });

describe("the hygiene gate", () => {
  it("should pass when run on the real repository", () => {
    const result = runGate(repoRoot);

    expect(result.stdout).toContain("check-hygiene: the policy files exist");
    expect(result.status).toBe(0);
  });

  for (const file of ["CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md"]) {
    it(`should fail naming ${file} when it is missing`, () => {
      const root = rootWith((dir) => rmSync(join(dir, file)));

      const result = runGate(root);

      expect(result.status).toBe(1);
      expect(result.stdout.trim()).toBe(`check-hygiene: ${file} is missing`);
    });
  }

  it("should fail naming the sentence when the README neither says the template is private nor links it", () => {
    const root = rootWith((dir) =>
      replaceIn(dir, "README.md", PRIVATE_SENTENCE, "The scaffold comes from a template"),
    );

    const result = runGate(root);

    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe(NO_TEMPLATE_LINE);
  });

  it("should pass when the README links a public template instead", () => {
    const root = rootWith((dir) =>
      replaceIn(
        dir,
        "README.md",
        PRIVATE_SENTENCE,
        "The scaffold comes from https://github.com/sergeiwallace/project-template",
      ),
    );

    expect(runGate(root).status).toBe(0);
  });

  it("should fail naming the file when .gitignore stops ignoring what a plugin load writes", () => {
    const root = rootWith((dir) =>
      replaceIn(dir, ".gitignore", "plugins/*/tsconfig.json\n", ""),
    );

    const result = runGate(root);

    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe(
      "check-hygiene: .gitignore does not ignore plugins/doc-editor/tsconfig.json, which a --plugin-dir load writes",
    );
  });
});
