# doc-editor plugin

A Claude Code plugin whose mod will open a Markdown file as a navigable document in a pane beside
the transcript: an outline, folding, find, links followed in place, and edits that go through
Claude and show what changed.

## What it does today

The reader. `/doc <path>` opens a Markdown file in a pane; `path:N` and `path#heading` open it at
that line or heading, and the path after `/doc` completes from the session's directory. A file
that is missing, over 4 MiB or not UTF-8 text is refused with the reason in the plugin's status
row.

The pane draws only the blocks in view, so a document of any size up to 4 MiB stays inside the
engine's draw limits. Fences draw as highlighted code, callouts as bordered boxes with their
label, and a table too wide for the pane as one card per row. Images draw as their alt text and
path. The header shows the path, the heading path, the mode, the read time and the find count.

| Key | Action |
| --- | --- |
| Up, Down | Previous or next block |
| PageUp, PageDown, wheel | Scroll |
| `o` | Outline; Enter on an entry jumps to it |
| `z`, `a` | Fold the current heading; fold or unfold every heading |
| `d`, `u` | Show only the current section; back up one level |
| `f` | Find; Enter goes to the next match, `b` to the previous |
| Enter on a link | Open a file or heading in the repository in place; `b` goes back |
| `g` | Go to a path, `:line` or `#heading` |
| `t`, `q` | Top; close |

When the open file changes on disk, or after Claude's `Write` or `Edit`, the pane re-reads it and
keeps the focused block, the folds and the open section. Editing arrives in the next release. The
design is in [docs/designs/doc-editor-design.md](../../docs/designs/doc-editor-design.md).

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
    "hooks": ["session.start", "command.run{command=doc}", "prompt.autocomplete", "tool.call{tool=Write|Edit}", "ui.close{id=doc}", "ui.scroll{requestId=doc}", "ui.render{component=Pane}"],
    "calls": ["$.clock.every", "$.command.register", "$.fs.list", "$.fs.read", "$.fs.stat", "$.fs.write", "$.process.run", "$.ui.ask", "$.ui.close", "$.ui.focus", "$.ui.invalidate", "$.ui.open", "$.ui.resolve", "$.ui.status"],
    "gating hook with .catch": ["command.run{command=doc}", "tool.call{tool=Write|Edit}", "ui.close{id=doc}", "ui.scroll{requestId=doc}"]
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
  `next(...)`, or that does anything with that result but return it;
- a model call (`$.model.*`, `$.agent.spawn`) or a network call (`$.http.*`, `$.mcp.*`);
- a reference to `fetch`, `WebSocket`, `XMLHttpRequest` or `EventSource`, or an import of a
  module that reaches the network or starts processes, such as `node:http`, `node:net` or
  `node:child_process`, in any source the plugin ships, `bin/` included;
- a `$.process.run` other than `node --version` or `node` on a
  `${$.plugin.root}/bin/<name>.mjs` script the plugin ships, so no node flag such as `-e` or
  `--import`, and no argv that is not a literal array;
- any `$.process.spawn`.

## Saving

Every save goes through `bin/save.mjs`, a dependency-free helper the mod runs with `node`. It
writes a temporary file beside the target and renames it over the target only if the target's
`mtimeMs` and size still match the ones the mod read. When the file changed since it was read,
the mod first asks whether to reload, overwrite or cancel. Without `node` on `PATH` the mod
writes the file directly with `$.fs.write`, which is not atomic, and says so once per session in
its status line.

## Layout

- `hooks/register.ts`: the hooks module, registered through `hooks/hooks.json`.
- `hooks/pane.ts`: the reader pane, with `hooks/header.ts` (the header row), `hooks/hints.ts`
  (the key bindings and hint row) and `hooks/tables.ts` (tables fitted to the pane or as cards).
- `hooks/commands.ts`: `/doc` and its path completion. It takes the pane or plain closures,
  never `$`.
- `hooks/save.ts`: the safe-write path, and `hooks/watch.ts`: the reload watcher. Both take
  plain closures from `register.ts`, never `$`.
- `bin/save.mjs`: the write-then-rename save helper.
- `core/`: the shared core, plain TypeScript with no DOM, no Node, no timers and no `$`. It
  imports only relative paths. `core/types.ts` holds the document model.
- `hooks/*.test.ts`: tests that `claude plugin test` runs in the mod environment.

## License

[MIT](../../LICENSE)
