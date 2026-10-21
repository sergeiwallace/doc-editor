#!/usr/bin/env node
// Type-checks a plugin's hooks against the mod types Claude Code writes when a session loads it.
// Usage: node scripts/typecheck-hooks.mjs <plugin-dir>
// The types exist only after one `claude --plugin-dir <plugin-dir>` load. Before that it prints
// that it did NOT type-check the hooks and why, and exits 0 without claiming a pass.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [dir] = process.argv.slice(2);
if (!dir) {
  console.log("usage: typecheck-hooks.mjs <plugin-dir>");
  process.exit(2);
}
const types = join(dir, ".claude-plugin/types/tsconfig.json");
if (!existsSync(types) || !existsSync(join(dir, "tsconfig.json"))) {
  console.log(
    `typecheck-hooks: did NOT type-check ${dir}/hooks: no mod types yet; load the plugin once with claude --plugin-dir ${dir}`,
  );
  process.exit(0);
}
const tsc = resolve(dirname(fileURLToPath(import.meta.url)), "../node_modules/typescript/bin/tsc");
// The generated tsconfig does not allow the `.ts` import extensions the mod loader needs.
const result = spawnSync(process.execPath, [tsc, "-p", dir, "--allowImportingTsExtensions"], {
  stdio: "inherit",
});
if (result.status === 0) console.log(`typecheck-hooks: ${dir}/hooks type-checks against the mod types`);
process.exit(result.status ?? 1);
