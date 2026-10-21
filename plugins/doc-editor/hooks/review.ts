// What Claude was asked and what it changed (design, The edit pipeline; FR-4, FR-5): the requests
// the pane submitted, matched to the turns that ran them; each turn's changes to a file, kept
// against the file as it was when that turn started; and the markers they put on blocks. Plain
// values in and out: the pane owns the document and draws this.

import { mapBlockIds, recordChanges } from "../core/changes.ts";
import { locate } from "../core/outline.ts";
import type { Block, Change, EditRequest } from "../core/types.ts";

/** A file as the tracker reads it: its source and its blocks. */
export interface Snapshot {
  source: string;
  blocks: readonly Block[];
}

export type AskPhase = "queued" | "waiting" | "editing";

/** One request the pane submitted, until its turn ends. */
export interface Ask {
  /** The prompt text submitted, which the turn's start carries back. */
  text: string;
  request: EditRequest;
  /** The file's absolute path. */
  path: string;
  /** The block asked about, as the open document names it now. */
  blockId: string;
  phase: AskPhase;
  turnId: string | null;
  /** The file when the turn started: what the turn's changes are measured from. */
  baseline: Snapshot | null;
  /** How many turns had started when the request was made. */
  after: number;
}

/** A turn that ended: its request and the changes it made to the request's file. */
export interface Landed {
  ask: Ask;
  changes: Change[];
}

// A change's block ids and lines carried across a reload that did not make it: each id to its
// new id, or the block now at its old first line; the lines moved by as much as its first block.
function carry(change: Change, before: readonly Block[], after: readonly Block[], map: Record<string, string>): Change {
  const ids: string[] = [];
  let shift: number | null = null;
  for (const id of change.blockIds) {
    const mapped = map[id];
    const old = before.find((block) => block.id === id);
    const next = mapped ?? (old === undefined ? null : locate(after, { line: old.start }));
    if (next !== null && !ids.includes(next)) ids.push(next);
    if (shift === null && mapped !== undefined && old !== undefined) {
      const moved = after.find((block) => block.id === mapped);
      if (moved !== undefined) shift = moved.start - old.start;
    }
  }
  const by = shift ?? 0;
  return { ...change, blockIds: ids, start: change.start + by, end: change.end + by };
}

/** The pane's record of Claude-mediated edits, one per session. */
export class Review {
  asks: Ask[] = [];
  /** Whether a main-loop turn runs now, from the turns' starts and ends. */
  isBusy = false;
  private changes = new Map<string, Change[]>();
  private requests = new Map<string, EditRequest>();
  private lastInstruction: string | null = null;
  private lastTurnId: string | null = null;
  private turns = 0;

  /** Records a request just submitted: queued when a turn runs, else waiting for its own. */
  asked(ask: Omit<Ask, "phase" | "turnId" | "after">): Ask {
    const entry: Ask = { ...ask, phase: this.isBusy ? "queued" : "waiting", turnId: null, after: this.turns };
    this.asks.push(entry);
    this.lastInstruction = ask.request.instruction;
    return entry;
  }

  /** The request was refused before its turn started: it is dropped. */
  dropped(ask: Ask): void {
    this.asks = this.asks.filter((entry) => entry !== ask);
  }

  /**
   * A main-loop turn started. A request waiting with this text is the turn's: it records the turn
   * id and measures the turn's changes from `current`, the request's file as it is now.
   */
  turnStarted(turnId: string, text: string, current: (path: string) => Snapshot | null): Ask | null {
    this.isBusy = true;
    this.lastTurnId = turnId;
    this.turns++;
    const ask = this.asks.find((entry) => entry.turnId === null && entry.text === text);
    if (ask === undefined) return null;
    this.adopt(ask, turnId, current);
    return ask;
  }

  /**
   * The submit resolved, so its turn has started: a request no turn start matched by text (a hook
   * rewrote it) takes the turn that runs now, if it started after the request was made.
   */
  started(ask: Ask, current: (path: string) => Snapshot | null): void {
    if (ask.turnId !== null || this.lastTurnId === null || !this.asks.includes(ask)) return;
    if (!this.isBusy || this.turns <= ask.after) return;
    if (this.asks.some((entry) => entry.turnId === this.lastTurnId)) return;
    this.adopt(ask, this.lastTurnId, current);
  }

  private adopt(ask: Ask, turnId: string, current: (path: string) => Snapshot | null): void {
    ask.turnId = turnId;
    ask.phase = "editing";
    ask.baseline = current(ask.path) ?? ask.baseline;
    this.requests.set(turnId, ask.request);
  }

  /** A main-loop turn ended: the request it ran, with the changes it made, or null for another turn. */
  turnEnded(turnId: string): Landed | null {
    this.isBusy = false;
    const ask = this.asks.find((entry) => entry.turnId === turnId);
    if (ask === undefined) return null;
    this.asks = this.asks.filter((entry) => entry !== ask);
    return { ask, changes: this.of(ask.path).filter((change) => change.turn === turnId) };
  }

  /**
   * The file at `path` changed from `before` to `after`. A running turn's changes are measured
   * again from its start; every other change keeps its blocks and lines, carried to the new ids.
   */
  fileChanged(path: string, before: Snapshot, after: Snapshot): void {
    const map = mapBlockIds(before.blocks, after.blocks);
    const running = this.asks.filter((ask) => ask.path === path && ask.phase === "editing" && ask.baseline !== null);
    const turns = new Set(running.map((ask) => ask.turnId));
    const kept = this.of(path)
      .filter((change) => !turns.has(change.turn))
      .map((change) => carry(change, before.blocks, after.blocks, map));
    const fresh = running.flatMap((ask) => recordChanges(ask.turnId ?? "", ask.baseline ?? after, after));
    this.set(path, [...kept, ...fresh]);
    for (const ask of this.asks) {
      if (ask.path !== path) continue;
      const old = before.blocks.find((block) => block.id === ask.blockId);
      ask.blockId = map[ask.blockId] ?? (old === undefined ? ask.blockId : (locate(after.blocks, { line: old.start }) ?? ask.blockId));
    }
  }

  /** Every change to `path` still marked, turn by turn in the order they ran. */
  of(path: string): Change[] {
    return this.changes.get(path) ?? [];
  }

  /** The changes that mark block `id` of `path`, oldest first. */
  on(path: string, id: string): Change[] {
    return this.of(path).filter((change) => change.blockIds.includes(id));
  }

  /** Clears one change's marker; a reload that carried it to new ids still holds its turn and text. */
  clear(path: string, change: Change): void {
    const same = (entry: Change) => entry.turn === change.turn && entry.before === change.before && entry.after === change.after;
    this.set(path, this.of(path).filter((entry) => !same(entry)));
  }

  /** Puts back the changes kept for `path`, as the session's state held them. */
  restore(path: string, changes: readonly Change[]): void {
    if (this.of(path).length === 0 && changes.length > 0) this.set(path, [...changes]);
  }

  /** The request of turn `turnId`, for refine. */
  requestOf(turnId: string): EditRequest | undefined {
    return this.requests.get(turnId);
  }

  /** The instruction of the last request made this session. */
  get previousInstruction(): string | null {
    return this.lastInstruction;
  }

  private set(path: string, changes: Change[]): void {
    if (changes.length === 0) this.changes.delete(path);
    else this.changes.set(path, changes);
  }
}
