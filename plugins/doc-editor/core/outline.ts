// The heading outline, sections, heading paths, folding, drill-in and `:N` or `#heading` lookup.
// Every function takes the document's top-level blocks and returns plain values.

import type { Block, OutlineEntry } from "./types.ts";
import { parseMarkdown, plainText } from "./parse.ts";

/** A heading block's title as plain text, with its Markdown markers and inline syntax removed. */
export function headingTitle(block: Block): string {
  const { tree } = parseMarkdown(block.text);
  const node = tree.children.find((child) => child.type === "heading");
  return node === undefined ? block.text.trim() : plainText(node).trim();
}

/** The outline: every top-level heading in source order. */
export function outline(blocks: readonly Block[]): OutlineEntry[] {
  return blocks
    .filter((block) => block.kind === "heading")
    .map((block) => ({ id: block.id, level: block.level ?? 1, title: headingTitle(block) }));
}

/** GitHub's heading anchor: lower case, punctuation removed, spaces as hyphens. */
export function slug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/** The anchor of each outline entry, in order, with GitHub's `-1`, `-2` suffixes on repeats. */
export function headingSlugs(entries: readonly OutlineEntry[]): string[] {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const base = slug(entry.title);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  });
}

const indexOf = (blocks: readonly Block[], id: string): number =>
  blocks.findIndex((block) => block.id === id);

/**
 * The block range a heading owns, as indices `[from, to)` into `blocks`: the heading and every
 * block up to the next heading of the same or a higher level. Null when `id` is not a heading.
 */
export function sectionOf(
  blocks: readonly Block[],
  id: string,
): { from: number; to: number } | null {
  const from = indexOf(blocks, id);
  const heading = blocks[from];
  if (heading === undefined || heading.kind !== "heading") return null;
  const level = heading.level ?? 1;
  let to = from + 1;
  while (to < blocks.length) {
    const next = blocks[to];
    if (next !== undefined && next.kind === "heading" && (next.level ?? 1) <= level) break;
    to++;
  }
  return { from, to };
}

/** The headings above a block, outermost first; a heading's own path ends with itself. */
export function headingPath(blocks: readonly Block[], id: string): OutlineEntry[] {
  const at = indexOf(blocks, id);
  if (at < 0) return [];
  const path: Block[] = [];
  for (let k = at; k >= 0; k--) {
    const block = blocks[k];
    if (block === undefined || block.kind !== "heading") continue;
    const level = block.level ?? 1;
    const inner = path[0];
    if (inner === undefined || level < (inner.level ?? 1)) path.unshift(block);
    if (level === 1) break;
  }
  return path.map((block) => ({ id: block.id, level: block.level ?? 1, title: headingTitle(block) }));
}

/** The heading whose section holds the block: the block itself when it is a heading. */
export function owningHeading(blocks: readonly Block[], id: string): string | null {
  const at = indexOf(blocks, id);
  for (let k = at; k >= 0; k--) {
    const block = blocks[k];
    if (block?.kind === "heading") return block.id;
  }
  return null;
}

/** Folds the heading when it is open and opens it when it is folded. A non-heading is ignored. */
export function toggleFold(blocks: readonly Block[], folded: readonly string[], id: string): string[] {
  if (blocks[indexOf(blocks, id)]?.kind !== "heading") return [...folded];
  return folded.includes(id) ? folded.filter((entry) => entry !== id) : [...folded, id];
}

/** Folds every heading, or opens every heading when all are already folded. */
export function toggleFoldAll(blocks: readonly Block[], folded: readonly string[]): string[] {
  const headings = blocks.filter((block) => block.kind === "heading").map((block) => block.id);
  const allFolded = headings.length > 0 && headings.every((id) => folded.includes(id));
  return allFolded ? [] : headings;
}

/** The parent section of a drilled-in section, or null for the whole document. */
export function drillUp(blocks: readonly Block[], drill: string | null): string | null {
  if (drill === null) return null;
  const path = headingPath(blocks, drill);
  return path.length >= 2 ? (path.at(-2)?.id ?? null) : null;
}

/**
 * The blocks to draw: only the drilled-in section when `drill` names a heading, and without the
 * blocks under a folded heading (the folded heading itself stays).
 */
export function visibleBlocks(
  blocks: readonly Block[],
  folded: readonly string[],
  drill: string | null,
): Block[] {
  let range = { from: 0, to: blocks.length };
  if (drill !== null) range = sectionOf(blocks, drill) ?? range;
  const foldedSet = new Set(folded);
  const out: Block[] = [];
  let hideBelow: number | null = null;
  for (let k = range.from; k < range.to; k++) {
    const block = blocks[k];
    if (block === undefined) continue;
    if (block.kind === "heading" && hideBelow !== null && (block.level ?? 1) <= hideBelow) {
      hideBelow = null;
    }
    if (hideBelow !== null) continue;
    out.push(block);
    if (block.kind === "heading" && foldedSet.has(block.id)) hideBelow = block.level ?? 1;
  }
  return out;
}

/** How many blocks a folded heading hides, for the outline's "(folded, N)" note. */
export function hiddenCount(blocks: readonly Block[], id: string): number {
  const section = sectionOf(blocks, id);
  return section === null ? 0 : section.to - section.from - 1;
}

export type Place = { line: number } | { heading: string };

/**
 * The block to focus for `path:N` (the block holding line N, else the next block after it) or
 * `path#heading` (the heading whose anchor matches). Null when the line is before line 1 or past
 * the last block, or no heading has that anchor.
 */
export function locate(blocks: readonly Block[], place: Place): string | null {
  if ("line" in place) {
    if (!Number.isInteger(place.line) || place.line < 1) return null;
    const hit = blocks.find((block) => block.end >= place.line);
    return hit?.id ?? null;
  }
  const entries = outline(blocks);
  const at = headingSlugs(entries).indexOf(slug(place.heading));
  return entries[at]?.id ?? null;
}
