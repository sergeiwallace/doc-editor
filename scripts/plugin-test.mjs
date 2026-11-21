#!/usr/bin/env node
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
