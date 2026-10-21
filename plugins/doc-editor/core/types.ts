// The document model shared by the mod, the web app and the MCP App (design, Data Model).
// Plain JSON shapes only: no classes, no functions, no runtime code.

export type BlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "fence"
  | "table"
  | "quote"
  | "callout"
  | "thematic"
  | "html"
  | "raw";

/** One block of the source. `start` and `end` are the 1-based line range in the source. */
export interface Block {
  id: string;
  kind: BlockKind;
  level?: number;
  text: string;
  start: number;
  end: number;
  /** List items and quote content. */
  children?: Block[];
  /** The text the pane draws, present only where it differs from `text` (see core/blocks.ts). */
  drawn?: string;
}

export interface OutlineEntry {
  id: string;
  level: number;
  title: string;
}

export type LinkKind = "file" | "heading" | "url";

export interface Link {
  blockId: string;
  href: string;
  kind: LinkKind;
}

/** The source text with line ranges is the canonical document; blocks index into it. */
export interface Document {
  path: string;
  mtimeMs: number;
  source: string;
  blocks: Block[];
  outline: OutlineEntry[];
  links: Link[];
}

export interface FindState {
  query: string;
  hits: string[];
  at: number;
}

export type ViewMode = "read" | "edit" | "diff";

export interface HistoryEntry {
  path: string;
  focus: string | null;
}

export interface ViewState {
  path: string;
  offset: number;
  focus: string | null;
  folded: string[];
  drill: string | null;
  find: FindState | null;
  mode: ViewMode;
  history: HistoryEntry[];
}

/** One block range Claude changed in one turn. */
export interface Change {
  turn: string;
  blockIds: string[];
  before: string;
  after: string;
  start: number;
  end: number;
}

/** What a Claude-mediated edit names: the file, the line range, the section and the ask. */
export interface EditRequest {
  path: string;
  start: number;
  end: number;
  heading: string;
  firstWords: string;
  instruction: string;
}

export type ConverterName = "lynx" | "w3m" | "pdftotext" | "pdftoppm" | "pandoc" | "node";

export interface Converter {
  name: ConverterName;
  present: boolean;
  checkedAt: number;
}
