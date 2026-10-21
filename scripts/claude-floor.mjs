// The Claude Code floor for the mod's gates (design D-11).
// 2.1.299 is the first release that lets a hooks module's helpers live in other files, which the
// reader's hooks/*.ts layout needs; the gate itself was measured on 2.1.306.
// A gate that cannot run says so and exits 0 without claiming a pass: `npm test` and the hooks stay
// one command for a contributor who has no `claude`, and the line names what did not run and why.
import { spawnSync } from "node:child_process";

export const CLAUDE_FLOOR = "2.1.299";

const parse = (version) => version.split(".").map(Number);

function atLeast(version, floor) {
  const [a, b] = [parse(version), parse(floor)];
  for (let k = 0; k < Math.max(a.length, b.length); k++) {
    const diff = (a[k] ?? 0) - (b[k] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}

/** Whether `claude` on PATH can run the mod's gates, and the reason when it cannot. */
export function claudeStatus() {
  const result = spawnSync("claude", ["--version"], { encoding: "utf8" });
  if (result.error) {
    return { usable: false, reason: `claude is not on PATH (${result.error.message})` };
  }
  const version = /\d+\.\d+\.\d+/.exec(result.stdout)?.[0];
  if (result.status !== 0 || version === undefined) {
    const said = (result.stdout + result.stderr).trim();
    return {
      usable: false,
      reason: `claude --version exited ${result.status} printing ${JSON.stringify(said)}`,
    };
  }
  if (!atLeast(version, CLAUDE_FLOOR)) {
    return {
      usable: false,
      reason: `claude ${version} is below the floor ${CLAUDE_FLOOR}`,
      version,
    };
  }
  return { usable: true, version };
}

/** Prints the skip line and exits 0 when `claude` cannot run `what`; returns otherwise. */
export function requireClaude(gate, what) {
  const status = claudeStatus();
  if (status.usable) return status;
  console.log(`${gate}: did NOT run ${what}: ${status.reason}`);
  process.exit(0);
}
