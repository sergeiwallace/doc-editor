# 0009. Change review never guesses where a change went

Governs: `plugins/doc-editor/core/changes.ts`, `plugins/doc-editor/hooks/review.ts`,
`plugins/doc-editor/hooks/watch.ts`, the review state in `plugins/doc-editor/hooks/pane.ts`, and
`plugins/doc-editor/types/doc-editor.d.ts`.

## Decisions and reasons

- Old and new blocks are aligned by source text with a longest common subsequence. Past the
  table limit the alignment anchors on texts that occur once on each side (patience alignment)
  and aligns each gap between anchors the same way, so a copy of a block inserted elsewhere is
  never taken for the block itself. Matching each new text to the next unused equal old text, in
  order, is only the last resort for a long run with no unique text.
- A block whose text is equal but whose last line ending changed is a changed block.
- When a change is relocated after a reload, a context cut short by an end of the file is matched
  as it is, so a copy elsewhere with the same neighbours leaves the match ambiguous rather than
  picking either. Carrying a change by its block ids alone is used only when that relocation
  cannot place it.
- The changes kept in session state are those whose lines still hold the text their turn left,
  checked against the file's text as last measured, which a closed pane's document may lag. The
  state is written back without the rest, so it never holds a change that can no longer be
  reviewed. A file that changed while another was shown, or while the pane was closed, carries
  its changes when it is opened again.
- The session-state contract in `types/doc-editor.d.ts` writes the change's shape out instead of
  importing core's `Change`, because a contract carries no import.
- A reload check asked for while one runs runs again after it, so a write that lands during the
  first check's stat is not missed.
