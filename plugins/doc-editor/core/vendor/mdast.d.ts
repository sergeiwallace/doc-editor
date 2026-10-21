// Types for the vendored bundle mdast.js, which scripts/bundle-vendor.mjs builds and which has
// no declarations of its own. Only the parts the core calls are declared.

export interface Point {
  line: number;
  column: number;
  offset?: number;
}

export interface Position {
  start: Point;
  end: Point;
}

export interface Node {
  type: string;
  position?: Position;
  children?: Node[];
  value?: string;
  depth?: number;
  url?: string;
  alt?: string | null;
  title?: string | null;
  identifier?: string;
  label?: string | null;
  referenceType?: string;
  checked?: boolean | null;
  lang?: string | null;
  ordered?: boolean | null;
  spread?: boolean | null;
}

export interface Root extends Node {
  type: "root";
  children: Node[];
}

export interface Extension {
  readonly kind: "micromark-or-mdast-extension";
}

export interface FromMarkdownOptions {
  extensions?: Extension[];
  mdastExtensions?: Extension[];
}

export function fromMarkdown(value: string, options?: FromMarkdownOptions): Root;
export function gfm(): Extension;
export function gfmFromMarkdown(): Extension;
