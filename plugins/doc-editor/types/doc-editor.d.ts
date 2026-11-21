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
