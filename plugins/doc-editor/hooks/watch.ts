import type { Timer } from "claude-code";

import type { FileStamp } from "./save.ts";

/**
 * The engine as the reload watcher uses it: plain closures register.ts builds from `$`, so this
 * file never holds `$`. The watcher only reads.
 */
export interface WatchHost {
  /** `$.fs.stat`; rejects when the file is missing. */
  stat: (path: string) => Promise<FileStamp>;
  /** `$.fs.read`; rejects when the file is missing or over 4 MiB. */
  read: (path: string) => Promise<string>;
  /** `$.clock.every`. */
  every: (ms: number, fn: () => void) => Timer;
}

/** What the pane's callback receives: the file's new text and stamp, or why it cannot be read. */
export type Reload =
  | { kind: "changed"; text: string; stamp: FileStamp }
  | { kind: "unreadable"; reason: string };

export interface Watcher {
  /**
   * Watches `path`, last read at `stamp`, and calls `onReload` once per change. Called again it
   * replaces the file, the stamp and the callback, as after the pane's own save.
   */
  watch: (path: string, stamp: FileStamp, onReload: (reload: Reload) => void) => void;
  /** Stops watching and cancels the clock. */
  stop: () => void;
  /** Re-reads now if the file's stamp moved: the clock's tick and the Write or Edit trigger. */
  check: () => Promise<void>;
}

/** The clock's period: a change is re-read within one period plus the read. */
export const RELOAD_PERIOD_MS = 1000;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The reload watcher (T-1.7). It polls the watched file's mtimeMs and size every
 * RELOAD_PERIOD_MS while a file is watched, and register.ts calls `check` after every Write or
 * Edit tool call, so a change is re-read within 1.5 s or on the next such call.
 *
 * @param host the engine's closures
 * @returns the session's watcher
 */
export function createWatcher(host: WatchHost): Watcher {
  let watched: { path: string; stamp: FileStamp; onReload: (reload: Reload) => void } | undefined;
  let timer: Timer | undefined;
  let isUnreadable = false;
  let checking: Promise<void> | undefined;

  const report = (target: NonNullable<typeof watched>, reload: Reload) => {
    if (watched === target) target.onReload(reload);
  };

  const unreadable = (target: NonNullable<typeof watched>, error: unknown) => {
    if (isUnreadable) return;
    isUnreadable = true;
    report(target, { kind: "unreadable", reason: message(error) });
  };

  const run = async () => {
    const target = watched;
    if (target === undefined) return;
    let stamp: FileStamp;
    try {
      stamp = await host.stat(target.path);
    } catch (error) {
      unreadable(target, error);
      return;
    }
    if (!isUnreadable && stamp.mtimeMs === target.stamp.mtimeMs && stamp.size === target.stamp.size) {
      return;
    }
    let text: string;
    try {
      text = await host.read(target.path);
    } catch (error) {
      unreadable(target, error);
      return;
    }
    isUnreadable = false;
    target.stamp = stamp;
    report(target, { kind: "changed", text, stamp });
  };

  // A check asked for while one runs runs again after it, so a write that lands during the
  // first one's stat is not missed.
  let isAgain = false;
  const check = () => {
    if (checking !== undefined) {
      isAgain = true;
      return checking;
    }
    checking = (async () => {
      do {
        isAgain = false;
        await run();
      } while (isAgain);
    })().finally(() => {
      checking = undefined;
    });
    return checking;
  };

  return {
    watch: (path, stamp, onReload) => {
      watched = { path, stamp, onReload };
      isUnreadable = false;
      timer ??= host.every(RELOAD_PERIOD_MS, () => void check());
    },
    stop: () => {
      watched = undefined;
      timer?.cancel();
      timer = undefined;
    },
    check,
  };
}
