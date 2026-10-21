// The `show` tool Claude calls to open a file in the pane (FR-1, D-13). It is the plugin's own
// registered tool, so its tool.call hook answers it (NFR-9).

import type { DocPane } from "./pane.ts";

export const SHOW_TOOL = "show";
/** The name the model calls it by: `mcp__<plugin>__<name>`. */
export const SHOW_TOOL_CALL = "mcp__doc-editor__show";

export const SHOW_TOOL_SPEC = {
  name: SHOW_TOOL,
  description:
    "Open a Markdown file in the doc-editor pane beside the transcript so the user can read it. " +
    "The path may end in :N to show line N or #heading to show that heading.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The file's path, absolute or relative to the session's directory, with an optional :N or #heading",
      },
    },
    required: ["path"],
  },
} as const;

export type ShowAnswer = { result: string } | { deny: string };

/** Opens the pane on the call's path; a path the pane cannot open is refused with the reason. */
export async function runShow(pane: DocPane, input: { path?: unknown }): Promise<ShowAnswer> {
  if (typeof input.path !== "string" || input.path.trim() === "") {
    return { deny: "show needs a path: a string naming the file" };
  }
  const opened = await pane.openSpec(input.path, { focus: false });
  if (!opened.ok) return { deny: opened.reason };
  if (!opened.isPlaced) return { result: `opened ${opened.path}; the pane is not on screen yet: ${opened.reason}` };
  return { result: `opened ${opened.path} in the doc-editor pane` };
}
