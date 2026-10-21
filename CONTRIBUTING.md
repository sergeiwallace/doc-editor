# Contributing to doc-editor

Thanks for helping. This repository is public, so read the rule on secrets below before your first
commit.

## Before you start

The design lives in [docs/designs/doc-editor-design.md](docs/designs/doc-editor-design.md). For
anything larger than a small fix, open an issue first so the change can be checked against the
design.

## Setup

You need Node.js 24 or later, npm, [pre-commit](https://pre-commit.com/), and Claude Code
(`claude`) on your `PATH` for the mod's own tests.

```sh
npm ci
bash .githooks/install.sh
```

The hook install wires the pre-commit and pre-push gates.

## Checks

Run these before you push. The hooks run them too, at commit and at push.

```sh
npm test            # the repository checks under Vitest, then claude plugin test
npm run typecheck   # tsc over the repository, the core with no DOM or Node types, then the hooks
```

The hooks type check reads the mod types Claude Code writes into the plugin when a session loads
it, so run `claude --plugin-dir plugins/doc-editor` once first; until then it says it did not run.

`npm test` and the `claude plugin validate` hooks need Claude Code 2.1.299 or later. Without it,
each of them prints a line saying it did not run and why, and the Vitest cases that call
`claude` show as skipped. Nothing reports a pass it did not run.

When you add a hook or a `$` call to the mod, add it to the declared list in
[plugins/doc-editor/README.md](plugins/doc-editor/README.md) in the same commit. The gate compares
that list with what `claude plugin validate --json` reports and names each difference.

## The shared core

Code under `plugins/doc-editor/core` runs inside a Claude Code mod and, later, in a browser. It
must not reference `document`, `window`, `process` or `setTimeout`, directly or through
`globalThis`, `self` or `window`, must not alias `globalThis` or `self` or call `require`, must
not use `$` anywhere, and may import only relative paths. A name the code declares itself, in a
scope around the use, is fine. A test file there may also import `claude-code/testing`. The core
purity lint in `npm test` fails naming the file, the line and the import or name. Every call to
the mods API stays in `plugins/doc-editor/hooks/register.ts`.

The plugin has no runtime dependencies, and no file under `plugins/doc-editor` may exceed 1 MB.
Development tools go in the root `package.json` as dev dependencies.

## No secrets

Never commit credentials, tokens, private keys, `.env` files or private data. If you committed a
secret by mistake, rotate it first, then tell the maintainer. Removing it from history does not
make it safe again.

## Tests

Name tests `it("should <action> when <condition>")` and test behaviour through the real entry
point rather than one function at a time.

File names choose the runner. `plugins/doc-editor/**/*.test.ts` files import their kit from
`claude-code/testing` and run under `claude plugin test`, in the mod environment. Repository
checks that need Node.js live in `test/*.spec.ts` and run under Vitest.

## Pull requests

Keep each commit to one logical change. Describe what changed and how you checked it. By
contributing you agree that your work is released under the [MIT license](LICENSE) and that you
follow the [code of conduct](CODE_OF_CONDUCT.md).
