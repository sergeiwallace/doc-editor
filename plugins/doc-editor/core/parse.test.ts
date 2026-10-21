import { describe, expect, test } from "claude-code/testing";

import { frontMatterRange, parseMarkdown, plainText } from "./parse.ts";

const kinds = (source: string) =>
  parseMarkdown(source).tree.children.map((node) => `${node.type}@${node.position?.start.line}`);

describe("parseMarkdown", () => {
  test("should give GFM nodes with their source lines when the source holds a table, a task list and strikethrough", () => {
    const source = "# T\n\n- [x] a\n- [ ] b\n\n~~x~~ www.example.com\n\n| a |\n| - |\n| 1 |\n";

    expect(kinds(source)).toEqual(["heading@1", "list@3", "paragraph@6", "table@8"]);
    const paragraph = parseMarkdown(source).tree.children[2];
    expect(paragraph?.children?.map((node) => node.type)).toEqual(["delete", "text", "link"]);
  });

  test("should drop the front matter and keep every later position when the source opens with a YAML block", () => {
    const parsed = parseMarkdown("---\ntitle: x\n---\n\n# Heading\n");

    expect(parsed.frontMatter).toEqual({ start: 1, end: 3 });
    expect(kinds("---\ntitle: x\n---\n\n# Heading\n")).toEqual(["heading@5"]);
    expect(parsed.tree.children[0]?.position?.start.offset).toBe("---\ntitle: x\n---\n\n".length);
  });

  test("should recognise front matter and keep positions when the lines end in CRLF", () => {
    const parsed = parseMarkdown("---\r\ntitle: x\r\n---\r\n\r\n# Heading\r\n");

    expect(parsed.frontMatter).toEqual({ start: 1, end: 3 });
    expect(parsed.tree.children.map((node) => `${node.type}@${node.position?.start.line}`)).toEqual(["heading@5"]);
  });

  test("should not treat a thematic break as front matter when no closing line follows", () => {
    expect(frontMatterRange(["---", "text"])).toBeNull();
    expect(parseMarkdown("---\ntext\n").frontMatter).toBeNull();
  });

  test("should run an unclosed fence to the end of the source when the closing fence is missing", () => {
    expect(kinds("para\n\n```js\nconst a = 1;\n\n# not a heading\n")).toEqual(["paragraph@1", "code@3"]);
  });

  test("should give an empty tree when the source is empty", () => {
    expect(parseMarkdown("").tree.children).toEqual([]);
  });

  test("should give the alt text and no markup when asked for a heading's plain text", () => {
    const heading = parseMarkdown("## A `code` **bold** ![pic](p.png) [link](x.md)\n").tree.children[0];

    expect(heading === undefined ? "" : plainText(heading)).toBe("A code bold pic link");
  });

  test("should give no text for a node with neither a value nor children", () => {
    expect(plainText({ type: "thematicBreak" })).toBe("");
  });
});
