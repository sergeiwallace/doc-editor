// The reader pane (design, The pane; The windowed renderer; FR-1 to FR-3, FR-7's redraw): it opens
// a Markdown file, draws only the pieces in view through the core's window, answers its own
// `ui.scroll`, and navigates with the outline, folding, drill-in, find and links with Back. It
// holds no `$`: register.ts binds it to a PaneHost of plain closures at session start. Every
// document rule is the core's; this file keeps the view state and draws it.

import type { Elements, RenderElement } from "claude-code";

import { toDocument } from "../core/blocks.ts";
import { linkDestination } from "../core/html-subset.ts";
import { diffsByTurn, discardChange, mapBlockIds } from "../core/changes.ts";
import {
  diffPages,
  editableLines,
  firstWords,
  lineAt,
  replaceLine,
  requestText,
  taskLines,
  toggleTask,
} from "../core/edits.ts";
import { currentHit, startFind, stepFind } from "../core/find.ts";
import { checkTarget, classifyHref, normalizePath, parseLocation, resolveLink, type TargetFacts } from "../core/links.ts";
import {
  drillUp,
  headingPath,
  hiddenCount,
  locate,
  owningHeading,
  sectionOf,
  toggleFold,
  toggleFoldAll,
} from "../core/outline.ts";
import type { Block, Change, Document, HistoryEntry, ViewState } from "../core/types.ts";
import {
  ELEMENT_LIMIT,
  PAGE_BUDGET,
  pageAt,
  type Piece,
  pieceIndex,
  revealOffset,
  rowsOf,
  scrollOffset,
  type Size,
  viewPieces,
} from "../core/window.ts";
import { diffHeader, documentHeader, type Header, outlineHeader, readMinutes, shownPath } from "./header.ts";
import { bindingsFor, hintRow, hintRows, type KeyBinding, type Screen } from "./hints.ts";
import { type Ask, Review, type Snapshot } from "./review.ts";
import type { FileStamp, Save } from "./save.ts";
import { naturalWidth, parseTable, tableCards } from "./tables.ts";
import type { Reload, Watcher } from "./watch.ts";

export const PANE_ID = "doc";
/** What `$.fs.read` can read, and so the largest document the pane opens. */
export const MAX_BYTES = 4 * 1024 * 1024;
export const FIND_INPUT = "find";
export const FIND_NEXT = "find-next";
export const GOTO_INPUT = "goto";
/** The field `c` and `r` open: the instruction for Claude. */
export const ASK_INPUT = "ask";
/** The single-line field `e` opens on a heading, list item or table row. */
export const EDIT_INPUT = "edit";
/** The field that asks which line to edit when a block has more than MAX_LINE_BUTTONS. */
export const LINE_INPUT = "edit-line";
export const EMPTY_TEXT = "No document is open. Run /doc <path> to open one.";

/** The keep, discard, refine and view-diff Buttons drawn under a changed block. */
export const CHANGE_ACTIONS = { keep: "change:keep", discard: "change:discard", refine: "change:refine", diff: "change:diff" } as const;
/** The Button of a task checkbox at line `n`, and of an editable line `n` when `e` asks which. */
export const taskButton = (line: number): string => `task:${line}`;
export const lineButton = (line: number): string => `line:${line}`;
const MAX_LINE_BUTTONS = 12;

type Field = typeof FIND_INPUT | typeof GOTO_INPUT | typeof ASK_INPUT | typeof EDIT_INPUT | typeof LINE_INPUT;

/** The header's two lines above the body. */
const HEADER_ROWS = 2;
/** The focus marker's column beside every piece. */
const MARGIN_COLUMNS = 2;
const MAX_LINK_BUTTONS = 9;
/** What one drawn frame (a piece's Box and margin, a card, a link Button) adds beside its text, serialized. */
const PIECE_FRAME_COST = 400;
const MAX_PRESSABLE = 256;

/** The elements the pane draws with; mobile has no Input, so the find and go-to fields are left out there. */
export type PaneUi = Pick<Elements["terminal"], "Box" | "Text" | "Button" | "Markdown" | "Code"> &
  Partial<Pick<Elements["terminal"], "Input">>;

/** What `$.fs.stat(path, { resolve: true })` answers, as the pane reads it. */
export interface FileFacts {
  kind: "file" | "dir" | "other";
  size: number;
  mtimeMs: number;
  realPath?: string;
}

/** The engine as the pane uses it: closures register.ts builds from `$`. */
export interface PaneHost {
  /** The session's working directory: where a relative path is read from. */
  cwd: string;
  /** The repository root with its symlinks resolved: links may not leave it. */
  repoRoot: string;
  /** `$.fs.stat(path, { resolve: true })`; rejects when the path is missing. */
  stat: (path: string) => Promise<FileFacts>;
  /** `$.fs.read(path, { as: "bytes" })`'s base64. */
  readBytes: (path: string) => Promise<string>;
  /** `$.ui.open` of the pane. */
  open: (args: { title: string; focus: boolean }) => Promise<{ isPlaced: boolean; reason?: string }>;
  /** `$.ui.close` of the pane. */
  close: () => Promise<void>;
  /** `$.ui.invalidate("ui.render")`. */
  invalidate: () => void;
  /** `$.ui.status`: the plugin's one status row. */
  status: (text: string | undefined) => void;
  /** `$.ui.focus` on one of the pane's elements. */
  focus: (key: string) => Promise<unknown>;
  /** The reload watcher session.start bound. */
  watcher: Watcher;
  /** The safe-write path session.start bound (D-12): every write the pane makes goes through it. */
  save: Save;
  /**
   * `$.prompt.submit({ text, asUser: true })`: resolves when its turn starts, which waits while a
   * turn runs, so the pane never awaits it in a hook. `reason` is a drop's.
   */
  submit: (text: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** `$.state.set` of the changes kept for one file. */
  storeChanges: (path: string, changes: Change[]) => Promise<void>;
  /** `$.state.get` of the changes kept for one file; none when nothing was kept. */
  loadChanges: (path: string) => Promise<Change[]>;
}

export type Opened = { ok: true; path: string; isPlaced: boolean; reason?: string } | { ok: false; reason: string };

type Loaded = { ok: true; path: string; text: string; stamp: FileStamp } | { ok: false; reason: string };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1) || path;

// Whether bytes are well-formed UTF-8 with no NUL: the pane's test for text.
function isUtf8Text(bytes: Uint8Array): boolean {
  let k = 0;
  while (k < bytes.length) {
    const b = bytes[k] ?? 0;
    if (b === 0) return false;
    if (b < 0x80) {
      k++;
      continue;
    }
    let need: number;
    let min: number;
    if (b >= 0xc2 && b <= 0xdf) [need, min] = [1, 0x80];
    else if (b >= 0xe0 && b <= 0xef) [need, min] = [2, 0x800];
    else if (b >= 0xf0 && b <= 0xf4) [need, min] = [3, 0x10000];
    else return false;
    let code = b & (0x3f >> need);
    for (let j = 1; j <= need; j++) {
      const next = bytes[k + j];
      if (next === undefined || (next & 0xc0) !== 0x80) return false;
      code = (code << 6) | (next & 0x3f);
    }
    if (code < min || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return false;
    k += need + 1;
  }
  return true;
}

/** The text of base64 bytes, or null when they are not UTF-8 text. */
function decodeText(base64: string): string | null {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let k = 0; k < binary.length; k++) bytes[k] = binary.charCodeAt(k);
  if (!isUtf8Text(bytes)) return null;
  const text = new TextDecoder().decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** An absolute path for `path` read from `cwd`. */
export const absoluteFrom = (cwd: string, path: string): string =>
  normalizePath(path.startsWith("/") ? path : `${cwd}/${path}`);

/**
 * The rows of `text` in view, counting wrapped rows as the core's `rowsOf` does (each line cut
 * every `columns` characters): `skip` rows dropped from the top, then `keep` rows kept when given
 * (one at least). A line cut by the window keeps only its rows in view.
 */
function rowWindow(text: string, skip: number, keep: number | null, columns: number): string {
  const width = Math.max(columns, 1);
  const rows: { line: number; text: string }[] = [];
  text.split("\n").forEach((line, k) => {
    const count = Math.max(1, Math.ceil(line.length / width));
    for (let r = 0; r < count; r++) rows.push({ line: k, text: line.slice(r * width, (r + 1) * width) });
  });
  const from = Math.min(Math.max(0, skip), rows.length - 1);
  const shown = rows.slice(from, keep === null ? undefined : from + Math.max(1, keep));
  const out: string[] = [];
  let last = -1;
  for (const row of shown) {
    if (row.line === last) out[out.length - 1] += row.text;
    else out.push(row.text);
    last = row.line;
  }
  return out.join("\n");
}

/** The columns a piece's text wraps at inside its frame. */
const textColumns = (piece: Piece, columns: number): number =>
  piece.type === "code" ? columns - 2 : piece.type === "callout" ? columns - 4 : columns;

const emptyView = (path: string): ViewState => ({
  path,
  offset: 0,
  focus: null,
  folded: [],
  drill: null,
  find: null,
  mode: "read",
  history: [],
});

/** The reader's keys (design, Key map). The editor's keys join this list as more bindings. */
export const READ_KEYS: readonly KeyBinding<DocPane>[] = [
  { key: "o", label: "outline", screens: ["document", "outline"], run: (pane) => pane.toggleOutline() },
  { key: "z", label: "fold", screens: ["document"], run: (pane) => pane.fold() },
  { key: "a", label: "fold all", screens: ["document"], run: (pane) => pane.foldAll() },
  { key: "d", label: "section", screens: ["document"], run: (pane) => pane.drillIn() },
  { key: "u", label: "up", screens: ["document"], run: (pane) => pane.drillOut() },
  { key: "f", label: "find", screens: ["document"], run: (pane) => pane.openInput(FIND_INPUT) },
  { key: "b", label: "back", screens: ["document"], run: (pane) => pane.back() },
  { key: "g", label: "go to", screens: ["document"], run: (pane) => pane.openInput(GOTO_INPUT) },
  { key: "t", label: "top", screens: ["document"], run: (pane) => pane.top() },
  { key: "q", label: "close", screens: ["document", "outline"], run: (pane) => pane.close() },
];

/**
 * The editor's keys (design, Key map; T-1.4 to T-1.6), and FR-3's next and previous heading,
 * which the key map leaves unassigned: `j` and `h`. On the diff screen `n` and `p` step turns
 * and `v` and `q` go back to the document.
 */
export const EDIT_KEYS: readonly KeyBinding<DocPane>[] = [
  { key: "j", label: "next heading", screens: ["document"], run: (pane) => pane.stepHeading(1) },
  { key: "h", label: "previous heading", screens: ["document"], run: (pane) => pane.stepHeading(-1) },
  { key: "c", label: "ask Claude", screens: ["document"], run: (pane) => pane.askClaude() },
  { key: "e", label: "edit", screens: ["document"], run: (pane) => pane.editLine() },
  { key: "n", label: "next change", screens: ["document"], run: (pane) => pane.stepChange(1) },
  { key: "p", label: "previous change", screens: ["document"], run: (pane) => pane.stepChange(-1) },
  { key: "v", label: "view diff", screens: ["document"], run: (pane) => pane.viewDiff() },
  { key: "k", label: "keep", screens: ["document"], run: (pane) => pane.keep() },
  { key: "x", label: "discard", screens: ["document"], run: (pane) => pane.discard() },
  { key: "r", label: "refine", screens: ["document"], run: (pane) => pane.refine() },
  { key: "n", label: "next turn", screens: ["diff"], run: (pane) => pane.stepTurn(1) },
  { key: "p", label: "previous turn", screens: ["diff"], run: (pane) => pane.stepTurn(-1) },
  { key: "v", label: "document", screens: ["diff"], run: (pane) => pane.leaveDiff() },
  { key: "q", label: "back", screens: ["diff"], run: (pane) => pane.leaveDiff() },
];

const lineRange = (start: number, end: number) => (end > start ? `lines ${start}-${end}` : `line ${start}`);

/**
 * The `/doc` pane: the open document, its view state, and its drawing. One instance per session.
 */
export class DocPane {
  host: PaneHost | undefined;
  doc: Document | undefined;
  view: ViewState = emptyView("");
  screen: Screen = "document";
  /** Which field the pane shows above the body, if any. */
  input: Field | null = null;
  isOpen = false;
  /** Claude's requests and changes this session. */
  readonly review = new Review();
  /** The open file's stamp as last read or saved: what a save checks the file against. */
  stamp: FileStamp = { mtimeMs: 0, size: 0 };
  /** The body's size as last drawn or scrolled. */
  size: Size = { bodyRows: 24, bodyColumns: 80 };
  /** Rows of the first piece on the page scrolled past, for a piece taller than the body. */
  skip = 0;
  /** The first outline entry the outline view shows. */
  outlineAt = 0;
  /** The keys the pane answers; a later mode appends its own. */
  bindings: KeyBinding<DocPane>[] = [...READ_KEYS, ...EDIT_KEYS];
  /** The drill-in sections entered before the current one, innermost last (null: the whole document). */
  private drills: (string | null)[] = [];
  /** The block the ask field asks about, and the text it opens with (r prefills it). */
  private askAt: { blockId: string; value: string } | null = null;
  /** The source line the edit field edits. */
  private editAt: number | null = null;
  /** The focused block's editable lines while `e` asks which one, else null. */
  private picking: number[] | null = null;
  /** The diff view's turn (an index into the file's turns) and page. */
  private diffAt = { turn: 0, page: 0 };
  private minutes = 1;
  private statusText: string | undefined;
  private cache: { key: string; pieces: Piece[] } | undefined;

  bind(host: PaneHost): void {
    this.host = host;
  }

  // ---- opening ----------------------------------------------------------------------------

  /** Reads a file the pane may show: a UTF-8 text file of at most MAX_BYTES. */
  async load(path: string): Promise<Loaded> {
    const host = this.host;
    if (host === undefined) return { ok: false, reason: "the doc-editor session has not started" };
    const shown = shownPath(path, host.repoRoot);
    let facts: FileFacts;
    try {
      facts = await host.stat(path);
    } catch {
      return { ok: false, reason: `no such file: ${shown}` };
    }
    if (facts.kind !== "file") return { ok: false, reason: `not a file: ${shown}` };
    if (facts.size > MAX_BYTES) {
      return { ok: false, reason: `${shown} is over 4 MiB (${facts.size} bytes), more than the pane can read` };
    }
    const real = normalizePath(facts.realPath ?? path);
    let text: string | null;
    try {
      text = decodeText(await host.readBytes(real));
    } catch (error) {
      return { ok: false, reason: `could not read ${shown}: ${message(error)}` };
    }
    if (text === null) return { ok: false, reason: `${shown} is not UTF-8 text` };
    return { ok: true, path: real, text, stamp: { mtimeMs: facts.mtimeMs, size: facts.size } };
  }

  /**
   * Opens `spec` (a path, with `:N` or `#heading`) from the session's directory: on success the
   * pane shows it focused on that place; on failure one status row names the reason and no pane
   * opens.
   */
  async openSpec(spec: string, options: { focus: boolean }): Promise<Opened> {
    const host = this.host;
    if (host === undefined) return { ok: false, reason: "the doc-editor session has not started" };
    const trimmed = spec.trim();
    if (trimmed === "") return this.refuse("give a path: /doc <path>[:line|#heading]");
    const place = parseLocation(trimmed);
    const loaded = await this.load(absoluteFrom(host.cwd, place.path));
    if (!loaded.ok) return this.refuse(loaded.reason);
    this.history = [];
    this.show(loaded);
    if (place.line !== null || place.heading !== null) {
      const found = locate(this.blocks, place.line !== null ? { line: place.line } : { heading: place.heading ?? "" });
      if (found === null) {
        this.say(place.line !== null ? `no line ${place.line} in ${baseName(loaded.path)}` : `no heading #${place.heading}`);
      } else {
        this.jumpTo(found);
      }
    }
    return this.present(options.focus);
  }

  private refuse(reason: string): Opened {
    this.say(reason);
    return { ok: false, reason };
  }

  /** Puts the pane on screen with the current document. */
  async present(focus: boolean): Promise<Opened> {
    const host = this.host;
    const doc = this.doc;
    if (host === undefined || doc === undefined) return { ok: false, reason: EMPTY_TEXT };
    const opened = await host.open({ title: baseName(doc.path), focus });
    this.isOpen = true;
    host.invalidate();
    return opened.isPlaced
      ? { ok: true, path: doc.path, isPlaced: true }
      : { ok: true, path: doc.path, isPlaced: false, reason: opened.reason ?? "the pane waits for room" };
  }

  // Makes a loaded file the document, its view reset, and watches it for changes.
  private show(loaded: Extract<Loaded, { ok: true }>): void {
    const host = this.host;
    if (host === undefined) return;
    const history = this.history;
    this.doc = toDocument(loaded.path, loaded.stamp.mtimeMs, loaded.text, host.repoRoot);
    this.view = { ...emptyView(loaded.path), history };
    this.view.focus = this.order()[0] ?? null;
    this.screen = "document";
    this.input = null;
    this.closeEditing();
    this.skip = 0;
    this.drills = [];
    this.cache = undefined;
    this.minutes = readMinutes(this.doc.blocks);
    this.stamp = loaded.stamp;
    this.clearSay();
    host.watcher.watch(loaded.path, loaded.stamp, (reload) => this.reloaded(reload));
    void this.restoreChanges(loaded.path);
  }

  // The changes the session's state kept for this file, after a reload of the mod: those whose
  // lines still hold the text their turn left, marked on the blocks at those lines.
  private async restoreChanges(path: string): Promise<void> {
    const host = this.host;
    if (host === undefined || this.review.of(path).length > 0) return;
    const kept = await host.loadChanges(path).catch((): Change[] => []);
    const doc = this.doc;
    if (doc === undefined || doc.path !== path || kept.length === 0) return;
    const live = kept
      .filter((change) => discardChange(change, doc.source).ok)
      .map((change) => ({ ...change, blockIds: this.blocksAt(change.start, change.end) }));
    this.review.restore(path, live);
    host.invalidate();
  }

  private blocksAt(start: number, end: number): string[] {
    const last = Math.max(start, end);
    const ids = this.blocks.filter((block) => block.start <= last && block.end >= start).map((block) => block.id);
    if (ids.length > 0) return ids;
    const near = locate(this.blocks, { line: start });
    return near === null ? [] : [near];
  }

  private persist(path: string): void {
    void this.host?.storeChanges(path, this.review.of(path)).catch(() => undefined);
  }

  private snapshot = (path: string): Snapshot | null => {
    const doc = this.doc;
    return doc !== undefined && doc.path === path ? { source: doc.source, blocks: doc.blocks } : null;
  };

  private get blocks(): Block[] {
    return this.doc?.blocks ?? [];
  }

  private get history(): HistoryEntry[] {
    return this.view.history;
  }

  private set history(entries: HistoryEntry[]) {
    this.view.history = entries;
  }

  // ---- status -----------------------------------------------------------------------------

  say(text: string): void {
    this.statusText = text;
    this.host?.status(text);
  }

  private clearSay(): void {
    if (this.statusText === undefined) return;
    this.statusText = undefined;
    this.host?.status(undefined);
  }

  // ---- the window -------------------------------------------------------------------------

  private contentColumns(): number {
    return Math.max(10, this.size.bodyColumns - MARGIN_COLUMNS);
  }

  /** Every piece the view draws, after folding and drill-in, cached per view shape. */
  pieces(): Piece[] {
    const columns = this.contentColumns();
    const key = `${this.doc?.mtimeMs}|${this.doc?.path}|${columns}|${this.view.drill}|${this.view.folded.join(",")}`;
    if (this.cache?.key === key) return this.cache.pieces;
    const pieces = viewPieces(this.blocks, this.view, columns);
    this.cache = { key, pieces };
    return pieces;
  }

  /** The visible blocks that draw at least one piece, in order: what Up and Down step through. */
  private order(): string[] {
    const out: string[] = [];
    for (const piece of this.pieces()) if (out.at(-1) !== piece.blockId) out.push(piece.blockId);
    return out;
  }

  private linkHrefs(blockId: string | null): string[] {
    if (blockId === null) return [];
    const hrefs = (this.doc?.links ?? [])
      .filter((link) => link.blockId === blockId && link.kind !== "url" && link.href.trim() !== "")
      .map((link) => link.href);
    return [...new Set(hrefs)];
  }

  /** The rows the body has for pieces once the header, the field, the link row and the hints are drawn. */
  private bodySize(): Size {
    const columns = this.size.bodyColumns;
    let chrome = HEADER_ROWS + hintRows(bindingsFor(this.bindings, this.screen), columns);
    if (this.input !== null) chrome++;
    if (this.linkHrefs(this.view.focus).length > 0) chrome++;
    chrome += this.underRows(this.view.focus);
    const path = this.doc?.path;
    chrome += this.review.asks.filter((ask) => ask.path === path).length;
    return { bodyRows: Math.max(1, this.size.bodyRows - chrome), bodyColumns: this.contentColumns() };
  }

  /** Rows drawn under the focused block beside its links: the change actions, its checkboxes, the line picker. */
  private underRows(blockId: string | null): number {
    if (blockId === null || this.doc === undefined) return 0;
    let rows = 0;
    if (this.review.on(this.doc.path, blockId).length > 0) rows++;
    if (this.tasksOf(blockId).length > 0) rows++;
    if (this.picking !== null) rows++;
    return rows;
  }

  private tasksOf(blockId: string): number[] {
    const block = this.blocks.find((entry) => entry.id === blockId);
    return block === undefined || this.doc === undefined ? [] : taskLines(block, this.doc.source);
  }

  /** Focuses a block and brings it into view: first on the page (`start`) or moving least (`nearest`). */
  focusBlock(id: string, block: "start" | "nearest" = "start"): void {
    const path = headingPath(this.blocks, id).map((entry) => entry.id);
    const ancestors = new Set(path.filter((entry) => entry !== id));
    this.view.folded = this.view.folded.filter((entry) => !ancestors.has(entry));
    const drill = this.view.drill;
    if (drill !== null) {
      const section = sectionOf(this.blocks, drill);
      const at = this.blocks.findIndex((entry) => entry.id === id);
      if (section === null || at < section.from || at >= section.to) {
        this.view.drill = null;
        this.drills = [];
      }
    }
    this.view.focus = id;
    this.skip = 0;
    const pieces = this.pieces();
    this.view.offset =
      block === "start"
        ? Math.max(0, pieceIndex(pieces, id))
        : revealOffset(pieces, this.view.offset, id, this.bodySize());
  }

  /** Focuses a heading, as the outline, `:N` and `#heading` and a link do. */
  jumpTo(id: string): void {
    this.screen = "document";
    this.focusBlock(id, "start");
    this.host?.invalidate();
  }

  // When the focused block is hidden (a fold, a drill), the innermost visible heading above it.
  private keepFocusVisible(): void {
    const order = this.order();
    const focus = this.view.focus;
    if (focus !== null && order.includes(focus)) return;
    const path = focus === null ? [] : headingPath(this.blocks, focus).map((entry) => entry.id);
    this.view.focus = [...path].reverse().find((id) => order.includes(id)) ?? order[0] ?? null;
  }

  /**
   * Answers the pane's `ui.scroll` (design D-2): moves the pane's own offset and never the
   * engine's window. One row (an arrow, a wheel tick) steps the focus one block; more moves by
   * whole pieces; a piece taller than the body scrolls inside itself first.
   */
  scroll(by: number, bodyRows: number): void {
    if (bodyRows > 0) this.size = { ...this.size, bodyRows };
    if (this.doc === undefined || by === 0) return;
    if (this.screen === "diff") {
      this.diffAt.page = Math.max(0, this.diffAt.page + Math.sign(by));
      this.host?.invalidate();
      return;
    }
    if (this.screen === "outline") {
      const rows = this.bodySize().bodyRows;
      const last = Math.max(0, this.doc.outline.length - rows);
      this.outlineAt = Math.min(last, Math.max(0, this.outlineAt + by));
      this.host?.invalidate();
      return;
    }
    const pieces = this.pieces();
    const size = this.bodySize();
    const page = pageAt(pieces, this.view.offset, size);
    this.view.offset = page.offset;
    const first = pieces[page.offset];
    const hidden = first === undefined ? 0 : first.rows - size.bodyRows;
    if (by > 0 && this.skip < hidden) {
      this.skip = Math.min(hidden, this.skip + by);
    } else if (by < 0 && this.skip > 0) {
      this.skip = Math.max(0, this.skip + by);
    } else if (Math.abs(by) === 1) {
      const order = this.order();
      const at = this.view.focus === null ? -1 : order.indexOf(this.view.focus);
      const next = order[Math.min(order.length - 1, Math.max(0, at + by))];
      const rows = pieces.filter((piece) => piece.blockId === next).reduce((sum, piece) => sum + piece.rows, 0);
      if (next !== undefined) this.focusBlock(next, rows > size.bodyRows ? "start" : "nearest");
    } else {
      this.view.offset = scrollOffset(pieces, page.offset, by, size);
      this.skip = 0;
      const shown = pageAt(pieces, this.view.offset, size).pieces.map((piece) => piece.blockId);
      if (this.view.focus === null || !shown.includes(this.view.focus)) this.view.focus = shown[0] ?? null;
    }
    this.host?.invalidate();
  }

  // ---- keys -------------------------------------------------------------------------------

  /** Runs a binding's action, as its Button's press or hotkey does. */
  async press(binding: KeyBinding<DocPane>): Promise<void> {
    await binding.run(this);
    this.host?.invalidate();
  }

  top(): void {
    this.view.offset = 0;
    this.skip = 0;
    this.view.focus = this.order()[0] ?? null;
  }

  async close(): Promise<void> {
    await this.host?.close();
    this.closed();
  }

  /** The pane closed: stop watching the file. */
  closed(): void {
    this.isOpen = false;
    this.input = null;
    this.closeEditing();
    this.host?.watcher.stop();
  }

  private sectionHeading(): string | null {
    const focus = this.view.focus;
    if (focus === null) return null;
    return owningHeading(this.blocks, focus);
  }

  /** `z`: folds or unfolds the focused heading, or the heading whose section holds the focus. */
  fold(): void {
    const heading = this.sectionHeading();
    if (heading === null) {
      this.say("z folds a heading, and no heading is above this block");
      return;
    }
    this.view.folded = toggleFold(this.blocks, this.view.folded, heading);
    this.focusBlock(heading, "nearest");
  }

  /** `a`: folds every heading, or unfolds them all when all are folded. */
  foldAll(): void {
    this.view.folded = toggleFoldAll(this.blocks, this.view.folded);
    this.keepFocusVisible();
    const focus = this.view.focus;
    this.view.offset = focus === null ? 0 : revealOffset(this.pieces(), this.view.offset, focus, this.bodySize());
    this.skip = 0;
  }

  /** `d`: draws only the focused section. */
  drillIn(): void {
    const heading = this.sectionHeading();
    if (heading === null) {
      this.say("d opens a section, and no heading is above this block");
      return;
    }
    if (heading === this.view.drill) return;
    this.drills.push(this.view.drill);
    this.view.drill = heading;
    this.view.focus = heading;
    this.view.offset = 0;
    this.skip = 0;
  }

  /** `u`: back to the section drilled from: the whole document from a first drill-in. */
  drillOut(): void {
    const drill = this.view.drill;
    if (drill === null) return;
    this.view.drill = this.drills.length > 0 ? (this.drills.pop() ?? null) : drillUp(this.blocks, drill);
    const focus = this.view.focus ?? drill;
    this.focusBlock(focus, "nearest");
  }

  /** `f` or `g`: shows a field above the body and gives it the focus ring. */
  openInput(input: Field): void {
    this.input = input;
    this.host?.invalidate();
    void this.host?.focus(input).catch(() => undefined);
  }

  /**
   * A find query submitted: the next block after the focus that contains it, or the next hit when
   * the query is the one already found. A blank query ends the find.
   */
  find(query: string): void {
    if (query.trim() === "") {
      this.view.find = null;
      this.input = null;
      return;
    }
    const current = this.view.find;
    const scope = this.view.drill === null ? this.blocks : this.drillBlocks();
    const found = current !== null && current.query === query ? stepFind(current, 1) : startFind(scope, query, this.view.focus);
    this.view.find = found;
    const hit = currentHit(found);
    if (hit === null) {
      this.say(`no block contains "${query}"`);
      return;
    }
    this.focusBlock(hit, "nearest");
    void this.host?.focus(FIND_NEXT).catch(() => undefined);
  }

  private drillBlocks() {
    const section = this.view.drill === null ? null : sectionOf(this.blocks, this.view.drill);
    return section === null ? this.blocks : this.blocks.slice(section.from, section.to);
  }

  /** `b`: the previous find hit while a find is on; else back to where the last link left. */
  async back(): Promise<void> {
    const found = this.view.find;
    if (found !== null && found.hits.length > 0) {
      this.view.find = stepFind(found, -1);
      const hit = currentHit(this.view.find);
      if (hit !== null) this.focusBlock(hit, "nearest");
      return;
    }
    const entry = this.history.pop();
    if (entry === undefined) {
      this.say("nothing to go back to");
      return;
    }
    const doc = this.doc;
    if (doc === undefined) return;
    if (entry.path !== doc.path) {
      const loaded = await this.load(entry.path);
      if (!loaded.ok) {
        this.say(loaded.reason);
        return;
      }
      this.show(loaded);
    }
    const focus = entry.focus !== null && this.blocks.some((block) => block.id === entry.focus) ? entry.focus : null;
    if (focus === null) this.top();
    else this.focusBlock(focus, "start");
  }

  /** A go-to submitted: `:N` or `#heading` in this document, else a path from the session's directory. */
  async goTo(spec: string): Promise<void> {
    this.input = null;
    const trimmed = spec.trim();
    const doc = this.doc;
    if (trimmed === "" || doc === undefined) return;
    if (trimmed.startsWith(":") || trimmed.startsWith("#")) {
      const place = parseLocation(`${doc.path}${trimmed}`);
      const found = locate(this.blocks, place.line !== null ? { line: place.line } : { heading: place.heading ?? "" });
      if (found === null) this.say(`no ${trimmed} in ${baseName(doc.path)}`);
      else this.jumpTo(found);
      return;
    }
    const before = { path: doc.path, focus: this.view.focus };
    const history = [...this.history, before];
    const opened = await this.openSpec(trimmed, { focus: true });
    if (opened.ok) this.history = history;
  }

  /**
   * Enter on a link: a file or heading in the repository opens in place and the position it
   * leaves is pushed for `b`; a link outside the repository, to a missing file or a missing
   * heading names the reason in the status row and the pane stays where it is.
   */
  async followLink(href: string): Promise<void> {
    const host = this.host;
    const doc = this.doc;
    if (host === undefined || doc === undefined) return;
    if (classifyHref(href) === "url") {
      this.say(`not a file in the repository: ${href}`);
      return;
    }
    const target = resolveLink(href, doc.path, host.repoRoot);
    if (!target.ok) {
      this.say(target.reason);
      return;
    }
    let loaded: Loaded | undefined;
    let facts: TargetFacts;
    if (target.path === doc.path) {
      facts = { exists: true, realPath: doc.path, outline: doc.outline };
    } else {
      const stat = await host.stat(target.path).catch(() => undefined);
      facts = { exists: stat?.kind === "file", realPath: stat?.realPath ?? null };
      const preliminary = checkTarget({ ...target, heading: null }, facts, host.repoRoot);
      if (!preliminary.ok) {
        this.say(preliminary.reason);
        return;
      }
      loaded = await this.load(target.path);
      if (!loaded.ok) {
        this.say(loaded.reason);
        return;
      }
      facts.outline = toDocument(loaded.path, 0, loaded.text, host.repoRoot).outline;
    }
    const checked = checkTarget(target, facts, host.repoRoot);
    if (!checked.ok) {
      this.say(checked.reason);
      return;
    }
    this.history = [...this.history, { path: doc.path, focus: this.view.focus }];
    this.view.find = null;
    if (loaded?.ok) this.show(loaded);
    if (checked.headingId !== null) this.focusBlock(checked.headingId, "start");
    else if (loaded?.ok) this.top();
    this.host?.invalidate();
  }

  /** `o`: the outline, or back to the document from it. */
  toggleOutline(): void {
    if (this.doc === undefined) return;
    if (this.screen === "outline") {
      this.screen = "document";
      return;
    }
    this.screen = "outline";
    const entries = this.doc.outline;
    const current = this.sectionHeading();
    const at = Math.max(0, entries.findIndex((entry) => entry.id === current));
    this.outlineAt = Math.max(0, at - 2);
    const key = entries[at]?.id;
    this.host?.invalidate();
    if (key !== undefined) void this.host?.focus(`outline:${key}`).catch(() => undefined);
  }

  // ---- reload -----------------------------------------------------------------------------

  /**
   * The watcher saw the file change: re-read, keep the focused block, the folds and the drill-in
   * by mapping old block ids to new ones, and keep the focused block in view (T-1.7).
   */
  reloaded(reload: Reload): void {
    const host = this.host;
    const doc = this.doc;
    if (host === undefined || doc === undefined) return;
    if (reload.kind === "unreadable") {
      this.say(`${shownPath(doc.path, host.repoRoot)} cannot be read: ${reload.reason}`);
      return;
    }
    const next = toDocument(doc.path, reload.stamp.mtimeMs, reload.text, host.repoRoot);
    this.stamp = reload.stamp;
    this.review.fileChanged(doc.path, doc, next);
    this.persist(doc.path);
    const map = mapBlockIds(doc.blocks, next.blocks);
    const follow = (id: string | null): string | null => {
      if (id === null) return null;
      const mapped = map[id];
      if (mapped !== undefined) return mapped;
      const old = doc.blocks.find((block) => block.id === id);
      return old === undefined ? null : locate(next.blocks, { line: old.start });
    };
    const view = this.view;
    view.focus = follow(view.focus);
    view.folded = view.folded.map((id) => map[id]).filter((id): id is string => id !== undefined);
    view.drill = view.drill === null ? null : (map[view.drill] ?? null);
    this.drills = view.drill === null ? [] : this.drills.map((id) => (id === null ? null : (map[id] ?? null)));
    view.history = view.history.map((entry) => (entry.path === doc.path ? { ...entry, focus: follow(entry.focus) } : entry));
    this.doc = next;
    this.cache = undefined;
    this.minutes = readMinutes(next.blocks);
    if (view.find !== null) {
      const hit = follow(currentHit(view.find));
      const scope = view.drill === null ? next.blocks : this.drillBlocks();
      const found = startFind(scope, view.find.query, null);
      const at = hit === null ? found.at : found.hits.indexOf(hit);
      view.find = { ...found, at: at < 0 ? found.at : at };
    }
    this.keepFocusVisible();
    if (this.editAt !== null && lineAt(next.source, this.editAt) === null) this.closeEditing();
    if (view.focus !== null) view.offset = revealOffset(this.pieces(), view.offset, view.focus, this.bodySize());
    this.skip = 0;
    host.invalidate();
  }

  // ---- editing: ask Claude (T-1.4) ----------------------------------------------------------

  /** `c`: opens the ask field for the focused block. */
  askClaude(): void {
    const focus = this.view.focus;
    if (this.doc === undefined || focus === null) {
      this.say("c asks Claude to change the focused block, and no block is focused");
      return;
    }
    this.openAsk(focus, "");
  }

  /** `r`: opens the ask field again, prefilled with the instruction that made the focused change. */
  refine(): void {
    const doc = this.doc;
    const focus = this.view.focus;
    if (doc === undefined || focus === null) return;
    const change = this.review.on(doc.path, focus).at(-1);
    const previous = (change === undefined ? undefined : this.review.requestOf(change.turn)?.instruction) ?? this.review.previousInstruction;
    if (previous === null) {
      this.say("r refines an instruction given to Claude, and none was given yet");
      return;
    }
    this.openAsk(focus, previous);
  }

  private openAsk(blockId: string, value: string): void {
    this.closeEditing();
    this.askAt = { blockId, value };
    this.openInput(ASK_INPUT);
  }

  /**
   * The ask field submitted: the request goes to Claude as the person's own prompt through
   * `$.prompt.submit({ asUser: true })`, never awaited here, and a status shows under the block.
   * While a turn runs the engine holds the prompt until it ends, and the status row says it is
   * queued. A blank instruction closes the field.
   */
  submitAsk(instruction: string): void {
    const doc = this.doc;
    const host = this.host;
    const target = this.askAt;
    this.input = null;
    this.askAt = null;
    if (doc === undefined || host === undefined || target === null || instruction.trim() === "") return;
    const block = this.blocks.find((entry) => entry.id === target.blockId);
    if (block === undefined) {
      this.say("the block asked about is no longer in the file; nothing was sent");
      return;
    }
    const heading = owningHeading(this.blocks, block.id);
    const request = {
      path: shownPath(doc.path, host.repoRoot),
      start: block.start,
      end: block.end,
      heading: heading === null ? "" : (doc.outline.find((entry) => entry.id === heading)?.title ?? ""),
      firstWords: firstWords(block.text),
      instruction: instruction.trim(),
    };
    const text = requestText(request);
    const ask = this.review.asked({ text, request, path: doc.path, blockId: block.id, baseline: this.snapshot(doc.path) });
    const where = `${lineRange(block.start, block.end)} of ${request.path}`;
    this.say(
      ask.phase === "queued"
        ? `queued: Claude is busy; the request to edit ${where} starts when the current turn ends`
        : `asked Claude to edit ${where}`,
    );
    void host.submit(text).then(
      (result) => {
        if (result.ok) this.review.started(ask, this.snapshot);
        else this.refused(ask, result.reason);
        host.invalidate();
      },
      (error: unknown) => {
        this.refused(ask, message(error));
        host.invalidate();
      },
    );
  }

  private refused(ask: Ask, reason: string): void {
    this.review.dropped(ask);
    this.say(`the request to edit ${lineRange(ask.request.start, ask.request.end)} did not start: ${reason}`);
  }

  /** A main-loop turn started: a request of the pane's that it runs is now being edited. */
  turnStarted(turnId: string, text: string): void {
    const ask = this.review.turnStarted(turnId, text, this.snapshot);
    if (ask === null) return;
    this.say(`Claude is editing ${lineRange(ask.request.start, ask.request.end)} of ${ask.request.path}`);
    this.host?.invalidate();
  }

  /**
   * A main-loop turn ended. For a request of the pane's, the file is read once more so its last
   * edit counts, the first changed block is focused and its actions are drawn under it.
   */
  async turnEnded(turnId: string): Promise<void> {
    const host = this.host;
    const ask = this.review.asks.find((entry) => entry.turnId === turnId);
    if (host !== undefined && ask !== undefined && this.doc?.path === ask.path) await host.watcher.check();
    const landed = this.review.turnEnded(turnId);
    if (landed === null || host === undefined) return;
    const shown = landed.ask.request.path;
    const first = landed.changes[0]?.blockIds[0];
    if (first === undefined) {
      this.say(`Claude's turn ended with no change to ${shown}`);
    } else {
      const blocks = new Set(landed.changes.flatMap((change) => change.blockIds)).size;
      this.say(`Claude changed ${blocks} ${blocks === 1 ? "block" : "blocks"} of ${shown}: k keep, x discard, r refine, v view diff`);
      if (this.doc?.path === landed.ask.path && this.screen === "document") this.focusBlock(first, "nearest");
    }
    this.persist(landed.ask.path);
    host.invalidate();
  }

  // ---- editing: review (T-1.5) --------------------------------------------------------------

  /** The ids of the blocks Claude's changes mark in the open file. */
  marked(): Set<string> {
    const doc = this.doc;
    return new Set(doc === undefined ? [] : this.review.of(doc.path).flatMap((change) => change.blockIds));
  }

  /** `n` or `p`: focuses the next or previous block Claude changed. */
  stepChange(by: 1 | -1): void {
    const marked = this.marked();
    if (marked.size === 0) {
      this.say("no block carries a change by Claude");
      return;
    }
    const ids = this.blocks.filter((block) => marked.has(block.id)).map((block) => block.id);
    const at = this.view.focus === null ? -1 : this.blocks.findIndex((block) => block.id === this.view.focus);
    const index = (id: string) => this.blocks.findIndex((block) => block.id === id);
    const next = by > 0 ? ids.find((id) => index(id) > at) : [...ids].reverse().find((id) => index(id) < at);
    if (next === undefined) {
      this.say(by > 0 ? "no change by Claude below this block" : "no change by Claude above this block");
      return;
    }
    this.focusBlock(next, "nearest");
  }

  /** `j` or `h`: focuses the next or previous heading. */
  stepHeading(by: 1 | -1): void {
    const at = this.view.focus === null ? -1 : this.blocks.findIndex((block) => block.id === this.view.focus);
    const headings = this.blocks.map((block, k) => ({ block, k })).filter(({ block }) => block.kind === "heading");
    const next = by > 0 ? headings.find(({ k }) => k > at) : [...headings].reverse().find(({ k }) => k < at);
    if (next === undefined) {
      this.say(by > 0 ? "no heading below this block" : "no heading above this block");
      return;
    }
    this.focusBlock(next.block.id, "start");
  }

  private focusedChanges(verb: string): { path: string; changes: Change[] } | null {
    const doc = this.doc;
    const focus = this.view.focus;
    const changes = doc === undefined || focus === null ? [] : this.review.on(doc.path, focus);
    if (doc === undefined || changes.length === 0) {
      this.say(`${verb} acts on a block Claude changed, and this block has no change`);
      return null;
    }
    return { path: doc.path, changes };
  }

  /** `k`: keeps Claude's change to the focused block: its marker goes and the file stays as it is. */
  keep(): void {
    const found = this.focusedChanges("k");
    if (found === null) return;
    for (const change of found.changes) this.review.clear(found.path, change);
    this.persist(found.path);
    this.say("kept Claude's change");
  }

  /**
   * `x`: writes the focused block's text from before Claude's latest change to it back through the
   * safe-write path, as a new edit, and clears its marker. Refused, with the reason, when the text
   * at those lines is no longer what the turn left.
   */
  async discard(): Promise<void> {
    const found = this.focusedChanges("x");
    const doc = this.doc;
    if (found === null || doc === undefined) return;
    const change = found.changes.at(-1);
    if (change === undefined) return;
    const undone = discardChange(change, doc.source);
    if (!undone.ok) {
      this.say(`the block changed again since Claude's turn: ${undone.reason}`);
      return;
    }
    if (!(await this.saveSource(undone.source))) return;
    this.review.clear(found.path, change);
    this.persist(found.path);
    this.say(`discarded Claude's change to ${lineRange(change.start, change.end)}`);
  }

  /** The open file's changes, one diff per turn in the order the turns ran. */
  private turnDiffs(): { turn: string; diff: string }[] {
    const doc = this.doc;
    const host = this.host;
    if (doc === undefined || host === undefined) return [];
    return diffsByTurn(shownPath(doc.path, host.repoRoot), this.review.of(doc.path));
  }

  /** `v`: the turn's unified diff, of the focused block's latest change or else the last turn. */
  viewDiff(): void {
    const doc = this.doc;
    const turns = this.turnDiffs();
    if (doc === undefined || turns.length === 0) {
      this.say("Claude has changed nothing in this file this session");
      return;
    }
    const focus = this.view.focus;
    const turn = focus === null ? undefined : this.review.on(doc.path, focus).at(-1)?.turn;
    const at = turns.findIndex((entry) => entry.turn === turn);
    this.diffAt = { turn: at < 0 ? turns.length - 1 : at, page: 0 };
    this.closeEditing();
    this.input = null;
    this.screen = "diff";
  }

  /** `n` or `p` on the diff view: the next or previous turn's diff. */
  stepTurn(by: 1 | -1): void {
    const turns = this.turnDiffs().length;
    this.diffAt = { turn: Math.min(Math.max(0, this.diffAt.turn + by), Math.max(0, turns - 1)), page: 0 };
  }

  /** `v` or `q` on the diff view: back to the document. */
  leaveDiff(): void {
    this.screen = "document";
  }

  // ---- editing: in the pane (T-1.6) ---------------------------------------------------------

  private closeEditing(): void {
    if (this.input === ASK_INPUT || this.input === EDIT_INPUT || this.input === LINE_INPUT) this.input = null;
    this.askAt = null;
    this.editAt = null;
    this.picking = null;
  }

  /**
   * `e`: a single-line field on the focused heading, or on a list item or table row; a block with
   * several such lines first asks which, as Buttons or, past MAX_LINE_BUTTONS, as a line number.
   */
  editLine(): void {
    const focus = this.view.focus;
    const block = focus === null ? undefined : this.blocks.find((entry) => entry.id === focus);
    const lines = block === undefined ? [] : editableLines(block);
    if (block === undefined || lines.length === 0) {
      this.say(`e edits a heading, a list item or a table row, and this block is a ${block?.kind ?? "nothing"}; c asks Claude to change it`);
      return;
    }
    if (lines.length === 1) {
      this.openLineField(lines[0] ?? block.start);
      return;
    }
    this.closeEditing();
    this.picking = lines;
    if (lines.length > MAX_LINE_BUTTONS) this.openInput(LINE_INPUT);
    else void this.host?.focus(lineButton(lines[0] ?? block.start)).catch(() => undefined);
  }

  /** A line chosen to edit: its Button pressed, or its number given. */
  pickLine(spec: string): void {
    const lines = this.picking ?? [];
    const line = Number(spec.trim().replace(/^:/, ""));
    if (!lines.includes(line)) {
      this.say(`line ${spec.trim()} is not an editable line of this block (${lines[0]}-${lines.at(-1)})`);
      return;
    }
    this.openLineField(line);
  }

  private openLineField(line: number): void {
    this.closeEditing();
    this.editAt = line;
    this.openInput(EDIT_INPUT);
  }

  /**
   * The edit field submitted: line `editAt` becomes the text, saved through the safe-write path.
   * A text that holds a line break is refused with the reason and the field stays open.
   */
  async saveLine(text: string): Promise<void> {
    const doc = this.doc;
    const line = this.editAt;
    if (doc === undefined || line === null) return;
    if (text === lineAt(doc.source, line)) {
      this.closeEditing();
      return;
    }
    const edited = replaceLine(doc.source, line, text);
    if (!edited.ok) {
      this.say(edited.reason);
      return;
    }
    if (!(await this.saveSource(edited.source))) return;
    this.closeEditing();
    this.say(`saved line ${line}`);
  }

  /** Enter on a task checkbox: flips `[ ]` and `[x]` on its line and saves it. */
  async toggleTaskLine(line: number): Promise<void> {
    const doc = this.doc;
    if (doc === undefined) return;
    const flipped = toggleTask(lineAt(doc.source, line) ?? "");
    if (flipped === null) {
      this.say(`line ${line} is not a task item`);
      return;
    }
    const edited = replaceLine(doc.source, line, flipped);
    if (!edited.ok || !(await this.saveSource(edited.source))) return;
    this.say(`${/\[ \]/.test(flipped) ? "unticked" : "ticked"} line ${line}`);
  }

  /**
   * Writes the open file through the safe-write path and shows the new text, the stamp kept for the
   * next save. A file changed on disk is asked about first: Reload re-reads it and saves nothing.
   */
  private async saveSource(source: string): Promise<boolean> {
    const host = this.host;
    const doc = this.doc;
    if (host === undefined || doc === undefined) return false;
    const result = await host.save(doc.path, source, this.stamp);
    if (result.kind === "saved") {
      let stamp = result.stamp;
      if (stamp === undefined) {
        const again = await this.load(doc.path);
        // Unknown, so the next save asks before it writes.
        stamp = again.ok ? again.stamp : { mtimeMs: -1, size: source.length };
      }
      if (this.doc !== doc) return true;
      this.reloaded({ kind: "changed", text: source, stamp });
      host.watcher.watch(doc.path, stamp, (reload) => this.reloaded(reload));
      return true;
    }
    if (result.kind === "reload") {
      const again = await this.load(doc.path);
      if (again.ok && this.doc === doc) {
        this.reloaded({ kind: "changed", text: again.text, stamp: again.stamp });
        host.watcher.watch(doc.path, again.stamp, (reload) => this.reloaded(reload));
      }
      this.say("reloaded the file as it now stands on disk; nothing was saved");
    } else if (result.kind === "cancelled") {
      this.say("the save was cancelled; the file is unchanged");
    } else {
      this.say(result.reason);
    }
    return false;
  }

  // ---- drawing ----------------------------------------------------------------------------

  /** The pane's tree for a body of `bodyColumns` by `bodyRows`. */
  draw(ui: PaneUi, bodyColumns: number, bodyRows: number): RenderElement {
    this.size = { bodyColumns: Math.max(20, bodyColumns), bodyRows: Math.max(4, bodyRows) };
    const doc = this.doc;
    const host = this.host;
    if (doc === undefined || host === undefined) {
      return ui.Box({ flexDirection: "column", children: [ui.Text({ children: EMPTY_TEXT })] });
    }
    const bindings = bindingsFor(this.bindings, this.screen);
    const hints = hintRow(ui, bindings, (binding) => void this.press(binding));
    if (this.screen === "outline") {
      const header = outlineHeader(doc.path, host.repoRoot, doc.outline.length);
      return this.frame(ui, header, [this.drawOutline(ui)], hints);
    }
    if (this.screen === "diff") return this.drawDiff(ui, hints);
    const isEditing = this.input === ASK_INPUT || this.input === EDIT_INPUT || this.input === LINE_INPUT || this.picking !== null;
    this.view.mode = isEditing ? "edit" : "read";
    const marked = this.marked();
    const header = documentHeader({
      path: doc.path,
      repoRoot: host.repoRoot,
      blocks: doc.blocks,
      at: this.view.focus ?? this.view.drill,
      mode: this.view.mode,
      find: this.view.find,
      drill: this.view.drill,
      minutes: this.minutes,
      changed: marked.size,
    });
    const pieces = this.pieces();
    const size = this.bodySize();
    const page = pageAt(pieces, this.view.offset, size);
    this.view.offset = page.offset;
    // The core's page may end on a piece that runs past the body; that piece is cut to the rows
    // left, so the hint row under the body stays on screen. The core budgets a page by its pieces'
    // text, but each piece draws inside a frame, a table may draw as cards, a Markdown lists its
    // links and the focused block adds a link row; the page stops before what it draws, measured
    // as serialized (pieceCost), would pass PAGE_BUDGET.
    const body: RenderElement[] = [];
    let used = 0;
    let bytes = 0;
    for (const [k, piece] of page.pieces.entries()) {
      const skip = k === 0 ? this.skip : 0;
      const left = size.bodyRows - used;
      let keep: number | null = null;
      if (piece.rows - skip > left) {
        const overhead = piece.rows - rowsOf(piece.text, textColumns(piece, size.bodyColumns));
        keep = left - overhead;
        if (k > 0 && keep < 2) break;
      }
      const isLastOfBlock = page.pieces[k + 1]?.blockId !== piece.blockId;
      const isLastOfFocus = piece.blockId === this.view.focus && isLastOfBlock;
      const links = isLastOfFocus ? this.linkHrefs(piece.blockId).slice(0, MAX_LINK_BUTTONS) : [];
      const window = keep === null ? null : Math.max(1, keep);
      const under = isLastOfBlock ? this.drawUnder(ui, piece.blockId, isLastOfFocus) : [];
      const cost = this.pieceCost(piece, skip, window, size.bodyColumns, links) + under.length * 2 * PIECE_FRAME_COST;
      if (k > 0 && bytes + cost > PAGE_BUDGET) break;
      bytes += cost;
      body.push(this.drawPiece(ui, piece, skip, window, size.bodyColumns, marked.has(piece.blockId), under));
      if (links.length > 0) body.push(this.drawLinks(ui, piece.blockId, links));
      used += piece.rows - skip;
      if (keep !== null) break;
    }
    const field = this.drawInput(ui);
    return this.frame(ui, header, [...(field === null ? [] : [field]), ui.Box({ key: "body", flexDirection: "column", children: body })], hints);
  }

  // The engine raises ui.scroll for an arrow key only while the tree is taller than the body, so a
  // blank spacer under the hint row keeps it taller. The pane never lets the engine's window move,
  // so the spacer stays below the rows in view.
  private frame(ui: PaneUi, header: Header, middle: RenderElement[], hints: RenderElement): RenderElement {
    return ui.Box({
      flexDirection: "column",
      children: [
        ui.Text({ bold: true, wrap: "truncate-start", children: header.title }),
        ui.Text({ dimColor: true, wrap: "truncate-end", children: header.status }),
        ...middle,
        hints,
        ui.Box({ key: "spacer", height: this.size.bodyRows }),
      ],
    });
  }

  private drawInput(ui: PaneUi): RenderElement | null {
    if (this.input === null || ui.Input === undefined) return null;
    const doc = this.doc;
    if (this.input === ASK_INPUT && this.askAt !== null) {
      const block = this.blocks.find((entry) => entry.id === this.askAt?.blockId);
      return ui.Box({
        key: "ask-row",
        children: [
          ui.Input({
            key: ASK_INPUT,
            label: `Ask Claude to change ${block === undefined ? "this block" : lineRange(block.start, block.end)}`,
            placeholder: "what to change; Enter sends, an empty field closes",
            value: this.askAt.value,
            submitLabel: "send",
            autoFocus: true,
            onSubmit: (value) => {
              this.submitAsk(value);
              this.host?.invalidate();
            },
          }),
        ],
      });
    }
    if (this.input === EDIT_INPUT && this.editAt !== null && doc !== undefined) {
      const line = this.editAt;
      return ui.Box({
        key: "edit-row",
        children: [
          ui.Input({
            key: EDIT_INPUT,
            label: `edit line ${line}`,
            value: lineAt(doc.source, line) ?? "",
            submitLabel: "save",
            autoFocus: true,
            onSubmit: (value) => void this.saveLine(value).then(() => this.host?.invalidate()),
          }),
        ],
      });
    }
    if (this.input === LINE_INPUT && this.picking !== null) {
      const lines = this.picking;
      return ui.Box({
        key: "edit-line-row",
        children: [
          ui.Input({
            key: LINE_INPUT,
            label: "edit which line",
            placeholder: `a line from ${lines[0]} to ${lines.at(-1)}`,
            submitLabel: "edit",
            autoFocus: true,
            onSubmit: (value) => {
              this.pickLine(value);
              this.host?.invalidate();
            },
          }),
        ],
      });
    }
    if (this.input === GOTO_INPUT) {
      return ui.Box({
        key: "goto-row",
        children: [
          ui.Input({
            key: GOTO_INPUT,
            label: "go to",
            placeholder: "path, :line or #heading",
            submitLabel: "go",
            autoFocus: true,
            onSubmit: (value) => void this.goTo(value).then(() => this.host?.invalidate()),
          }),
        ],
      });
    }
    if (this.input !== FIND_INPUT) return null;
    return ui.Box({
      key: "find-row",
      flexDirection: "row",
      columnGap: 2,
      children: [
        ui.Input({
          key: FIND_INPUT,
          label: "find",
          value: this.view.find?.query ?? "",
          submitLabel: "next",
          autoFocus: true,
          onSubmit: (value) => {
            this.find(value);
            this.host?.invalidate();
          },
        }),
        ui.Button({
          key: FIND_NEXT,
          label: "next match",
          plain: true,
          dimColor: true,
          onPress: () => {
            const query = this.view.find?.query;
            if (query !== undefined) this.find(query);
            this.host?.invalidate();
          },
        }),
      ],
    });
  }

  private drawLinks(ui: PaneUi, blockId: string, hrefs: readonly string[]): RenderElement {
    return ui.Box({
      key: `links:${blockId}`,
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 2,
      paddingLeft: MARGIN_COLUMNS,
      children: hrefs.map((href, k) =>
        ui.Button({
          key: `link:${k}`,
          label: `→ ${href}`,
          plain: true,
          dimColor: true,
          onPress: () => void this.followLink(href),
        }),
      ),
    });
  }

  private drawOutline(ui: PaneUi): RenderElement {
    const doc = this.doc;
    const entries = doc?.outline ?? [];
    const rows = this.bodySize().bodyRows;
    const last = Math.max(0, entries.length - rows);
    this.outlineAt = Math.min(last, Math.max(0, this.outlineAt));
    const current = this.sectionHeading();
    const folded = new Set(this.view.folded);
    // A tall body holds thousands of entries; the outline stops at PAGE_BUDGET as a page does.
    const children: RenderElement[] = [];
    let bytes = 0;
    for (const entry of entries.slice(this.outlineAt, this.outlineAt + rows)) {
      const mark = entry.id === current ? "› " : folded.has(entry.id) ? "▸ " : "  ";
      const note = folded.has(entry.id) ? `  (folded, ${hiddenCount(this.blocks, entry.id)})` : "";
      const label = `${mark}${"  ".repeat(Math.max(0, entry.level - 1))}${entry.title}${note}`;
      bytes += JSON.stringify(label).length + JSON.stringify(entry.id).length + PIECE_FRAME_COST;
      if (children.length > 0 && bytes > PAGE_BUDGET) break;
      children.push(ui.Button({ key: `outline:${entry.id}`, label, plain: true, onPress: () => this.jumpTo(entry.id) }));
    }
    return ui.Box({ key: "outline", flexDirection: "column", children });
  }

  /**
   * The serialized characters a piece adds to the tree as drawPiece draws it: its text escaped as
   * JSON, the frame around it, its pressable links, a table's cards and the focused block's link
   * row. An element handle does not serialize as the tree the engine receives, so this is counted
   * from the parts.
   */
  private pieceCost(piece: Piece, skip: number, keep: number | null, columns: number, links: readonly string[]): number {
    const text = rowWindow(piece.text, skip, keep, textColumns(piece, columns));
    let cost = JSON.stringify(text).length + PIECE_FRAME_COST;
    for (const href of this.pressable(piece.blockId, text).keys()) cost += JSON.stringify(href).length + 1;
    const block = this.blocks.find((entry) => entry.id === piece.blockId);
    if (block?.kind === "table" && skip === 0 && keep === null) {
      const table = parseTable(piece.text);
      if (table !== null && naturalWidth(table) > columns) {
        for (const card of tableCards(table)) cost += JSON.stringify(card).length + PIECE_FRAME_COST;
      }
    }
    for (const href of links) cost += 2 * JSON.stringify(href).length + PIECE_FRAME_COST;
    return cost;
  }

  private drawPiece(
    ui: PaneUi,
    piece: Piece,
    skip: number,
    keep: number | null,
    columns: number,
    isMarked: boolean,
    under: readonly RenderElement[],
  ): RenderElement {
    const block = this.blocks.find((entry) => entry.id === piece.blockId);
    const text = rowWindow(piece.text, skip, keep, textColumns(piece, columns));
    let content: RenderElement;
    if (piece.type === "code") {
      const parts: RenderElement[] = [ui.Code({ source: text, language: piece.format })];
      if (piece.marker !== null) parts.push(ui.Text({ dimColor: true, children: `… ${piece.marker}` }));
      content = ui.Box({ flexDirection: "column", children: parts });
    } else if (piece.type === "callout") {
      content = ui.Box({
        borderStyle: "round",
        flexDirection: "column",
        paddingX: 1,
        children: [ui.Text({ bold: true, children: piece.label }), this.markdown(ui, piece, text)],
      });
    } else if (block?.kind === "table" && skip === 0 && keep === null) {
      content = this.drawTable(ui, piece, columns);
    } else {
      content = this.markdown(ui, piece, text);
    }
    const isFocused = piece.blockId === this.view.focus;
    // The margin: the focus mark, then the change marker (Word's Simple Markup) on a block Claude changed.
    const margin = `${isFocused ? "›" : " "}${isMarked ? "▌" : " "}`;
    return ui.Box({
      key: piece.key,
      flexDirection: "row",
      marginBottom: 1,
      children: [
        ui.Text({ ...(isMarked ? { color: "warning" as const } : {}), children: margin }),
        ui.Box({ flexDirection: "column", flexGrow: 1, children: [content, ...under] }),
      ],
    });
  }

  /**
   * What draws under a block: the status of a request about it while Claude works on it; and under
   * the focused block, the keep, discard, refine and view-diff actions when Claude changed it, a
   * Button per task checkbox, and the line Buttons while `e` asks which line.
   */
  private drawUnder(ui: PaneUi, blockId: string, isFocused: boolean): RenderElement[] {
    const doc = this.doc;
    if (doc === undefined) return [];
    const out: RenderElement[] = [];
    // The latest request about the block: one status row, so its key stays unique.
    const ask = this.review.asks.findLast((entry) => entry.path === doc.path && entry.blockId === blockId);
    if (ask !== undefined) {
      const where = lineRange(ask.request.start, ask.request.end);
      const text = ask.phase === "queued" ? `⏳ queued until Claude's current turn ends: ${where}` : `⏳ Claude is editing ${where} …`;
      out.push(ui.Box({ key: `ask:${blockId}`, children: [ui.Text({ dimColor: true, children: text })] }));
    }
    if (!isFocused) return out;
    if (this.review.on(doc.path, blockId).length > 0) {
      const action = (key: string, label: string, run: () => unknown) =>
        ui.Button({ key, label, plain: true, onPress: () => void Promise.resolve(run()).then(() => this.host?.invalidate()) });
      out.push(
        ui.Box({
          key: `actions:${blockId}`,
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: 2,
          children: [
            ui.Text({ children: "✔ Updated" }),
            action(CHANGE_ACTIONS.keep, "[ k keep ]", () => this.keep()),
            action(CHANGE_ACTIONS.discard, "[ x discard ]", () => this.discard()),
            action(CHANGE_ACTIONS.refine, "[ r refine ]", () => this.refine()),
            action(CHANGE_ACTIONS.diff, "[ v view diff ]", () => this.viewDiff()),
          ],
        }),
      );
    }
    const tasks = this.tasksOf(blockId);
    if (tasks.length > 0) out.push(this.lineRow(ui, `tasks:${blockId}`, tasks, taskButton, (line) => this.toggleTaskLine(line)));
    const picking = this.picking;
    if (picking !== null && picking.length <= MAX_LINE_BUTTONS) {
      out.push(this.lineRow(ui, `lines:${blockId}`, picking, lineButton, (line) => this.pickLine(String(line))));
    }
    return out;
  }

  // A wrapping row of Buttons, one per source line, each labelled with the line's text.
  private lineRow(
    ui: PaneUi,
    key: string,
    lines: readonly number[],
    keyOf: (line: number) => string,
    run: (line: number) => unknown,
  ): RenderElement {
    const source = this.doc?.source ?? "";
    const shown = lines.slice(0, MAX_LINE_BUTTONS);
    const label = (line: number) => {
      const text = (lineAt(source, line) ?? "").trim();
      return text.length > 60 ? `${text.slice(0, 59)}…` : text;
    };
    const rest = lines.length - shown.length;
    return ui.Box({
      key,
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 2,
      children: [
        ...shown.map((line) =>
          ui.Button({
            key: keyOf(line),
            label: label(line),
            plain: true,
            onPress: () => void Promise.resolve(run(line)).then(() => this.host?.invalidate()),
          }),
        ),
        ...(rest > 0 ? [ui.Text({ dimColor: true, children: `… ${rest} more; e edits any line` })] : []),
      ],
    });
  }

  // The diff view (design, Change review): the turn's unified diff as Code with format diff, one
  // page at a time, cut so every page parses as hunks.
  private drawDiff(ui: PaneUi, hints: RenderElement): RenderElement {
    const doc = this.doc;
    const host = this.host;
    const turns = this.turnDiffs();
    if (doc === undefined || host === undefined || turns.length === 0) {
      this.screen = "document";
      return this.draw(ui, this.size.bodyColumns, this.size.bodyRows);
    }
    this.view.mode = "diff";
    const at = Math.min(this.diffAt.turn, turns.length - 1);
    const entry = turns[at] ?? { turn: "", diff: "" };
    const blocks = new Set(this.review.of(doc.path).filter((change) => change.turn === entry.turn).flatMap((change) => change.blockIds)).size;
    const header = diffHeader(doc.path, host.repoRoot, at + 1, turns.length, blocks);
    const rows = Math.max(2, this.bodySize().bodyRows - 1);
    const pages = diffPages(entry.diff, rows, ELEMENT_LIMIT);
    const page = Math.min(this.diffAt.page, Math.max(0, pages.length - 1));
    this.diffAt.page = page;
    const children: RenderElement[] = [
      ui.Box({ key: `diff:${at}:${page}`, children: [ui.Code({ source: pages[page] ?? "", format: "diff" })] }),
    ];
    if (pages.length > 1) children.push(ui.Text({ dimColor: true, children: `page ${page + 1} of ${pages.length} · scroll for more` }));
    return this.frame(ui, header, [ui.Box({ key: "body", flexDirection: "column", children })], hints);
  }

  // The core writes each href into the drawn text through linkDestination, and a press names the
  // href as drawn, so the pressable list holds the drawn form, only for the links `text` draws, and
  // a press maps back to the source's href.
  private pressable(blockId: string, text: string): Map<string, string> {
    const drawn = new Map<string, string>();
    for (const href of this.linkHrefs(blockId)) {
      const destination = linkDestination(href);
      if (!drawn.has(destination) && drawn.size < MAX_PRESSABLE && text.includes(`](${destination}`)) {
        drawn.set(destination, href);
      }
    }
    return drawn;
  }

  private markdown(ui: PaneUi, piece: Piece, text: string): RenderElement {
    const drawn = this.pressable(piece.blockId, text);
    if (drawn.size === 0) return ui.Markdown({ key: `md:${piece.key}`, text });
    return ui.Markdown({
      key: `md:${piece.key}`,
      text,
      pressableLinks: [...drawn.keys()],
      onLinkPress: (link) => void this.followLink(drawn.get(link.href) ?? link.href),
    });
  }

  // A table fitted to the body, or one card per row when it is wider; a card set past the element
  // limit falls back to the table's source as Code, which keeps the tree in budget.
  private drawTable(ui: PaneUi, piece: Piece, columns: number): RenderElement {
    const table = parseTable(piece.text);
    if (table === null || naturalWidth(table) <= columns) return this.markdown(ui, piece, piece.text);
    const cards = tableCards(table);
    if (cards.reduce((sum, card) => sum + card.length, 0) > ELEMENT_LIMIT) {
      return ui.Code({ source: piece.text, language: "markdown" });
    }
    return ui.Box({
      flexDirection: "column",
      children: cards.map((card, k) =>
        ui.Box({
          key: `${piece.key}~r${k + 1}`,
          borderStyle: "round",
          paddingX: 1,
          children: [ui.Markdown({ text: card })],
        }),
      ),
    });
  }
}
