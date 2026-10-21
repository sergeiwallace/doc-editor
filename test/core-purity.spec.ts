// Runner: Vitest. It spawns the purity lint, which reads the repository from Node.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const lint = join(repoRoot, "scripts/check-core-purity.mjs");
const fixtures = "test/fixtures/core-purity";

const run = (dir: string) =>
  spawnSync("node", [lint, dir], { cwd: repoRoot, encoding: "utf8" });

const scratch: string[] = [];
const scratchDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-purity-"));
  scratch.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true });
});

const findings = (stdout: string) => stdout.trim().split("\n");

describe("the core purity lint", () => {
  it("should pass when run on the real core", () => {
    const result = run("plugins/doc-editor/core");

    expect(result.stdout).toMatch(/check-core-purity: \d+ file\(s\) clean/);
    expect(result.status).toBe(0);
  });

  it("should pass when the names appear only in comments, strings, templates, regular expressions, property names or as locals the file declares", () => {
    const result = run(`${fixtures}/clean`);

    expect(result.stdout.trim()).toBe("check-core-purity: 4 file(s) clean");
    expect(result.status).toBe(0);
  });

  it("should fail naming the file and the import when a core file imports anything but a relative path", () => {
    const result = run(`${fixtures}/impure`);

    expect(result.status).toBe(1);
    expect(findings(result.stdout).filter((line) => line.includes("imports.ts"))).toEqual([
      `${fixtures}/impure/imports.ts:1: import micromark`,
      `${fixtures}/impure/imports.ts:2: import node:fs`,
      `${fixtures}/impure/imports.ts:3: import claude-code/testing`,
      `${fixtures}/impure/imports.ts:6: import micromark-util-types`,
      `${fixtures}/impure/imports.ts:7: import() of a computed specifier`,
    ]);
  });

  it("should fail naming the file and the token when a core file references document, window, process or setTimeout", () => {
    const result = run(`${fixtures}/impure`);

    expect(result.status).toBe(1);
    expect(findings(result.stdout).filter((line) => line.includes("globals.ts"))).toEqual([
      `${fixtures}/impure/globals.ts:3: globalThis.document`,
      `${fixtures}/impure/globals.ts:4: setTimeout`,
      `${fixtures}/impure/globals.ts:5: document`,
      `${fixtures}/impure/globals.ts:6: window`,
      `${fixtures}/impure/globals.ts:7: process`,
      `${fixtures}/impure/globals.ts:8: globalThis.window`,
    ]);
  });

  it("should fail naming the file and the token when a core file calls $ or takes it as a parameter", () => {
    const result = run(`${fixtures}/impure`);

    expect(result.status).toBe(1);
    expect(findings(result.stdout).filter((line) => line.includes("engine.ts"))).toEqual([
      `${fixtures}/impure/engine.ts:3: $`,
      `${fixtures}/impure/engine.ts:4: $`,
      `${fixtures}/impure/engine.ts:4: $`,
    ]);
  });

  it("should pass when every forbidden name is declared by a scope enclosing its use", () => {
    const result = run(`${fixtures}/clean-scopes`);

    expect(result.stdout.trim()).toBe("check-core-purity: 1 file(s) clean");
    expect(result.status).toBe(0);
  });

  it("should fail naming each escape when a name is bound only in another scope or reached through the global object or require", () => {
    const result = run(`${fixtures}/impure-scopes`);

    expect(result.status).toBe(1);
    const file = `${fixtures}/impure-scopes/escapes.js`;
    expect(findings(result.stdout)).toEqual([
      `${file}:3: document`,
      `${file}:4: window`,
      `${file}:5: self.document`,
      `${file}:6: globalThis aliased or indexed by a computed key`,
      `${file}:8: globalThis.document`,
      `${file}:9: globalThis aliased or indexed by a computed key`,
      `${file}:10: require`,
      `${file}:11: require`,
      `${file}:12: window.process`,
      `${file}:12: window`,
      `${file}:13: globalThis.globalThis.document`,
      `${file}:14: self.self.document`,
      `${file}:15: globalThis.window.document`,
      `${file}:15: globalThis.window`,
      `${file}:16: window.self.process`,
      `${file}:16: window`,
    ]);
  });

  it("should fail when a core file is added that uses a timer", () => {
    const dir = scratchDir();
    writeFileSync(join(dir, "clock.ts"), "export const tick = () => 1;\n\nsetTimeout(tick, 5);\n");

    const result = run(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("clock.ts:3: setTimeout");
  });

  it("should fail naming the file when a core file cannot be parsed", () => {
    const dir = scratchDir();
    writeFileSync(join(dir, "broken.js"), "const = ;\n");

    const result = run(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("broken.js:0: cannot parse:");
  });

  it("should refuse to pass when the directory holds no source file", () => {
    const result = run(scratchDir());

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("nothing was checked");
  });
});
