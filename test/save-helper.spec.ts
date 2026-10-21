// Runner: Vitest. It runs the mod's save helper, plugins/doc-editor/bin/save.mjs, under node on
// real files in a fresh temporary directory, as the mod's $.process.run does (design D-12, T-1.7).
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const helper = resolve(import.meta.dirname, "../plugins/doc-editor/bin/save.mjs");
const ORIGINAL = "# Notes\n\n- [ ] first\n";
const EDITED = "# Notes\n\n- [x] first\n- [ ] second, ünïcode\n";

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) {
    chmodSync(dir, 0o755);
    rmSync(dir, { recursive: true });
  }
});

function folder(): string {
  const dir = mkdtempSync(join(tmpdir(), "doc-editor-save-"));
  scratch.push(dir);
  return dir;
}

function fileWith(text: string): { dir: string; path: string; mtimeMs: number; size: number } {
  const dir = folder();
  const path = join(dir, "notes.md");
  writeFileSync(path, text);
  const { mtimeMs, size } = statSync(path);
  return { dir, path, mtimeMs, size };
}

const save = (path: string, mtimeMs: number, size: number, content: string) =>
  spawnSync("node", [helper, path, String(mtimeMs), String(size)], {
    input: content,
    encoding: "utf8",
  });

const lastLine = (text: string) => text.trimEnd().split("\n").at(-1) ?? "";

describe("the save helper", () => {
  it("should replace the target with stdin and leave no temporary file when mtimeMs and size match", () => {
    const f = fileWith(ORIGINAL);

    const result = save(f.path, f.mtimeMs, f.size, EDITED);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readFileSync(f.path, "utf8")).toBe(EDITED);
    expect(readdirSync(f.dir)).toEqual(["notes.md"]);
    const saved = statSync(f.path);
    expect(JSON.parse(result.stdout)).toEqual({ mtimeMs: saved.mtimeMs, size: saved.size });
  });

  it("should exit non-zero naming both mtimeMs values and leave the target unchanged when mtimeMs differs", () => {
    const f = fileWith(ORIGINAL);
    const stale = f.mtimeMs - 5_000;

    const result = save(f.path, stale, f.size, EDITED);

    expect(result.status).toBe(1);
    expect(lastLine(result.stderr)).toBe(
      `save: ${f.path} changed since it was read: expected mtimeMs ${stale} size ${f.size}, found mtimeMs ${f.mtimeMs} size ${f.size}`,
    );
    expect(readFileSync(f.path, "utf8")).toBe(ORIGINAL);
    expect(readdirSync(f.dir)).toEqual(["notes.md"]);
  });

  it("should exit non-zero naming both sizes and leave the target unchanged when the size differs", () => {
    const f = fileWith(ORIGINAL);

    const result = save(f.path, f.mtimeMs, f.size + 1, EDITED);

    expect(result.status).toBe(1);
    expect(lastLine(result.stderr)).toBe(
      `save: ${f.path} changed since it was read: expected mtimeMs ${f.mtimeMs} size ${f.size + 1}, found mtimeMs ${f.mtimeMs} size ${f.size}`,
    );
    expect(readFileSync(f.path, "utf8")).toBe(ORIGINAL);
    expect(readdirSync(f.dir)).toEqual(["notes.md"]);
  });

  it("should refuse the rename when the target changes after the helper starts and before it renames", async () => {
    const f = fileWith(ORIGINAL);
    const child = spawn("node", [helper, f.path, String(f.mtimeMs), String(f.size)]);
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    const exited = new Promise<number | null>((done) => child.on("close", done));

    // The helper has checked the path and now waits for its content: an outside edit lands here.
    await new Promise((done) => setTimeout(done, 200));
    writeFileSync(f.path, ORIGINAL);
    utimesSync(f.path, new Date(), new Date(f.mtimeMs + 60_000));
    child.stdin.end(EDITED);

    expect(await exited).toBe(1);
    expect(lastLine(stderr)).toContain(`expected mtimeMs ${f.mtimeMs} size ${f.size}, found mtimeMs`);
    expect(readFileSync(f.path, "utf8")).toBe(ORIGINAL);
    expect(readdirSync(f.dir)).toEqual(["notes.md"]);
  });

  it("should exit non-zero and create nothing when the target does not exist", () => {
    const dir = folder();
    const path = join(dir, "missing.md");

    const result = save(path, 1, 1, EDITED);

    expect(result.status).toBe(1);
    expect(lastLine(result.stderr)).toBe(`save: cannot save ${path}: it does not exist`);
    expect(readdirSync(dir)).toEqual([]);
  });

  it.skipIf(process.getuid?.() === 0)(
    "should exit non-zero and leave the target unchanged when its directory is not writable",
    () => {
      const f = fileWith(ORIGINAL);
      chmodSync(f.dir, 0o555);

      const result = save(f.path, f.mtimeMs, f.size, EDITED);

      expect(result.status).toBe(1);
      expect(lastLine(result.stderr)).toMatch(new RegExp(`^save: cannot save ${f.path}: EACCES`));
      expect(readFileSync(f.path, "utf8")).toBe(ORIGINAL);
      expect(readdirSync(f.dir)).toEqual(["notes.md"]);
    },
  );

  it("should write beside the real file and keep the link when the target is a symbolic link", () => {
    const f = fileWith(ORIGINAL);
    const linkDir = join(folder(), "docs");
    mkdirSync(linkDir);
    const link = join(linkDir, "link.md");
    symlinkSync(f.path, link);

    const result = save(link, f.mtimeMs, f.size, EDITED);

    expect(result.status).toBe(0);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readFileSync(f.path, "utf8")).toBe(EDITED);
    expect(readdirSync(linkDir)).toEqual(["link.md"]);
    expect(readdirSync(f.dir)).toEqual(["notes.md"]);
  });

  it("should exit 2 with a usage line and write nothing when an argument is missing or not a number", () => {
    const f = fileWith(ORIGINAL);

    const missing = save(f.path, f.mtimeMs, Number.NaN, EDITED);

    expect(missing.status).toBe(2);
    expect(lastLine(missing.stderr)).toBe(
      "save: usage: save.mjs <target> <expected-mtimeMs> <expected-size>, content on stdin",
    );
    expect(readFileSync(f.path, "utf8")).toBe(ORIGINAL);
  });
});
