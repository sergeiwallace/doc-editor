#!/usr/bin/env node
// The one `npm test` command (design D-11): the repository checks under Vitest, then
// `claude plugin test <plugin-dir>`, then one summary line.
// Usage: node scripts/run-gate.mjs <plugin-dir> [vitest arguments]
// The summary line names every gate that did not run and why, or says every gate ran, so a
// contributor without a usable `claude` sees what was left out even where a hook hides output.
// Exits non-zero when Vitest or the plugin tests fail.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { claudeStatus } from "./claude-floor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [dir, ...vitestArgs] = process.argv.slice(2);
if (!dir) {
  console.log("usage: run-gate.mjs <plugin-dir> [vitest arguments]");
  process.exit(2);
}

const vitest = spawnSync(
  process.execPath,
  [resolve(here, "../node_modules/vitest/vitest.mjs"), "run", ...vitestArgs],
  { stdio: "inherit" },
);
const plugin = spawnSync(process.execPath, [resolve(here, "plugin-test.mjs"), dir], {
  stdio: "inherit",
});

const claude = claudeStatus();
if (claude.usable) {
  console.log("npm test: every gate ran");
} else {
  console.log(
    `npm test: did NOT run claude plugin test ${dir} or the Vitest suites that call claude (declared list, marketplace): ${claude.reason}`,
  );
}
const failed = [vitest, plugin].find((result) => result.status !== 0);
process.exit(failed === undefined ? 0 : (failed.status ?? 1));
