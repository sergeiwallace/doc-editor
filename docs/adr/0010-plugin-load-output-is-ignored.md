# 0010. What a plugin load writes is ignored

Governs: `.gitignore` and `scripts/check-hygiene.mjs`.

## Decisions and reasons

- `claude --plugin-dir plugins/<name>` writes into the plugin when a session loads it: the mod
  types under `.claude-plugin/types/`, which also carries its own `*` `.gitignore`, and a
  `tsconfig.json` at the plugin root that extends them. `.gitignore` ignores both, and the same
  root `tsconfig.json` a load writes into the Phase 0 spike's gallery mods.
- `check-hygiene.mjs` fails when a file a load writes is not ignored, so `git status` never
  lists it as untracked. The list of those files was measured on Claude Code 2.1.306.
