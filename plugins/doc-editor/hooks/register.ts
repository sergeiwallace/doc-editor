import type { On } from "claude-code";

import { createSaver, type FileStamp, type Save } from "./save.ts";
import { createWatcher, type Watcher } from "./watch.ts";

export const COMMAND_NAME = "doc";
// Claude Code draws a command's text after the plugin's name, so the line names no plugin itself.
export const NOT_BUILT_TEXT =
  "the document reader is not built yet; /doc opens a pane in a later release.";

/**
 * Registers `/doc` at session start, binds the safe-write path and the reload watcher, and
 * observes Write and Edit tool calls. Every `$` call of the plugin sits in this file; helpers in
 * other files take plain values or closures, never `$`.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  // What the session's start binds for the pane: the safe-write path and the reload watcher.
  const session: { save?: Save; watcher?: Watcher } = {};

  on("session.start", async ($, e, next) => {
    const stat = async (path: string): Promise<FileStamp> => {
      const { mtimeMs, size } = await $.fs.stat(path);
      return { mtimeMs, size };
    };
    session.save = createSaver({
      stat,
      write: (path, text) => $.fs.write(path, text),
      nodeVersion: () => $.process.run(["node", "--version"]),
      saveHelper: (args, stdin) =>
        $.process.run(["node", `${$.plugin.root}/bin/save.mjs`, ...args], { stdin }),
      ask: (question, options) => $.ui.ask(question, options),
      status: (text) => $.ui.status(text),
    });
    session.watcher = createWatcher({
      stat,
      read: (path) => $.fs.read(path),
      every: (ms, fn) => $.clock.every(ms, fn),
    });
    await $.command.register({
      name: COMMAND_NAME,
      description: "Open a Markdown file as a document in a pane",
    });

    return next(e);
  });

  on("command.run", { command: COMMAND_NAME }, async () => ({ text: NOT_BUILT_TEXT })).catch(
    (_$, e, next) => next(e),
  );

  // Observed, never answered (NFR-9): the call goes on with next and its own result comes back.
  on("tool.call", { tool: ["Write", "Edit"] }, async (_$, e, next) => {
    const result = await next(e);
    void session.watcher?.check();

    return result;
  }).catch((_$, e, next) => next(e));
}
