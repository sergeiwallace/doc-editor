import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { describe, expect, test } from "claude-code/testing";

import { LINKED_FILE, linkedDoc } from "../core/fixture-docs.ts";
import { keyButton } from "./hints.ts";
import { ASK_INPUT, CHANGE_ACTIONS, EDIT_INPUT, lineButton, taskButton } from "./pane.ts";
import { CWD, elementsOf, endTurn, focusedKey, header, openDoc, PANE_PROPS, pieceKeys, START_MS, startTurn } from "./tests/pane-world.ts";

// The editing half of the pane through the mod's own hooks (T-1.4 to T-1.6, and FR-3's next and
// previous heading): the c, e, n, p, v, k, x, r, j and h keys, the fields, the turn hooks and the
// safe-write path, under the test kit.

const DOC = `${CWD}/notes.md`;
const TEXT = [
  "# Notes",
  "",
  "The pane draws only the rows in view. A document is cut into blocks.",
  "",
  "## Tasks",
  "",
  "- [ ] Open task",
  "- [x] Done task, see [the linked doc](linked-doc.md)",
  "",
  "* First item",
  "* Second item",
  "",
  "| A | B |",
  "| --- | --- |",
  "| one | two |",
  "",
  "## Later",
  "",
  "Second paragraph here.",
  "",
].join("\n");
const files = (text = TEXT, state?: Record<string, unknown>) => ({
  files: { [DOC]: text, [`${CWD}/${LINKED_FILE}`]: linkedDoc() },
  ...(state === undefined ? {} : { state }),
});
const TALL = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 60 } };

/** The text Claude's turn leaves: the first paragraph rewritten. */
const EDITED = TEXT.replace("A document is cut into blocks.", "A document is cut into blocks, as /diff cuts hunks.");
const REQUEST =
  'Edit lines 3-3 of notes.md: name the /diff mod\nSection: Notes\nThe block starts: "The pane draws only the rows in view. …"';

const open = ($: Engine, on: On, state?: Record<string, unknown>) => openDoc($, on, files(TEXT, state), "notes.md", TALL);

/** One row down: the person's Down arrow. */
const down = ($: Engine) =>
  $.ui.scroll({ component: "Pane", requestId: "doc", offset: 1, by: 1, bodyRows: 60, contentRows: 60, origin: { kind: "person" } });

describe("ask Claude to change a block (T-1.4)", () => {
  test("should submit the request as the person's own words naming the path, the lines, the heading, the first words and the instruction, and draw a waiting status under the block", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    expect(await focusedKey(ui)).toBe("h1:1");

    await ui.press({ key: keyButton("c") });
    expect((await header(ui)).status).toMatch(/^EDIT /);
    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });

    expect(w.submits).toEqual([{ text: REQUEST, asUser: true }]);
    expect((await ui.find({ key: "ask:h1:1" }))?.text).toBe("⏳ Claude is editing line 3 …");
    expect(w.statuses.at(-1)).toBe("asked Claude to edit line 3 of notes.md");
    expect((await header(ui)).status).toMatch(/^READ /);
  });

  test("should mark every block the file's change touched with the turn id once the turn started", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });
    await startTurn($, "turn-7", REQUEST);
    expect(w.statuses.at(-1)).toBe("Claude is editing line 3 of notes.md");

    w.edit(DOC, EDITED.replace("Second paragraph here.", "Second paragraph, edited."));
    await w.clock.advance(1_500);

    const kept = w.stateOf(DOC) as { turn: string; blockIds: string[] }[];
    expect(kept.map((change) => change.turn)).toEqual(["turn-7", "turn-7"]);
    expect(kept.flatMap((change) => change.blockIds)).toEqual(["h1:1", "h1.2:1"]);
  });

  test("should not mark a change made before the request's turn started", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });

    w.edit(DOC, EDITED);
    await w.clock.advance(1_500);

    expect(w.stateOf(DOC) ?? []).toEqual([]);
    expect(JSON.stringify(await ui.find({ key: "h1:1" }))).not.toContain("▌");
  });

  test("should redraw with a margin marker on each changed block and keep the focused block in view", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });
    await startTurn($, "turn-1", REQUEST);

    w.edit(DOC, EDITED.replace("Second paragraph here.", "Second paragraph, edited."));
    await w.clock.advance(1_500);

    const margin = async (key: string) => JSON.stringify((await ui.find({ key }))?.children?.[0] ?? "");
    expect(await focusedKey(ui)).toBe("h1:1");
    expect(await pieceKeys(ui)).toContain("h1:1");
    expect(await margin("h1:1")).toContain("›▌");
    expect(await margin("h1.2:1")).toContain(" ▌");
    expect(await margin("h1.1")).not.toContain("▌");
    expect((await header(ui)).status).toMatch(/2 changed by Claude$/);
  });

  test("should draw the keep, discard, refine and view-diff actions under the changed block when the turn's edit has landed", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });
    await startTurn($, "turn-1", REQUEST);
    w.edit(DOC, EDITED);
    await w.clock.advance(1_500);
    expect(await ui.find({ key: CHANGE_ACTIONS.keep })).toBeDefined();

    await endTurn($, "turn-1");
    await w.clock.settle();

    expect(await ui.find({ key: "ask:h1:1" })).toBeUndefined();
    const actions = await ui.find({ key: "actions:h1:1" });
    expect(actions?.text).toContain("✔ Updated");
    for (const key of Object.values(CHANGE_ACTIONS)) expect(await ui.find({ key })).toBeDefined();
    expect(w.statuses.at(-1)).toBe("Claude changed 1 block of notes.md: k keep, x discard, r refine, v view diff");
  });

  test("should say the turn ended with no change when Claude left the file as it was", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "anything" });
    await startTurn($, "turn-1", w.submits[0]?.text ?? "");

    await endTurn($, "turn-1");
    await w.clock.settle();

    expect(w.statuses.at(-1)).toBe("Claude's turn ended with no change to notes.md");
    expect(await ui.find({ key: CHANGE_ACTIONS.keep })).toBeUndefined();
  });

  test("should queue the request and say so in the status row while a turn runs, without holding the hook", async ($, on) => {
    const { w, ui } = await open($, on);
    await startTurn($, "user-turn", "what the person typed");
    w.hold();
    await down($);
    await ui.press({ key: keyButton("c") });

    await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });

    expect(w.submits).toHaveLength(1);
    expect(w.statuses.at(-1)).toBe("queued: Claude is busy; the request to edit line 3 of notes.md starts when the current turn ends");
    expect((await ui.find({ key: "ask:h1:1" }))?.text).toBe("⏳ queued until Claude's current turn ends: line 3");

    await endTurn($, "user-turn");
    w.release();
    await startTurn($, "turn-2", REQUEST);
    expect(w.statuses.at(-1)).toBe("Claude is editing line 3 of notes.md");
    expect((await ui.find({ key: "ask:h1:1" }))?.text).toBe("⏳ Claude is editing line 3 …");
  });

  test("should name the reason and draw no waiting status when the engine drops the request", async ($, on) => {
    const { w, ui } = await open($, on);
    w.dropSubmits("a Stop hook stands");
    await ui.press({ key: keyButton("c") });

    await ui.input({ key: ASK_INPUT, text: "anything" });
    await w.clock.settle();

    expect(w.statuses.at(-1)).toBe("the request to edit line 1 did not start: a Stop hook stands");
    expect(await ui.find({ key: "ask:h1" })).toBeUndefined();
  });

  test("should send nothing when the instruction is blank", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("c") });

    await ui.input({ key: ASK_INPUT, text: "   " });

    expect(w.submits).toEqual([]);
    expect(await ui.find({ key: ASK_INPUT })).toBeUndefined();
  });
});

/** Opens the file, asks for EDITED on the first paragraph and lands the turn. */
async function landed($: Engine, on: On) {
  const opened = await open($, on);
  const { w, ui } = opened;
  await down($);
  await ui.press({ key: keyButton("c") });
  await ui.input({ key: ASK_INPUT, text: "name the /diff mod" });
  await startTurn($, "turn-1", REQUEST);
  w.edit(DOC, EDITED);
  await endTurn($, "turn-1");
  await w.clock.settle();
  return opened;
}

describe("review changes (T-1.5)", () => {
  test("should draw the turn's unified diff in a Code element with format diff, grouped by turn, on v", async ($, on) => {
    const { w, ui } = await landed($, on);
    await ui.press({ key: keyButton("j") });
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "shorter heading" });
    await startTurn($, "turn-2", w.submits[1]?.text ?? "");
    w.edit(DOC, EDITED.replace("## Tasks", "## Things to do"));
    await endTurn($, "turn-2");
    await w.clock.settle();

    await ui.press({ key: keyButton("v") });
    const codes = elementsOf(await ui.drawn()).filter((node) => node.type === "Code");
    expect(await header(ui)).toEqual({
      title: "notes.md › Changes this session",
      status: "DIFF · turn 2 of 2 · 1 block · n/p turn · v back",
    });
    expect(codes).toHaveLength(1);
    expect(codes[0]?.props.format).toBe("diff");
    expect(codes[0]?.props.source).toBe("@@ -5,1 +5,1 @@\n-## Tasks\n+## Things to do");

    await ui.press({ key: keyButton("p") });
    const first = elementsOf(await ui.drawn()).find((node) => node.type === "Code");
    expect((await header(ui)).status).toMatch(/^DIFF · turn 1 of 2/);
    expect(first?.props.source).toBe(
      "@@ -3,1 +3,1 @@\n-The pane draws only the rows in view. A document is cut into blocks.\n+The pane draws only the rows in view. A document is cut into blocks, as /diff cuts hunks.",
    );

    await ui.press({ key: keyButton("v") });
    expect((await header(ui)).status).toMatch(/^READ /);
  });

  test("should say there is nothing to show on v when Claude changed nothing", async ($, on) => {
    const { w, ui } = await open($, on);

    await ui.press({ key: keyButton("v") });

    expect(w.statuses.at(-1)).toBe("Claude has changed nothing in this file this session");
    expect((await header(ui)).status).toMatch(/^READ /);
  });

  test("should focus the next and previous changed block on n and p", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);
    await ui.press({ key: keyButton("c") });
    await ui.input({ key: ASK_INPUT, text: "two edits" });
    await startTurn($, "turn-1", REQUEST.replace("name the /diff mod", "two edits"));
    w.edit(DOC, EDITED.replace("Second paragraph here.", "Second paragraph, edited."));
    await endTurn($, "turn-1");
    await w.clock.settle();
    expect(await focusedKey(ui)).toBe("h1:1");

    await ui.press({ key: keyButton("n") });
    expect(await focusedKey(ui)).toBe("h1.2:1");
    await ui.press({ key: keyButton("n") });
    expect(w.statuses.at(-1)).toBe("no change by Claude below this block");
    await ui.press({ key: keyButton("p") });
    expect(await focusedKey(ui)).toBe("h1:1");
  });

  test("should say no block carries a change on n when Claude changed nothing", async ($, on) => {
    const { w, ui } = await open($, on);

    await ui.press({ key: keyButton("n") });

    expect(w.statuses.at(-1)).toBe("no block carries a change by Claude");
  });

  test("should write the block's previous text back through the safe-write path and clear its marker on x", async ($, on) => {
    const { w, ui } = await landed($, on);

    await ui.press({ key: keyButton("x") });

    expect(w.saves).toHaveLength(1);
    expect(w.saves.at(-1)?.text).toBe(TEXT);
    expect(w.files.get(DOC)).toBe(TEXT);
    expect(JSON.stringify((await ui.find({ key: "h1:1" }))?.children?.[0])).not.toContain("▌");
    expect(await ui.find({ key: CHANGE_ACTIONS.keep })).toBeUndefined();
    expect(w.stateOf(DOC) ?? []).toEqual([]);
  });

  test("should refuse the discard and say the block changed again when its text no longer matches the turn's", async ($, on) => {
    const { w, ui } = await landed($, on);
    w.edit(DOC, EDITED.replace("as /diff cuts hunks.", "as /diff cuts hunks, edited by hand."));
    await w.clock.advance(1_500);

    await ui.press({ key: keyButton("x") });

    expect(w.statuses.at(-1)).toMatch(/^the block changed again since Claude's turn: lines 3-3 changed again since the turn; nothing was discarded$/);
    expect(w.saves).toEqual([]);
    expect(w.files.get(DOC)).toContain("edited by hand");
  });

  test("should name the reason and keep the marker when the save of a discard fails", async ($, on) => {
    // The file moves on disk after it was read, and the person dismisses the reload question.
    on("tool.call", { tool: "AskUserQuestion" }, () => ({ deny: "dismissed" }));
    const { w, ui } = await landed($, on);
    await w.clock.advance(1);
    w.edit(DOC, EDITED);

    await ui.press({ key: keyButton("x") });

    expect(w.saves).toEqual([]);
    expect(w.statuses.at(-1)).toBe("the save was cancelled; the file is unchanged");
    expect(await ui.find({ key: CHANGE_ACTIONS.keep })).toBeDefined();
  });

  test("should clear the marker and leave the file as it is on k", async ($, on) => {
    const { w, ui } = await landed($, on);

    await ui.press({ key: keyButton("k") });

    expect(w.saves).toEqual([]);
    expect(w.files.get(DOC)).toBe(EDITED);
    expect(await ui.find({ key: CHANGE_ACTIONS.keep })).toBeUndefined();
    expect(w.statuses.at(-1)).toBe("kept Claude's change");
  });

  test("should name the reason on k or x when the focused block has no change", async ($, on) => {
    const { w, ui } = await landed($, on);
    await ui.press({ key: keyButton("j") });

    await ui.press({ key: keyButton("x") });
    expect(w.statuses.at(-1)).toBe("x acts on a block Claude changed, and this block has no change");
    await ui.press({ key: keyButton("k") });
    expect(w.statuses.at(-1)).toBe("k acts on a block Claude changed, and this block has no change");
  });

  test("should open the ask field prefilled with the previous instruction on r", async ($, on) => {
    const { ui } = await landed($, on);

    await ui.press({ key: CHANGE_ACTIONS.refine });

    expect((await ui.find({ key: ASK_INPUT }))?.props.value).toBe("name the /diff mod");
  });

  test("should say there is nothing to refine on r before any instruction was given", async ($, on) => {
    const { w, ui } = await open($, on);

    await ui.press({ key: keyButton("r") });

    expect(w.statuses.at(-1)).toBe("r refines an instruction given to Claude, and none was given yet");
    expect(await ui.find({ key: ASK_INPUT })).toBeUndefined();
  });

  test("should mark again, from the session's state, the changes a reload of the mod kept and drop those whose lines moved on", async ($, on) => {
    const live = { turn: "turn-9", blockIds: ["stale"], before: "Second paragraph here.\n", after: "Second paragraph here.\n", start: 19, end: 19 };
    const gone = { turn: "turn-8", blockIds: ["h1:1"], before: "x\n", after: "not in the file\n", start: 3, end: 3 };
    const { w, ui } = await open($, on, { [DOC]: [live, gone] });
    expect(w.stateReads).toEqual([DOC]);
    await ui.press({ key: keyButton("j") });
    await ui.press({ key: keyButton("j") });
    await ui.press({ key: keyButton("j") });
    await down($);

    expect(JSON.stringify((await ui.find({ key: "h1.2:1" }))?.children?.[0])).toContain("▌");
    expect(JSON.stringify((await ui.find({ key: "h1:1" }))?.children?.[0])).not.toContain("▌");
  });
});

describe("edit in the pane (T-1.6)", () => {
  test("should open a single-line field with a heading's source on e and save it through the safe-write path on Enter", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("j") });

    await ui.press({ key: keyButton("e") });
    expect((await ui.find({ key: EDIT_INPUT }))?.props.value).toBe("## Tasks");
    expect((await header(ui)).status).toMatch(/^EDIT /);
    await ui.input({ key: EDIT_INPUT, text: "## To do" });

    expect(w.saves).toHaveLength(1);
    expect(w.saves[0]?.expected).toEqual([START_MS, new TextEncoder().encode(TEXT).length]);
    expect(w.files.get(DOC)).toBe(TEXT.replace("## Tasks", "## To do"));
    expect(w.statuses.at(-1)).toBe("saved line 5");
    expect(await ui.find({ key: EDIT_INPUT })).toBeUndefined();
    expect((await header(ui)).title).toBe("notes.md › Notes › To do");
  });

  test("should ask which line on e on a list and open the field with that item's source", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("j") });
    await down($);
    await down($);
    expect(await focusedKey(ui)).toBe("h1.1:2");

    await ui.press({ key: keyButton("e") });
    expect((await ui.find({ key: lineButton(10) }))?.text).toBe("* First item");
    await ui.press({ key: lineButton(11) });
    expect((await ui.find({ key: EDIT_INPUT }))?.props.value).toBe("* Second item");
    await ui.input({ key: EDIT_INPUT, text: "* Second item, renamed" });

    expect(w.files.get(DOC)).toBe(TEXT.replace("* Second item", "* Second item, renamed"));
  });

  test("should edit a table row's line on e on a table", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("j") });
    for (let k = 0; k < 3; k++) {
      await down($);
    }
    expect(await focusedKey(ui)).toBe("h1.1:3");

    await ui.press({ key: keyButton("e") });
    expect(await ui.find({ key: lineButton(14) })).toBeUndefined();
    await ui.press({ key: lineButton(15) });
    await ui.input({ key: EDIT_INPUT, text: "| one | 2 |" });

    expect(w.files.get(DOC)).toBe(TEXT.replace("| one | two |", "| one | 2 |"));
  });

  test("should refuse the save and say why when the field's text holds a newline", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("j") });
    await ui.press({ key: keyButton("e") });

    await ui.input({ key: EDIT_INPUT, text: "## To do\n## More" });

    expect(w.saves).toEqual([]);
    expect(w.files.get(DOC)).toBe(TEXT);
    expect(w.statuses.at(-1)).toMatch(/^the field edits one line and the text holds a line break; nothing was saved/);
    expect(await ui.find({ key: EDIT_INPUT })).toBeDefined();
  });

  test("should name the reason on e on a block with no editable line", async ($, on) => {
    const { w, ui } = await open($, on);
    await down($);

    await ui.press({ key: keyButton("e") });

    expect(w.statuses.at(-1)).toBe("e edits a heading, a list item or a table row, and this block is a paragraph; c asks Claude to change it");
    expect(await ui.find({ key: EDIT_INPUT })).toBeUndefined();
  });

  test("should toggle [ ] and [x] on a task line and save it on Enter on its checkbox, and follow the link on the same block on Enter on the link", async ($, on) => {
    const { w, ui } = await open($, on);
    await ui.press({ key: keyButton("j") });
    await down($);
    expect(await focusedKey(ui)).toBe("h1.1:1");

    await ui.press({ key: taskButton(7) });
    expect(w.files.get(DOC)).toContain("- [x] Open task");
    expect(w.statuses.at(-1)).toBe("ticked line 7");
    await ui.press({ key: taskButton(8) });
    expect(w.files.get(DOC)).toContain("- [ ] Done task");
    expect(w.statuses.at(-1)).toBe("unticked line 8");
    expect(w.saves).toHaveLength(2);

    await ui.press({ key: "link:0" });
    expect((await header(ui)).title).toBe(`${LINKED_FILE} › Linked document`);
  });
});

describe("next and previous heading (FR-3)", () => {
  test("should focus the next heading on j and the previous on h, and say so past the last", async ($, on) => {
    const { w, ui } = await open($, on);

    await ui.press({ key: keyButton("j") });
    expect(await focusedKey(ui)).toBe("h1.1");
    await ui.press({ key: keyButton("j") });
    expect(await focusedKey(ui)).toBe("h1.2");
    await ui.press({ key: keyButton("j") });
    expect(w.statuses.at(-1)).toBe("no heading below this block");
    await ui.press({ key: keyButton("h") });
    expect(await focusedKey(ui)).toBe("h1.1");
    await ui.press({ key: keyButton("h") });
    await ui.press({ key: keyButton("h") });
    expect(w.statuses.at(-1)).toBe("no heading above this block");
    expect(await focusedKey(ui)).toBe("h1");
  });
});
