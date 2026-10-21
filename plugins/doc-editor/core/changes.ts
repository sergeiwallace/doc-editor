// What Claude changed: the old and new blocks of a file aligned by source text, one `Change` per
// changed run of blocks in a turn, the turn's unified diff for a `Code` element with format `diff`,
// and the check that keeps a discard from writing over text that changed again.

import type { Block, Change } from "./types.ts";

/** Pairs of old and new block indices whose source text is equal, in order (a longest common run). */
export function alignBlocks(before: readonly Block[], after: readonly Block[]): [number, number][] {
  const pairs: [number, number][] = [];
  let head = 0;
  while (head < before.length && head < after.length && before[head]?.text === after[head]?.text) {
    pairs.push([head, head]);
    head++;
  }
  let tailOld = before.length;
  let tailNew = after.length;
  while (tailOld > head && tailNew > head && before[tailOld - 1]?.text === after[tailNew - 1]?.text) {
    tailOld--;
    tailNew--;
  }
  const middle = lcs(
    before.slice(head, tailOld).map((block) => block.text),
    after.slice(head, tailNew).map((block) => block.text),
  ).map(([a, b]): [number, number] => [a + head, b + head]);
  pairs.push(...middle);
  for (let k = 0; tailOld + k < before.length; k++) pairs.push([tailOld + k, tailNew + k]);
  return pairs;
}

const LCS_CELLS = 4_000_000;

// The longest common subsequence of two string lists. Past the table limit it matches each new
// text to the next unused equal old text in order, which finds every unchanged block that keeps
// its order and marks the rest changed.
function lcs(a: readonly string[], b: readonly string[]): [number, number][] {
  if (a.length === 0 || b.length === 0) return [];
  if (a.length * b.length > LCS_CELLS) {
    const pairs: [number, number][] = [];
    let from = 0;
    for (let j = 0; j < b.length; j++) {
      const i = a.indexOf(b[j] ?? "", from);
      if (i >= 0) {
        pairs.push([i, j]);
        from = i + 1;
      }
    }
    return pairs;
  }
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/** The ids of the new blocks whose source text matches no old block in the alignment. */
export function changedBlockIds(before: readonly Block[], after: readonly Block[]): string[] {
  const kept = new Set(alignBlocks(before, after).map(([, j]) => j));
  return after.filter((_, j) => !kept.has(j)).map((block) => block.id);
}


/**
 * Old block id to new block id for every block the alignment keeps, so focus, folds and drill-in
 * can follow a block across a reload even when an earlier insertion renumbered it. A block whose
 * text changed has no entry.
 */
export function mapBlockIds(before: readonly Block[], after: readonly Block[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [i, j] of alignBlocks(before, after)) {
    const from = before[i];
    const to = after[j];
    if (from !== undefined && to !== undefined) map[from.id] = to.id;
  }
  return map;
}

/**
 * The source as lines that each keep their own line ending, so that joining them gives the source
 * back byte for byte and a change to a line ending (the final newline included) is a changed line.
 */
export function sourceLines(source: string): string[] {
  return source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

const lineRange = (lines: readonly string[], start: number, end: number): string =>
  end < start ? "" : lines.slice(start - 1, end).join("");

const blockText = (lines: readonly string[], block: Block): string => lineRange(lines, block.start, block.end);

/**
 * The changes one turn made, one per changed run between unchanged blocks, the blank lines between
 * blocks and the final newline included. `start` and `end` are the run's lines in the new source
 * (`end` is `start - 1` when the run only removed text); `before` and `after` are the old and new
 * text of those lines, each line with its line ending. A run that leaves no block of its own in
 * the new source (a deletion, or a change only to blank lines) marks the surviving block after
 * it, or the one before it at the end of the file, so it can still be reviewed and discarded.
 */
export function recordChanges(
  turn: string,
  before: { source: string; blocks: readonly Block[] },
  after: { source: string; blocks: readonly Block[] },
): Change[] {
  const oldLines = sourceLines(before.source);
  const newLines = sourceLines(after.source);
  // A block whose text is equal but whose last line ending changed is a changed block.
  const pairs = alignBlocks(before.blocks, after.blocks).filter(([i, j]) => {
    const a = before.blocks[i];
    const b = after.blocks[j];
    return a !== undefined && b !== undefined && blockText(oldLines, a) === blockText(newLines, b);
  });
  const anchors: [number, number][] = [[-1, -1], ...pairs, [before.blocks.length, after.blocks.length]];
  const changes: Change[] = [];
  for (let k = 1; k < anchors.length; k++) {
    const [i0, j0] = anchors[k - 1] ?? [-1, -1];
    const [i1, j1] = anchors[k] ?? [0, 0];
    const oldStart = (before.blocks[i0]?.end ?? 0) + 1;
    const oldEnd = (before.blocks[i1]?.start ?? oldLines.length + 1) - 1;
    const newStart = (after.blocks[j0]?.end ?? 0) + 1;
    const newEnd = (after.blocks[j1]?.start ?? newLines.length + 1) - 1;
    const [from, to, start, end] = trimCommon(oldLines, oldStart, oldEnd, newLines, newStart, newEnd);
    if (to < from && end < start) continue;
    let blockIds = after.blocks.slice(j0 + 1, j1).map((block) => block.id);
    if (blockIds.length === 0) blockIds = neighbour(after.blocks, j0, j1);
    changes.push({
      turn,
      blockIds,
      before: lineRange(oldLines, from, to),
      after: lineRange(newLines, start, end),
      start,
      end,
    });
  }
  return changes;
}

// The block a run that changed no new block is marked on: the one after it, or the one before it
// at the end of the file.
function neighbour(blocks: readonly Block[], before: number, after: number): string[] {
  const block = blocks[after] ?? blocks[before];
  return block === undefined ? [] : [block.id];
}

// Narrows an old and a new line range by the equal lines they open and close with, such as the
// blank lines between blocks, so a change holds only the lines that differ.
function trimCommon(
  a: readonly string[],
  a0: number,
  a1: number,
  b: readonly string[],
  b0: number,
  b1: number,
): [number, number, number, number] {
  let [from, to, start, end] = [a0, a1, b0, b1];
  while (from <= to && start <= end && a[from - 1] === b[start - 1]) {
    from++;
    start++;
  }
  while (from <= to && start <= end && a[to - 1] === b[end - 1]) {
    to--;
    end--;
  }
  return [from, to, start, end];
}

/** The ids of every block the changes mark, for the margin markers. */
export function markedBlockIds(changes: readonly Change[]): string[] {
  return [...new Set(changes.flatMap((change) => change.blockIds))];
}

const hunk = (sign: string, text: string): string[] =>
  sourceLines(text).flatMap((line) =>
    line.endsWith("\n")
      ? [`${sign}${line.slice(0, -1).replace(/\r$/, "")}`]
      : [`${sign}${line.replace(/\r$/, "")}`, "\\ No newline at end of file"],
  );

/**
 * One turn's unified diff, for a `Code` element with format `diff`. The changes must be one turn's
 * record, in order, as `recordChanges` returns them: each hunk's old line numbers are its new ones
 * less the lines the hunks above it added.
 */
export function turnDiff(path: string, changes: readonly Change[]): string {
  const out = [`--- a/${path}`, `+++ b/${path}`];
  let shift = 0;
  for (const change of changes) {
    const removed = sourceLines(change.before).length;
    const added = sourceLines(change.after).length;
    const newStart = added === 0 ? change.start - 1 : change.start;
    const oldStart = removed === 0 ? change.start - 1 - shift : change.start - shift;
    out.push(`@@ -${oldStart},${removed} +${newStart},${added} @@`);
    out.push(...hunk("-", change.before), ...hunk("+", change.after));
    shift += added - removed;
  }
  return out.join("\n");
}

/** Every turn's diff, grouped by turn in the order the turns first appear. */
export function diffsByTurn(path: string, changes: readonly Change[]): { turn: string; diff: string }[] {
  const turns: string[] = [];
  for (const change of changes) if (!turns.includes(change.turn)) turns.push(change.turn);
  return turns.map((turn) => ({ turn, diff: turnDiff(path, changes.filter((change) => change.turn === turn)) }));
}

export type Discard = { ok: true; source: string } | { ok: false; reason: string };

/**
 * The source with a change undone: its lines put back to the text before the turn. Refused when
 * the current text at those lines is no longer the text the turn left.
 */
export function discardChange(change: Change, currentSource: string): Discard {
  const lines = sourceLines(currentSource);
  const inRange = change.start >= 1 && change.end >= change.start - 1 && change.end <= lines.length;
  if (!inRange || lineRange(lines, change.start, change.end) !== change.after) {
    return { ok: false, reason: `lines ${change.start}-${change.end} changed again since the turn; nothing was discarded` };
  }
  const next = [...lines.slice(0, change.start - 1), change.before, ...lines.slice(change.end)];
  return { ok: true, source: next.join("") };
}
