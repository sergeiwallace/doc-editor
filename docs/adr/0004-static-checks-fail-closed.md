# 0004. The static checks fail closed

Governs: `scripts/check-plugin-declared.mjs`, `scripts/safety-floor.mjs`,
`scripts/check-core-purity.mjs`, `scripts/js-scope.mjs` and the literal matchers in
`plugins/doc-editor/hooks/register.ts`.

## Decisions and reasons

- The declared-list gate compares every `<module> <kind>: <values>` note that
  `claude plugin validate --strict --json` reports with the list the plugin README declares, both
  ways: a reported value the README does not declare fails, and so does a declared value validate
  does not report.
- It also scans the sources, because validate files every call under the module that reached it,
  even one made in a helper the module handed `on` or `$` to, so the report alone cannot show
  where a call sits. `validate --strict` refuses `$` bound to a name (`const engine = $`) but
  accepts it passed straight to a call, so the scan fails a bare `$` in a hooks module that is
  neither a parameter nor a member access's object.
- A static scan is not a proof. It does not see a helper whose engine parameter is untyped or
  typed `any` or `unknown` when the hooks module hands it the engine under another name than `$`;
  a noun handed out, such as `helper($.ui)`; or an engine type rebuilt structurally or derived
  from a hooks module's export. `claude plugin test` and review cover those.
- The safety floor runs inside the declared-list gate and holds whatever the README declares. It
  reads the code as text, so it is strict rather than complete: a handler it cannot read (one
  passed by name, a return it cannot parse) fails rather than passes. Validate reports a
  `tool.call` hook the same way whether its handler passes the call on or answers it, so the floor
  reads the handler's source.
- The floor allows `$.process.run` only for `["node", "--version"]` or `node` on a
  `${$.plugin.root}/bin/<name>.mjs` template naming a script the plugin ships. A plain string path
  is refused: a relative one resolves against the session's directory and an absolute one can
  name any file, so neither proves the script is the plugin's own.
- "Free" is resolved by scope (`scripts/js-scope.mjs`, shared by the core purity lint and the
  floor's network check): a reference is free when no scope enclosing the use declares the name.
  A file's own `const fetch = ...` is a local, and a vendored bundle's own `var document` is a
  local; `globalThis.fetch` is not. Any alias of a global object fails, because a network API
  could be reached through it unseen.
- `register.ts` writes its matchers and the tool name as literals, so that
  `claude plugin validate` and the safety floor can read them.
