# doc-editor

A doc viewer and editor inside the Claude Code terminal UI, built as a
[Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview). It renders markdown,
HTML, PDF and other doc formats as interactive documents you can read and edit without leaving the
session.

The aim is a reading and editing experience close to Notion, Confluence, Google Docs or Word,
adapted to a terminal: headings and a table of contents to navigate by, rendered tables and code,
links that open, and edits that save back to the file on disk.

## Status

Research and design stage. Nothing is built yet. The research and design docs land in
[docs/research/](docs/research/) and [docs/designs/](docs/designs/) and wait on the owner's review
before any build starts. The design phases the work, starting with an MVP.

The work is tracked in this repo's own Beads store (prefix `DED`).

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
