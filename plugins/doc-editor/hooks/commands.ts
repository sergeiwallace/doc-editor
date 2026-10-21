// `/doc <path>[:line|#heading]` and the path completion after it (FR-1, D-13).

import { absoluteFrom, type DocPane } from "./pane.ts";

export const COMMAND_NAME = "doc";

export const COMMAND_SPEC = {
  name: COMMAND_NAME,
  description: "Open a Markdown file as a document in a pane",
  argumentHint: "<path>[:line|#heading]",
} as const;

const MAX_SUGGESTIONS = 20;
const MARKDOWN = /\.(md|markdown)$/i;
const AFTER_COMMAND = new RegExp(`^\\s*/${COMMAND_NAME}\\s+$`);

/**
 * Runs `/doc`: opens the pane on the path, or, with no path and a document already read this
 * session, shows that document again. A failure is the status row the pane wrote.
 */
export async function runDoc(pane: DocPane, args: string): Promise<{ text?: string }> {
  if (args.trim() === "" && pane.doc !== undefined) {
    await pane.present(true);
    return {};
  }
  await pane.openSpec(args, { focus: true });
  return {};
}

/** One directory entry as `$.fs.list` gives it. */
export interface Entry {
  name: string;
  kind: "file" | "dir" | "other";
}

/** What the completion reads: `$.fs.list` of an absolute directory. */
export type ListDir = (path: string) => Promise<readonly Entry[]>;

export interface Suggestion {
  text: string;
  label?: string;
  description?: string;
}

/**
 * Path suggestions for the token after `/doc `: the directories and Markdown files in the
 * token's directory, read from the session's directory, whose names start with its last part.
 * Nothing for any other token.
 */
export async function completePath(
  list: ListDir,
  cwd: string,
  draft: { text: string; token: string; start: number },
): Promise<Suggestion[]> {
  if (!AFTER_COMMAND.test(draft.text.slice(0, draft.start))) return [];
  const cut = draft.token.lastIndexOf("/");
  const dir = cut < 0 ? "" : draft.token.slice(0, cut + 1);
  const prefix = draft.token.slice(cut + 1);
  let entries: readonly Entry[];
  try {
    entries = await list(absoluteFrom(cwd, dir === "" ? "." : dir));
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.name.startsWith(prefix) && (prefix.startsWith(".") || !entry.name.startsWith(".")))
    .filter((entry) => entry.kind === "dir" || MARKDOWN.test(entry.name))
    .sort((a, b) => Number(b.kind === "dir") - Number(a.kind === "dir") || a.name.localeCompare(b.name))
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => {
      const text = `${dir}${entry.name}${entry.kind === "dir" ? "/" : ""}`;
      return { text, label: text, description: entry.kind === "dir" ? "folder" : "Markdown file" };
    });
}
