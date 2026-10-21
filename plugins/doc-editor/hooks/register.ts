import type { On } from "claude-code";

import { COMMAND_NAME, COMMAND_SPEC, completePath, runDoc } from "./commands.ts";
import { DocPane, PANE_ID, type PaneHost } from "./pane.ts";
import { createSaver, type FileStamp, type Save } from "./save.ts";
import { createWatcher, type Watcher } from "./watch.ts";

export { COMMAND_NAME, PANE_ID };
export const PLUGIN_NAME = "doc-editor";
export const OPEN_FAILED_TEXT = "doc-editor could not open the pane";

/**
 * Registers `/doc` at session start, binds the pane, the safe-write path and the reload watcher,
 * draws the pane, and observes Write and Edit tool calls. Every `$` call of the plugin sits in
 * this file; helpers in other files take plain values or closures, never `$`.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  // Matchers are literals so that `claude plugin validate` and the safety floor can read them;
  // they are COMMAND_NAME and PANE_ID.
  // What the session's start binds for the pane: the safe-write path and the reload watcher.
  const session: { save?: Save; watcher?: Watcher } = {};
  const pane = new DocPane();

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
    const watcher = createWatcher({
      stat,
      read: (path) => $.fs.read(path),
      every: (ms, fn) => $.clock.every(ms, fn),
    });
    session.watcher = watcher;
    const root = await $.fs.stat(e.cwd, { resolve: true }).catch(() => undefined);
    const host: PaneHost = {
      cwd: e.cwd,
      repoRoot: root?.realPath ?? e.cwd,
      stat: (path) => $.fs.stat(path, { resolve: true }),
      readBytes: async (path) => (await $.fs.read(path, { as: "bytes" })).base64,
      open: ({ title, focus }) => $.ui.open({ id: PANE_ID, title, ...(focus ? { focus: true as const } : {}) }),
      close: () => $.ui.close({ id: PANE_ID }),
      invalidate: () => $.ui.invalidate("ui.render"),
      status: (text) => $.ui.status(text),
      focus: (key) => $.ui.focus({ requestId: PANE_ID, key }),
      watcher,
    };
    pane.bind(host);
    await $.command.register(COMMAND_SPEC);

    return next(e);
  });

  on("command.run", { command: "doc" }, async (_$, e) => runDoc(pane, e.args)).catch(() => ({
    text: OPEN_FAILED_TEXT,
  }));

  on("prompt.autocomplete", async ($, e, next) => {
    const base = await next(e);
    const cwd = pane.host?.cwd;
    if (cwd === undefined) return base;
    const extra = await completePath((path) => $.fs.list(path), cwd, e);
    return extra.length === 0 ? base : { suggestions: [...base.suggestions, ...extra] };
  }).catch((_$, e, next) => next(e));

  // Observed, never answered (NFR-9): the call goes on with next and its own result comes back.
  on("tool.call", { tool: ["Write", "Edit"] }, async (_$, e, next) => {
    const result = await next(e);
    void session.watcher?.check();

    return result;
  }).catch((_$, e, next) => next(e));

  on("ui.close", { id: "doc" }, async (_$, e, next) => {
    const result = await next(e);
    if (result.deny === undefined && e.origin.kind !== "plugin") pane.closed();

    return result;
  }).catch((_$, e, next) => next(e));

  // The pane answers its own scroll (D-2): its offset moves, the engine's window never does.
  on("ui.scroll", { requestId: "doc" }, (_$, e) => {
    pane.scroll(e.by, e.bodyRows);

    return {};
  }).catch(() => ({}));

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e);
    const elements = await $.ui.resolve(e);
    const { Box, Text, Button, Markdown, Code } = elements;
    const Input = "Input" in elements ? elements.Input : undefined;
    return pane.draw(
      { Box, Text, Button, Markdown, Code, ...(Input === undefined ? {} : { Input }) },
      e.props.bodyColumns,
      e.props.scroll.bodyRows,
    );
  });
}
