// The doc-editor plugin's contract with the engine (design, Data Model): the session state it
// keeps. `changes` holds, per file path, the changes Claude made this session that still carry a
// marker, so the review survives a reload of the mod. A contract carries no import, so the
// change's shape is written out here; it is core/types.ts's `Change`.

export type DocEditorChange = {
  turn: string;
  blockIds: string[];
  before: string;
  after: string;
  start: number;
  end: number;
};

declare module "claude-code" {
  interface PluginState {
    "doc-editor": { changes: StateFamily<DocEditorChange[]> };
  }
}
