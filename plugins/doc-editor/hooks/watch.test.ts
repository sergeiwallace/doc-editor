import { describe, expect, mock, test } from "claude-code/testing";

import { sizeOf, watchWorld } from "./tests/world.ts";
import { createWatcher, type Reload } from "./watch.ts";

// The reload watcher on the test kit's mock clock (T-1.7, the re-read half; the pane's redraw is
// the reader's). register.test.ts covers the Write and Edit hook that calls `check`.

const PATH = "/work/doc-editor/notes.md";
const TEXT = "# Notes\n";
const EDITED = "# Notes\n\nA line Claude added.\n";
const START = 1_000_000;

describe("watch", () => {
  test("should re-read the file within 1.5 s when its mtimeMs changes", async (_$, on) => {
    const clock = mock.clock(on, { now: START });
    const w = watchWorld(clock, { [PATH]: { text: TEXT, mtimeMs: START } });
    const reloads: Reload[] = [];
    createWatcher(w.host).watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));

    // The edit lands just after a tick, the worst case for a poll.
    await clock.advance(4_000);
    expect(reloads).toEqual([]);
    w.fs.map.set(PATH, { text: EDITED, mtimeMs: clock.now() });
    await clock.advance(1_500);

    expect(reloads).toEqual([
      { kind: "changed", text: EDITED, stamp: { mtimeMs: START + 4_000, size: sizeOf(EDITED) } },
    ]);
  });

  test("should not read the file while its mtimeMs and size stay the same", async (_$, on) => {
    const clock = mock.clock(on, { now: START });
    const w = watchWorld(clock, { [PATH]: { text: TEXT, mtimeMs: START } });
    const reloads: Reload[] = [];
    createWatcher(w.host).watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));

    await clock.advance(10_000);

    expect(w.reads()).toBe(0);
    expect(reloads).toEqual([]);
  });

  test("should re-read at once without the clock moving when check runs, as after a Write or Edit", async (_$, on) => {
    const clock = mock.clock(on, { now: START });
    const w = watchWorld(clock, { [PATH]: { text: TEXT, mtimeMs: START } });
    const reloads: Reload[] = [];
    const watcher = createWatcher(w.host);
    watcher.watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));
    w.fs.map.set(PATH, { text: EDITED, mtimeMs: START + 1 });

    await watcher.check();

    expect(reloads.map((r) => r.kind)).toEqual(["changed"]);
    expect(clock.now()).toBe(START);
  });

  test("should report once when the file cannot be read and again when it is back", async (_$, on) => {
    const clock = mock.clock(on, { now: START });
    const w = watchWorld(clock, { [PATH]: { text: TEXT, mtimeMs: START } });
    const reloads: Reload[] = [];
    createWatcher(w.host).watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));

    w.fs.map.delete(PATH);
    await clock.advance(5_000);
    w.fs.map.set(PATH, { text: TEXT, mtimeMs: START });
    await clock.advance(1_000);

    expect(reloads).toEqual([
      { kind: "unreadable", reason: `ENOENT: no such file or directory, stat '${PATH}'` },
      { kind: "changed", text: TEXT, stamp: { mtimeMs: START, size: sizeOf(TEXT) } },
    ]);
  });

  test("should stop reading and keep one clock when stopped or watched again", async (_$, on) => {
    const clock = mock.clock(on, { now: START });
    const w = watchWorld(clock, { [PATH]: { text: TEXT, mtimeMs: START } });
    const reloads: Reload[] = [];
    const watcher = createWatcher(w.host);
    watcher.watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));
    watcher.watch(PATH, { mtimeMs: START, size: sizeOf(TEXT) }, (r) => reloads.push(r));
    expect(w.timers()).toBe(1);

    watcher.stop();
    w.fs.map.set(PATH, { text: EDITED, mtimeMs: START + 1 });
    await clock.advance(5_000);

    expect(reloads).toEqual([]);
    expect(w.reads()).toBe(0);
  });
});
