# 0007. Large fixture documents are generated

Governs: `plugins/doc-editor/core/fixture-docs.ts`, `test/fixture-doc.spec.ts`,
`docs/test/fixtures/thousand-line-doc.md`, `docs/test/fixtures/linked-doc.md`, and the tests
that parse the large fixtures.

## Decisions and reasons

- The fixture documents are generated from a fixed pattern in `fixture-docs.ts` rather than
  committed, because a 20,000-line document committed as a file would pass the repository's
  500 KB file limit.
- Every chapter holds each block kind: headings at all six levels, paragraphs with inline
  syntax, nested lists, task lists, a fence, a wide table, a callout, a quote, links to a second
  file, to its heading and to this file's headings, an image, HTML and an HTML comment. Chapter 1
  also holds a quote and a fence over 9,000 characters each, which exercise the piece limit in
  [0001](0001-pane-draws-within-the-engines-limits.md).
- The Phase 1 live check opens a committed copy of `fixtureDoc(1000)` in the pane, so that copy
  must be exactly what the tests generate. `test/fixture-doc.spec.ts` checks it byte for byte.
  Regenerate both committed files with:

  ```bash
  node -e 'import("./plugins/doc-editor/core/fixture-docs.ts").then(f => { const fs = require("node:fs"); fs.writeFileSync("docs/test/fixtures/thousand-line-doc.md", f.fixtureDoc(1000)); fs.writeFileSync("docs/test/fixtures/linked-doc.md", f.linkedDoc()); })'
  ```

- A test's own time limit is 5 seconds, so the tests parse the large fixtures once at load, not
  inside each test.
- The alignment test that parses two 2,500-block documents takes about 0.5 s alone but can pass
  the default 5 s on a loaded host, so it carries a 30 s limit.
