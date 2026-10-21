// Runner: Vitest. Design D-3's mitigation: the committed bundles match what
// scripts/bundle-vendor.mjs writes. The rebuild needs the pinned packages, which
// `npm ci --prefix tools/vendor-bundle` installs; without them the test is skipped and says why,
// and never passes.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const toolModules = join(repoRoot, "tools/vendor-bundle/node_modules");
const BUNDLES = [
  "plugins/doc-editor/core/vendor/mdast.js",
  "plugins/doc-editor/vendor-candidates/codemirror-state.js",
  "plugins/doc-editor/vendor-candidates/prosemirror-model.js",
  "plugins/doc-editor/vendor-candidates/yjs.js",
];
const installed = existsSync(toolModules);
if (!installed) {
  console.log(
    `vendor-bundle: did NOT rebuild the bundles to compare them: ${toolModules} is missing; run npm ci --prefix tools/vendor-bundle`,
  );
}

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

describe("the committed vendor bundles", () => {
  it.skipIf(!installed)("should match byte for byte what scripts/bundle-vendor.mjs writes", () => {
    const out = mkdtempSync(join(tmpdir(), "doc-editor-bundle-"));
    scratch.push(out);
    const run = spawnSync(process.execPath, ["scripts/bundle-vendor.mjs", "--out-dir", out], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    for (const bundle of BUNDLES) {
      const rebuilt = readFileSync(join(out, bundle));
      const committed = readFileSync(join(repoRoot, bundle));
      expect(rebuilt.equals(committed), `${bundle} differs from the script's output`).toBe(true);
    }
  });

  it("should refuse --out-dir with no directory", () => {
    const run = spawnSync(process.execPath, ["scripts/bundle-vendor.mjs", "--out-dir"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("--out-dir needs a directory");
  });
});
