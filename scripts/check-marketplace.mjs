#!/usr/bin/env node
// Marketplace gate (design D-10 and D-11, task T-0.2).
// Usage: node scripts/check-marketplace.mjs <repo-root> <plugin-source>
// Runs `claude plugin validate --strict <repo-root>`, then checks that the root
// .claude-plugin/marketplace.json lists <plugin-source> (for example ./plugins/doc-editor)
// under the name its own plugin.json gives. Validate passes a source that names no
// plugin folder, so this gate checks the listing itself.
// Exits 1 naming each problem, 2 when validate cannot run.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { requireClaude } from "./claude-floor.mjs";

function fail(problems) {
  for (const problem of problems) console.log(`check-marketplace: ${problem}`);
  process.exit(1);
}

function main() {
  const [rootArg, source] = process.argv.slice(2);
  if (!rootArg || !source) {
    console.log("usage: check-marketplace.mjs <repo-root> <plugin-source>");
    process.exit(2);
  }
  const root = resolve(rootArg);
  requireClaude("check-marketplace", `claude plugin validate ${rootArg}`);

  const result = spawnSync("claude", ["plugin", "validate", "--strict", root], {
    encoding: "utf8",
  });
  if (result.error) {
    console.log(`check-marketplace: cannot run claude plugin validate: ${result.error.message}`);
    process.exit(2);
  }
  if (result.status !== 0) {
    process.stdout.write(result.stdout + result.stderr);
    fail([`claude plugin validate ${rootArg} failed (exit ${result.status})`]);
  }

  const marketplacePath = join(root, ".claude-plugin/marketplace.json");
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  const entry = (marketplace.plugins ?? []).find((plugin) => plugin.source === source);
  if (!entry) fail([`.claude-plugin/marketplace.json does not list ${source}`]);

  const manifestPath = join(root, source, ".claude-plugin/plugin.json");
  if (!existsSync(manifestPath)) fail([`${source} has no .claude-plugin/plugin.json`]);
  const { name } = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (entry.name !== name) {
    fail([
      `.claude-plugin/marketplace.json lists ${source} as ${entry.name}, its plugin.json says ${name}`,
    ]);
  }

  console.log(`check-marketplace: the marketplace validates and lists ${source} as ${name}`);
}

main();
