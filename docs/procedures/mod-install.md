# Installing and testing the doc-editor mod

Load the mod for one session from a clone with `claude --plugin-dir plugins/doc-editor`, or install
it from this repository's marketplace with `claude plugin install doc-editor@doc-editor` after
adding the marketplace. Then run `/doc`.

## What it does today

This is the scaffold release. `/doc` is registered at session start and answers with one line
saying the reader is not built yet. The Markdown reader replaces that line in the next release.

## Requirements

- Claude Code 2.1.299 or later. That is the first release that lets a hooks module's helpers live
  in other files, which the reader's layout needs. The gate was measured on 2.1.306. Check yours
  with `claude --version`.
- `node` on your `PATH` for saves, from the reader release on. The mod saves a file through
  `plugins/doc-editor/bin/save.mjs`, a write-then-rename helper with no dependencies that it runs
  with `node`. The helper renames its temporary file over yours only if your file's modification
  time and size still match what the mod read, so an edit made elsewhere at the same moment is
  never overwritten; the save fails instead and the status line shows why. The mod checks for
  `node` once per session by running `node --version`. Without it, saves still work, but through a
  direct write that is not atomic, and the status line says so once per session.
- For the test gate: Node.js 24 or later and npm.

## Load it from a clone

```sh
git clone https://github.com/sergeiwallace/doc-editor.git
claude --plugin-dir doc-editor/plugins/doc-editor
```

The flag loads the plugin for that session only and changes no settings. Loading it writes the
mod types into the plugin, and a tsconfig that extends them, so the hooks can be type-checked:
`plugins/doc-editor/.claude-plugin/types/` and `plugins/doc-editor/tsconfig.json`. <!-- gitignored-path-ok: says where a load writes, not evidence -->
Both are gitignored, and `git status` stays clean.

To load it with your own settings left out, add `--setting-sources project`; the mod still loads.

## Install it from the marketplace

The marketplace is this repository. Its name, from `.claude-plugin/marketplace.json`, is
`doc-editor`, and it lists one plugin, also `doc-editor`.

```sh
claude plugin marketplace add sergeiwallace/doc-editor
claude plugin install doc-editor@doc-editor
```

Or in one step, which adds the marketplace first if it is not there yet:

```sh
claude plugin install doc-editor --marketplace sergeiwallace/doc-editor
```

Inside a session the same steps are `/plugin marketplace add sergeiwallace/doc-editor` and
`/plugin install doc-editor@doc-editor`. Both install for your user by default; pass
`--scope project` or `--scope local` to install for one repository instead. Start a new session
afterwards. To update later, run `claude plugin marketplace update doc-editor`.

## Run the gate

From the repository root:

```sh
npm ci
npm test
npm run typecheck
```

`npm test` runs the repository checks under Vitest (the core purity lint, the declared hooks and
calls, the marketplace, the 1 MB file limit and the hygiene files), then
`claude plugin test plugins/doc-editor`. `npm run typecheck` runs `tsc` over the repository, then
over the core with no DOM or Node types, then over the hooks against the mod types a session
load writes. The pre-commit and pre-push hooks run both, plus
`claude plugin validate` on the root and on the plugin. Install the hooks with
`bash .githooks/install.sh`.

When `claude` is missing or older than 2.1.299, each claude-backed step prints a line saying it
did not run and why, and the Vitest cases that call `claude` show as skipped. Before the first
session load, the hooks type check says the same. None of them prints a pass.
