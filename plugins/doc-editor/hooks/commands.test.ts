import type { Engine } from "claude-code/testing";
import { describe, expect, test } from "claude-code/testing";

import { COMMAND_NAME } from "./commands.ts";
import { PANE_ID } from "./register.ts";
import { CWD, mountPane, openDoc, paneWorld, SESSION } from "./tests/pane-world.ts";

// `/doc` and the path completion after it, through the mod's hooks (FR-1, D-13).

const DOC = `${CWD}/doc.md`;
const DIRS = {
  [CWD]: [
    { name: "doc.md", kind: "file" as const },
    { name: "docs", kind: "dir" as const },
    { name: "dodo.txt", kind: "file" as const },
    { name: ".hidden.md", kind: "file" as const },
    { name: "README.md", kind: "file" as const },
  ],
  [`${CWD}/docs`]: [
    { name: "design.md", kind: "file" as const },
    { name: "diagram.svg", kind: "file" as const },
  ],
};
const draft = (text: string) => {
  const start = text.lastIndexOf(" ") + 1;
  return { text, cursor: text.length, token: text.slice(start), start };
};

// The engine raises prompt.autocomplete as the prompt box's typeahead does; the kit's `$` carries
// the event, which its noun type does not list.
type Suggested = { suggestions: readonly { text: string }[] };
const complete = ($: Engine, text: string): Promise<Suggested> =>
  ($.prompt as unknown as { autocomplete: (e: ReturnType<typeof draft>) => Promise<Suggested> }).autocomplete(draft(text));

describe("/doc", () => {
  test("should register /doc when the session starts", async ($, on) => {
    const w = paneWorld(on, { files: {} });

    await $.session.start(SESSION);

    expect(w.commands).toEqual([COMMAND_NAME]);
  });

  test("should name the missing path in the status row and open no pane when /doc runs with no path and nothing open", async ($, on) => {
    const { w } = await openDoc($, on, { files: {} }, "");

    expect(w.statuses).toEqual(["give a path: /doc <path>[:line|#heading]"]);
    expect(w.opened).toEqual([]);
  });

  test("should show the open document again when /doc runs with no path after one was opened", async ($, on) => {
    const { w } = await openDoc($, on, { files: { [DOC]: "# Notes\n" } }, "doc.md");

    await $.command.run({ command: "doc", args: "", origin: { kind: "composer" }, presentation: { isFullscreen: true, columns: 160 } });

    expect(w.opened.map((open) => open.id)).toEqual([PANE_ID, PANE_ID]);
    expect(w.statuses).toEqual([]);
  });

  test("should read a relative path from the session's directory and an absolute one as given", async ($, on) => {
    const w = paneWorld(on, { files: { [DOC]: "# Here\n", "/elsewhere/notes.md": "# There\n" } });
    await $.session.start(SESSION);

    await $.command.run({ command: "doc", args: "/elsewhere/notes.md", origin: { kind: "composer" }, presentation: { isFullscreen: true, columns: 160 } });
    const ui = await mountPane($);

    expect((await ui.findAll({ type: "Text" }))[0]?.text).toBe("/elsewhere/notes.md › There");
    expect(w.opened.map((open) => open.title)).toEqual(["notes.md"]);
  });
});

describe("path completion after /doc", () => {
  test("should suggest the folders and Markdown files whose names start with the typed part", async ($, on) => {
    paneWorld(on, { files: {}, dirs: DIRS });
    await $.session.start(SESSION);

    const { suggestions } = await complete($, "/doc do");

    expect(suggestions.map((row) => row.text)).toEqual(["docs/", "doc.md"]);
  });

  test("should complete inside a folder the token names", async ($, on) => {
    paneWorld(on, { files: {}, dirs: DIRS });
    await $.session.start(SESSION);

    const { suggestions } = await complete($, "/doc docs/d");

    expect(suggestions.map((row) => row.text)).toEqual(["docs/design.md"]);
  });

  test("should suggest nothing for a token that is not the argument of /doc", async ($, on) => {
    paneWorld(on, { files: {}, dirs: DIRS });
    await $.session.start(SESSION);

    expect((await complete($, "please read do")).suggestions).toEqual([]);
    expect((await complete($, "/review do")).suggestions).toEqual([]);
  });

  test("should suggest nothing when the folder cannot be listed", async ($, on) => {
    paneWorld(on, { files: {}, dirs: DIRS });
    await $.session.start(SESSION);

    expect((await complete($, "/doc nowhere/x")).suggestions).toEqual([]);
  });
});
