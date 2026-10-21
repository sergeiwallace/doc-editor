#!/usr/bin/env node
// Bundles the libraries the doc-editor plugin vendors into committed ESM files.
//
//   npm ci --prefix tools/vendor-bundle
//   node scripts/bundle-vendor.mjs
//   node scripts/bundle-vendor.mjs --out-dir <dir>   writes each bundle under <dir> at its
//                                                    repository path instead, for a comparison
//
// The output is committed and must be reproduced byte for byte by this script (design D-3).
// Each bundle is built unminified with the default export condition (never `browser`) and
// `process.env.NODE_ENV` defined to "production", and carries the licence notice of every
// package it contains. A bundle over the size cap fails the run.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_DIR = join(ROOT, "tools", "vendor-bundle");
const outFlag = process.argv.indexOf("--out-dir");
const outValue = outFlag < 0 ? undefined : process.argv[outFlag + 1];
if (outFlag >= 0 && outValue === undefined) throw new Error("--out-dir needs a directory");
const OUT_DIR = outValue === undefined ? ROOT : resolve(outValue);
const MAX_BYTES = 500 * 1024;

const require = createRequire(join(TOOL_DIR, "package.json"));
const esbuild = require("esbuild");

const BUNDLES = [
  {
    out: "plugins/doc-editor/core/vendor/mdast.js",
    title: "micromark and mdast-util-from-markdown with the GFM extensions",
    source: [
      'export { fromMarkdown } from "mdast-util-from-markdown";',
      'export { gfm } from "micromark-extension-gfm";',
      'export { gfmFromMarkdown } from "mdast-util-gfm";',
    ].join("\n"),
  },
  {
    out: "plugins/doc-editor/vendor-candidates/codemirror-state.js",
    title: "@codemirror/state",
    source: 'export * from "@codemirror/state";',
  },
  {
    out: "plugins/doc-editor/vendor-candidates/prosemirror-model.js",
    title: "prosemirror-model",
    source: 'export * from "prosemirror-model";',
  },
  {
    out: "plugins/doc-editor/vendor-candidates/yjs.js",
    title: "yjs",
    source: 'export * from "yjs";',
  },
];

const packageRootOf = (file) => {
  let dir = dirname(file);
  while (dir.startsWith(TOOL_DIR) && dir !== TOOL_DIR) {
    try {
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      if (manifest.name && manifest.version) return { dir, manifest };
    } catch {
      // not a package root; keep climbing
    }
    dir = dirname(dir);
  }
  throw new Error(`no package.json above ${file}`);
};

const licenceTextOf = (dir) => {
  const name = readdirSync(dir).find((entry) => /^(licen[cs]e|copying)(\.|$)/i.test(entry));
  if (name === undefined) throw new Error(`no licence file in ${dir}`);
  return readFileSync(join(dir, name), "utf8").trim();
};

const licenceBanner = (title, inputs) => {
  const packages = new Map();
  for (const input of inputs) {
    const { dir, manifest } = packageRootOf(resolve(TOOL_DIR, input));
    packages.set(`${manifest.name}@${manifest.version}`, { dir, manifest });
  }
  const sections = [...packages.keys()].sort().map((id) => {
    const { dir, manifest } = packages.get(id);
    return `${id} (${manifest.license})\n\n${licenceTextOf(dir)}`;
  });
  const body = [
    `Vendored bundle of ${title}, built by scripts/bundle-vendor.mjs. Do not edit.`,
    `It contains ${sections.length} packages; each licence notice follows.`,
    ...sections,
  ].join("\n\n");
  return `/*!\n${body.replaceAll("*/", "* /")}\n*/`;
};

for (const bundle of BUNDLES) {
  const result = await esbuild.build({
    stdin: { contents: bundle.source, resolveDir: TOOL_DIR, sourcefile: "entry.js" },
    absWorkingDir: TOOL_DIR,
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: [],
    define: { "process.env.NODE_ENV": '"production"' },
    minify: false,
    legalComments: "none",
    charset: "utf8",
    metafile: true,
    write: false,
    logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs).filter((path) => path.includes("node_modules/"));
  // The repository's whitespace hooks would rewrite trailing blanks, so the script strips them
  // itself and the committed file stays what the script writes.
  const code = `${licenceBanner(bundle.title, inputs)}\n${result.outputFiles[0].text}`
    .replace(/[ \t]+$/gm, "")
    .replace(/\n*$/, "\n");
  const bytes = Buffer.byteLength(code);
  if (bytes >= MAX_BYTES) {
    throw new Error(`${bundle.out} is ${bytes} bytes, over the ${MAX_BYTES}-byte cap`);
  }
  const target = join(OUT_DIR, bundle.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
  console.log(`${relative(OUT_DIR, target)} ${statSync(target).size} bytes`);
}
