// Find in page: case-insensitive search over the text each block draws, with next and previous.

import type { Block, FindState } from "./types.ts";
import { drawnOf } from "./blocks.ts";

/** The ids of the blocks whose drawn text contains the query, ignoring case, in document order. */
export function findHits(blocks: readonly Block[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return blocks.filter((block) => drawnOf(block).toLowerCase().includes(needle)).map((block) => block.id);
}

/**
 * Starts a search: `at` is the first hit after the focused block (from the top when nothing is
 * focused), wrapping to the first hit.
 * With no hit, or a blank query, `hits` is empty and `at` is -1.
 */
export function startFind(blocks: readonly Block[], query: string, focus: string | null): FindState {
  const hits = findHits(blocks, query);
  if (hits.length === 0) return { query, hits, at: -1 };
  const after = focus === null ? -1 : blocks.findIndex((block) => block.id === focus);
  const order = new Map(blocks.map((block, k) => [block.id, k]));
  const at = hits.findIndex((id) => (order.get(id) ?? 0) > after);
  return { query, hits, at: at < 0 ? 0 : at };
}

/** Moves to the next (`1`) or previous (`-1`) hit, wrapping at either end. */
export function stepFind(state: FindState, direction: 1 | -1): FindState {
  if (state.hits.length === 0) return { ...state, at: -1 };
  const at = (((state.at + direction) % state.hits.length) + state.hits.length) % state.hits.length;
  return { ...state, at };
}

/** The focused hit's block id, or null when there is none. */
export function currentHit(state: FindState): string | null {
  return state.at < 0 ? null : (state.hits[state.at] ?? null);
}

/** The header's hit count: `3 of 12`, or `no match`. */
export function hitLabel(state: FindState): string {
  return state.hits.length === 0 ? "no match" : `${state.at + 1} of ${state.hits.length}`;
}
