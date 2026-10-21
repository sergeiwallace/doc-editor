// Markdown source to blocks: the top-level units the pane draws, each with its 1-based line range,
// its source text and the text the `Markdown` element is given to draw.
//
// Block ids follow the heading tree: a heading is `h` plus its position among its siblings at each
// level (`h2.1` is the first subheading of the second top-level heading), and any other block is
// its section's id plus its ordinal in that section (`h2.1:3`, or `h:1` before the first heading).
// An id therefore stays the same while the block's place in the heading tree is unchanged, however
// its text or the lines above it change. List items and quote content are `children`, with the
// parent's id and their ordinal (`h2.1:3.2`).
//
// The drawn text differs from the source where the Phase 0 spike measured that the engine's
// `Markdown` element would show syntax as text: task markers become checkbox glyphs, HTML comments
// are dropped and inline HTML is converted, images become their alt text and path (D-14), a link
// whose href may not be drawn as a hyperlink becomes its label and its target as code, and a
// reference link is resolved, since each block is drawn in its own element.

import type { Block, BlockKind, Document, Link } from "./types.ts";
import { parseMarkdown, splitLines } from "./parse.ts";
import type { Node } from "./parse.ts";
import { htmlToMarkdown, imageText } from "./html-subset.ts";
import { classifyHref, isDrawableHref } from "./links.ts";
import { outline } from "./outline.ts";

/** Where the document lives, so the drawn text can tell an in-repository link from any other. */
export interface Origin {
  path: string;
  repoRoot: string;
}

export const CALLOUT = /^ {0,3}>[ \t]*\[!([A-Za-z]+)\][+-]?[ \t]*(.*)$/;

const kindOf = (node: Node, firstLine: string): BlockKind => {
  switch (node.type) {
    case "heading":
      return "heading";
    case "paragraph":
      return "paragraph";
    case "list":
      return "list";
    case "code":
      return "fence";
    case "table":
      return "table";
    case "blockquote":
      return CALLOUT.test(firstLine) ? "callout" : "quote";
    case "thematicBreak":
      return "thematic";
    case "html":
      return "html";
    default:
      return "raw";
  }
};

interface Replacement {
  from: number;
  to: number;
  text: string;
}

interface Walk {
  source: string;
  definitions: Map<string, string>;
  origin: Origin | null;
  links: { href: string; offset: number }[];
}

const startOf = (node: Node): number => node.position?.start.offset ?? 0;
const endOf = (node: Node): number => node.position?.end.offset ?? 0;

const drawable = (walk: Walk, href: string): boolean =>
  walk.origin === null
    ? classifyHref(href) === "url" && /^https?:\/\//i.test(href.trim())
    : isDrawableHref(href, walk.origin.path, walk.origin.repoRoot);

const labelOf = (walk: Walk, node: Node): string => {
  const children = node.children ?? [];
  const first = children[0];
  const last = children.at(-1);
  if (first === undefined || last === undefined) return "";
  return walk.source.slice(startOf(first), endOf(last));
};

const PHRASING_PARENTS = new Set([
  "paragraph",
  "heading",
  "emphasis",
  "strong",
  "delete",
  "link",
  "linkReference",
]);

// Collects the drawn-text rewrites in a block's subtree and the links it holds.
function rewrites(walk: Walk, node: Node, parent: Node | null, inCell: boolean, out: Replacement[]): void {
  const href = (url: string) => walk.links.push({ href: url, offset: startOf(node) });
  switch (node.type) {
    case "html": {
      const context = inCell ? "cell" : parent !== null && PHRASING_PARENTS.has(parent.type) ? "inline" : "flow";
      out.push({ from: startOf(node), to: endOf(node), text: htmlToMarkdown(node.value ?? "", context) });
      return;
    }
    case "image":
      out.push({ from: startOf(node), to: endOf(node), text: imageText(node.alt ?? "", node.url ?? "") });
      return;
    case "imageReference": {
      const url = walk.definitions.get(node.identifier ?? "") ?? "";
      out.push({ from: startOf(node), to: endOf(node), text: imageText(node.alt ?? "", url) });
      return;
    }
    case "link": {
      const url = node.url ?? "";
      href(url);
      if (!drawable(walk, url)) {
        const label = labelOf(walk, node);
        const text = label === url || label === "" ? `\`${url}\`` : `${label} (\`${url}\`)`;
        out.push({ from: startOf(node), to: endOf(node), text });
        return;
      }
      break;
    }
    case "linkReference": {
      const url = walk.definitions.get(node.identifier ?? "");
      if (url === undefined) break;
      href(url);
      const label = labelOf(walk, node);
      const text = drawable(walk, url) ? `[${label}](${url})` : `${label} (\`${url}\`)`;
      out.push({ from: startOf(node), to: endOf(node), text });
      return;
    }
    case "listItem": {
      if (node.checked === true || node.checked === false) {
        const first = node.children?.[0];
        const stop = first === undefined ? endOf(node) : startOf(first);
        const head = walk.source.slice(startOf(node), stop);
        const marker = /\[[ xX]\]/.exec(head);
        if (marker !== null) {
          const from = startOf(node) + marker.index;
          out.push({ from, to: from + 3, text: node.checked ? "☑" : "☐" });
        }
      }
      break;
    }
    case "code":
    case "inlineCode":
    case "definition":
      return;
  }
  for (const child of node.children ?? []) {
    rewrites(walk, child, node, inCell || node.type === "tableCell", out);
  }
}

function applyRewrites(text: string, base: number, edits: Replacement[]): string {
  let out = text;
  let floor = Number.POSITIVE_INFINITY;
  for (const edit of [...edits].sort((a, b) => b.from - a.from || b.to - a.to)) {
    if (edit.to > floor) continue;
    out = out.slice(0, edit.from - base) + edit.text + out.slice(edit.to - base);
    floor = edit.from;
  }
  return out;
}

const stripQuote = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.replace(/^ {0,3}>[ \t]?/, ""))
    .join("\n");

interface Builder {
  walk: Walk;
  lines: string[];
  lineStarts: number[];
}

const linesText = (b: Builder, start: number, end: number): string =>
  b.lines.slice(start - 1, end).join("\n");

function drawnText(b: Builder, node: Node, kind: BlockKind, start: number, text: string): string {
  if (kind === "fence") return node.value ?? "";
  if (kind === "thematic") return text;
  if (node.type === "definition") return "";
  const edits: Replacement[] = [];
  rewrites(b.walk, node, null, false, edits);
  const base = b.lineStarts[start - 1] ?? 0;
  const drawn = applyRewrites(text, base, edits);
  if (kind === "callout") return stripQuote(drawn).split("\n").slice(1).join("\n").trim();
  return drawn;
}

function childBlocks(b: Builder, node: Node, id: string, depth: number): Block[] | undefined {
  let nodes: Node[] = [];
  if (node.type === "list") nodes = node.children ?? [];
  else if (node.type === "blockquote") nodes = node.children ?? [];
  else return undefined;
  const out: Block[] = [];
  nodes.forEach((child, k) => {
    const start = child.position?.start.line ?? 1;
    const end = child.position?.end.line ?? start;
    const childId = `${id}.${k + 1}`;
    const text = linesText(b, start, end);
    if (child.type === "listItem") {
      const nested = (child.children ?? []).filter((inner) => inner.type === "list");
      const items = nested.flatMap((list) => childBlocks(b, list, childId, depth + 1) ?? []);
      const item: Block = { id: childId, kind: "list", level: depth, text, start, end };
      if (items.length > 0) item.children = items.map((entry, n) => ({ ...entry, id: `${childId}.${n + 1}` }));
      out.push(item);
    } else {
      const kind = kindOf(child, b.lines[start - 1] ?? "");
      const inner: Block = { id: childId, kind, text, start, end };
      if (child.type === "heading" && child.depth !== undefined) inner.level = child.depth;
      const nested = childBlocks(b, child, childId, depth + 1);
      if (nested !== undefined) inner.children = nested;
      out.push(inner);
    }
  });
  return out;
}

export interface Parsed {
  blocks: Block[];
  links: Link[];
}

/** Cuts Markdown source into blocks with ids, line ranges, source text and drawn text, and indexes its links. */
export function parseBlocks(source: string, origin: Origin | null = null): Parsed {
  const { tree, frontMatter } = parseMarkdown(source);
  const lines = splitLines(source);
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }
  const definitions = new Map<string, string>();
  for (const node of tree.children) {
    if (node.type === "definition" && node.identifier !== undefined && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url ?? "");
    }
  }
  const b: Builder = { walk: { source, definitions, origin, links: [] }, lines, lineStarts };
  const blocks: Block[] = [];
  const links: Link[] = [];
  const root = { level: 0, path: [] as number[], headings: 0, blocks: 0, id: "h" };
  const stack = [root];
  if (frontMatter !== null) {
    root.blocks++;
    const text = linesText(b, frontMatter.start, frontMatter.end);
    blocks.push({ id: `h:${root.blocks}`, kind: "raw", text, start: frontMatter.start, end: frontMatter.end });
  }
  for (const node of tree.children) {
    const start = node.position?.start.line ?? 1;
    const end = node.position?.end.line ?? start;
    const text = linesText(b, start, end);
    const kind = kindOf(node, lines[start - 1] ?? "");
    let id: string;
    if (kind === "heading") {
      const level = node.depth ?? 1;
      while ((stack.at(-1)?.level ?? 0) >= level) stack.pop();
      const parent = stack.at(-1) ?? root;
      parent.headings++;
      const path = [...parent.path, parent.headings];
      id = `h${path.join(".")}`;
      stack.push({ level, path, headings: 0, blocks: 0, id });
    } else {
      const section = stack.at(-1) ?? root;
      section.blocks++;
      id = `${section.id}:${section.blocks}`;
    }
    b.walk.links = [];
    const drawn = drawnText(b, node, kind, start, text);
    const block: Block = { id, kind, text, start, end };
    if (kind === "heading" && node.depth !== undefined) block.level = node.depth;
    if (drawn !== text) block.drawn = drawn;
    const children = childBlocks(b, node, id, 1);
    if (children !== undefined) block.children = children;
    blocks.push(block);
    for (const link of b.walk.links) links.push({ blockId: id, href: link.href, kind: classifyHref(link.href) });
  }
  return { blocks, links };
}

/** The text a block is drawn with: its source unless the drawn text differs. */
export function drawnOf(block: Block): string {
  return block.drawn ?? block.text;
}

/** The label of a callout block (`NOTE`, or `WARNING: title`), or null for any other block. */
export function calloutLabel(block: Block): string | null {
  if (block.kind !== "callout") return null;
  const match = CALLOUT.exec(block.text.split("\n")[0] ?? "");
  if (match === null) return null;
  const type = (match[1] ?? "").toUpperCase();
  const title = (match[2] ?? "").trim();
  return title === "" ? type : `${type}: ${title}`;
}

/** The fence's info-string language, or null when it has none or the block is not a fence. */
export function fenceLanguage(block: Block): string | null {
  if (block.kind !== "fence") return null;
  const match = /^ {0,3}(?:`{3,}|~{3,})[ \t]*([^\s`{]+)/.exec(block.text.split("\n")[0] ?? "");
  return match?.[1] ?? null;
}

/** A whole document: the source, its blocks, its outline and its link index. */
export function toDocument(path: string, mtimeMs: number, source: string, repoRoot: string): Document {
  const { blocks, links } = parseBlocks(source, { path, repoRoot });
  return { path, mtimeMs, source, blocks, outline: outline(blocks), links };
}
