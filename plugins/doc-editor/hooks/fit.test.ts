import { describe, expect, test } from "claude-code/testing";

import { fixtureDoc, LINKED_FILE, linkedDoc } from "../core/fixture-docs.ts";
import { keyButton } from "./hints.ts";
import { OUTLINE_HINT } from "./pane.ts";
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
