#!/usr/bin/env node
// Public-repository hygiene (design D-16, task T-0.3).
// Usage: node scripts/check-hygiene.mjs <repo-root>
// Fails naming each problem:
//   - CONTRIBUTING.md, SECURITY.md or CODE_OF_CONDUCT.md missing at the root;
//   - README.md with no sentence saying the Copier template is private and no link to a public
//     template repository;
//   - a file a `claude --plugin-dir plugins/doc-editor` load writes that .gitignore does not
//     ignore, so git status would list it as untracked.
// Exits 1 on any problem, 2 when the root is not a git repository.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REQUIRED = ["CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md"];
const PUBLIC_TEMPLATE = "https://github.com/sergeiwallace/project-template";
// Measured on Claude Code 2.1.306: what a --plugin-dir load writes into the plugin.
const LOAD_WRITES = [
  "plugins/doc-editor/tsconfig.json",
  "plugins/doc-editor/.claude-plugin/types/tsconfig.json",
  "plugins/doc-editor/.claude-plugin/types/claude-code/index.d.ts",
];

const sentences = (text) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s/)
    .map((sentence) => sentence.trim());

function readmeProblem(root) {
  const path = join(root, "README.md");
  if (!existsSync(path)) return "README.md is missing";
  const text = readFileSync(path, "utf8");
  const saysPrivate = sentences(text).some((sentence) =>
    /\bCopier\b.*\btemplate\b.*\bprivate\b/i.test(sentence),
  );
  if (saysPrivate || text.includes(PUBLIC_TEMPLATE)) return null;
  return `README.md has no sentence saying the Copier template is private, and no link to a public template (${PUBLIC_TEMPLATE})`;
}

function unignored(root) {
  const result = spawnSync("git", ["-C", root, "check-ignore", "--no-index", "--stdin", "-z"], {
    encoding: "utf8",
    input: LOAD_WRITES.join("\0"),
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    console.log(`check-hygiene: git check-ignore failed in ${root}: ${result.error?.message ?? result.stderr.trim()}`);
    process.exit(2);
  }
  const ignored = new Set(result.stdout.split("\0").filter(Boolean));
  return LOAD_WRITES.filter((path) => !ignored.has(path));
}

function main() {
  const [rootArg] = process.argv.slice(2);
  if (!rootArg) {
    console.log("usage: check-hygiene.mjs <repo-root>");
    process.exit(2);
  }
  const root = resolve(rootArg);
  const problems = [];
  for (const file of REQUIRED) {
    if (!existsSync(join(root, file))) problems.push(`${file} is missing`);
  }
  const readme = readmeProblem(root);
  if (readme) problems.push(readme);
  for (const path of unignored(root)) {
    problems.push(`.gitignore does not ignore ${path}, which a --plugin-dir load writes`);
  }
  for (const problem of problems) console.log(`check-hygiene: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log("check-hygiene: the policy files exist, the README states the template is private or links it, and a plugin load leaves nothing untracked");
}

main();
