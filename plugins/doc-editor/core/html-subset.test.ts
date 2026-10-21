import { describe, expect, test } from "claude-code/testing";

import { decodeEntities, htmlToMarkdown, imageText } from "./html-subset.ts";

describe("htmlToMarkdown", () => {
  test("should convert inline tags to Markdown emphasis, strikethrough, code and links", () => {
    const drawable = (href: string) => href === "x.md";

    expect(htmlToMarkdown('<b>b</b> <em>i</em> <del>d</del> <code>c</code> <a href="x.md">l</a>', "flow", drawable)).toBe(
      "**b** *i* ~~d~~ `c` [l](x.md)",
    );
  });

  test("should draw an anchor as its label and target when its href may not be a hyperlink or no check is given", () => {
    expect(htmlToMarkdown('<a href="file:///x">l</a>', "flow", () => false)).toBe("l (`file:///x`)");
    expect(htmlToMarkdown('<a href="x.md">l</a>')).toBe("l (`x.md`)");
    expect(htmlToMarkdown("<a>plain</a>")).toBe("plain");
    expect(htmlToMarkdown('<a href="x.md">', "inline", () => true)).toBe(" (`x.md`)");
  });

  test("should drop comments and the content of script and style", () => {
    expect(htmlToMarkdown("a<!-- hidden -->b<script>alert(1)</script>c<style>p{}</style>d")).toBe("abcd");
  });

  test("should turn <br> into a hard break in flow and inline text and a space in a table cell", () => {
    expect(htmlToMarkdown("a<br>b")).toBe("a  \nb");
    expect(htmlToMarkdown("<br>", "inline")).toBe("\\\n");
    expect(htmlToMarkdown("<br/>", "cell")).toBe(" ");
  });

  test("should open a details block as its summary in bold followed by its body", () => {
    expect(htmlToMarkdown("<details><summary>More</summary><p>Body text.</p></details>")).toBe(
      "▸ **More**\n\nBody text.",
    );
  });

  test("should convert a simple table with a header row to a pipe table", () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>x|y</td></tr></table>";

    expect(htmlToMarkdown(html)).toBe("| A | B |\n| --- | --- |\n| 1 | x\\|y |");
  });

  test("should convert lists, nested lists and headings", () => {
    expect(htmlToMarkdown("<h2>T</h2><ul><li>a<ol><li>b</li><li>c</li></ol></li></ul>")).toBe(
      "## T\n\n- a\n  1. b\n  2. c",
    );
  });

  test("should draw an image as its alt text and source", () => {
    expect(htmlToMarkdown('<img src="p.png" alt="A &amp; B">')).toBe("🖼 A & B `p.png`");
    expect(imageText("", "")).toBe("🖼 image");
  });

  test("should keep the text and drop the tags when the HTML is malformed or unknown", () => {
    expect(htmlToMarkdown("<span>a < b</span> <unknown x=1>c</unknown> <b>open")).toBe("a < b c **open");
  });

  test("should give nothing for an empty fragment", () => {
    expect(htmlToMarkdown("")).toBe("");
  });
});

describe("decodeEntities", () => {
  test("should decode named, decimal and hexadecimal references and leave an unknown one as text", () => {
    expect(decodeEntities("&lt;a&gt; &#65;&#x42; &bogus; &#0;")).toBe("<a> AB &bogus; &#0;");
  });
});
