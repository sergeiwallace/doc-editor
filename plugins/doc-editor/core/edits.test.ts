import { describe, expect, test } from "claude-code/testing";

import { parseBlocks } from "./blocks.ts";
import { diffPages, editableLines, firstWords, lineAt, replaceLine, requestText, taskLines, toggleTask } from "./edits.ts";

// The edits the pane makes or asks for, through the core's exports (T-1.4's request text, T-1.6's
// line edits and checkbox toggles).

const SOURCE = [
  "# Title",
  "",
  "- First item",
  "  - Nested item",
  "- [ ] Open task",
  "- [x] Done task",
  "",
  "| A | B |",
  "| --- | --- |",
  "| one | two |",
  "",
  "A paragraph of words.",
  "",
].join("\n");
const blocks = parseBlocks(SOURCE).blocks;
const kind = (k: string) => blocks.find((block) => block.kind === k);

describe("edits", () => {
  test("should name the path, the line range, the instruction, the section and the first words in the request", () => {
    const text = requestText({
      path: "docs/notes.md",
      start: 12,
      end: 14,
      heading: "Architecture",
      firstWords: "The pane draws only",
      instruction: "make this two sentences",
    });

    expect(text).toBe(
      'Edit lines 12-14 of docs/notes.md: make this two sentences\nSection: Architecture\nThe block starts: "The pane draws only"',
    );
  });

  test("should say the block sits above the first heading when the request has no heading", () => {
    const text = requestText({ path: "a.md", start: 1, end: 1, heading: "", firstWords: "Hi", instruction: "go" });

    expect(text.split("\n")[1]).toBe("Section: (above the first heading)");
  });

  test("should quote the first eight words with an ellipsis when more follow, and all of a short text", () => {
    expect(firstWords("one  two\nthree four five six seven eight nine")).toBe("one two three four five six seven eight …");
    expect(firstWords("just three words")).toBe("just three words");
  });

  test("should give a heading its line, a list each item's first line and a table its rows less the delimiter", () => {
    expect(editableLines(kind("heading")!)).toEqual([1]);
    expect(editableLines(kind("list")!)).toEqual([3, 4, 5, 6]);
    expect(editableLines(kind("table")!)).toEqual([8, 10]);
  });

  test("should give a paragraph no editable line", () => {
    expect(editableLines(kind("paragraph")!)).toEqual([]);
  });

  test("should list the task items of a list by line and none of a list without tasks", () => {
    expect(taskLines(kind("list")!, SOURCE)).toEqual([5, 6]);
    const plain = parseBlocks("- a\n- b\n").blocks[0]!;
    expect(taskLines(plain, "- a\n- b\n")).toEqual([]);
  });

  test("should flip [ ] to [x] and [x] to [ ] and keep the rest of the line", () => {
    expect(toggleTask("- [ ] Open task")).toBe("- [x] Open task");
    expect(toggleTask("  1. [X] Done")).toBe("  1. [ ] Done");
  });

  test("should refuse to toggle a line that is no task item", () => {
    expect(toggleTask("- First item")).toBeNull();
    expect(toggleTask("[ ] not a list")).toBeNull();
  });

  test("should replace one line and keep its line ending and every other byte", () => {
    const crlf = "# A\r\nbody\r\n";
    const edited = replaceLine(crlf, 1, "# B");

    expect(edited).toEqual({ ok: true, source: "# B\r\nbody\r\n" });
    expect(lineAt(SOURCE, 5)).toBe("- [ ] Open task");
  });

  test("should refuse a replacement that holds a line break and name why", () => {
    const edited = replaceLine(SOURCE, 1, "# One\n# Two");

    expect(edited.ok).toBe(false);
    expect(edited.ok ? "" : edited.reason).toMatch(/^the field edits one line and the text holds a line break/);
  });

  test("should keep a short diff as one page of its own hunks without the file header", () => {
    const diff = "--- a/x.md\n+++ b/x.md\n@@ -3,1 +3,2 @@\n-old\n+new\n+more\n@@ -9,0 +10,1 @@\n+added";

    expect(diffPages(diff, 40, 9_000)).toEqual(["@@ -3,1 +3,2 @@\n-old\n+new\n+more\n@@ -9,0 +10,1 @@\n+added"]);
  });

  test("should cut a hunk taller than a page into slices that each carry their own header and line numbers", () => {
    const body = Array.from({ length: 6 }, (_, k) => ` same ${k + 1}`);
    const diff = ["@@ -10,7 +10,7 @@", ...body.slice(0, 3), "-gone", "+came", ...body.slice(3)].join("\n");
    const pages = diffPages(diff, 4, 9_000);

    expect(pages).toEqual([
      "@@ -10,3 +10,3 @@\n same 1\n same 2\n same 3",
      "@@ -13,2 +13,2 @@\n-gone\n+came\n same 4",
      "@@ -15,2 +15,2 @@\n same 5\n same 6",
    ]);
    for (const page of pages) expect(page.split("\n").length).toBeLessThanOrEqual(4);
  });

  test("should keep every page under the character limit and cut a line too long for any page", () => {
    const diff = `@@ -1,1 +1,1 @@\n-${"a".repeat(20_000)}\n+${"b".repeat(50)}`;
    const pages = diffPages(diff, 40, 9_000);

    for (const page of pages) expect(page.length).toBeLessThanOrEqual(9_000);
    expect(pages[0]).toMatch(/^@@ -1,1 \+0,0 @@\n-a+…$/);
    expect(pages[1]).toBe(`@@ -1,0 +1,1 @@\n+${"b".repeat(50)}`);
  });

  test("should give no page for a diff with no hunk", () => {
    expect(diffPages("--- a/x.md\n+++ b/x.md", 40, 9_000)).toEqual([]);
  });

  test("should refuse a replacement past the last line", () => {
    expect(replaceLine("# A\n", 9, "x")).toEqual({ ok: false, reason: "line 9 is not in the file; nothing was saved" });
    expect(lineAt("# A\n", 9)).toBeNull();
  });
});
