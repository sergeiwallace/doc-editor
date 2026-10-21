import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { COMMAND_NAME } from "./register.ts";
import { CWD, header, openDoc, START_MS } from "./tests/pane-world.ts";

const SESSION = { surface: "terminal", isInteractive: true, cwd: "/work/doc-editor" } as const;

// The engine beneath the mod: it ends the session start and keeps each command the mod registers.
function world(on: On) {
  const registered: string[] = [];
  on("session.start", (_engine, e) => ({ cwd: e.cwd }));
  on("command.register", (_engine, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  on("tool.register", (_engine, e) => ({ value: { tool: `mcp__doc-editor__${e.name}` } }));
  return { registered };
}

describe("register", () => {
  test("should register /doc when the session starts", async ($, on) => {
    const w = world(on);

    await $.session.start(SESSION);

    expect(w.registered).toEqual([COMMAND_NAME]);
  });

  // T-1.7: a Write or Edit re-reads the open file at once, without waiting for the clock.
  for (const tool of ["Write", "Edit"] as const) {
    test(`should re-read the open file and redraw the pane when Claude's ${tool} call on it returns`, async ($, on) => {
      const doc = `${CWD}/notes.md`;
      on("tool.call", { tool: ["Write", "Edit"] }, () => ({ result: { written: doc } }) as never);
      const { w, ui } = await openDoc($, on, { files: { [doc]: "# Before\n" } }, "notes.md");
      expect((await header(ui)).title).toBe("notes.md › Before");

      w.edit(doc, "# After\n");
      await $.tool.call({ tool, file_path: doc, content: "# After\n", old_string: "Before", new_string: "After" });
      await w.clock.settle();

      expect((await header(ui)).title).toBe("notes.md › After");
      expect(w.clock.now()).toBe(START_MS);
    });
  }

  // NFR-9: the mod observes Write and Edit to trigger a reload and never answers them.
  for (const call of [
    { tool: "Write", file_path: "/work/doc-editor/notes.md", content: "# Notes\n" },
    { tool: "Edit", file_path: "/work/doc-editor/notes.md", old_string: "a", new_string: "b" },
  ] as const) {
    test(`should pass the ${call.tool} call on and return the tool's own result unchanged`, async ($, on) => {
      world(on);
      const ran: unknown[] = [];
      const answer = { result: { written: call.file_path }, text: `${call.tool} ran` };
      on("tool.call", { tool: ["Write", "Edit"] }, (_engine, e) => {
        ran.push(e.file_path);
        return answer as never;
      });
      await $.session.start(SESSION);

      const result = await $.tool.call(call);

      expect(ran).toEqual([call.file_path]);
      expect(result).toEqual(expect.objectContaining(answer));
    });

    test(`should pass the ${call.tool} call's refusal on unchanged`, async ($, on) => {
      world(on);
      on("tool.call", { tool: ["Write", "Edit"] }, () => ({ deny: "refused beneath the mod" }));
      await $.session.start(SESSION);

      const result = await $.tool.call(call);

      expect(result).toEqual(expect.objectContaining({ deny: "refused beneath the mod" }));
    });
  }
});
