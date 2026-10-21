import type { ProcessRunResult, Timer } from "claude-code";
import type { MockClock } from "claude-code/testing";

import type { FileStamp, SaveHost } from "../save.ts";
import type { WatchHost } from "../watch.ts";

// Stub hosts for the hooks tests: a file system held as a map of paths to text and mtimeMs,
// processes that answer from a script, and a record of what the code asked of the engine.
// `claude plugin test` cannot spawn processes, so the save helper itself runs on real files
// under Vitest (test/save-helper.spec.ts).

export const HELPER = "/plugins/doc-editor/bin/save.mjs";

export interface FileState {
  text: string;
  mtimeMs: number;
}

const result = (exitCode: number, stdout: string, stderr: string): ProcessRunResult => ({
  exitCode,
  stdout,
  stderr,
  isStdoutTruncated: false,
  isStderrTruncated: false,
});
export const ok = (stdout: string) => result(0, stdout, "");
export const exit = (exitCode: number, stderr: string) => result(exitCode, "", stderr);

/** What a process script answers: a result, or an Error for a command that cannot start. */
export type Script = (argv: readonly string[]) => ProcessRunResult | Error | undefined;

export const sizeOf = (text: string) => new TextEncoder().encode(text).length;

export function files(entries: Record<string, FileState>) {
  const map = new Map(Object.entries(entries));
  const stat = async (path: string): Promise<FileStamp> => {
    const file = map.get(path);
    if (file === undefined) throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    return { mtimeMs: file.mtimeMs, size: sizeOf(file.text) };
  };
  return { map, stat };
}

export interface SaveWorldOptions {
  files: Record<string, FileState>;
  script: Script;
  /** The label the person picks in the ask dialog; an Error is a dismissal. */
  answer?: string | Error;
}

export function saveWorld(options: SaveWorldOptions) {
  const fs = files(options.files);
  const runs: { argv: string[]; stdin: string | undefined }[] = [];
  const writes: { path: string; text: string }[] = [];
  const asked: { question: string; options: readonly string[] }[] = [];
  const statuses: string[] = [];
  let clock = 2_000_000_000_000;

  const host: SaveHost = {
    stat: fs.stat,
    write: async (path, text) => {
      writes.push({ path, text });
      fs.map.set(path, { text, mtimeMs: (clock += 1000) });
    },
    run: async (argv, stdin) => {
      runs.push({ argv: [...argv], stdin });
      const answer = options.script(argv) ?? exit(127, `unscripted: ${argv.join(" ")}`);
      if (answer instanceof Error) throw answer;
      return answer;
    },
    ask: async (question, labels) => {
      asked.push({ question, options: labels });
      if (options.answer instanceof Error) throw options.answer;
      return options.answer ?? "Cancel";
    },
    status: (text) => statuses.push(text),
    helper: HELPER,
  };
  const helperRuns = () => runs.filter((run) => run.argv[0] === "node" && run.argv[1] === HELPER);
  return { host, fs, runs, helperRuns, writes, asked, statuses };
}

/** node is on PATH: `node --version` answers. */
export const nodeVersion: Script = (argv) =>
  argv.length === 2 && argv[0] === "node" && argv[1] === "--version" ? ok("v24.11.0\n") : undefined;

export function watchWorld(clock: MockClock, entries: Record<string, FileState>) {
  const fs = files(entries);
  let reads = 0;
  let timers = 0;
  const host: WatchHost = {
    stat: fs.stat,
    read: async (path) => {
      reads++;
      const file = fs.map.get(path);
      if (file === undefined) throw new Error(`ENOENT: ${path}`);
      return file.text;
    },
    // $.clock.every on the kit's mock clock: each period is one held wait the test's advance
    // resolves, as the engine's clock.every dispatch is.
    every: (ms, fn): Timer => {
      timers++;
      let isLive = true;
      void (async () => {
        while (isLive) {
          await clock.sleep(ms);
          if (isLive) fn();
        }
      })();
      return {
        cancel: () => {
          isLive = false;
        },
      };
    },
  };
  return { host, fs, reads: () => reads, timers: () => timers };
}
