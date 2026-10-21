# doc-editor plugin

A Claude Code plugin whose mod will open a Markdown file as a navigable document in a pane beside
the transcript: an outline, folding, find, links followed in place, and edits that go through
Claude and show what changed.

## What it does today

This is the scaffold release. The plugin loads, registers the `/doc` command at session start,
and answers `/doc` with one line saying the reader is not built yet. The reader itself arrives in
the next release. The design is in
[docs/designs/doc-editor-design.md](../../docs/designs/doc-editor-design.md).

## Load it

From a clone of the repository:

```sh
claude --plugin-dir plugins/doc-editor
```

Or install it from the repository's marketplace:

```text
/plugin install doc-editor --marketplace sergeiwallace/doc-editor
```

The full install note, with requirements and the test gate, is
[docs/procedures/mod-install.md](../../docs/procedures/mod-install.md).

## Hooks and calls

The plugin's one hooks module is `hooks/register.ts`, and every call to the mods API sits there.
The block below is the complete list of hooks it registers and calls it makes, in the form
`claude plugin validate --json plugins/doc-editor` reports them. The repository's gate fails when
the two differ in either direction, so a change that adds or drops a hook or a call updates this
list in the same commit.

<!-- validate-declared:begin -->
```json
{
  "./register.ts": {
    "hooks": ["session.start", "command.run{command=doc}"],
    "calls": ["$.command.register"],
    "gating hook with .catch": ["command.run{command=doc}"]
  }
}
```
<!-- validate-declared:end -->

The plugin registers no `tool.check` hook, answers no `tool.call`, calls no model and makes no
network request.

## Layout

- `hooks/register.ts`: the hooks module, registered through `hooks/hooks.json`.
- `core/`: the shared core, plain TypeScript with no DOM, no Node, no timers and no `$`. It
  imports only relative paths. `core/types.ts` holds the document model.
- `hooks/*.test.ts`: tests that `claude plugin test` runs in the mod environment.

## License

[MIT](../../LICENSE)
