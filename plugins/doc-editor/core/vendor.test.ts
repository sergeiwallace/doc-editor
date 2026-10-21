import { describe, expect, test } from "claude-code/testing";

import { fromMarkdown, gfm, gfmFromMarkdown } from "./vendor/mdast.js";
import { EditorState } from "../vendor-candidates/codemirror-state.js";
import { Schema } from "../vendor-candidates/prosemirror-model.js";
import * as Y from "../vendor-candidates/yjs.js";

const SAMPLE = [
  "# Title",
  "",
  "- [x] done",
  "- [ ] todo",
  "",
  "~~gone~~",
  "",
  "| a | b |",
  "| - | - |",
  "| 1 | 2 |",
  "",
].join("\n");

const named = (library: string, run: () => unknown): unknown => {
  try {
    return run();
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason);
    throw new Error(`${library}: ${message}`);
  }
};

describe("vendored libraries", () => {
  test("should parse GFM Markdown to an mdast tree with positions when micromark and mdast-util-from-markdown load", () => {
    const tree = named("micromark + mdast-util-from-markdown", () =>
      fromMarkdown(SAMPLE, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }),
    ) as {
      children: { type: string; position: { start: { line: number }; end: { line: number } } }[];
    };
    const kinds = tree.children.map((node) => `${node.type}@${node.position.start.line}`);
    expect(kinds).toEqual(["heading@1", "list@3", "paragraph@6", "table@8"]);
    const list = tree.children[1] as unknown as { children: { checked: boolean | null }[] };
    expect(list.children.map((item) => item.checked)).toEqual([true, false]);
    const paragraph = tree.children[2] as unknown as { children: { type: string }[] };
    expect(paragraph.children[0]?.type).toBe("delete");
  });

  test("should build an EditorState with a doc and apply a change when @codemirror/state loads", () => {
    const state = named("@codemirror/state", () =>
      EditorState.create({ doc: "hello\nworld" }),
    ) as InstanceType<typeof EditorState>;
    const next = state.update({ changes: { from: 0, to: 5, insert: "HELLO" } }).state;
    expect(state.doc.lines).toBe(2);
    expect(next.doc.toString()).toBe("HELLO\nworld");
  });

  test("should build a schema node when prosemirror-model loads", () => {
    const schema = named(
      "prosemirror-model",
      () =>
        new Schema({
          nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} },
        }),
    ) as InstanceType<typeof Schema>;
    const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("hi")])]);
    expect(doc.textContent).toBe("hi");
    expect(doc.childCount).toBe(1);
  });

  test("should insert text into a Y.Doc when yjs loads", () => {
    const doc = named("yjs", () => new Y.Doc()) as InstanceType<typeof Y.Doc>;
    const text = doc.getText("t");
    text.insert(0, "hello");
    text.insert(5, " world");
    expect(text.toString()).toBe("hello world");
  });
});
