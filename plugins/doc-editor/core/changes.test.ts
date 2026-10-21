import { describe, expect, test } from "claude-code/testing";

import { parseBlocks } from "./blocks.ts";
import {
  alignBlocks,
  changedBlockIds,
  diffsByTurn,
  discardChange,
  mapBlockIds,
  markedBlockIds,
  recordChanges,
  turnDiff,
} from "./changes.ts";
import { fixtureDoc } from "./fixture-docs.ts";

const doc = (source: string) => ({ source, blocks: parseBlocks(source).blocks });
const BEFORE = "# T\n\nOne.\n\nTwo.\n\nThree.\n";

// The 20,000-line fixture before and after one edit, parsed once at load: a test's own time limit
// is 5 seconds.
const bigBefore = doc(fixtureDoc(20_000));
const edited = bigBefore.blocks[3000];
const bigLines = bigBefore.source.split("\n");
if (edited !== undefined) bigLines[edited.start - 1] = `${bigLines[edited.start - 1]} EDITED`;
const bigAfter = doc(bigLines.join("\n"));

describe("marking changed blocks", () => {
  test("should mark every block whose text changed with the turn id when the file changes after a request", () => {
    const after = doc("# T\n\nOne, edited.\n\nTwo.\n\nThree, edited\nover two lines.\n");
    const changes = recordChanges("turn-1", doc(BEFORE), after);

    expect(changes).toEqual([
      { turn: "turn-1", blockIds: ["h1:1"], before: "One.\n", after: "One, edited.\n", start: 3, end: 3 },
      { turn: "turn-1", blockIds: ["h1:3"], before: "Three.\n", after: "Three, edited\nover two lines.\n", start: 7, end: 8 },
    ]);
    expect(markedBlockIds(changes)).toEqual(["h1:1", "h1:3"]);
  });

  test("should mark an inserted block and record a removed one with an empty range", () => {
    const inserted = recordChanges("t", doc(BEFORE), doc("# T\n\nOne.\n\nNew.\n\nTwo.\n\nThree.\n"));
    const removed = recordChanges("t", doc(BEFORE), doc("# T\n\nOne.\n\nThree.\n"));

    expect(inserted).toEqual([{ turn: "t", blockIds: ["h1:2"], before: "", after: "New.\n\n", start: 5, end: 6 }]);
    expect(removed).toMatchObject([{ turn: "t", before: "Two.\n\n", after: "", start: 5, end: 4 }]);
  });

  test("should mark a deleted run on the surviving block after it, or before it at the end, and discard it", () => {
    const middle = "# T\n\nOne.\n\nThree.\n";
    const atEnd = "# T\n\nOne.\n\nTwo.\n";
    const [removed] = recordChanges("t", doc(BEFORE), doc(middle));
    const [last] = recordChanges("t", doc(BEFORE), doc(atEnd));

    expect(removed?.blockIds).toEqual(["h1:2"]);
    expect(last).toEqual({ turn: "t", blockIds: ["h1:2"], before: "\nThree.\n", after: "", start: 6, end: 5 });
    expect(markedBlockIds([removed, last].filter((change) => change !== undefined))).toEqual(["h1:2"]);
    expect(last === undefined ? null : discardChange(last, atEnd)).toEqual({ ok: true, source: BEFORE });
    expect(turnDiff("a.md", last === undefined ? [] : [last]).split("\n").slice(2)).toEqual([
      "@@ -6,2 +5,0 @@",
      "-",
      "-Three.",
    ]);
  });

  test("should record a change only to the blank lines between blocks and mark the block after it", () => {
    const after = "# T\n\nOne.\n\n\nTwo.\n\nThree.\n";
    const changes = recordChanges("t", doc(BEFORE), doc(after));

    expect(changes).toEqual([{ turn: "t", blockIds: ["h1:2"], before: "", after: "\n", start: 5, end: 5 }]);
    expect(turnDiff("a.md", changes).split("\n").slice(2)).toEqual(["@@ -4,0 +5,1 @@", "+"]);
    const [change] = changes;
    expect(change === undefined ? null : discardChange(change, after)).toEqual({ ok: true, source: BEFORE });
  });

  test("should record a change only to the final newline, diff it and discard it", () => {
    const after = "# T\n\nOne.\n\nTwo.\n\nThree.";
    const changes = recordChanges("t", doc(BEFORE), doc(after));

    expect(changes).toEqual([{ turn: "t", blockIds: ["h1:3"], before: "Three.\n", after: "Three.", start: 7, end: 7 }]);
    expect(turnDiff("a.md", changes).split("\n").slice(2)).toEqual([
      "@@ -7,1 +7,1 @@",
      "-Three.",
      "+Three.",
      "\\ No newline at end of file",
    ]);
    const [change] = changes;
    expect(change === undefined ? null : discardChange(change, after)).toEqual({ ok: true, source: BEFORE });
  });

  test("should mark nothing when the file is unchanged", () => {
    expect(recordChanges("t", doc(BEFORE), doc(BEFORE))).toEqual([]);
    expect(changedBlockIds(parseBlocks(BEFORE).blocks, parseBlocks(BEFORE).blocks)).toEqual([]);
  });

  test("should mark only the edited block of the 20,000-line fixture", () => {
    expect(edited).toBeDefined();
    expect(changedBlockIds(bigBefore.blocks, bigAfter.blocks)).toEqual([edited?.id]);
    expect(recordChanges("t", bigBefore, bigAfter).map((change) => change.start)).toEqual([edited?.start]);
  });

  test("should align unchanged blocks in order even when a block moved", () => {
    const a = parseBlocks("A\n\nB\n\nC\n").blocks;
    const b = parseBlocks("B\n\nC\n\nA\n").blocks;

    expect(alignBlocks(a, b)).toEqual([
      [1, 0],
      [2, 1],
    ]);
    expect(changedBlockIds(a, b)).toEqual(["h:3"]);
  });
});

describe("mapping ids across a reload", () => {
  test("should map each unchanged block's old id to its new id when an earlier block is inserted", () => {
    const before = parseBlocks(BEFORE).blocks;
    const after = parseBlocks("# T\n\nNew.\n\nOne.\n\nTwo.\n\nThree.\n").blocks;

    expect(mapBlockIds(before, after)).toEqual({ h1: "h1", "h1:1": "h1:2", "h1:2": "h1:3", "h1:3": "h1:4" });
  });

  test("should leave out a block whose text changed", () => {
    const before = parseBlocks(BEFORE).blocks;
    const after = parseBlocks("# T\n\nOne!\n\nTwo.\n\nThree.\n").blocks;

    expect(mapBlockIds(before, after)["h1:1"]).toBeUndefined();
    expect(mapBlockIds(before, after)["h1:2"]).toBe("h1:2");
  });
});

describe("CRLF line endings", () => {
  test("should record, diff and discard a change in a CRLF file byte for byte", () => {
    const before = BEFORE.replaceAll("\n", "\r\n");
    const after = before.replace("Two.", "Two, edited.");
    const changes = recordChanges("t", doc(before), doc(after));

    expect(changes).toEqual([{ turn: "t", blockIds: ["h1:2"], before: "Two.\r\n", after: "Two, edited.\r\n", start: 5, end: 5 }]);
    expect(turnDiff("a.md", changes).split("\n").slice(2)).toEqual(["@@ -5,1 +5,1 @@", "-Two.", "+Two, edited."]);
    const [change] = changes;
    expect(change === undefined ? null : discardChange(change, after)).toEqual({ ok: true, source: before });
  });
});

describe("the turn's diff", () => {
  test("should give a unified diff of a turn, with old line numbers shifted by the hunks above", () => {
    const changes = recordChanges("t", doc(BEFORE), doc("# T\n\nOne,\nedited.\n\nTwo.\n\nThree!\n"));

    expect(turnDiff("docs/a.md", changes)).toBe(
      [
        "--- a/docs/a.md",
        "+++ b/docs/a.md",
        "@@ -3,1 +3,2 @@",
        "-One.",
        "+One,",
        "+edited.",
        "@@ -7,1 +8,1 @@",
        "-Three.",
        "+Three!",
      ].join("\n"),
    );
  });

  test("should give a removal hunk an empty new side", () => {
    const changes = recordChanges("t", doc(BEFORE), doc("# T\n\nOne.\n\nThree.\n"));

    expect(turnDiff("a.md", changes).split("\n").slice(2)).toEqual(["@@ -5,2 +4,0 @@", "-Two.", "-"]);
  });

  test("should group diffs by turn in the order the turns first appear", () => {
    const one = recordChanges("turn-1", doc(BEFORE), doc("# T\n\nOne!\n\nTwo.\n\nThree.\n"));
    const two = recordChanges("turn-2", doc("# T\n\nOne!\n\nTwo.\n\nThree.\n"), doc("# T\n\nOne!\n\nTwo!\n\nThree.\n"));
    const grouped = diffsByTurn("a.md", [...one, ...two]);

    expect(grouped.map((entry) => entry.turn)).toEqual(["turn-1", "turn-2"]);
    expect(grouped[1]?.diff).toContain("-Two.\n+Two!");
  });

  test("should give only the file header when a turn has no change", () => {
    expect(turnDiff("a.md", [])).toBe("--- a/a.md\n+++ b/a.md");
  });
});

describe("discarding a change", () => {
  test("should put the text before the turn back when the block still holds what the turn wrote", () => {
    const after = "# T\n\nOne, edited.\n\nTwo.\n\nThree.\n";
    const [change] = recordChanges("t", doc(BEFORE), doc(after));
    const result = change === undefined ? null : discardChange(change, after);

    expect(result).toEqual({ ok: true, source: BEFORE });
  });

  test("should restore a removed block and remove an inserted one", () => {
    const removedSource = "# T\n\nOne.\n\nThree.\n";
    const [removed] = recordChanges("t", doc(BEFORE), doc(removedSource));
    const insertedSource = "# T\n\nOne.\n\nNew.\n\nTwo.\n\nThree.\n";
    const [inserted] = recordChanges("t", doc(BEFORE), doc(insertedSource));

    expect(removed === undefined ? null : discardChange(removed, removedSource)).toEqual({ ok: true, source: BEFORE });
    expect(inserted === undefined ? null : discardChange(inserted, insertedSource)).toEqual({ ok: true, source: BEFORE });
  });

  test("should refuse the discard and say the block changed again when its text no longer matches the turn's", () => {
    const after = "# T\n\nOne, edited.\n\nTwo.\n\nThree.\n";
    const [change] = recordChanges("t", doc(BEFORE), doc(after));
    const again = after.replace("One, edited.", "One, edited twice.");

    expect(change === undefined ? null : discardChange(change, again)).toEqual({
      ok: false,
      reason: "lines 3-3 changed again since the turn; nothing was discarded",
    });
  });

  test("should refuse the discard when the file is now shorter than the change's lines", () => {
    const change = { turn: "t", blockIds: ["h:9"], before: "x", after: "y", start: 40, end: 41 };

    expect(discardChange(change, "short\n").ok).toBe(false);
  });
});
