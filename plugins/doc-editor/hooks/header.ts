// The pane's header row (design, The pane): the path and heading path on the first line; the mode
// word, the read time and the find state on the second. Plain values in, plain strings out.

import { drawnOf } from "../core/blocks.ts";
import { hitLabel } from "../core/find.ts";
import { headingPath } from "../core/outline.ts";
import type { Block, FindState, ViewMode } from "../core/types.ts";

/** Words a minute the read time assumes. */
export const WORDS_PER_MINUTE = 265;

const MODE_WORD: Record<ViewMode, string> = { read: "READ", edit: "EDIT", diff: "DIFF" };

/** Whole minutes to read the blocks' drawn text at WORDS_PER_MINUTE, at least 1. */
export function readMinutes(blocks: readonly Block[]): number {
  let words = 0;
  for (const block of blocks) words += drawnOf(block).split(/\s+/).filter((word) => word !== "").length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** A path as the header shows it: relative to the repository root when it lies inside it. */
export function shownPath(path: string, repoRoot: string): string {
  const root = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  return path.startsWith(root) ? path.slice(root.length) : path;
}

export interface HeaderInput {
  path: string;
  repoRoot: string;
  blocks: readonly Block[];
  /** The block whose heading path the header shows: the focused block, else the drilled section. */
  at: string | null;
  mode: ViewMode;
  find: FindState | null;
  drill: string | null;
  /** Minutes to read, computed once per document. */
  minutes: number;
  /** How many blocks carry a marker for a change Claude made. */
  changed?: number;
}

export interface Header {
  title: string;
  status: string;
}

/** The two header lines for the document view. */
export function documentHeader(input: HeaderInput): Header {
  const trail = input.at === null ? [] : headingPath(input.blocks, input.at).map((entry) => entry.title);
  const title = [shownPath(input.path, input.repoRoot), ...trail].join(" › ");
  const parts = [MODE_WORD[input.mode], `${input.minutes} min read`];
  if (input.drill !== null) parts.push("section · u up");
  if (input.find !== null) parts.push(`find "${input.find.query}" ${hitLabel(input.find)}`);
  if ((input.changed ?? 0) > 0) parts.push(`${input.changed} changed by Claude`);
  return { title, status: parts.join(" · ") };
}

/** The two header lines for the diff view: which turn of how many, and its blocks. */
export function diffHeader(path: string, repoRoot: string, turn: number, turns: number, blocks: number): Header {
  return {
    title: `${shownPath(path, repoRoot)} › Changes this session`,
    status: `DIFF · turn ${turn} of ${turns} · ${blocks} ${blocks === 1 ? "block" : "blocks"} · n/p turn · v back`,
  };
}

/** The two header lines for the outline view. */
export function outlineHeader(path: string, repoRoot: string, headings: number): Header {
  return {
    title: `${shownPath(path, repoRoot)} › Outline`,
    status: `OUTLINE · ${headings} headings · Enter jumps · o back`,
  };
}
