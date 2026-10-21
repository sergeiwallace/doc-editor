import { describe, expect, test } from "claude-code/testing";

import { parseBlocks } from "./blocks.ts";
import { currentHit, findHits, hitLabel, startFind, stepFind } from "./find.ts";
import { fixtureDoc } from "./fixture-docs.ts";

// Parsed once at load: a test's own time limit is 5 seconds.
const big = parseBlocks(fixtureDoc(20_000)).blocks;
const blocks = parseBlocks("# Alpha\n\nbeta GAMMA\n\nnothing\n\ngamma ray <!-- secret -->\n\n- [x] Gamma item\n").blocks;

describe("find", () => {
  test("should focus the next block containing the query, ignoring case, and count the hits", () => {
    const state = startFind(blocks, "gamma", null);

    expect(state.hits).toEqual(["h1:1", "h1:3", "h1:4"]);
    expect(currentHit(state)).toBe("h1:1");
    expect(hitLabel(state)).toBe("1 of 3");
  });

  test("should start after the focused block and wrap past the last hit", () => {
    expect(currentHit(startFind(blocks, "gamma", "h1:3"))).toBe("h1:4");
    expect(currentHit(startFind(blocks, "gamma", "h1:4"))).toBe("h1:1");
  });

  test("should go to the next hit on Enter and the previous hit on b, wrapping at both ends", () => {
    const first = startFind(blocks, "gamma", null);
    const second = stepFind(first, 1);

    expect(currentHit(second)).toBe("h1:3");
    expect(currentHit(stepFind(first, -1))).toBe("h1:4");
    expect(currentHit(stepFind(stepFind(second, 1), 1))).toBe("h1:1");
  });

  test("should search the drawn text, so a hidden HTML comment is not a hit", () => {
    expect(findHits(blocks, "secret")).toEqual([]);
  });

  test("should give no hit and say so when the query is blank or matches nothing", () => {
    const none = startFind(blocks, "zebra", null);

    expect(none).toEqual({ query: "zebra", hits: [], at: -1 });
    expect(currentHit(none)).toBeNull();
    expect(hitLabel(none)).toBe("no match");
    expect(stepFind(none, 1).at).toBe(-1);
    expect(findHits(blocks, "   ")).toEqual([]);
  });

  test("should find every chapter heading of the 20,000-line fixture", () => {
    const chapters = big.filter((block) => block.kind === "heading" && block.text.startsWith("# Chapter ")).length;

    expect(startFind(big, "# chapter ", null).hits.length).toBe(chapters);
    expect(chapters).toBeGreaterThan(300);
  });
});
