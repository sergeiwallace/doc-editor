import { describe, expect, test } from "claude-code/testing";

import { fixtureDoc, LINKED_FILE, linkedDoc } from "../core/fixture-docs.ts";
import { keyButton } from "./hints.ts";
import { CWD, focusedKey, frameRows, openDoc, PANE_PROPS, pieceKeys, scrollPane } from "./tests/pane-world.ts";

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
