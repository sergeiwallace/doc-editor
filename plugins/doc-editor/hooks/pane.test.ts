import { describe, expect, test } from "claude-code/testing";

import { fixtureDoc, LINKED_FILE, linkedDoc } from "../core/fixture-docs.ts";
import { ELEMENT_LIMIT, TREE_LIMIT } from "../core/window.ts";
import { keyButton } from "./hints.ts";
import { FIND_INPUT, MAX_BYTES } from "./pane.ts";
import { PANE_ID } from "./register.ts";
import { CWD, elementsOf, ENGINE_TEST, focusedKey, header, openDoc, PANE_PROPS, type PaneWorldOptions, pieceKeys, scrollPane } from "./tests/pane-world.ts";

// The reader pane through the mod's own hooks: /doc, the pane's ui.render and ui.scroll, its
// Buttons' hotkeys and its fields, under the test kit (T-1.1 to T-1.3, and the redraw half of
// T-1.7's first criterion).

const SMALL = fixtureDoc(200);
const MEDIUM = fixtureDoc(1000);
const DOC = `${CWD}/doc.md`;
const files = (text = SMALL): PaneWorldOptions => ({
  files: { [DOC]: text, [`${CWD}/${LINKED_FILE}`]: linkedDoc() },
});
const lineOf = (text: string, line: string) => text.split("\n").indexOf(line) + 1;

/** Words of six characters with their space, `w00001 w00002 ...`, so a 60-column row holds ten. */
const words = (count: number) => Array.from({ length: count }, (_, k) => `w${String(k + 1).padStart(5, "0")}`).join(" ");

/**
 * A quote of short paragraphs, each holding eight links to distinct long in-repository paths: a
 * block over 9,000 characters the core splits into several pieces, and so many links that
 * listing a whole block's links on every piece would pass the tree limit.
 */
const linkHeavy = (paragraphs: number) => {
  const lines = ["# Link-heavy section", ""];
  for (let p = 0; p < paragraphs; p++) {
    if (p > 0) lines.push(">");
    const links = Array.from({ length: 8 }, (_, k) => `[l${p}.${k}](docs/${"deep-folder-name/".repeat(4)}target-${p}-${k}.md)`);
    lines.push(`> ${links.join(" ")}`);
  }
  return `${lines.join("\n")}\n`;
};

describe("open and render (T-1.1)", () => {
  test("should open the pane with the header row, the first blocks and the hint row within one render when /doc names a Markdown file", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md");

    expect(w.opened).toEqual([{ id: PANE_ID, title: "doc.md", focus: true }]);
    expect(await header(ui)).toEqual({ title: "doc.md", status: "READ · 4 min read" });
    expect((await pieceKeys(ui)).slice(0, 4)).toEqual(["h:1", "h:2", "h:3", "h1"]);
    expect((await ui.find({ key: keyButton("o") }))?.props).toMatchObject({ hotkey: "o", label: "outline" });
    expect(w.statuses).toEqual([]);
  });

  test("should focus the block holding line N when the path carries :N", ENGINE_TEST, async ($, on) => {
    const line = lineOf(SMALL, "# Chapter 2: topic 2");
    const { ui } = await openDoc($, on, files(), `doc.md:${line}`);

    expect(await focusedKey(ui)).toBe("h2");
    expect((await pieceKeys(ui))[0]).toBe("h2");
    expect((await header(ui)).title).toBe("doc.md › Chapter 2: topic 2");
  });

  test("should focus the heading when the path carries #heading", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#lists-2");

    expect(await focusedKey(ui)).toBe("h2.1");
    expect((await header(ui)).title).toBe("doc.md › Chapter 2: topic 2 › Lists 2");
  });

  test("should open at the top and name the missing place in the status row when :N or #heading is not in the file", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md#no-such-heading");

    expect(w.statuses).toEqual(["no heading #no-such-heading"]);
    expect(await focusedKey(ui)).toBe("h:1");
  });

  for (const [name, spec, reason] of [
    ["does not exist", { [`${CWD}/other.md`]: "# Other\n" }, "no such file: doc.md"],
    ["is over 4 MiB", { [DOC]: { size: MAX_BYTES + 1 } }, `doc.md is over 4 MiB (${MAX_BYTES + 1} bytes), more than the pane can read`],
    ["is not UTF-8 text", { [DOC]: { bytes: new Uint8Array([0x23, 0x20, 0xff, 0xfe, 0x0a]) } }, "doc.md is not UTF-8 text"],
    ["holds a NUL byte", { [DOC]: { bytes: new Uint8Array([0x23, 0x00, 0x0a]) } }, "doc.md is not UTF-8 text"],
  ] as const) {
    test(`should show one status row naming the reason and open no pane when the file ${name}`, ENGINE_TEST, async ($, on) => {
      const { w } = await openDoc($, on, { files: spec }, "doc.md");

      expect(w.statuses).toEqual([reason]);
      expect(w.opened).toEqual([]);
    });
  }

  test("should draw a fence as Code with its language, a callout as a bordered Box with its label and a wide table as one card per row", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#code-1", { ...PANE_PROPS, bodyRows: 200, scroll: { offset: 0, bodyRows: 200 } } as never);
    const tree = elementsOf(await ui.drawn());

    const code = tree.find((node) => node.type === "Code" && String(node.props.source).includes("chapter1"));
    expect(code?.props.language).toBe("ts");
    const callout = tree.find((node) => node.type === "Box" && node.props.borderStyle === "round");
    expect(callout).toBeDefined();
    expect((await ui.find({ type: "Text", text: /^NOTE$/ }))?.text).toBe("NOTE");
    expect((await ui.find({ key: "h1.1.1.1.1:1~r1" }))?.text).toMatch(/\*\*Element:\*\* Markdown 1/);
    expect((await ui.find({ key: "h1.1.1.1.1:1~r2" }))?.text).toMatch(/\*\*Element:\*\* Code 1/);
  });

  test("should draw a table that fits the body as the engine's Markdown table", ENGINE_TEST, async ($, on) => {
    const wide = { ...PANE_PROPS, bodyColumns: 220, scroll: { offset: 0, bodyRows: 200 } };
    const { ui } = await openDoc($, on, files(), "doc.md#table-1", wide);

    expect(await ui.find({ key: "h1.1.1.1.1:1~r1" })).toBeUndefined();
    expect((await ui.find({ key: "md:h1.1.1.1.1:1" }))?.text).toMatch(/^\| Element \| Cap/);
  });

  test("should draw an image as its alt text and path", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#media-1");

    expect((await ui.find({ key: "md:h1.1.1.1.1.1:1" }))?.text).toContain("Figure 1");
    expect((await ui.find({ key: "md:h1.1.1.1.1.1:1" }))?.text).toContain("images/figure-1.png");
  });
});

describe("window and budget (T-1.2)", () => {
  for (const [name, props] of [
    ["a 40-row body", PANE_PROPS],
    ["a 2,000-row body", { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 2_000 } }],
  ] as const) {
  test(`should keep every render of a 20,000-line file with a link-heavy block under 100,000 serialized characters with no Markdown over 9,000, in ${name}`, { timeoutMs: 180_000 }, async ($, on) => {
    const { ui } = await openDoc($, on, files(`${linkHeavy(60)}\n${fixtureDoc(20_000)}`), "doc.md", props);
    let renders = 0;
    let last = "";
    let largest = 0;
    for (;;) {
      const tree = await ui.drawn();
      const size = JSON.stringify(tree).length;
      largest = Math.max(largest, size);
      expect(size).toBeLessThan(TREE_LIMIT);
      for (const node of elementsOf(tree)) {
        if (node.type === "Markdown") expect(String(node.props.text).length).toBeLessThanOrEqual(ELEMENT_LIMIT);
        if (node.type === "Code") expect(String(node.props.source).length).toBeLessThanOrEqual(ELEMENT_LIMIT);
      }
      renders++;
      const body = JSON.stringify(await ui.find({ key: "body" }));
      if (body === last) break;
      last = body;
      await scrollPane($, props.scroll.bodyRows);
    }
    await ui.press({ key: keyButton("o") });
    expect(JSON.stringify(await ui.drawn()).length).toBeLessThan(TREE_LIMIT);

    expect(renders).toBeGreaterThan(props === PANE_PROPS ? 100 : 5);
    expect(largest).toBeGreaterThan(0);
  });
  }

  test("should list on each piece only the links its own text draws", ENGINE_TEST, async ($, on) => {
    const tall = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 2_000 } };
    const { ui } = await openDoc($, on, files(linkHeavy(60)), "doc.md", tall);
    const pieces = (await ui.findAll({ type: "Markdown" })).filter((node) => (node.key ?? "").startsWith("md:h1:1~p"));

    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      const links = piece.props.pressableLinks as string[];
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) expect(piece.text).toContain(href);
    }
  });

  test("should rewrite its own offset, return without calling next and redraw the rows in view when the pane receives ui.scroll", ENGINE_TEST, async ($, on) => {
    const reached: number[] = [];
    on("ui.scroll", (_engine, e) => {
      reached.push(e.by);
      return {};
    });
    const { ui } = await openDoc($, on, files(), "doc.md");
    const before = await pieceKeys(ui);

    const result = await scrollPane($, PANE_PROPS.scroll.bodyRows);
    const after = await pieceKeys(ui);

    expect(result).toEqual({});
    expect(reached).toEqual([]);
    expect(after[0]).not.toBe(before[0]);
    await scrollPane($, -1_000);
    expect(await pieceKeys(ui)).toEqual(before);
  });

  test("should move the focus to the next block when the pane receives a one-row ui.scroll", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md");

    await scrollPane($, 1);
    expect(await focusedKey(ui)).toBe("h:2");
    await scrollPane($, -1);
    expect(await focusedKey(ui)).toBe("h:1");
  });

  test("should pass a ui.scroll for another site on to the engine", ENGINE_TEST, async ($, on) => {
    const reached: string[] = [];
    on("ui.scroll", (_engine, e) => {
      reached.push(e.requestId);
      return {};
    });
    await openDoc($, on, files(), "doc.md");

    await $.ui.scroll({ component: "Pane", requestId: "other", offset: 1, by: 1, bodyRows: 10, contentRows: 20, origin: { kind: "person" } });

    expect(reached).toEqual(["other"]);
  });

  test("should split a block over 9,000 characters at its paragraph boundaries into keyed elements in order", ENGINE_TEST, async ($, on) => {
    const tall = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 2_000 } };
    const { ui } = await openDoc($, on, files(MEDIUM), "doc.md#long-blocks", tall);
    const keys = (await pieceKeys(ui)).filter((key) => key.startsWith("h1:1~"));
    const texts = await Promise.all(keys.map(async (key) => (await ui.find({ key: `md:${key}` }))?.text ?? ""));

    expect(keys).toEqual(["h1:1~p1", "h1:1~p2"]);
    for (const text of texts) expect(text.length).toBeLessThanOrEqual(ELEMENT_LIMIT);
    expect(texts[0]).toMatch(/^> Long quote paragraph 1\./);
    expect(texts[1]).toMatch(/Long quote paragraph 12\./);
    const joined = texts.join("\n");
    for (let p = 1; p < 12; p++) {
      expect(joined.indexOf(`paragraph ${p}.`)).toBeLessThan(joined.indexOf(`paragraph ${p + 1}.`));
    }
  });

  test("should draw a fence over 9,000 characters as Code slices of at most 9,000 with a continuation marker on each, in order", ENGINE_TEST, async ($, on) => {
    const tall = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 2_000 } };
    const { ui } = await openDoc($, on, files(MEDIUM), "doc.md#long-blocks", tall);
    const keys = (await pieceKeys(ui)).filter((key) => key.startsWith("h1:2"));
    const slices = await Promise.all(keys.map(async (key) => (await ui.find({ key }))?.text ?? ""));

    expect(keys).toEqual(["h1:2~c1", "h1:2~c2"]);
    expect(slices[0]).toContain("long fence line 001");
    expect(slices[0]).toContain("… part 1 of 2");
    expect(slices[1]).toContain("long fence line 260");
    expect(slices[1]).toContain("… part 2 of 2");
    const codes = elementsOf(await ui.drawn()).filter((node) => node.type === "Code" && String(node.props.source).includes("long fence"));
    for (const code of codes) expect(String(code.props.source).length).toBeLessThanOrEqual(ELEMENT_LIMIT);
  });

  test("should cut a piece that runs past the body to the rows left, so the hint row stays in view", ENGINE_TEST, async ($, on) => {
    // 19 rows: the hint row, with the editor's keys, wraps to three rows at 100 columns, and a cut
    // piece holds a spare row; at 18 to 21 rows the list piece is the one cut.
    const short = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 19 } };
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-2-topic-2", short);
    const keys = await pieceKeys(ui);
    const last = keys.at(-1) ?? "";
    const drawn = (await ui.find({ key: `md:${last}` }))?.text ?? (await ui.find({ key: last }))?.text ?? "";

    expect(keys[0]).toBe("h2");
    expect(keys).toContain("h2.1:1");
    expect(drawn).toContain("First item 2");
    expect(drawn).not.toContain("Done task 2");
    expect(await ui.find({ key: keyButton("q") })).toBeDefined();
  });

  test("should draw a blank spacer of the body's height under the hint row, so the engine raises ui.scroll for the arrow keys", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md");
    const tree = (await ui.drawn()) as { children?: { props?: { key?: string; height?: number } }[] };

    expect(tree.children?.at(-1)?.props).toEqual({ key: "spacer", height: PANE_PROPS.scroll.bodyRows });
    expect(tree.children?.at(-2)?.props?.key).toBe("hints");
  });

  test("should scroll a single long wrapped line row by row and show every row before the next piece", ENGINE_TEST, async ($, on) => {
    const narrow = { ...PANE_PROPS, bodyColumns: 62, scroll: { offset: 0, bodyRows: 20 } };
    const text = `# Long line\n\n${words(1_200)}\n\n## After\n`;
    const { ui } = await openDoc($, on, files(text), "doc.md", narrow);
    await scrollPane($, 1, 20);
    expect((await pieceKeys(ui))[0]).toBe("h1:1");
    const seen = new Set<string>();
    for (let k = 0; k < 200 && (await pieceKeys(ui))[0] === "h1:1"; k++) {
      for (const word of ((await ui.find({ key: "md:h1:1" }))?.text ?? "").split(/\s+/)) seen.add(word);
      await scrollPane($, 1, 20);
    }

    expect((await pieceKeys(ui))[0]).not.toBe("h1:1");
    const missing = words(1_200).split(" ").filter((word) => !seen.has(word));
    expect(missing).toEqual([]);
  });

  test("should scroll inside a piece taller than the body before moving to the next piece", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(MEDIUM), "doc.md#long-blocks");
    for (let k = 0; k < 400 && (await pieceKeys(ui))[0] !== "h1:2~c1"; k++) await scrollPane($, 1);
    expect((await pieceKeys(ui))[0]).toBe("h1:2~c1");
    const top = (await ui.find({ key: "h1:2~c1" }))?.text ?? "";

    await scrollPane($, 10);

    const moved = (await ui.find({ key: "h1:2~c1" }))?.text ?? "";
    expect(top).toContain("long fence line 001");
    expect(moved).not.toContain("long fence line 001");
    expect(moved).toContain("long fence line 011");
  });
});

describe("navigate (T-1.3)", () => {
  test("should show the outline on o and focus a heading when Enter presses its entry", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md");

    await ui.press({ key: keyButton("o") });
    expect((await header(ui)).title).toBe("doc.md › Outline");
    expect((await ui.find({ key: "outline:h2" }))?.text).toContain("Chapter 2: topic 2");

    await ui.press({ key: "outline:h2" });

    expect(await focusedKey(ui)).toBe("h2");
    expect((await pieceKeys(ui))[0]).toBe("h2");
  });

  test("should hide a heading's section on z and show it again on the next z", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");
    const open = await pieceKeys(ui);
    expect(open).toContain("h1:1");

    await ui.press({ key: keyButton("z") });
    const folded = await pieceKeys(ui);
    expect(folded).toContain("h1");
    expect(folded.filter((key) => key.startsWith("h1:") || key.startsWith("h1."))).toEqual([]);
    expect(folded).toContain("h2");

    await ui.press({ key: keyButton("z") });
    expect(await pieceKeys(ui)).toEqual(open);
  });

  test("should fold every heading on a and unfold them all on the next a", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");

    await ui.press({ key: keyButton("a") });
    const keys = await pieceKeys(ui);
    expect(keys.filter((key) => /^h\d+$/.test(key)).length).toBeGreaterThan(2);
    expect(keys.some((key) => key.includes(":") && key !== "h:1" && key !== "h:2" && key !== "h:3")).toBe(false);

    await ui.press({ key: keyButton("a") });
    expect(await pieceKeys(ui)).toContain("h1:1");
  });

  test("should name the reason in the status row when z is pressed with no heading above the focus", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md");

    await ui.press({ key: keyButton("z") });

    expect(w.statuses).toEqual(["z folds a heading, and no heading is above this block"]);
  });

  test("should draw only the section with its heading path on d and the whole document again on u", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#lists-1");

    await ui.press({ key: keyButton("d") });
    const keys = await pieceKeys(ui);
    expect(keys.every((key) => key.startsWith("h1.1"))).toBe(true);
    expect(await header(ui)).toEqual({ title: "doc.md › Chapter 1: topic 1 › Lists 1", status: "READ · 4 min read · section · u up" });

    await ui.press({ key: keyButton("u") });
    expect((await pieceKeys(ui)).some((key) => !key.startsWith("h1.1"))).toBe(true);
    expect((await header(ui)).status).toBe("READ · 4 min read");
  });

  test("should go up one drill-in level on u from a section drilled into from another", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");
    await ui.press({ key: keyButton("d") });
    await scrollPane($, 1);
    await scrollPane($, 1);
    expect(await focusedKey(ui)).toBe("h1.1");
    await ui.press({ key: keyButton("d") });
    expect((await pieceKeys(ui)).every((key) => key.startsWith("h1.1"))).toBe(true);

    await ui.press({ key: keyButton("u") });
    const chapter = await pieceKeys(ui);
    expect(chapter.every((key) => key.startsWith("h1"))).toBe(true);
    expect(chapter).toContain("h1:1");

    await ui.press({ key: keyButton("u") });
    expect((await header(ui)).status).toBe("READ · 4 min read");
  });

  test("should focus the next block holding the query with the hit count in the header on Enter, and the previous hit on b", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md");

    await ui.press({ key: keyButton("f") });
    expect(await ui.find({ key: FIND_INPUT })).toBeDefined();
    await ui.input({ key: FIND_INPUT, text: "Ordered one" });
    expect(await focusedKey(ui)).toBe("h1.1:2");
    expect((await header(ui)).status).toMatch(/find "Ordered one" 1 of \d+$/);

    await ui.input({ key: FIND_INPUT, text: "Ordered one" });
    expect(await focusedKey(ui)).toBe("h2.1:2");
    expect((await header(ui)).status).toMatch(/find "Ordered one" 2 of \d+$/);

    await ui.press({ key: keyButton("b") });
    expect(await focusedKey(ui)).toBe("h1.1:2");
    expect((await header(ui)).status).toMatch(/1 of \d+$/);
  });

  test("should say so in the status row and the header when no block holds the query", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md");

    await ui.press({ key: keyButton("f") });
    await ui.input({ key: FIND_INPUT, text: "no such words anywhere" });

    expect(w.statuses).toEqual(['no block contains "no such words anywhere"']);
    expect((await header(ui)).status).toMatch(/no match$/);
    expect(await focusedKey(ui)).toBe("h:1");
  });

  test("should open a file link in place on Enter, push the previous position and return to it on b", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");
    await scrollPane($, 1);
    expect(await focusedKey(ui)).toBe("h1:1");

    await ui.press({ key: "md:h1:1", link: { href: `${LINKED_FILE}#second-section` } });
    expect((await header(ui)).title).toBe(`${LINKED_FILE} › Linked document › Second section`);
    expect(await focusedKey(ui)).toBe("h1.1");

    await ui.press({ key: keyButton("b") });
    expect((await header(ui)).title).toBe("doc.md › Chapter 1: topic 1");
    expect(await focusedKey(ui)).toBe("h1:1");
  });

  test("should follow a heading link in the same file from the focused block's link row and come back on b", ENGINE_TEST, async ($, on) => {
    const { ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");
    await scrollPane($, 1);

    expect((await ui.find({ key: "link:2" }))?.text).toBe("→ #chapter-2-topic-2");
    await ui.press({ key: "link:2" });
    expect(await focusedKey(ui)).toBe("h2");

    await ui.press({ key: keyButton("b") });
    expect(await focusedKey(ui)).toBe("h1:1");
  });

  // The outside link draws as text, not a link, so it is reached through the focused block's link row.
  for (const [name, button, reason] of [
    ["outside the repository", "link:0", "outside the repository: ../../../../outside.md"],
    ["to a missing file", "link:1", `missing file: ${CWD}/missing-file.md`],
  ] as const) {
    test(`should show the reason in the status row and not navigate when a link points ${name}`, ENGINE_TEST, async ($, on) => {
      const { w, ui } = await openDoc($, on, files(), "doc.md");
      await scrollPane($, 1);
      await scrollPane($, 1);
      expect(await focusedKey(ui)).toBe("h:3");

      await ui.press({ key: button });

      expect(w.statuses).toEqual([reason]);
      expect(await focusedKey(ui)).toBe("h:3");
      expect((await header(ui)).title).toBe("doc.md");
    });
  }

  test("should open a link whose path the drawn text percent-encodes when its drawn form is pressed", ENGINE_TEST, async ($, on) => {
    const text = "# Start\n\nSee [the spaced doc](<my notes.md>).\n";
    const { ui } = await openDoc($, on, { files: { [DOC]: text, [`${CWD}/my notes.md`]: "# Spaced\n" } }, "doc.md");
    const link = await ui.find({ key: "md:h1:1" });
    expect(link?.props.pressableLinks).toEqual(["my%20notes.md"]);

    await ui.press({ key: "md:h1:1", link: { href: "my%20notes.md" } });

    expect((await header(ui)).title).toBe("my notes.md › Spaced");
  });

  test("should refuse a link whose symlink leads outside the repository", ENGINE_TEST, async ($, on) => {
    const text = "# Start\n\nSee [the escape](escape.md).\n";
    const { w, ui } = await openDoc(
      $,
      on,
      { files: { [DOC]: text, [`${CWD}/escape.md`]: { linkTo: "/elsewhere/secret.md" }, "/elsewhere/secret.md": "# Secret\n" } },
      "doc.md",
    );

    await ui.press({ key: "md:h1:1", link: { href: "escape.md" } });

    expect(w.statuses).toEqual([`outside the repository: ${CWD}/escape.md resolves to /elsewhere/secret.md`]);
    expect((await header(ui)).title).toBe("doc.md › Start");
  });
});

describe("reload (T-1.7, the pane's half)", () => {
  test("should redraw after the file changes and keep the focused block and the folds across renumbered ids", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md#chapter-1-topic-1");
    await ui.press({ key: keyButton("z") });
    await ui.press({ key: "outline:h2" }).catch(() => undefined);
    await ui.press({ key: keyButton("o") });
    await ui.press({ key: "outline:h2" });
    expect(await focusedKey(ui)).toBe("h2");

    w.edit(DOC, `# A new first heading\n\nInserted above everything.\n\n${SMALL}`);
    await w.clock.advance(1_500);

    expect(await focusedKey(ui)).toBe("h3");
    expect((await header(ui)).title).toBe("doc.md › Chapter 2: topic 2");
    await ui.press({ key: keyButton("t") });
    const keys = await pieceKeys(ui);
    expect(keys).toContain("h2");
    expect(keys).not.toContain("h2:1");
  });

  test("should keep drawing the last text and name the reason in the status row when the file cannot be read", ENGINE_TEST, async ($, on) => {
    const { w, ui } = await openDoc($, on, files(), "doc.md");
    const before = await pieceKeys(ui);

    w.files.delete(DOC);
    await w.clock.advance(1_500);

    expect(w.statuses.at(-1)).toMatch(/^doc\.md cannot be read: /);
    expect(await pieceKeys(ui)).toEqual(before);
  });
});
