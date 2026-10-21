import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { COMMAND_NAME, NOT_BUILT_TEXT } from "./register.ts";

const SESSION = { surface: "terminal", isInteractive: true, cwd: "/work/doc-editor" } as const;
const DOC = {
  command: COMMAND_NAME,
  args: "README.md",
  origin: { kind: "composer" },
  presentation: { isFullscreen: false, columns: 120 },
} as const;

// The engine beneath the mod: it ends the session start and keeps each command the mod registers.
function world(on: On) {
  const registered: string[] = [];
  on("session.start", (_engine, e) => ({ cwd: e.cwd }));
  on("command.register", (_engine, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  return { registered };
}

describe("register", () => {
  test("should register /doc when the session starts", async ($, on) => {
    const w = world(on);

    await $.session.start(SESSION);

    expect(w.registered).toEqual([COMMAND_NAME]);
  });

  test("should answer with one line saying the reader is not built when /doc runs", async ($, on) => {
    world(on);
    await $.session.start(SESSION);

    expect(await $.command.run(DOC)).toEqual({ text: NOT_BUILT_TEXT });
  });
});
