import type { RenderPropsOf } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { PANE_ID, PLUGIN_NAME } from "./register.ts";
import { openLinkKey } from "./rows.ts";
import { CWD, paneWorld, SESSION } from "./tests/pane-world.ts";

// The open link under Claude's Read, Write and Edit rows (FR-1, D-13). The row beneath is the
// test's own hook, standing for the engine or any other mod: the link is added under it, so it
// still draws.

const DOC = `${CWD}/docs/design.md`;
const TEXT = "# Design\n\nBody.\n";

const call = (tool: string, file_path: string, extra: Partial<RenderPropsOf["ToolUse"]> = {}): RenderPropsOf["ToolUse"] => ({
  tool_use_id: "toolu_1",
  tool,
  input: { file_path },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  output: {},
  ...extra,
});

describe("open link under tool rows", () => {
  for (const tool of ["Read", "Write", "Edit"]) {
    test(`should draw an open link under a ${tool} row that names a .md file, and open the pane on it when pressed`, async ($, on) => {
      const w = paneWorld(on, { files: { [DOC]: TEXT } });
      on("ui.render", { component: "ToolUse" }, ($$, e) => ({ type: "Text", props: {}, children: [`${e.props.tool}(row beneath)`] }) as never);
      await $.session.start(SESSION);
      const row = await $.ui.mount({ plugin: PLUGIN_NAME, surface: "terminal", component: "ToolUse", props: call(tool, DOC), requestId: "toolu_1" });

      expect((await row.find({ type: "Text", text: `${tool}(row beneath)` }))?.text).toBe(`${tool}(row beneath)`);
      expect((await row.find({ key: openLinkKey(DOC) }))?.text).toContain("open design.md in doc-editor");

      await row.press({ key: openLinkKey(DOC) });

      expect(w.opened).toEqual([{ id: PANE_ID, title: "design.md", focus: true }]);
    });
  }

  for (const [name, props] of [
    ["a row for another tool", call("Bash", DOC)],
    ["a row naming a file that is not Markdown", call("Read", `${CWD}/src/main.ts`)],
    ["a row whose call errored", call("Read", DOC, { isErrored: true })],
    ["a row whose call still runs", call("Write", DOC, { isRunning: true })],
  ] as const) {
    test(`should draw only the row beneath for ${name}`, async ($, on) => {
      paneWorld(on, { files: { [DOC]: TEXT } });
      on("ui.render", { component: "ToolUse" }, () => ({ type: "Text", props: {}, children: ["row beneath"] }) as never);
      await $.session.start(SESSION);
      const row = await $.ui.mount({ plugin: PLUGIN_NAME, surface: "terminal", component: "ToolUse", props, requestId: "toolu_1" });

      expect(await row.findAll({ type: "Button" })).toEqual([]);
      expect((await row.drawn()).type).toBe("Text");
    });
  }

  test("should draw one open link per Markdown file under a folded group of reads", async ($, on) => {
    paneWorld(on, { files: { [DOC]: TEXT } });
    on("ui.render", { component: "ToolGroup" }, () => ({ type: "Text", props: {}, children: ["Read 3 files"] }) as never);
    await $.session.start(SESSION);
    const other = `${CWD}/README.md`;
    const calls = [call("Read", DOC), call("Read", `${CWD}/src/main.ts`), call("Read", other), call("Read", DOC)];
    const row = await $.ui.mount({
      plugin: PLUGIN_NAME,
      surface: "terminal",
      component: "ToolGroup",
      props: { calls, isActive: false, isExpanded: false },
    });

    expect((await row.findAll({ type: "Button" })).map((button) => button.key)).toEqual([openLinkKey(DOC), openLinkKey(other)]);
    expect((await row.find({ type: "Text", text: "Read 3 files" }))?.text).toBe("Read 3 files");
  });
});
