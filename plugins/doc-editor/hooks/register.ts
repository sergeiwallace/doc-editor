import type { On } from "claude-code";

import {
  COMMAND_NAME,
  COMMAND_SPEC,
  completePath,
  FALLBACK_COMMAND_NAME,
  FALLBACK_COMMAND_SPEC,
  noCommandText,
  runDoc,
  takenText,
} from "./commands.ts";
import { DocPane, PANE_ID, type PaneHost } from "./pane.ts";
import { groupPaths, rowPath, withOpenLinks } from "./rows.ts";
import { createSaver, type FileStamp, type Save } from "./save.ts";
import { runShow, SHOW_TOOL_SPEC } from "./tools.ts";
import { createWatcher, type Watcher } from "./watch.ts";

export { COMMAND_NAME, FALLBACK_COMMAND_NAME, PANE_ID };
export const PLUGIN_NAME = "doc-editor";
export const OPEN_FAILED_TEXT = "doc-editor could not open the pane";

// A refusal's reason without the engine's `<plugin>: <call>: ` lead, for the status row. The
// pattern is a string, so the source scan never reads its dollar sign as the engine handed on.
const ENGINE_LEAD = new RegExp("^[\\w-]+: \\$\\.\\w+\\.\\w+: ");
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(ENGINE_LEAD, "");

/**
 * Registers `/doc` and the `show` tool at session start, binds the pane, the safe-write path and
 * the reload watcher, draws the pane and the open link under Read, Write and Edit rows, and
 * observes Write and Edit tool calls. Every `$` call of the plugin sits in this file; helpers in
 * other files take plain values or closures, never `$`.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  // Matchers and the tool name are literals so that `claude plugin validate` and the safety floor
  // can read them; they are COMMAND_NAME, PANE_ID, SHOW_TOOL and SHOW_TOOL_CALL.
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
    const save = session.save;
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
      save,
      // The request is the person's own words (D-4); the pane never awaits this in a hook.
      submit: async (text) => {
        const result = await $.prompt.submit({ text, asUser: true });
        return result.drop === undefined ? { ok: true } : { ok: false, reason: result.drop };
      },
      storeChanges: async (path, changes) => {
        await $.state.set({ plugin: "doc-editor", key: "changes", id: path }, changes);
      },
      loadChanges: async (path) => (await $.state.get({ plugin: "doc-editor", key: "changes", id: path })).value ?? [],
    };
    pane.bind(host);
    // Each registration stands alone, so a refusal of one never stops the next. `/doc` may already
    // be the person's own skill or command; `/doc-editor` then stands in for it.
    try {
      await $.command.register(COMMAND_SPEC);
      pane.command = COMMAND_NAME;
    } catch (taken) {
      try {
        await $.command.register(FALLBACK_COMMAND_SPEC);
        pane.command = FALLBACK_COMMAND_NAME;
        $.ui.status(takenText(message(taken)));
      } catch (refused) {
        pane.command = null;
        $.ui.status(noCommandText(message(refused)));
      }
    }
    try {
      await $.tool.register({ ...SHOW_TOOL_SPEC, name: "show" });
    } catch (refused) {
      $.ui.status(`the show tool could not be registered (${message(refused)})`);
    }

    return next(e);
  });

  // Only the name the session granted is the mod's: a `/doc` that is the person's own passes on.
  on("command.run", { command: ["doc", "doc-editor"] }, async (_$, e, next) =>
    e.command === pane.command ? runDoc(pane, e.args) : next(e),
  ).catch(() => ({
    text: OPEN_FAILED_TEXT,
  }));

  on("prompt.autocomplete", async ($, e, next) => {
    const base = await next(e);
    const cwd = pane.host?.cwd;
    if (cwd === undefined) return base;
    const extra = await completePath((path) => $.fs.list(path), cwd, e, pane.command);
    return extra.length === 0 ? base : { suggestions: [...base.suggestions, ...extra] };
  }).catch((_$, e, next) => next(e));

  // The plugin's own tool: answered here, never passed on (NFR-9).
  on("tool.call", { tool: "mcp__doc-editor__show" }, async (_$, e) => runShow(pane, { path: e["path"] })).catch(() => ({
    deny: OPEN_FAILED_TEXT,
  }));

  // Observed, never answered (NFR-9): the call goes on with next and its own result comes back.
  on("tool.call", { tool: ["Write", "Edit"] }, async (_$, e, next) => {
    const result = await next(e);
    void session.watcher?.check();

    return result;
  }).catch((_$, e, next) => next(e));

  // The main loop's turns, observed: a request the pane submitted learns its turn id at the start,
  // and its edit lands at the end. Both pass on unchanged and never wait on the pane.
  on("turn.start", (_$, e, next) => {
    if (e.agentId === undefined) pane.turnStarted(e.turnId, e.text);

    return next(e);
  }).catch((_$, e, next) => next(e));

  on("turn.complete", (_$, e, next) => {
    if (e.agentId === undefined) void pane.turnEnded(e.turnId);

    return next(e);
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

  // The open link under Claude's Read, Write and Edit rows; the row is the chain's (D-13).
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    const row = await next(e);
    const path = rowPath(e.props);
    if (path === null) return row;
    const { Box, Button } = await $.ui.resolve(e);
    return withOpenLinks({ Box, Button }, row, [path], (file) => void pane.openSpec(file, { focus: true }));
  }).catch((_$, e, next) => next(e));

  on("ui.render", { component: "ToolGroup" }, async ($, e, next) => {
    const row = await next(e);
    const paths = groupPaths(e.props.calls);
    if (paths.length === 0) return row;
    const { Box, Button } = await $.ui.resolve(e);
    return withOpenLinks({ Box, Button }, row, paths, (file) => void pane.openSpec(file, { focus: true }));
  }).catch((_$, e, next) => next(e));
}
