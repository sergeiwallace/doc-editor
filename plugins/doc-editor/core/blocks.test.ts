import { describe, expect, test } from "claude-code/testing";

import { calloutLabel, drawnOf, fenceLanguage, parseBlocks, toDocument } from "./blocks.ts";
import { fixtureDoc } from "./fixture-docs.ts";
import { parseMarkdown } from "./parse.ts";
import type { Node } from "./parse.ts";

const ORIGIN = { path: "/repo/docs/a.md", repoRoot: "/repo" };
const blocksOf = (source: string) => parseBlocks(source, ORIGIN).blocks;
const shape = (source: string) => blocksOf(source).map((b) => `${b.id} ${b.kind}${b.level ?? ""} ${b.start}-${b.end}`);

const SAMPLE = [
  "Intro.",
  "",
  "# One",
  "",
  "Para one.",
  "",
  "## Sub",
  "",
  "- a",
  "  - b",
  "- c",
  "",
  "```ts",
  "x",
  "```",
  "",
  "> [!WARNING] Careful",
  "> body",
  "",
  "> plain quote",
  "",
  "| a | b |",
  "| - | - |",
  "| 1 | 2 |",
  "",
  "---",
  "",
  "<div>html</div>",
  "",
  "# Two",
  "",
].join("\n");

describe("parseBlocks", () => {
  test("should cut the source into kinds with 1-based line ranges and heading-tree ids when it holds every block kind", () => {
    expect(shape(SAMPLE)).toEqual([
      "h:1 paragraph 1-1",
      "h1 heading1 3-3",
      "h1:1 paragraph 5-5",
      "h1.1 heading2 7-7",
      "h1.1:1 list 9-11",
      "h1.1:2 fence 13-15",
      "h1.1:3 callout 17-18",
      "h1.1:4 quote 20-20",
      "h1.1:5 table 22-24",
      "h1.1:6 thematic 26-26",
      "h1.1:7 html 28-28",
      "h2 heading1 30-30",
    ]);
  });

  test("should keep each block's id when the text above it in the same section changes length", () => {
    const before = blocksOf(SAMPLE);
    const after = blocksOf(SAMPLE.replace("Para one.", "Para one,\nnow two lines."));

    expect(after.map((b) => b.id)).toEqual(before.map((b) => b.id));
    expect(after.find((b) => b.id === "h2")?.start).toBe(31);
  });

  test("should give a block a new id when its place in the heading tree changes", () => {
    const moved = blocksOf(SAMPLE.replace("Para one.", "## New sub\n\nPara one."));

    expect(moved.find((b) => b.text === "- a\n  - b\n- c")?.id).toBe("h1.2:1");
  });

  test("should give list items and nested items as children with their own lines", () => {
    const list = blocksOf(SAMPLE).find((b) => b.kind === "list");

    expect(list?.children?.map((c) => `${c.id} L${c.level} ${c.start}-${c.end}`)).toEqual([
      "h1.1:1.1 L1 9-10",
      "h1.1:1.2 L1 11-11",
    ]);
    expect(list?.children?.[0]?.children?.map((c) => `${c.id} L${c.level} ${c.text}`)).toEqual([
      "h1.1:1.1.1 L2   - b",
    ]);
  });

  test("should draw task markers as checkbox glyphs and keep them in the source", () => {
    const [list] = blocksOf("- [ ] open\n- [x] done\n");

    expect(list?.text).toBe("- [ ] open\n- [x] done");
    expect(list === undefined ? "" : drawnOf(list)).toBe("- ☐ open\n- ☑ done");
  });

  test("should drop HTML comments from the drawn text and keep CriticMarkup and %% comments as text", () => {
    const blocks = blocksOf("Before <!-- gone --> after {>>kept<<} and %% kept %%.\n\n<!-- block comment -->\n\n- item <!-- c -->\n");

    expect(blocks.map(drawnOf)).toEqual(["Before  after {>>kept<<} and %% kept %%.", "", "- item "]);
    expect(blocks[1]?.text).toBe("<!-- block comment -->");
  });

  test("should draw an image as its alt text and path", () => {
    const [paragraph] = blocksOf("See ![The figure](img/fig.png) here.\n");

    expect(paragraph === undefined ? "" : drawnOf(paragraph)).toBe("See 🖼 The figure `img/fig.png` here.");
  });

  test("should draw a link that may not be a hyperlink as its label and target, and keep https and in-repository links", () => {
    const [paragraph] = blocksOf(
      "[a](javascript:alert(1)) [b](mailto:x@y.z) [c](https://e.com) [d](b.md#h) [e](#top) [f](../../out.md)\n",
    );

    expect(paragraph === undefined ? "" : drawnOf(paragraph)).toBe(
      "a (`javascript:alert(1)`) b (`mailto:x@y.z`) [c](https://e.com) [d](b.md#h) [e](#top) f (`../../out.md`)",
    );
  });

  test("should check the href of an inline HTML anchor like any other link and draw it whole", () => {
    const [paragraph] = blocksOf(
      'A <a href="file:///etc/passwd">x</a> and <a href="https://e.com">ok <b>b</b></a> and <a href="b.md">in</a>.\n',
    );

    expect(paragraph === undefined ? "" : drawnOf(paragraph)).toBe(
      "A x (`file:///etc/passwd`) and [ok **b**](https://e.com) and [in](b.md).",
    );
  });

  test("should never let an emitted href or label close its link and open another", () => {
    const evil = "https://safe/) [bad](javascript:alert(1)";
    const sources = [
      `A <a href="${evil}">x</a> b.\n`,
      `<p><a href="${evil}">x</a></p>\n`,
      `See [x][r].\n\n[r]: <${evil}>\n`,
      '<a href="https://ok">x](javascript:alert(1)) [y</a>\n',
      "<a href=\"javascript:a`[b](javascript:c)`\">l</a>\n",
      "See [x][r].\n\n[r]: <javascript:a`[b](javascript:c)`>\n",
    ];
    for (const source of sources) {
      const drawn = blocksOf(source).map(drawnOf).join("\n\n");
      const urls: string[] = [];
      const walk = (node: Node) => {
        if (node.type === "link") urls.push(node.url ?? "");
        for (const child of node.children ?? []) walk(child);
      };
      walk(parseMarkdown(drawn).tree);

      expect(urls.filter((url) => !url.startsWith("https://")), `${source} drew ${drawn}`).toEqual([]);
    }
  });

  test("should check the href of an anchor inside an HTML block", () => {
    const [html] = blocksOf('<p><a href="javascript:x()">j</a> <a href="b.md">b</a></p>\n');

    expect(html === undefined ? "" : drawnOf(html)).toBe("j (`javascript:x()`) [b](b.md)");
  });

  test("should resolve a reference link inline when its definition is in another block, and draw the definition as nothing", () => {
    const blocks = blocksOf("Read [the doc][ref].\n\n[ref]: other.md\n");

    expect(blocks.map(drawnOf)).toEqual(["Read [the doc](other.md).", ""]);
  });

  test("should convert inline HTML in a paragraph and in a table cell", () => {
    const blocks = blocksOf("A <b>bold</b> word<br>next.\n\n| a |\n| - |\n| x<br>y |\n");

    expect(blocks.map(drawnOf)).toEqual(["A **bold** word\\\nnext.", "| a |\n| - |\n| x y |"]);
  });

  test("should give a callout's label and body without the quote markers", () => {
    const callout = blocksOf(SAMPLE).find((b) => b.kind === "callout");

    expect(callout === undefined ? null : calloutLabel(callout)).toBe("WARNING: Careful");
    expect(callout === undefined ? "" : drawnOf(callout)).toBe("body");
  });

  test("should give no callout label or fence language for a block of another kind", () => {
    const [paragraph] = blocksOf("Just text.\n");

    expect(paragraph === undefined ? "x" : calloutLabel(paragraph)).toBeNull();
    expect(paragraph === undefined ? "x" : fenceLanguage(paragraph)).toBeNull();
  });

  test("should give a fence's language and its content as the drawn text", () => {
    const fence = blocksOf(SAMPLE).find((b) => b.kind === "fence");

    expect(fence === undefined ? null : fenceLanguage(fence)).toBe("ts");
    expect(fence === undefined ? "" : drawnOf(fence)).toBe("x");
  });

  test("should keep front matter as one raw block at lines 1 to its closing line", () => {
    expect(shape("---\ntitle: x\n---\n\n# H\n")).toEqual(["h:1 raw 1-3", "h1 heading1 5-5"]);
  });

  test("should give no blocks when the source is empty or blank", () => {
    expect(blocksOf("")).toEqual([]);
    expect(blocksOf("\n\n   \n")).toEqual([]);
  });

  test("should draw a file link as text when no origin is given, since it cannot be checked against a repository", () => {
    const [paragraph] = parseBlocks("[d](b.md) [c](https://e.com)\n").blocks;

    expect(paragraph === undefined ? "" : drawnOf(paragraph)).toBe("d (`b.md`) [c](https://e.com)");
  });
});

describe("CRLF line endings", () => {
  const lf = fixtureDoc(1000);
  const crlf = lf.replaceAll("\n", "\r\n");
  const strip = (text: string) => text.replaceAll("\r", "");

  test("should give the CRLF fixture the same blocks, ids, kinds, lines and drawn text as the LF one", () => {
    const a = parseBlocks(lf, ORIGIN).blocks;
    const b = parseBlocks(crlf, ORIGIN).blocks;

    expect(b.map((x) => `${x.id} ${x.kind}${x.level ?? ""} ${x.start}-${x.end}`)).toEqual(
      a.map((x) => `${x.id} ${x.kind}${x.level ?? ""} ${x.start}-${x.end}`),
    );
    expect(b.map((x) => strip(drawnOf(x)))).toEqual(a.map(drawnOf));
    expect(b[0]?.kind).toBe("raw");
  });

  test("should give a CRLF callout's label and fence language with no carriage return", () => {
    const blocks = blocksOf("> [!WARNING] Careful\r\n> body\r\n\r\n```ts\r\nx\r\n```\r\n");

    expect(blocks[0] === undefined ? null : calloutLabel(blocks[0])).toBe("WARNING: Careful");
    expect(blocks[1] === undefined ? null : fenceLanguage(blocks[1])).toBe("ts");
  });
});

describe("toDocument", () => {
  test("should index every link with its block and kind when the 1,000-line fixture is parsed", () => {
    const doc = toDocument("/repo/docs/test/fixtures/thousand-line-doc.md", 5, fixtureDoc(1000), "/repo");

    expect(doc.source.split("\n").length - 1).toBe(1000);
    expect(doc.mtimeMs).toBe(5);
    expect(doc.links.slice(0, 6)).toEqual([
      { blockId: "h:3", href: "../../../../outside.md", kind: "file" },
      { blockId: "h:3", href: "missing-file.md", kind: "file" },
      { blockId: "h:3", href: "javascript:void(0)", kind: "url" },
      { blockId: "h2:1", href: "linked-doc.md", kind: "file" },
      { blockId: "h2:1", href: "linked-doc.md#second-section", kind: "file" },
      { blockId: "h2:1", href: "#chapter-2-topic-2", kind: "heading" },
    ]);
    expect(doc.outline[0]).toEqual({ id: "h1", level: 1, title: "Long blocks" });
    expect(new Set(doc.blocks.map((b) => b.kind))).toEqual(
      new Set(["raw", "paragraph", "heading", "quote", "fence", "list", "callout", "table", "html", "thematic"]),
    );
    expect(new Set(doc.outline.map((entry) => entry.level))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });
});
