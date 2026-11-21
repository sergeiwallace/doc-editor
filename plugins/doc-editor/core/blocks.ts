import type { Block, BlockKind, Document, Link } from "./types";
import { parseMarkdown, splitLines } from "./parse";
import type { Node } from "./parse";
import { codeSpan, decodeEntities, htmlToMarkdown, imageText, linkDestination, linkLabel } from "./html-subset";
import { classifyHref, isDrawableHref } from "./links";
import { outline } from "./outline";

/** Where the document lives, so the drawn text can tell an in-repository link from any other. */
export interface Origin {
  path: string;
  repoRoot: string;
}

export const CALLOUT = /^ {0,3}>[ \t]*\[!([A-Za-z]+)\][+-]?[ \t]*(.*?)\r?$/;

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

function linkMarkdown(walk: Walk, label: string, url: string): string {
  const destination = linkDestination(url);
  const text = linkLabel(label);
  if (drawable(walk, destination)) return `[${text}](${destination})`;
  return label === "" || label === url ? codeSpan(url) : `${text} (${codeSpan(url)})`;
}

const PHRASING_PARENTS = new Set([
  "paragraph",
  "heading",
  "emphasis",
  "strong",
  "delete",
  "link",
  "linkReference",
]);

function rewrites(walk: Walk, node: Node, parent: Node | null, inCell: boolean, out: Replacement[]): void {
  const href = (url: string) => walk.links.push({ href: url, offset: startOf(node) });
  switch (node.type) {
    case "html": {
      const context = inCell ? "cell" : parent !== null && PHRASING_PARENTS.has(parent.type) ? "inline" : "flow";
      const value = node.value ?? "";
      for (const match of value.matchAll(ANCHOR_HREF)) href(match[1] ?? match[2] ?? match[3] ?? "");
      const text = htmlToMarkdown(value, context, (url) => drawable(walk, url));
      out.push({ from: startOf(node), to: endOf(node), text });
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
    case "link":
    case "linkReference": {
      const url = node.type === "link" ? (node.url ?? "") : walk.definitions.get(node.identifier ?? "");
      if (url === undefined) break;
      href(url);
      const children = node.children ?? [];
      const first = children[0];
      const last = children.at(-1);
      const inner: Replacement[] = [];
      for (const child of children) rewrites(walk, child, node, inCell, inner);
      const label =
        first === undefined || last === undefined
          ? ""
          : applyRewrites(walk.source.slice(startOf(first), endOf(last)), startOf(first), inner);
      out.push({ from: startOf(node), to: endOf(node), text: linkMarkdown(walk, label, url) });
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
  const children = node.children ?? [];
  const cell = inCell || node.type === "tableCell";
  for (let k = 0; k < children.length; k++) {
    const child = children[k];
    if (child === undefined) continue;
    const close = anchorClose(children, k);
    if (close < 0) {
      rewrites(walk, child, node, cell, out);
      continue;
    }
    k = anchorRewrite(walk, node, children, k, close, cell, out);
  }
}

const ANCHOR_HREF = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const ANCHOR_OPEN = /^<a\b[^>]*>$/i;
const ANCHOR_CLOSE = /^<\/a\s*>$/i;

function anchorClose(children: readonly Node[], k: number): number {
  const open = children[k];
  if (open?.type !== "html" || !ANCHOR_OPEN.test(open.value ?? "")) return -1;
  for (let j = k + 1; j < children.length; j++) {
    const next = children[j];
    if (next?.type === "html" && ANCHOR_CLOSE.test(next.value ?? "")) return j;
  }
  return -1;
}

function anchorRewrite(
  walk: Walk,
  parent: Node,
  children: readonly Node[],
  open: number,
  close: number,
  cell: boolean,
  out: Replacement[],
): number {
  const first = children[open];
  const last = children[close];
  if (first === undefined || last === undefined) return close;
  const tag = first.value ?? "";
  const match = new RegExp(ANCHOR_HREF.source, "i").exec(tag);
  const url = match === null ? null : decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
  const inner: Replacement[] = [];
  for (let j = open + 1; j < close; j++) {
    const child = children[j];
    if (child !== undefined) rewrites(walk, child, parent, cell, inner);
  }
  const label = applyRewrites(walk.source.slice(endOf(first), startOf(last)), endOf(first), inner);
  let text = label;
  if (url !== null) {
    walk.links.push({ href: url, offset: startOf(first) });
    text = linkMarkdown(walk, label, url);
  }
  out.push({ from: startOf(first), to: endOf(last), text });
  return close;
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
