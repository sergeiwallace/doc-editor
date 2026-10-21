// Runner: Vitest. It spawns the marketplace gate, which runs `claude plugin validate`.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { claudeStatus } from "../scripts/claude-floor.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const gate = join(repoRoot, "scripts/check-marketplace.mjs");
const SOURCE = "./plugins/doc-editor";

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

// A repository root holding the real marketplace and plugin manifest, the marketplace edited.
function rootWith(edit: (marketplace: { plugins: { source: string }[] }) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-marketplace-"));
  scratch.push(dir);
  mkdirSync(join(dir, ".claude-plugin"));
  mkdirSync(join(dir, "plugins/doc-editor/.claude-plugin"), { recursive: true });
  cpSync(
    join(repoRoot, "plugins/doc-editor/.claude-plugin/plugin.json"),
    join(dir, "plugins/doc-editor/.claude-plugin/plugin.json"),
  );
  const marketplace = JSON.parse(
    readFileSync(join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"),
  );
  edit(marketplace);
  writeFileSync(join(dir, ".claude-plugin/marketplace.json"), JSON.stringify(marketplace));
  return dir;
}

const runGate = (root: string) =>
  spawnSync("node", [gate, root, SOURCE], { cwd: repoRoot, encoding: "utf8" });

// Without a usable claude these cases are reported as skipped, with the reason, never as passed.
const claude = claudeStatus();

describe.skipIf(!claude.usable)(`the marketplace gate (claude ${claude.version ?? claude.reason})`, { timeout: 60_000 }, () => {
  it("should pass when claude plugin validate accepts the root and the marketplace lists doc-editor", () => {
    const result = runGate(repoRoot);

    expect(result.stdout).toContain(
      "check-marketplace: the marketplace validates and lists ./plugins/doc-editor as doc-editor",
    );
    expect(result.status).toBe(0);
  });

  it("should fail naming the source when the marketplace does not list the plugin", () => {
    const root = rootWith((marketplace) => {
      for (const plugin of marketplace.plugins) plugin.source = "./plugins/other";
    });

    const result = runGate(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "check-marketplace: .claude-plugin/marketplace.json does not list ./plugins/doc-editor",
    );
  });

  it("should fail when claude plugin validate refuses the marketplace", () => {
    const root = rootWith((marketplace) => {
      Object.assign(marketplace, { plugins: "not a list" });
    });

    const result = runGate(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("check-marketplace: claude plugin validate");
  });
});
