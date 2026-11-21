# 0002. Saves check the file before the rename

Governs: `plugins/doc-editor/bin/save.mjs`, `plugins/doc-editor/hooks/save.ts` and the save path
in `plugins/doc-editor/hooks/pane.ts`.

The safe-write path is decided in [the design](../designs/doc-editor-design.md). This record
keeps the helper's contract.

## Decisions and reasons

- The helper is run as `node bin/save.mjs <target> <expected-mtimeMs> <expected-size>` with the
  new content on stdin. It writes a temporary file beside the target, re-reads the target's
  `mtimeMs` and size right before the rename, and renames only when both still match the values
  the mod read.
- A symbolic link is resolved first, so the temporary file sits beside the real file and the
  link survives the rename.
- Before the rename, a failure removes the temporary file, leaves the target as it was, and exits
  non-zero with one stderr line saying why. The mod reads a non-zero exit as "the target is
  unchanged".
- After the rename the helper always exits 0, because the target has been replaced and a
  non-zero exit would tell the mod otherwise. It prints the saved file's `{"mtimeMs","size"}` as
  one JSON line when it can. Without that line the mod re-reads the file for the stamp.
- In `save.ts`, a stat that fails after a save leaves the stamp unknown and is not a failure,
  since the file is saved by then.
- In `pane.ts`, when no stamp can be had after a save, the next save asks before it writes.
