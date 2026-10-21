import { describe, expect, test } from "claude-code/testing";

import { parseBlocks } from "./blocks.ts";
import { chapterTitle, fixtureDoc } from "./fixture-docs.ts";
import {
  drillUp,
  headingPath,
  headingSlugs,
  hiddenCount,
  locate,
  outline,
  owningHeading,
  sectionOf,
  slug,
  toggleFold,
  toggleFoldAll,
  visibleBlocks,
} from "./outline.ts";

const SOURCE = ["# A", "", "a1", "", "## B", "", "b1", "", "### C", "", "c1", "", "## D", "", "d1", "", "# E", "", "e1", ""].join("\n");
const blocks = parseBlocks(SOURCE).blocks;
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);
const big = parseBlocks(fixtureDoc(20_000)).blocks;

describe("outline", () => {
  test("should list every heading with its level and plain title when the user opens the outline", () => {
    expect(outline(blocks)).toEqual([
      { id: "h1", level: 1, title: "A" },
      { id: "h1.1", level: 2, title: "B" },
      { id: "h1.1.1", level: 3, title: "C" },
      { id: "h1.2", level: 2, title: "D" },
      { id: "h2", level: 1, title: "E" },
    ]);
  });

  test("should list the 20,000-line fixture's headings at all six levels", () => {
    const entries = outline(big);

    expect(entries.length).toBeGreaterThan(2000);
    expect(new Set(entries.map((entry) => entry.level))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(entries[1]).toEqual({ id: "h2", level: 1, title: chapterTitle(1) });
  });

  test("should give an empty outline when there is no heading", () => {
    expect(outline(parseBlocks("text\n\nmore\n").blocks)).toEqual([]);
  });
});

describe("locate", () => {
  test("should focus the heading an outline entry or a #heading names", () => {
    expect(locate(big, { heading: chapterTitle(7) })).toBe(outline(big).find((e) => e.title === chapterTitle(7))?.id);
    expect(locate(blocks, { heading: "d" })).toBe("h1.2");
  });

  test("should focus the block that holds line N, or the next block when line N is blank", () => {
    expect(locate(blocks, { line: 7 })).toBe("h1.1:1");
    expect(locate(blocks, { line: 8 })).toBe("h1.1.1");
  });

  test("should find no block when the line is before line 1 or past the last block, or the heading is unknown", () => {
    expect(locate(blocks, { line: 0 })).toBeNull();
    expect(locate(blocks, { line: 999 })).toBeNull();
    expect(locate(blocks, { heading: "nowhere" })).toBeNull();
  });
});

describe("slugs", () => {
  test("should make GitHub anchors with numbered repeats", () => {
    expect(slug("Chapter 1: Topic, `code` & more!")).toBe("chapter-1-topic-code--more");
    expect(headingSlugs([{ id: "a", level: 1, title: "X" }, { id: "b", level: 1, title: "X" }])).toEqual(["x", "x-1"]);
  });
});

describe("sections and heading paths", () => {
  test("should give a heading's section up to the next heading of its level or higher", () => {
    expect(sectionOf(blocks, "h1.1")).toEqual({ from: 2, to: 6 });
    expect(sectionOf(blocks, "h1")).toEqual({ from: 0, to: 8 });
  });

  test("should give no section for a block that is not a heading or an unknown id", () => {
    expect(sectionOf(blocks, "h1:1")).toBeNull();
    expect(sectionOf(blocks, "nope")).toBeNull();
  });

  test("should give the heading path of a block, outermost first", () => {
    expect(headingPath(blocks, "h1.1.1:1").map((entry) => entry.title)).toEqual(["A", "B", "C"]);
    expect(headingPath(blocks, "h1.2")).toEqual([
      { id: "h1", level: 1, title: "A" },
      { id: "h1.2", level: 2, title: "D" },
    ]);
    expect(headingPath(blocks, "nope")).toEqual([]);
  });

  test("should give the owning heading of a block and none before the first heading", () => {
    expect(owningHeading(blocks, "h1.1:1")).toBe("h1.1");
    expect(owningHeading(parseBlocks("intro\n\n# H\n").blocks, "h:1")).toBeNull();
  });
});

describe("folding", () => {
  test("should hide a heading's section when z folds it and show it again when z is pressed again", () => {
    const folded = toggleFold(blocks, [], "h1.1");

    expect(ids(visibleBlocks(blocks, folded, null))).toEqual(["h1", "h1:1", "h1.1", "h1.2", "h1.2:1", "h2", "h2:1"]);
    expect(hiddenCount(blocks, "h1.1")).toBe(3);
    const open = toggleFold(blocks, folded, "h1.1");
    expect(ids(visibleBlocks(blocks, open, null))).toEqual(ids(blocks));
  });

  test("should fold every heading when a is pressed and unfold every heading when a is pressed again", () => {
    const all = toggleFoldAll(blocks, []);

    expect(ids(visibleBlocks(blocks, all, null))).toEqual(["h1", "h2"]);
    expect(toggleFoldAll(blocks, all)).toEqual([]);
  });

  test("should ignore z on a block that is not a heading", () => {
    expect(toggleFold(blocks, ["h1"], "h1:1")).toEqual(["h1"]);
  });
});

describe("drill-in", () => {
  test("should draw only the drilled-in section and give its heading path; up returns to the whole document", () => {
    expect(ids(visibleBlocks(blocks, [], "h1.1"))).toEqual(["h1.1", "h1.1:1", "h1.1.1", "h1.1.1:1"]);
    expect(drillUp(blocks, "h1.1.1")).toBe("h1.1");
    expect(drillUp(blocks, "h1")).toBeNull();
    expect(drillUp(blocks, null)).toBeNull();
  });

  test("should draw the whole document when the drill names no heading", () => {
    expect(ids(visibleBlocks(blocks, [], "h1:1"))).toEqual(ids(blocks));
  });
});
