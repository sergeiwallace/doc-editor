# 0005. The plugin size gate reads the index

Governs: `scripts/check-plugin-size.mjs`.

## Decisions and reasons

- A file over 1 MB fails, counted as 1,000,000 bytes. That is the stricter reading of "1 MB",
  so a file the engine reads as over 1 MiB is always caught.
- The files are the ones git's index holds under the plugin directory: every tracked file plus
  every staged one, which in the pre-commit hook is exactly what the commit carries. Each size is
  the indexed blob's, so a file staged large and then shrunk in the working tree still fails.
  Untracked files are not part of the plugin and are not read.
- A conflicted path has several index stages. Each is a blob the merge could commit, so each is
  checked.
- No directory is exempt: a file force-added under `node_modules` or `.turbo` is counted like any
  other.
