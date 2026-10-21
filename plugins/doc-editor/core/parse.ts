// Markdown source to an mdast tree with source positions, through the vendored micromark bundle
// with the GFM extensions (design D-3): tables, task lists, strikethrough and autolinks.

import { fromMarkdown, gfm, gfmFromMarkdown } from "./vendor/mdast.js";
import type { Node, Root } from "./vendor/mdast.js";

export type { Node, Root };

export interface Parsed {
  tree: Root;
  /** The 1-based line range of a leading YAML front matter block, or null when there is none. */
  frontMatter: { start: number; end: number } | null;
}

const FENCE = /^---[ \t]*$/;
const CLOSE = /^(---|\.\.\.)[ \t]*$/;

/**
 * Finds a front matter block: `---` on line 1 and a closing `---` or `...` line. Without one the
 * parser would read the block as a thematic break and a setext heading.
 */
export function frontMatterRange(lines: readonly string[]): { start: number; end: number } | null {
  if (lines.length < 2 || !FENCE.test(lines[0] ?? "")) return null;
  for (let k = 1; k < lines.length; k++) {
    if (CLOSE.test(lines[k] ?? "")) return { start: 1, end: k + 1 };
  }
  return null;
}

/** Splits source into lines on LF; a CR before the LF stays on its line. */
export function splitLines(source: string): string[] {
  return source.split("\n");
}

/**
 * Parses Markdown source. Front matter lines are blanked before parsing, so every position in the
 * tree is a position in the original source and the front matter yields no node.
 */
export function parseMarkdown(source: string): Parsed {
  const lines = splitLines(source);
  const frontMatter = frontMatterRange(lines);
  let text = source;
  if (frontMatter !== null) {
    const blanked = lines.map((line, k) =>
      k < frontMatter.end ? " ".repeat(line.length) : line,
    );
    text = blanked.join("\n");
  }
  const tree = fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  return { tree, frontMatter };
}

/** The plain text of a node: its values and its children's, joined; an image gives its alt. */
export function plainText(node: Node): string {
  if (node.type === "image") return node.alt ?? "";
  if (typeof node.value === "string" && node.type !== "html") return node.value;
  if (node.children === undefined) return "";
  return node.children.map(plainText).join("");
}
