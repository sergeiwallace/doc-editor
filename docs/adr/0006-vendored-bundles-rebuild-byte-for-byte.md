# 0006. Vendored bundles rebuild byte for byte

Governs: `scripts/bundle-vendor.mjs`, `test/vendor-bundle.spec.ts` and the bundles under
`plugins/doc-editor/core/vendor/` and `plugins/doc-editor/vendor-candidates/`.

Vendoring the parser is decided in [the design](../designs/doc-editor-design.md). This record
keeps how the bundles are built.

## Decisions and reasons

- The bundles are committed, and the script must reproduce them byte for byte;
  `test/vendor-bundle.spec.ts` checks it. Rebuild with `npm ci --prefix tools/vendor-bundle`
  and then `node scripts/bundle-vendor.mjs`. `--out-dir <dir>` writes each bundle under `<dir>`
  at its repository path instead, for a comparison.
- Each bundle is built unminified, with the default export condition (never `browser`) and
  `process.env.NODE_ENV` defined to `"production"`, and carries the licence notice of every
  package it contains. A bundle over the size cap fails the run.
- The script strips trailing blanks itself, because the repository's whitespace hooks would
  rewrite them and the committed file must stay what the script writes.
- The bundles are generated, so their comments are not this repository's prose. They keep their
  counts in `comment-baseline.json`, and a rebuild that changes a bundle's comment count needs
  that entry moved by hand in the same commit.
