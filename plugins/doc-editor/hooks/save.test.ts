import { describe, expect, test } from "claude-code/testing";

import { CANCEL, conflictQuestion, createSaver, NON_ATOMIC_TEXT, OVERWRITE, RELOAD } from "./save.ts";
import { exit, HELPER, nodeVersion, ok, saveWorld, sizeOf, type Script } from "./tests/world.ts";

// The safe-write path over a stub host (design D-12, T-1.7). The helper's own behaviour on real
// files is test/save-helper.spec.ts.

const PATH = "/work/doc-editor/notes.md";
const READ_TEXT = "# Notes\n\n- [ ] first\n";
const NEW_TEXT = "# Notes\n\n- [x] first\n";
const READ = { mtimeMs: 1_700_000_000_000.25, size: sizeOf(READ_TEXT) };
const SAVED = { mtimeMs: 1_700_000_009_000.5, size: sizeOf(NEW_TEXT) };

const isHelper = (argv: readonly string[]) => argv[0] === "node" && argv[1] === HELPER;
/** node is present and the helper saves, printing the new stamp. */
const helperSaves: Script = (argv) =>
  nodeVersion(argv) ?? (isHelper(argv) ? ok(`${JSON.stringify(SAVED)}\n`) : undefined);
/** node cannot start, as `$.process.run` rejects for a missing executable. */
const noNode: Script = (argv) =>
  argv[0] === "node" ? new Error('ENOENT: Executable not found in $PATH: "node"') : undefined;

const unchanged = { [PATH]: { text: READ_TEXT, mtimeMs: READ.mtimeMs } };
const changedOnDisk = { [PATH]: { text: "# Notes, edited elsewhere\n", mtimeMs: READ.mtimeMs + 4_000 } };

describe("save", () => {
  test("should run the helper with the expected mtimeMs and size and the text on stdin when node is present", async () => {
    const w = saveWorld({ files: unchanged, script: helperSaves });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({ kind: "saved", stamp: SAVED });
    expect(w.helperRuns()).toEqual([
      { argv: ["node", HELPER, PATH, String(READ.mtimeMs), String(READ.size)], stdin: NEW_TEXT },
    ]);
    expect(w.writes).toEqual([]);
    expect(w.asked).toEqual([]);
  });

  test("should report saved and re-read the stamp when the helper exits 0 without printing one", async () => {
    const w = saveWorld({
      files: unchanged,
      script: (argv) => nodeVersion(argv) ?? (isHelper(argv) ? ok("") : undefined),
    });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({ kind: "saved", stamp: await w.fs.stat(PATH) });
    expect(w.statuses).toEqual([]);
  });

  test("should report saved with no stamp when the helper exits 0 and the file cannot be stat'ed after", async () => {
    const w = saveWorld({
      files: unchanged,
      script: (argv) => {
        if (isHelper(argv)) {
          w.fs.map.delete(PATH);
          return ok("");
        }
        return nodeVersion(argv);
      },
    });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({ kind: "saved", stamp: undefined });
    expect(w.statuses).toEqual([]);
  });

  test("should detect node once per session by running node --version as an argument vector", async () => {
    const w = saveWorld({ files: unchanged, script: helperSaves });
    const save = createSaver(w.host);

    await save(PATH, NEW_TEXT, READ);
    await save(PATH, NEW_TEXT, READ);

    expect(w.runs.filter((run) => run.argv.join(" ") === "node --version").length).toBe(1);
    expect(w.helperRuns().length).toBe(2);
  });

  test("should ask reload, overwrite or cancel before writing when mtimeMs differs from the last read", async () => {
    const w = saveWorld({ files: changedOnDisk, script: helperSaves, answer: CANCEL });

    await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(w.asked).toEqual([{ question: conflictQuestion(PATH), options: [RELOAD, OVERWRITE, CANCEL] }]);
    expect(w.helperRuns()).toEqual([]);
  });

  test("should return reload and write nothing when the person picks Reload", async () => {
    const w = saveWorld({ files: changedOnDisk, script: helperSaves, answer: RELOAD });

    expect(await createSaver(w.host)(PATH, NEW_TEXT, READ)).toEqual({ kind: "reload" });
    expect(w.helperRuns()).toEqual([]);
    expect(w.writes).toEqual([]);
  });

  test("should write nothing when the person dismisses the question", async () => {
    const w = saveWorld({ files: changedOnDisk, script: helperSaves, answer: new Error("dismissed") });

    expect(await createSaver(w.host)(PATH, NEW_TEXT, READ)).toEqual({ kind: "cancelled" });
    expect(w.helperRuns()).toEqual([]);
    expect(w.writes).toEqual([]);
  });

  test("should pass the file's current mtimeMs and size to the helper when the person picks Overwrite", async () => {
    const w = saveWorld({ files: changedOnDisk, script: helperSaves, answer: OVERWRITE });
    const now = await w.fs.stat(PATH);

    expect(await createSaver(w.host)(PATH, NEW_TEXT, READ)).toEqual({ kind: "saved", stamp: SAVED });
    expect(w.helperRuns()[0]?.argv.slice(2)).toEqual([PATH, String(now.mtimeMs), String(now.size)]);
  });

  test("should leave the target unchanged and show the helper's last stderr line when the helper exits non-zero", async () => {
    const refusal = `save: ${PATH} changed since it was read: expected mtimeMs ${READ.mtimeMs} size ${READ.size}, found mtimeMs 1700000001000 size 30`;
    const w = saveWorld({
      files: unchanged,
      script: (argv) => nodeVersion(argv) ?? (isHelper(argv) ? exit(1, `warming up\n${refusal}\n`) : undefined),
    });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({ kind: "failed", reason: refusal });
    expect(w.statuses).toEqual([refusal]);
    expect(w.writes).toEqual([]);
    expect(w.fs.map.get(PATH)?.text).toBe(READ_TEXT);
  });

  test("should leave the target unchanged and show the reason when the helper cannot run to its end", async () => {
    const w = saveWorld({
      files: unchanged,
      script: (argv) => nodeVersion(argv) ?? (isHelper(argv) ? new Error("timed out after 30000 ms") : undefined),
    });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({ kind: "failed", reason: "save: timed out after 30000 ms" });
    expect(w.statuses).toEqual(["save: timed out after 30000 ms"]);
    expect(w.writes).toEqual([]);
  });

  test("should write with fs.write and state the non-atomic risk once per session when node is absent", async () => {
    const w = saveWorld({ files: unchanged, script: noNode });
    const save = createSaver(w.host);

    const first = await save(PATH, NEW_TEXT, READ);
    const second = await save(PATH, "# Notes\n", await w.fs.stat(PATH));

    expect(first.kind).toBe("saved");
    expect(second).toEqual({ kind: "saved", stamp: await w.fs.stat(PATH) });
    expect(w.writes).toEqual([
      { path: PATH, text: NEW_TEXT },
      { path: PATH, text: "# Notes\n" },
    ]);
    expect(w.statuses).toEqual([NON_ATOMIC_TEXT]);
    expect(w.helperRuns()).toEqual([]);
  });

  test("should still ask before the direct write when node is absent and the file changed", async () => {
    const w = saveWorld({ files: changedOnDisk, script: noNode, answer: CANCEL });

    expect(await createSaver(w.host)(PATH, NEW_TEXT, READ)).toEqual({ kind: "cancelled" });
    expect(w.asked.length).toBe(1);
    expect(w.writes).toEqual([]);
  });

  test("should show the reason and write nothing when the target is missing", async () => {
    const w = saveWorld({ files: {}, script: helperSaves });

    const result = await createSaver(w.host)(PATH, NEW_TEXT, READ);

    expect(result).toEqual({
      kind: "failed",
      reason: `cannot save ${PATH}: ENOENT: no such file or directory, stat '${PATH}'`,
    });
    expect(w.writes).toEqual([]);
    expect(w.helperRuns()).toEqual([]);
  });
});
