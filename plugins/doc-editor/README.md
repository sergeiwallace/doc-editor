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
    "hooks": ["session.start", "command.run{command=doc}", "tool.call{tool=Write|Edit}"],
    "calls": ["$.clock.every", "$.command.register", "$.fs.read", "$.fs.stat", "$.fs.write", "$.process.run", "$.ui.ask", "$.ui.status"],
    "gating hook with .catch": ["command.run{command=doc}", "tool.call{tool=Write|Edit}"]
  },
  "safety floor": {
    "process.run binaries": ["node"],
    "process.run argv expressions": []
  }
}
```
<!-- validate-declared:end -->

The plugin registers no `tool.check` hook, answers no `tool.call`, calls no model and makes no
network request. Its one `tool.call` hook observes `Write` and `Edit`: it passes each call on and
returns the tool's own result, then re-reads the open file if it changed.

The same gate enforces this safety floor whatever the list says, over both the validate report
and the sources. It fails, naming the hook, call or line, on any of these:

- a `tool.check` hook;
- a `tool.call` hook other than the observed one, unless it answers a tool the plugin registers
  with `$.tool.register` under the `mcp__doc-editor__` prefix;
- a `tool.call` handler, or its `.catch` handler, that returns anything but the result of
  `next(...)`;
- a model call (`$.model.*`, `$.agent.spawn`) or a network call (`$.http.*`, `$.mcp.*`);
- a reference to `fetch`, `WebSocket`, `XMLHttpRequest` or `EventSource`;
- a `$.process.run` whose literal argv starts with a binary the `safety floor` entry above does
  not list, or whose argv is not a literal array and whose `<file>: <argv expression>` the entry
  does not list.

## Saving

Every save goes through `bin/save.mjs`, a dependency-free helper the mod runs with `node`. It
writes a temporary file beside the target and renames it over the target only if the target's
`mtimeMs` and size still match the ones the mod read. When the file changed since it was read,
the mod first asks whether to reload, overwrite or cancel. Without `node` on `PATH` the mod
writes the file directly with `$.fs.write`, which is not atomic, and says so once per session in
its status line.

## Layout

- `hooks/register.ts`: the hooks module, registered through `hooks/hooks.json`.
- `hooks/save.ts`: the safe-write path, and `hooks/watch.ts`: the reload watcher. Both take
  plain closures from `register.ts`, never `$`.
- `bin/save.mjs`: the write-then-rename save helper.
- `core/`: the shared core, plain TypeScript with no DOM, no Node, no timers and no `$`. It
  imports only relative paths. `core/types.ts` holds the document model.
- `hooks/*.test.ts`: tests that `claude plugin test` runs in the mod environment.

## License

[MIT](../../LICENSE)
