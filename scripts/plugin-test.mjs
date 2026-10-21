#!/usr/bin/env node
// Runs `claude plugin test <plugin-dir>` (design D-11), or says it did not and why.
// Usage: node scripts/plugin-test.mjs <plugin-dir>
// Exits with the runner's own status when it runs.
import { spawnSync } from "node:child_process";

import { requireClaude } from "./claude-floor.mjs";

const [dir] = process.argv.slice(2);
if (!dir) {
  console.log("usage: plugin-test.mjs <plugin-dir>");
  process.exit(2);
}
requireClaude("plugin-test", `claude plugin test ${dir}`);
const result = spawnSync("claude", ["plugin", "test", dir], { stdio: "inherit" });
if (result.error) {
  console.log(`plugin-test: cannot run claude plugin test: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 1);
