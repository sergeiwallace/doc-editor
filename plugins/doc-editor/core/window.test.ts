import { describe, expect, test } from "claude-code/testing";

import type { Block, ViewState } from "./types.ts";
import { parseBlocks } from "./blocks.ts";
import { fixtureDoc } from "./fixture-docs.ts";
import { outline, toggleFoldAll } from "./outline.ts";
import {
  ELEMENT_LIMIT,
  PAGE_BUDGET,
  TREE_LIMIT,
  blockPieces,
  maxOffset,
  pageAt,
  paragraphs,
  pieceIndex,
  renderView,
  revealOffset,
  rowsOf,
  scrollOffset,
  sliceText,
  viewPieces,
} from "./window.ts";
import type { Piece } from "./window.ts";

const big = parseBlocks(fixtureDoc(20_000)).blocks;
const SIZES = [
  { bodyRows: 50, bodyColumns: 120 },
  { bodyRows: 200, bodyColumns: 40 },
];
// Header and hint rows a pane draws around the body: generous next to the two rows they are.
const CHROME = 2_000;

const view = (patch: Partial<ViewState> = {}): ViewState => ({
  path: "a.md",
  offset: 0,
  focus: null,
  folded: [],
  drill: null,
  find: null,
  mode: "read",
  history: [],
  ...patch,
});

const block = (patch: Partial<Block>): Block => ({ id: "h:1", kind: "paragraph", text: "", start: 1, end: 1, ...patch });
const words = (n: number, seed: string) => Array.from({ length: n }, (_, k) => `${seed}${k}`).join(" ");

function everyPage(pieces: readonly Piece[], size: { bodyRows: number; bodyColumns: number }) {
  let largest = 0;
  let budget = 0;
  let longest = 0;
  for (let offset = 0; offset < pieces.length; offset++) {
    const page = pageAt(pieces, offset, size);
    largest = Math.max(largest, JSON.stringify(page.pieces).length);
    budget = Math.max(budget, page.size);
    for (const piece of page.pieces) longest = Math.max(longest, piece.text.length);
  }
  return { largest, budget, longest };
}

describe("the 20,000-line document", () => {
  test("should emit every render under 100,000 serialized characters with no element over 9,000", { timeoutMs: 30_000 }, () => {
    for (const size of SIZES) {
      for (const folded of [[], toggleFoldAll(big, [])]) {
        const pieces = viewPieces(big, { folded, drill: null }, size.bodyColumns);
        const { largest, budget, longest } = everyPage(pieces, size);

        expect(largest + CHROME).toBeLessThan(TREE_LIMIT);
        expect(budget).toBeLessThanOrEqual(PAGE_BUDGET);
        expect(longest).toBeLessThanOrEqual(ELEMENT_LIMIT);
      }
    }
  });

  test("should stop a page at the budget when the body has more rows than the budget can fill", () => {
    const size = { bodyRows: 20_000, bodyColumns: 200 };
    const pieces = viewPieces(big, view(), size.bodyColumns);
    for (let offset = 0; offset < pieces.length; offset += 97) {
      const page = pageAt(pieces, offset, size);

      expect(JSON.stringify(page.pieces).length + CHROME).toBeLessThan(TREE_LIMIT);
      expect(page.size).toBeLessThanOrEqual(PAGE_BUDGET);
    }
  });

  test("should draw every visible block in order across the pages from top to bottom", () => {
    const size = { bodyRows: 50, bodyColumns: 120 };
    const pieces = viewPieces(big, view(), size.bodyColumns);
    const seen: string[] = [];
    const keys = new Set<string>();
    let offset = 0;
    for (;;) {
      const page = pageAt(pieces, offset, size);
      for (const piece of page.pieces) {
        if (!keys.has(piece.key)) seen.push(piece.key);
        keys.add(piece.key);
      }
      if (page.atEnd) break;
      offset = page.offset + page.pieces.length;
    }
    expect(seen.length).toBe(pieces.length);
    expect(seen.join("\n") === pieces.map((piece) => piece.key).join("\n")).toBe(true);
  });

  test("should start a render at the view's offset and fill the body rows", () => {
    const size = { bodyRows: 50, bodyColumns: 120 };
    const page = renderView(big, view({ offset: 300 }), size);

    expect(page.offset).toBe(300);
    expect(page.pieces.reduce((rows, piece) => rows + piece.rows, 0)).toBeGreaterThanOrEqual(size.bodyRows);
    expect(page.total).toBe(viewPieces(big, view(), 120).length);
  });
});

describe("splitting a long block", () => {
  test("should split a block over 9,000 characters at its paragraph boundaries into keyed pieces in order", () => {
    const paras = Array.from({ length: 6 }, (_, k) => `> ${words(300, `q${k}w`)}`);
    const quote = block({ id: "h1:2", kind: "quote", text: paras.join("\n>\n") });
    const pieces = blockPieces(quote, 120);

    expect(quote.text.length).toBeGreaterThan(ELEMENT_LIMIT);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.map((piece) => piece.key)).toEqual(pieces.map((_, k) => `h1:2~p${k + 1}`));
    expect(pieces.every((piece) => piece.type === "markdown" && piece.text.length <= ELEMENT_LIMIT)).toBe(true);
    expect(pieces.flatMap((piece) => piece.text.split("\n\n"))).toEqual(paras);
  });

  test("should split the 20,000-line fixture's long quote into Markdown pieces, not Code slices", () => {
    const quote = big.find((b) => b.kind === "quote" && b.text.length > ELEMENT_LIMIT);
    const pieces = quote === undefined ? [] : blockPieces(quote, 120);

    expect(pieces.map((piece) => piece.type)).toEqual(["markdown", "markdown"]);
  });

  test("should split a quote at its blank quote lines when the lines end in CRLF", () => {
    expect(paragraphs("> a\r\n>\r\n> b\r\n", true)).toHaveLength(2);
  });

  test("should keep a fence inside a long list whole when splitting at blank lines", () => {
    const fence = ["  ```", "  a", "", "  b", "  ```"].join("\n");
    const text = [`- ${words(900, "a")}`, fence, "", `- ${words(900, "b")}`].join("\n");
    const parts = paragraphs(text);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("  a\n\n  b");
  });
});

describe("an indivisible block over 9,000 characters", () => {
  test("should draw a long fence as consecutive Code slices of at most 9,000 characters, each with a continuation marker", () => {
    const fence = big.find((b) => b.kind === "fence" && b.text.length > ELEMENT_LIMIT);
    const pieces = fence === undefined ? [] : blockPieces(fence, 120);

    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.map((piece) => (piece.type === "code" ? piece.marker : null))).toEqual(
      pieces.map((_, k) => `part ${k + 1} of ${pieces.length}`),
    );
    expect(pieces.every((piece) => piece.type === "code" && piece.format === "text" && piece.text.length <= ELEMENT_LIMIT)).toBe(true);
    expect(pieces.map((piece) => piece.text).join("")).toBe(fence?.drawn);
  });

  test("should draw a long table and a long single paragraph as Code slices in order", () => {
    const row = `| ${words(20, "c")} | x |`;
    const table = block({ id: "h:2", kind: "table", text: ["| a | b |", "| - | - |", ...Array.from({ length: 160 }, () => row)].join("\n") });
    const paragraph = block({ id: "h:3", text: words(2500, "p") });

    for (const long of [table, paragraph]) {
      const pieces = blockPieces(long, 100);
      expect(long.text.length).toBeGreaterThan(ELEMENT_LIMIT);
      expect(pieces.length).toBeGreaterThan(1);
      expect(pieces.every((piece) => piece.type === "code" && piece.marker !== null)).toBe(true);
      expect(pieces.map((piece) => piece.text).join("")).toBe(long.text);
      expect(pieces.map((piece) => piece.key)).toEqual(pieces.map((_, k) => `${long.id}~c${k + 1}`));
    }
  });

  test("should draw a fence under 9,000 characters as one Code element with no marker", () => {
    const pieces = blockPieces(block({ kind: "fence", text: "```js\nx\n```", drawn: "x" }), 80);

    expect(pieces).toEqual([{ type: "code", key: "h:1", blockId: "h:1", text: "x", format: "js", marker: null, rows: 2 }]);
  });

  test("should never cut a surrogate pair when a slice has no line end to cut at", () => {
    const slices = sliceText(`${"a".repeat(8_999)}😀${"b".repeat(10)}`);

    expect(slices.map((slice) => slice.length)).toEqual([8_999, 12]);
  });
});

describe("drawn kinds", () => {
  test("should draw a callout as its own piece with its label, and a block with empty drawn text as nothing", () => {
    expect(blockPieces(block({ kind: "callout", text: "> [!TIP]\n> body", drawn: "body" }), 80)).toMatchObject([
      { type: "callout", label: "TIP", text: "body" },
    ]);
    expect(blockPieces(block({ kind: "html", text: "<!-- c -->", drawn: "" }), 80)).toEqual([]);
  });

  test("should estimate rows by wrapping each line at the pane width", () => {
    expect(rowsOf("a".repeat(250), 100)).toBe(3);
    expect(rowsOf("a\n\nb", 100)).toBe(3);
    expect(rowsOf("x", 0)).toBe(1);
  });
});

describe("scrolling", () => {
  const size = { bodyRows: 50, bodyColumns: 120 };
  const pieces = viewPieces(big, view(), size.bodyColumns);

  test("should move the offset forward by whole pieces for a ui.scroll down and back for a scroll up", () => {
    const down = scrollOffset(pieces, 100, size.bodyRows, size);
    const rows = pieces.slice(100, down).reduce((sum, piece) => sum + piece.rows, 0);

    expect(down).toBeGreaterThan(100);
    expect(rows).toBeGreaterThanOrEqual(size.bodyRows);
    expect(scrollOffset(pieces, 100, 1, size)).toBe(101);
    expect(scrollOffset(pieces, 100, -1, size)).toBe(99);
    expect(scrollOffset(pieces, 100, 0, size)).toBe(100);
  });

  test("should clamp a scroll above the top or past the last full page", () => {
    const last = maxOffset(pieces, size.bodyRows);

    expect(scrollOffset(pieces, 0, -10, size)).toBe(0);
    expect(scrollOffset(pieces, last, 10_000, size)).toBe(last);
    expect(scrollOffset(pieces, 1e9, 1, size)).toBe(last);
    expect(pageAt(pieces, last, size).atEnd).toBe(true);
    expect(pageAt([], 5, size)).toEqual({ pieces: [], offset: 0, total: 0, size: 0, atEnd: true });
  });

  test("should bring a focused block into view and leave the offset when it already shows", () => {
    const entries = outline(big);
    const target = entries[500]?.id ?? "";
    const at = revealOffset(pieces, 0, target, size);
    const page = pageAt(pieces, at, size);

    expect(page.pieces.map((piece) => piece.blockId)).toContain(target);
    expect(revealOffset(pieces, at, target, size)).toBe(at);
    expect(revealOffset(pieces, pieceIndex(pieces, target) + 40, target, size)).toBe(pieceIndex(pieces, target));
  });

  test("should leave the offset when the focused block is not drawn", () => {
    expect(pieceIndex(pieces, "nope")).toBe(-1);
    expect(revealOffset(pieces, 12, "nope", size)).toBe(12);
  });
});
