// The open link under Claude's Read, Write and Edit rows (FR-1, D-13). The row itself is drawn by
// whatever the chain beneath returns (`next`), so other mods still draw it; this adds one line.

import type { Elements, RenderElement } from "claude-code";

const FILE_TOOLS = new Set(["Read", "Write", "Edit"]);
const MARKDOWN = /\.(md|markdown)$/i;
const MAX_GROUP_LINKS = 5;

const filePath = (input: unknown): string | null => {
  if (typeof input !== "object" || input === null) return null;
  const path = (input as { file_path?: unknown }).file_path;
  return typeof path === "string" && MARKDOWN.test(path) ? path : null;
};

/** The Markdown file a Read, Write or Edit call names, once it ran without error; else null. */
export function rowPath(call: { tool: string; input: unknown; isRunning: boolean; isErrored: boolean }): string | null {
  if (!FILE_TOOLS.has(call.tool) || call.isRunning || call.isErrored) return null;
  return filePath(call.input);
}

/** The distinct Markdown files a folded run of calls names, in order, at most MAX_GROUP_LINKS. */
export function groupPaths(calls: readonly Parameters<typeof rowPath>[0][]): string[] {
  const out: string[] = [];
  for (const call of calls) {
    const path = rowPath(call);
    if (path !== null && !out.includes(path)) out.push(path);
  }
  return out.slice(0, MAX_GROUP_LINKS);
}

/** The address of a row's open link, which a test presses. */
export const openLinkKey = (path: string): string => `open:${path}`;

/** The row as the chain drew it, with one open link per path under it. */
export function withOpenLinks(
  ui: Pick<Elements["terminal"], "Box" | "Button">,
  row: RenderElement,
  paths: readonly string[],
  open: (path: string) => void,
): RenderElement {
  if (paths.length === 0) return row;
  return ui.Box({
    flexDirection: "column",
    children: [
      row,
      ...paths.map((path) =>
        ui.Button({
          key: openLinkKey(path),
          label: `  ⎿ open ${path.slice(path.lastIndexOf("/") + 1)} in doc-editor`,
          plain: true,
          dimColor: true,
          onPress: () => open(path),
        }),
      ),
    ],
  });
}
