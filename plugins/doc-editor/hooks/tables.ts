// Tables fitted to the pane (FR-2): a table whose natural width fits `bodyColumns` draws as the
// engine's own Markdown table; a wider one draws as one card per row, each card the row's cells
// under their column names. The cells keep their inline Markdown.

import { parseMarkdown } from "../core/parse.ts";
import type { Node } from "../core/parse.ts";

export interface Table {
  header: string[];
  rows: string[][];
}

const cellText = (source: string, cell: Node): string => {
  const children = cell.children ?? [];
  const first = children[0];
  const last = children.at(-1);
  if (first === undefined || last === undefined) return "";
  return source.slice(first.position?.start.offset ?? 0, last.position?.end.offset ?? 0).trim();
};

/** The header and body cells of the first table in `text`, or null when it holds none. */
export function parseTable(text: string): Table | null {
  const { tree } = parseMarkdown(text);
  const table = tree.children.find((node) => node.type === "table");
  if (table === undefined) return null;
  const rows = (table.children ?? []).map((row) => (row.children ?? []).map((cell) => cellText(text, cell)));
  const [header, ...body] = rows;
  if (header === undefined) return null;
  return { header, rows: body };
}

/** The columns the engine needs to draw the table unwrapped: each column's widest cell, padded. */
export function naturalWidth(table: Table): number {
  const widths = table.header.map((cell) => cell.length);
  for (const row of table.rows) {
    row.forEach((cell, k) => {
      widths[k] = Math.max(widths[k] ?? 0, cell.length);
    });
  }
  return widths.reduce((sum, width) => sum + width + 3, 1);
}

/** Each body row as one card's Markdown: `**Column:** value` lines with hard line breaks. */
export function tableCards(table: Table): string[] {
  return table.rows.map((row) =>
    table.header
      .map((name, k) => `**${name === "" ? `Column ${k + 1}` : name}:** ${row[k] ?? ""}`)
      .join("  \n"),
  );
}
