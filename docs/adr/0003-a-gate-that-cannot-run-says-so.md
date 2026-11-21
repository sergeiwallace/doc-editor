# 0003. A gate that cannot run says so

Governs: `scripts/run-gate.mjs`, `scripts/claude-floor.mjs`, `scripts/plugin-test.mjs`,
`scripts/typecheck-hooks.mjs`, `vitest.config.ts`, the mod gate hooks in
`.pre-commit-config.yaml`, and the specs under `test/`.

## Decisions and reasons

- `npm test` is one command: the repository checks under Vitest, then
  `claude plugin test plugins/doc-editor`, then one summary line. The validate and size gates
  also run as their own pre-commit hooks, so a failure names its gate. All of them need `npm ci`
  first and fail loudly without it.
- A gate that needs `claude` and cannot run (no `claude` on PATH, or one below the floor in
  `scripts/claude-floor.mjs`) prints that it did NOT run and why, and exits 0 without claiming a
  pass. `npm test` and the hooks stay one command for a contributor who has no `claude`, and the
  summary line names every gate that did not run, so nothing left out looks like a pass. A spec
  case that needs `claude` is reported as skipped with the reason, never as passed.
- The hooks set `verbose: true` because pre-commit prints a passing hook's output only when the
  hook is verbose, and the did-not-run line is printed by a hook that exits 0.
- The floor is 2.1.299, the first Claude Code release that lets a hooks module's helpers live in
  other files, which the `hooks/*.ts` layout needs. The gates were measured on 2.1.306.
- `typecheck-hooks.mjs` checks the hooks against the mod types Claude Code writes when a session
  loads the plugin. The types exist only after one `claude --plugin-dir` load; before that the
  script says it did not type-check and exits 0. It passes `--allowImportingTsExtensions`,
  because the generated tsconfig does not allow the `.ts` import extensions the mod loader needs.
- Vitest runs the repository checks in `test/*.spec.ts` under Node. The mod's own tests,
  `plugins/*/**/*.test.ts`, run under `claude plugin test`. `claude plugin test` cannot spawn
  processes, so the hooks tests use stub hosts and the save helper itself runs on real files
  under Vitest (`test/save-helper.spec.ts`).
- `test/claude-floor.spec.ts` runs the gate scripts with a PATH that has no usable `claude`. The
  runner's own Vitest pass is narrowed to one quick suite so it does not run that spec again;
  that suite needs git, so the PATH holds node's and git's directories, neither with `claude`.
- Inside the pre-commit hook git exports `GIT_INDEX_FILE` and related variables for the outer
  repository. A spec that builds a scratch git repository clears them, or its `git add` would
  write the outer index.
- `test/vendor-bundle.spec.ts` needs the pinned packages that
  `npm ci --prefix tools/vendor-bundle` installs. Without them it is skipped and says why.
