import type { On } from "claude-code";

export const COMMAND_NAME = "doc";
// Claude Code draws a command's text after the plugin's name, so the line names no plugin itself.
export const NOT_BUILT_TEXT =
  "the document reader is not built yet; /doc opens a pane in a later release.";

/**
 * Registers `/doc` at session start. Every `$` call of the plugin sits in this file; helpers in
 * other files take plain values or closures, never `$`.
 *
 * @param on the engine's registrar
 */
export function register(on: On) {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: COMMAND_NAME,
      description: "Open a Markdown file as a document in a pane",
    });

    return next(e);
  });

  on("command.run", { command: COMMAND_NAME }, async () => ({ text: NOT_BUILT_TEXT })).catch(
    (_$, e, next) => next(e),
  );
}
