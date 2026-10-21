# doc-editor

A doc viewer and editor inside the Claude Code terminal UI, built as a
[Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview). It renders markdown,
HTML, PDF and other doc formats as interactive documents you can read and edit without leaving the
session.

The aim is a reading and editing experience close to Notion, Confluence, Google Docs or Word,
adapted to a terminal: headings and a table of contents to navigate by, rendered tables and code,
links that open, and edits that save back to the file on disk.

## Status

The plugin scaffold is in place: the repository is a Claude Code marketplace, the plugin loads
and registers `/doc`, and the test gate runs at commit and at push. The first reader, a Markdown
pane with Claude-mediated editing, is in progress; until it lands, `/doc` answers with one line
saying the reader is not built yet. The design is
[docs/designs/doc-editor-design.md](docs/designs/doc-editor-design.md), and the research behind it
is in [docs/research/](docs/research/).

The work is tracked in this repo's own Beads store (prefix `DED`).

## Install

```text
/plugin install doc-editor --marketplace sergeiwallace/doc-editor
```

To load it from a clone instead, run `claude --plugin-dir plugins/doc-editor`. The
[install note](docs/procedures/mod-install.md) covers requirements, both routes and the test gate.

## Repository structure

- `.claude-plugin/marketplace.json`: the marketplace, listing one plugin.
- `plugins/doc-editor/`: the plugin. `hooks/register.ts` holds every call to the mods API, and
  `core/` is the dependency-free document core.
- `scripts/` and `test/`: the repository's gates and their Vitest suites.
- `packages/`: later surfaces, a web app and an MCP App, which will import the same core.

See [CONTRIBUTING.md](CONTRIBUTING.md) to work on it and [SECURITY.md](SECURITY.md) to report a
vulnerability.

## Open source

This repository is public and MIT licensed. It holds no secrets, credentials or private data, and
nothing of that kind may be committed to it. Copy `.env.example` to `.env` for local settings;
`.env` is gitignored.

## Repository setup

The scaffold comes from a [Copier](https://copier.readthedocs.io/) template that is private, so
`copier update` works only for the maintainer; `.copier-answers.yml` records the answers it was
generated with. Contributors need neither. Git hooks install with
`bash .githooks/install.sh` (needs `pre-commit`).

## License

[MIT](LICENSE)
