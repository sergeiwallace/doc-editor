// The reader pane (design, The pane; The windowed renderer; FR-1 to FR-3, FR-7's redraw): it opens
// a Markdown file, draws only the pieces in view through the core's window, answers its own
// `ui.scroll`, and navigates with the outline, folding, drill-in, find and links with Back. It
// holds no `$`: register.ts binds it to a PaneHost of plain closures at session start. Every
// document rule is the core's; this file keeps the view state and draws it.

import type { Elements, RenderElement } from "claude-code";

import { toDocument } from "../core/blocks.ts";
import { linkDestination } from "../core/html-subset.ts";
import { mapBlockIds } from "../core/changes.ts";
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
import type { Document, HistoryEntry, ViewState } from "../core/types.ts";
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
import { documentHeader, type Header, outlineHeader, readMinutes, shownPath } from "./header.ts";
import { bindingsFor, hintRow, hintRows, type KeyBinding, type Screen } from "./hints.ts";
import type { FileStamp } from "./save.ts";
import { naturalWidth, parseTable, tableCards } from "./tables.ts";
import type { Reload, Watcher } from "./watch.ts";

export const PANE_ID = "doc";
/** What `$.fs.read` can read, and so the largest document the pane opens. */
export const MAX_BYTES = 4 * 1024 * 1024;
export const FIND_INPUT = "find";
export const FIND_NEXT = "find-next";
export const GOTO_INPUT = "goto";
export const EMPTY_TEXT = "No document is open. Run /doc <path> to open one.";

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
 * The `/doc` pane: the open document, its view state, and its drawing. One instance per session.
 */
export class DocPane {
  host: PaneHost | undefined;
  doc: Document | undefined;
  view: ViewState = emptyView("");
  screen: Screen = "document";
  /** Which field the pane shows above the body, if any. */
  input: typeof FIND_INPUT | typeof GOTO_INPUT | null = null;
  isOpen = false;
  /** The body's size as last drawn or scrolled. */
  size: Size = { bodyRows: 24, bodyColumns: 80 };
  /** Rows of the first piece on the page scrolled past, for a piece taller than the body. */
  skip = 0;
  /** The first outline entry the outline view shows. */
  outlineAt = 0;
  /** The keys the pane answers; a later mode appends its own. */
  bindings: KeyBinding<DocPane>[] = [...READ_KEYS];
  /** The drill-in sections entered before the current one, innermost last (null: the whole document). */
  private drills: (string | null)[] = [];
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
    this.skip = 0;
    this.drills = [];
    this.cache = undefined;
    this.minutes = readMinutes(this.doc.blocks);
    this.clearSay();
    host.watcher.watch(loaded.path, loaded.stamp, (reload) => this.reloaded(reload));
  }

  private get blocks() {
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
    return { bodyRows: Math.max(1, this.size.bodyRows - chrome), bodyColumns: this.contentColumns() };
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
  openInput(input: typeof FIND_INPUT | typeof GOTO_INPUT): void {
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
    if (view.focus !== null) view.offset = revealOffset(this.pieces(), view.offset, view.focus, this.bodySize());
    this.skip = 0;
    host.invalidate();
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
    const header = documentHeader({
      path: doc.path,
      repoRoot: host.repoRoot,
      blocks: doc.blocks,
      at: this.view.focus ?? this.view.drill,
      mode: this.view.mode,
      find: this.view.find,
      drill: this.view.drill,
      minutes: this.minutes,
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
      const isLastOfFocus = piece.blockId === this.view.focus && page.pieces[k + 1]?.blockId !== piece.blockId;
      const links = isLastOfFocus ? this.linkHrefs(piece.blockId).slice(0, MAX_LINK_BUTTONS) : [];
      const window = keep === null ? null : Math.max(1, keep);
      const cost = this.pieceCost(piece, skip, window, size.bodyColumns, links);
      if (k > 0 && bytes + cost > PAGE_BUDGET) break;
      bytes += cost;
      body.push(this.drawPiece(ui, piece, skip, window, size.bodyColumns));
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

  private drawPiece(ui: PaneUi, piece: Piece, skip: number, keep: number | null, columns: number): RenderElement {
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
    return ui.Box({
      key: piece.key,
      flexDirection: "row",
      marginBottom: 1,
      children: [
        ui.Text({ children: isFocused ? "› " : "  " }),
        ui.Box({ flexDirection: "column", flexGrow: 1, children: [content] }),
      ],
    });
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
