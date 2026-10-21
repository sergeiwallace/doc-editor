import type { On } from "claude-code";

// mdast-link.js is a symlink to plugins/doc-editor/core/vendor/mdast.js, outside this plugin.
import { fromMarkdown } from "./mdast-link.js";

export function register(on: On) {
  on("session.start", async ($, e, next) => {
    await $.command.register({ name: "symprobe", description: "Parse a sample through the symlink" });
    return next(e);
  });

  on("command.run", { command: "symprobe" }, () => {
    const tree = fromMarkdown("# Heading\n\nA paragraph.\n") as {
      children: { type: string; position: { start: { line: number } } }[];
    };
    const kinds = tree.children.map((node) => `${node.type}@${node.position.start.line}`);
    return { text: `SYMPROBE loaded through the symlink: ${kinds.join(", ")}` };
  });
}
