import { describe, expect, test } from "claude-code/testing";

import { fixtureDoc, LINKED_FILE, linkedDoc } from "../core/fixture-docs.ts";
import { keyButton } from "./hints.ts";
import { CARD_CONTINUES, OUTLINE_HINT } from "./pane.ts";
import { CWD, focusedKey, frameRows, header, type MountedPane, openDoc, PANE_PROPS, pieceKeys, scrollPane } from "./tests/pane-world.ts";

// What the pane draws fits its rows (T-1.4's and T-1.7's "keep the focused block in view"), counted
// from the drawn tree by the kit-side layout model, not by the pane's own estimate.

const DOC = `${CWD}/doc.md`;
const files = (text: string) => ({ files: { [DOC]: text, [`${CWD}/${LINKED_FILE}`]: linkedDoc() } });

describe("the page fits the pane", () => {
  test("should keep the hint row and the focused block inside the pane's rows while a table drawn as cards is in view", async ($, on) => {
    const { ui } = await openDoc($, on, files(fixtureDoc(200)), "doc.md#quotes-1");
    let sawCards = false;
    const misfits: unknown[] = [];
    for (let step = 0; step < 12; step++) {
      sawCards ||= (await ui.find({ key: "h1.1.1.1.1:1~r1" })) !== undefined;
      const focus = await focusedKey(ui);
      const rows = await frameRows(ui, PANE_PROPS.bodyColumns);
      const keys = await pieceKeys(ui);
      const hasHints = (await ui.find({ key: keyButton("q") })) !== undefined;
      if (rows > PANE_PROPS.scroll.bodyRows || focus === undefined || !keys.includes(focus) || !hasHints) {
        misfits.push({ step, rows, focus, keys, hasHints });
      }
      await scrollPane($, 1);
    }

    expect(misfits).toEqual([]);
    expect(sawCards).toBe(true);
  });
});

/** The outline entry drawn with the cursor mark, `›`. */
async function cursorEntry(ui: MountedPane): Promise<string | undefined> {
  const entries = (await ui.findAll({ type: "Button" })).filter((node) => (node.key ?? "").startsWith("outline:"));
  return entries.find((node) => node.text.startsWith("› "))?.key;
}

describe("the outline with keys alone", () => {
  test("should move the cursor entry by entry on Down through an outline longer than the pane, keep it in view and jump on Enter", async ($, on) => {
    const { ui } = await openDoc($, on, files(fixtureDoc(1000)), "doc.md");
    await ui.press({ key: keyButton("o") });
    const drawn = (await ui.findAll({ type: "Button" })).filter((node) => (node.key ?? "").startsWith("outline:"));
    expect(drawn.length).toBeLessThan(86);
    expect((await ui.find({ key: "hints" }))?.text).toContain(OUTLINE_HINT);
    const visited = [await cursorEntry(ui)];
    const misfits: unknown[] = [];

    for (let step = 1; step <= 100; step++) {
      await scrollPane($, 1);
      const cursor = await cursorEntry(ui);
      const rows = await frameRows(ui, PANE_PROPS.bodyColumns);
      if (cursor === undefined || rows > PANE_PROPS.scroll.bodyRows) misfits.push({ step, cursor, rows });
      if (cursor !== visited.at(-1)) visited.push(cursor);
    }

    expect(misfits).toEqual([]);
    expect(visited).toHaveLength(86);
    const last = visited.at(-1) ?? "";
    await scrollPane($, -1);
    expect(await cursorEntry(ui)).toBe(visited.at(-2));
    await scrollPane($, 1);
    expect(await cursorEntry(ui)).toBe(last);

    await ui.press({ key: last });
    expect((await header(ui)).title).toBe("doc.md › Closing");
  });
});

// The engine sums arrows that arrive together into one ui.scroll: a `by` of 5 is five Downs, not
// a page key, which moves the window's rows.
describe("summed arrow keys", () => {
  test("should move five outline entries on a summed scroll of 5, as five Downs do", async ($, on) => {
    const { ui } = await openDoc($, on, files(fixtureDoc(1000)), "doc.md");
    await ui.press({ key: keyButton("o") });
    for (let k = 0; k < 5; k++) await scrollPane($, 1);
    const stepped = await cursorEntry(ui);
    await ui.press({ key: keyButton("o") });
    await ui.press({ key: keyButton("o") });

    await scrollPane($, 5);

    expect(await cursorEntry(ui)).toBe(stepped);
    expect(stepped).not.toBe(undefined);
  });

  test("should move the focus five blocks on a summed scroll of 5, as five Downs do", async ($, on) => {
    const { ui } = await openDoc($, on, files(fixtureDoc(200)), "doc.md");
    const start = await focusedKey(ui);
    for (let k = 0; k < 5; k++) await scrollPane($, 1);
    const stepped = await focusedKey(ui);
    await ui.press({ key: keyButton("t") });
    expect(await focusedKey(ui)).toBe(start);

    await scrollPane($, 5);

    expect(await focusedKey(ui)).toBe(stepped);
    expect(stepped).not.toBe(start);
  });
});

// The live re-check's two pages that lost hint rows: the opening page, whose last piece is the long
// quote cut to the rows left, and a page that ends on a table too wide for the pane.
describe("the hint row on a page that ends on a cut piece", () => {
  for (const [columns, rows] of [
    [160, 50],
    [100, 40],
    [76, 46],
  ] as const) {
    test(`should draw the opening page of the 1,000-line fixture with every hint row inside a ${columns} by ${rows} pane`, async ($, on) => {
      const props = { ...PANE_PROPS, bodyColumns: columns, scroll: { offset: 0, bodyRows: rows } };
      const { ui } = await openDoc($, on, files(fixtureDoc(1000)), "doc.md", props);
      const misfits: unknown[] = [];

      for (let step = 0; step < 8; step++) {
        const drawn = await frameRows(ui, columns);
        const hints = await ui.find({ key: "hints" });
        if (drawn > rows || hints === undefined) misfits.push({ step, drawn, keys: await pieceKeys(ui) });
        await scrollPane($, 1, rows);
      }

      expect(misfits).toEqual([]);
    });
  }

  for (const rows of [18, 22, 26, 30, 34, 38]) {
    test(`should draw a table too wide for a 76 by ${rows} pane as cards, never as a grid, when it is cut as the page's last piece`, async ($, on) => {
      const props = { ...PANE_PROPS, bodyColumns: 76, scroll: { offset: 0, bodyRows: rows } };
      const { ui } = await openDoc($, on, files(fixtureDoc(200)), "doc.md#code-1", props);
      const grids: unknown[] = [];
      for (let step = 0; step < 6; step++) {
        const grid = (await ui.findAll({ type: "Markdown" })).find((node) => node.text.startsWith("| Element"));
        const drawn = await frameRows(ui, 76);
        if (grid !== undefined || drawn > rows) grids.push({ step, grid: grid?.key, drawn });
        await scrollPane($, 1, rows);
      }

      expect(grids).toEqual([]);
    });
  }
});

// One table row drawn as a card taller than the pane: the card is cut to the rows left with a
// continuation marker and goes on as the pane scrolls.
describe("a table card taller than the pane", () => {
  const COLUMNS = 30;
  const header = Array.from({ length: COLUMNS }, (_, k) => `Column ${k + 1}`);
  const values = Array.from({ length: COLUMNS }, (_, k) => `value-${k + 1}`);
  const text = [
    "# Wide",
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    `| ${values.join(" | ")} |`,
    "",
    "## After",
    "",
    "The end.",
    "",
  ].join("\n");

  test("should keep every hint row and the focused block inside a 76 by 18 pane and reach the rest of the card by scrolling", async ($, on) => {
    const props = { ...PANE_PROPS, bodyColumns: 76, scroll: { offset: 0, bodyRows: 18 } };
    const { ui } = await openDoc($, on, files(text), "doc.md", props);
    const seen = new Set<string>();
    const misfits: unknown[] = [];
    let sawMarker = false;

    for (let step = 0; step < 60; step++) {
      const drawn = await frameRows(ui, 76);
      const focus = await focusedKey(ui);
      const keys = await pieceKeys(ui);
      if (drawn > 18 || (await ui.find({ key: "hints" })) === undefined || focus === undefined || !keys.includes(focus)) {
        misfits.push({ step, drawn, focus, keys });
      }
      for (const node of await ui.findAll({ type: "Markdown" })) {
        for (const value of node.text.match(/value-\d+/g) ?? []) seen.add(value);
      }
      sawMarker ||= (await ui.find({ type: "Text", text: CARD_CONTINUES })) !== undefined;
      if (keys.includes("h1.1")) break;
      await scrollPane($, 1, 18);
    }

    expect(misfits).toEqual([]);
    expect(sawMarker).toBe(true);
    expect([...values].filter((value) => !seen.has(value))).toEqual([]);
    expect(await pieceKeys(ui)).toContain("h1.1");
  });
});

// The live check of the tall-card fix: a card cut and scrolled, whose last rows were then drawn
// whole, ran one row past the pane. Walk the 1,000-line fixture's last tables frame by frame.
describe("a cut table card scrolled to its end", () => {
  for (const [columns, rows] of [
    [100, 40],
    [98, 11],
    [98, 12],
    [98, 14],
  ] as const) {
    test(`should keep every hint row inside a ${columns} by ${rows} pane on every frame through a card-drawn table`, async ($, on) => {
      const props = { ...PANE_PROPS, bodyColumns: columns, scroll: { offset: 0, bodyRows: rows } };
      const { ui } = await openDoc($, on, files(fixtureDoc(1000)), "doc.md#table-14", props);
      const misfits: unknown[] = [];

      for (let frame = 0; frame < 40; frame++) {
        const drawn = await frameRows(ui, columns);
        if (drawn > rows || (await ui.find({ key: "hints" })) === undefined) {
          misfits.push({ frame, drawn, keys: await pieceKeys(ui) });
        }
        await scrollPane($, 1, rows);
      }

      expect(misfits).toEqual([]);
    });
  }
});

// The live walk at 100 by 40 through Table 14 drew the same frame for three Downs in a row: every
// Down must change what is on screen while content remains below.
describe("every Down moves the screen", () => {
  for (const [columns, rows] of [
    [100, 40],
    [98, 11],
    [98, 12],
    [98, 14],
  ] as const) {
    test(`should change the drawn tree on every Down through a card-drawn table in a ${columns} by ${rows} pane`, async ($, on) => {
      const props = { ...PANE_PROPS, bodyColumns: columns, scroll: { offset: 0, bodyRows: rows } };
      const { ui } = await openDoc($, on, files(fixtureDoc(1000)), "doc.md#table-14", props);
      const stalls: unknown[] = [];
      let last = JSON.stringify(await ui.drawn());

      for (let frame = 1; frame <= 30; frame++) {
        await scrollPane($, 1, rows);
        const now = JSON.stringify(await ui.drawn());
        if (now === last) stalls.push({ frame, keys: await pieceKeys(ui), focus: await focusedKey(ui) });
        last = now;
        if ((await header(ui)).title.endsWith("› Closing")) break;
      }

      expect(stalls).toEqual([]);
      expect((await header(ui)).title.endsWith("› Closing")).toBe(true);
    });
  }
});
