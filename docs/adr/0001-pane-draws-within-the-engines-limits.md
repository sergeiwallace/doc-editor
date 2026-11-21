# 0001. The pane draws within the engine's limits

Governs: `plugins/doc-editor/core/window.ts`, `plugins/doc-editor/core/blocks.ts`,
`plugins/doc-editor/core/links.ts`, `plugins/doc-editor/hooks/pane.ts`,
`plugins/doc-editor/hooks/register.ts` and the fit tests in `plugins/doc-editor/hooks/fit.test.ts`.

The rendering model itself (one engine `Markdown` element per block, windowed by answering
`ui.scroll`) is decided in [the design](../designs/doc-editor-design.md). This record keeps the
engine facts the code is shaped around, which the code does not show.

## Decisions and reasons

- A piece's text is never over 9,000 characters. A longer block is split at paragraph
  boundaries; one that cannot be split (a fence, a table, a single long paragraph) is drawn as
  consecutive `Code` slices, each with a continuation marker.
- A page stays within 60,000 serialized characters, so with the header and hint rows the tree
  stays under the engine's 100,000-character draw limit. Past that limit the engine cuts text
  without refusing the tree, so nothing would report the loss.
- `ViewState.offset` is an index into the visible pieces, never a row. The mod answers
  `ui.scroll` itself and moves by pieces, so the engine's own window never moves.
- The engine sums the moves that arrive together (a burst of Downs, a held key, crowded wheel
  ticks) into one `ui.scroll` and marks no key. An arrow is one row, a page key the window's
  rows, Home and End all of them. So a move shorter than the window is read as that many single
  steps, and a `by` of 5 in a test is five Downs, not a page key.
- The engine raises `ui.scroll` for an arrow key only while the tree is taller than the body, so
  a blank spacer under the hint row keeps it taller. The spacer stays below the rows in view
  because the engine's window never moves.
- The core budgets a page by its pieces' text, but each piece draws inside a frame, a table may
  draw as cards, a `Markdown` element lists its links and the focused block adds a link row. The
  pane stops the page before what it draws, measured as serialized, would pass the page budget,
  and cuts the last piece to the rows left so the hint row stays on screen. The outline stops at
  the same budget, since a tall body holds thousands of entries.
- A table wider than the body whose cards would pass the element limit falls back to its source
  as `Code`, which keeps the tree in budget.
- The drawn text differs from the source where the engine's `Markdown` element would show syntax
  as text (measured in the Phase 0 spike): task markers become checkbox glyphs, HTML comments are
  dropped, inline HTML is converted, and images become their alt text and path. A reference link
  is resolved inline, because each block is drawn in its own element and cannot see a definition
  in another block.
- Every href is classified before it reaches a terminal `Link`, because the terminal writes any
  non-blank href into a hyperlink, `javascript:` included. A link that may not be drawn becomes
  its label and its target as code. The label is escaped so it cannot close the link and the
  href percent-encoded so it cannot end the destination, then checked again. mdast hands inline
  HTML one tag at a time, so an anchor's open and close tags are matched as siblings and checked
  like any other link.
