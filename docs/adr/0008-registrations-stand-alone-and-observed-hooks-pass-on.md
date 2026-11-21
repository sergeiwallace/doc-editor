# 0008. Registrations stand alone and observed hooks pass on

Governs: `plugins/doc-editor/hooks/register.ts`, `plugins/doc-editor/hooks/rows.ts` and
`plugins/doc-editor/hooks/tools.ts`.

## Decisions and reasons

- Each registration at session start stands alone, so a refusal of one never stops the next.
  `/doc` may already be the person's own skill or command, which the engine refuses to override
  (measured on 2.1.306). `/doc-editor` then stands in, and the `show` tool is registered whatever
  happens. Only the name the session granted is the mod's: a `/doc` that is the person's own is
  passed on.
- The plugin's own `show` tool is answered by its own `tool.call` hook and never passed on.
- Write and Edit tool calls are observed to trigger a reload and are never answered: the call
  goes on with `next` and its own result comes back.
- The main loop's turns are observed: a request the pane submitted learns its turn id at the
  start, and its edit lands at the end. Both pass on unchanged and never wait on the pane, and
  the pane never awaits its own request inside a hook. A request is the person's own words.
- The open link under Claude's Read, Write and Edit rows adds one line under whatever the chain
  beneath returns, so the engine and other mods still draw the row itself.
