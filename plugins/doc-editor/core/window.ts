// The windowed renderer's core (design, The windowed renderer; D-2). Blocks become pieces, the
// keyed elements the pane draws, and a page is the run of pieces from the view's offset that fills
// `bodyRows`. A piece's text is never over 9,000 characters: a longer block is split at paragraph
// boundaries, and one that cannot be split (a fence, a table, a single long paragraph) is drawn as
// consecutive Code slices, each carrying a continuation marker. A page stays within 60,000
// serialized characters, so with the header and hint rows the tree stays under the engine's
// 100,000-character draw limit, past which the engine cuts text without refusing the tree.
//
// `ViewState.offset` is an index into the visible pieces, never a row: the mod answers `ui.scroll`
// itself and moves by pieces, so the engine's own window never moves.

import type { Block, ViewState } from "./types.ts";
import { calloutLabel, drawnOf, fenceLanguage } from "./blocks.ts";
import { visibleBlocks } from "./outline.ts";

export const ELEMENT_LIMIT = 9_000;
export const PAGE_BUDGET = 60_000;
export const TREE_LIMIT = 100_000;

interface PieceBase {
  key: string;
  blockId: string;
  text: string;
  /** Estimated rows the piece takes when wrapped at the pane's width, its spacing included. */
  rows: number;
}

export interface MarkdownPiece extends PieceBase {
  type: "markdown";
}

export interface CodePiece extends PieceBase {
  type: "code";
  format: string;
  /** `part 2 of 5` on each slice of a block cut into several; null for a whole block. */
  marker: string | null;
}

export interface CalloutPiece extends PieceBase {
  type: "callout";
  label: string;
}

export type Piece = MarkdownPiece | CodePiece | CalloutPiece;

export interface Size {
  bodyRows: number;
  bodyColumns: number;
}

/** Estimated rows of text wrapped at `columns`: each line takes at least one row. */
export function rowsOf(text: string, columns: number): number {
  const width = Math.max(columns, 1);
  let rows = 0;
  for (const line of text.split("\n")) rows += Math.max(1, Math.ceil(line.length / width));
  return rows;
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;

/** Cuts text into slices of at most `limit` characters, at a line end where one is near. */
export function sliceText(text: string, limit: number = ELEMENT_LIMIT): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit - 1) + 1;
    if (cut < limit / 2) {
      cut = limit;
      if (isHighSurrogate(rest.charCodeAt(cut - 1))) cut--;
    }
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  out.push(rest);
  return out;
}

const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;

const QUOTE_BLANK = /^(?: {0,3}>)+[ \t]*$/;

/**
 * Splits Markdown text at blank lines outside fences into its paragraphs, in order. In a quote a
 * line holding only `>` markers is the blank line, and it is dropped with the others.
 */
export function paragraphs(text: string, quoted = false): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  for (const line of text.split("\n")) {
    const open = FENCE_LINE.exec(line)?.[1];
    if (open !== undefined) {
      if (fence === null) fence = open;
      else if (open[0] === fence[0] && open.length >= fence.length) fence = null;
    }
    const blank = line.trim() === "" || (quoted && QUOTE_BLANK.test(line));
    if (fence === null && blank && current.length > 0) {
      out.push(current.join("\n"));
      current = [];
    } else if (!(blank && current.length === 0)) {
      current.push(line);
    }
  }
  if (current.length > 0) out.push(current.join("\n"));
  return out;
}

/** Packs paragraphs into chunks of at most `limit` characters, joined by blank lines, in order. */
function pack(parts: string[], limit: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const part of parts) {
    const joined = current === "" ? part : `${current}\n\n${part}`;
    if (joined.length <= limit) {
      current = joined;
    } else {
      if (current !== "") out.push(current);
      current = part;
    }
  }
  if (current !== "") out.push(current);
  return out;
}

function codeSlices(block: Block, text: string, format: string, columns: number, keyPrefix: string): CodePiece[] {
  const slices = sliceText(text);
  return slices.map((slice, k) => ({
    type: "code",
    key: slices.length === 1 ? keyPrefix : `${keyPrefix}~c${k + 1}`,
    blockId: block.id,
    text: slice,
    format,
    marker: slices.length === 1 ? null : `part ${k + 1} of ${slices.length}`,
    rows: rowsOf(slice, columns - 2) + (slices.length === 1 ? 1 : 2),
  }));
}

/** The pieces one block draws as, in order. A block whose drawn text is empty draws nothing. */
export function blockPieces(block: Block, columns: number): Piece[] {
  const text = drawnOf(block);
  if (text.trim() === "") return [];
  if (block.kind === "fence") return codeSlices(block, text, fenceLanguage(block) ?? "text", columns, block.id);
  if (block.kind === "raw" && block.start === 1 && /^---/.test(block.text)) {
    return codeSlices(block, text, "yaml", columns, block.id);
  }
  if (text.length <= ELEMENT_LIMIT) {
    if (block.kind === "callout") {
      const label = calloutLabel(block) ?? "NOTE";
      return [{ type: "callout", key: block.id, blockId: block.id, text, label, rows: rowsOf(text, columns - 4) + 3 }];
    }
    return [{ type: "markdown", key: block.id, blockId: block.id, text, rows: rowsOf(text, columns) + 1 }];
  }
  const chunks = block.kind === "table" ? [text] : pack(paragraphs(text, block.kind === "quote"), ELEMENT_LIMIT);
  if (chunks.length === 1) return codeSlices(block, text, "markdown", columns, block.id);
  const out: Piece[] = [];
  chunks.forEach((chunk, k) => {
    const key = `${block.id}~p${k + 1}`;
    if (chunk.length > ELEMENT_LIMIT) {
      out.push(...codeSlices(block, chunk, "markdown", columns, key));
    } else if (block.kind === "callout") {
      const label = calloutLabel(block) ?? "NOTE";
      out.push({
        type: "callout",
        key,
        blockId: block.id,
        text: chunk,
        label: k === 0 ? label : `${label} (continued)`,
        rows: rowsOf(chunk, columns - 4) + 3,
      });
    } else {
      out.push({ type: "markdown", key, blockId: block.id, text: chunk, rows: rowsOf(chunk, columns) + 1 });
    }
  });
  return out;
}

/** Every piece of the blocks a view shows, after folding and drill-in, in order. */
export function viewPieces(blocks: readonly Block[], view: Pick<ViewState, "folded" | "drill">, columns: number): Piece[] {
  return visibleBlocks(blocks, view.folded, view.drill).flatMap((block) => blockPieces(block, columns));
}

/** The size a piece adds to the serialized tree. */
export function serializedSize(piece: Piece): number {
  return JSON.stringify(piece).length;
}

/** The last offset worth scrolling to: from it, the remaining pieces fill the body. */
export function maxOffset(pieces: readonly Piece[], bodyRows: number): number {
  let rows = 0;
  for (let k = pieces.length - 1; k >= 0; k--) {
    rows += pieces[k]?.rows ?? 1;
    if (rows > bodyRows) return Math.min(k + 1, pieces.length - 1);
  }
  return 0;
}

const clampOffset = (pieces: readonly Piece[], offset: number, bodyRows: number): number =>
  Math.min(Math.max(Math.trunc(offset), 0), maxOffset(pieces, bodyRows));

export interface Page {
  pieces: Piece[];
  /** The offset the page starts at, clamped to the pieces. */
  offset: number;
  /** How many pieces the view has in all. */
  total: number;
  /** The serialized size of the page's pieces. */
  size: number;
  /** True when the page shows the last piece. */
  atEnd: boolean;
}

/**
 * The page from `offset`: pieces in order while their rows fit `bodyRows` and their serialized
 * size fits the page budget. The first piece is always drawn, so a tall piece still shows.
 */
export function pageAt(pieces: readonly Piece[], offset: number, size: Size): Page {
  const start = clampOffset(pieces, offset, size.bodyRows);
  const out: Piece[] = [];
  let rows = 0;
  let bytes = 0;
  for (let k = start; k < pieces.length; k++) {
    const piece = pieces[k];
    if (piece === undefined) break;
    const cost = serializedSize(piece);
    if (out.length > 0 && (rows >= size.bodyRows || bytes + cost > PAGE_BUDGET)) break;
    out.push(piece);
    rows += piece.rows;
    bytes += cost;
  }
  return { pieces: out, offset: start, total: pieces.length, size: bytes, atEnd: start + out.length >= pieces.length };
}

/** The page a view shows. */
export function renderView(blocks: readonly Block[], view: ViewState, size: Size): Page {
  return pageAt(viewPieces(blocks, view, size.bodyColumns), view.offset, size);
}

/**
 * The offset after a `ui.scroll` move of `by` rows: whole pieces, at least one for any non-zero
 * move, clamped so the last page stays full.
 */
export function scrollOffset(pieces: readonly Piece[], offset: number, by: number, size: Size): number {
  let at = clampOffset(pieces, offset, size.bodyRows);
  const last = maxOffset(pieces, size.bodyRows);
  let remaining = Math.abs(Math.trunc(by));
  if (remaining === 0) return at;
  if (by > 0) {
    while (remaining > 0 && at < last) {
      remaining -= pieces[at]?.rows ?? 1;
      at++;
    }
  } else {
    while (remaining > 0 && at > 0) {
      at--;
      remaining -= pieces[at]?.rows ?? 1;
    }
  }
  return at;
}

/** The index of a block's first piece, or -1 when the view does not draw the block. */
export function pieceIndex(pieces: readonly Piece[], blockId: string): number {
  return pieces.findIndex((piece) => piece.blockId === blockId);
}

/**
 * The offset that brings a block into view, moving the least: unchanged when its first piece is on
 * the page, else the offset that puts it first (above) or last (below). Unchanged when the view
 * does not draw the block.
 */
export function revealOffset(pieces: readonly Piece[], offset: number, blockId: string, size: Size): number {
  const target = pieceIndex(pieces, blockId);
  const start = clampOffset(pieces, offset, size.bodyRows);
  if (target < 0) return start;
  if (target < start) return target;
  const page = pageAt(pieces, start, size);
  if (target < start + page.pieces.length) return start;
  let rows = 0;
  let at = target;
  while (at >= 0) {
    rows += pieces[at]?.rows ?? 1;
    if (rows > size.bodyRows) break;
    at--;
  }
  return clampOffset(pieces, Math.min(at + 1, target), size.bodyRows);
}
