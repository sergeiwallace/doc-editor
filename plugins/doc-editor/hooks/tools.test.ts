import { describe, expect, test } from "claude-code/testing";

import { PANE_ID } from "./register.ts";
import { CWD, mountPane, paneWorld, SESSION } from "./tests/pane-world.ts";
import { SHOW_TOOL_CALL } from "./tools.ts";

// The `show` tool Claude calls, answered by the mod's own tool.call hook (FR-1, D-13, NFR-9).

const DOC = `${CWD}/doc.md`;
const TEXT = "# Notes\n\nFirst paragraph.\n\n## Later\n\nSecond paragraph.\n";

describe("show", () => {
  test("should open the pane on the path when Claude calls show", async ($, on) => {
    const w = paneWorld(on, { files: { [DOC]: TEXT } });
    await $.session.start(SESSION);

    const result = await $.tool.call({ tool: SHOW_TOOL_CALL, path: "doc.md#later" });
    const ui = await mountPane($);

    expect(result).toEqual(expect.objectContaining({ result: `opened ${DOC} in the doc-editor pane` }));
    expect(w.opened).toEqual([{ id: PANE_ID, title: "doc.md" }]);
    expect((await ui.findAll({ type: "Text" }))[0]?.text).toBe("doc.md › Notes › Later");
  });

  test("should refuse the call with the reason and open no pane when the path does not exist", async ($, on) => {
    const w = paneWorld(on, { files: { [DOC]: TEXT } });
    await $.session.start(SESSION);

    const result = await $.tool.call({ tool: SHOW_TOOL_CALL, path: "missing.md" });

    expect(JSON.stringify(result)).toContain("no such file: missing.md");
    expect(w.opened).toEqual([]);
    expect(w.statuses).toEqual(["no such file: missing.md"]);
  });

  test("should refuse a call without a path string", async ($, on) => {
    const w = paneWorld(on, { files: { [DOC]: TEXT } });
    await $.session.start(SESSION);

    const result = await $.tool.call({ tool: SHOW_TOOL_CALL, path: 3 });

    expect(JSON.stringify(result)).toContain("show needs a path");
    expect(w.opened).toEqual([]);
  });
});
