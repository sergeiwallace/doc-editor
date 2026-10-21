#!/usr/bin/env node
// The mod's save helper (design D-12): writes stdin to a file only if the file is still the one
// the mod read.
// Usage: node bin/save.mjs <target> <expected-mtimeMs> <expected-size>  (the new content on stdin)
// It writes a temporary file beside the target, re-reads the target's mtimeMs and size right
// before the rename, and renames only when both still match. On success it prints the saved
// file's {"mtimeMs","size"} as one JSON line. On any failure it removes the temporary file,
// leaves the target as it was and exits non-zero with one stderr line saying why.
// A symbolic link is resolved first, so the temporary file sits beside the real file and the link
// survives the rename.
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

function fail(message, code = 1) {
  process.stderr.write(`save: ${message}\n`);
  process.exit(code);
}

const [target, mtimeArg, sizeArg, ...rest] = process.argv.slice(2);
const expectedMtimeMs = Number(mtimeArg);
const expectedSize = Number(sizeArg);
const isValid =
  target !== undefined &&
  target !== "" &&
  rest.length === 0 &&
  mtimeArg !== "" &&
  Number.isFinite(expectedMtimeMs) &&
  sizeArg !== "" &&
  Number.isInteger(expectedSize) &&
  expectedSize >= 0;
if (!isValid) {
  fail("usage: save.mjs <target> <expected-mtimeMs> <expected-size>, content on stdin", 2);
}

let real;
try {
  real = realpathSync(target);
} catch (error) {
  fail(`cannot save ${target}: ${error.code === "ENOENT" ? "it does not exist" : error.message}`);
}
const before = statSync(real);
if (!before.isFile()) fail(`cannot save ${target}: not a regular file`);

const content = readFileSync(0);
const temporary = join(
  dirname(real),
  `.${basename(real)}.doc-editor-${process.pid}-${Date.now()}.tmp`,
);
let created = false;
const removeTemporary = () => {
  if (!created) return;
  try {
    unlinkSync(temporary);
  } catch {
    // Already gone; nothing else to undo.
  }
};

try {
  const fd = openSync(temporary, "wx", before.mode & 0o7777);
  created = true;
  try {
    writeSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const now = statSync(real);
  if (now.mtimeMs !== expectedMtimeMs || now.size !== expectedSize) {
    removeTemporary();
    fail(
      `${target} changed since it was read: expected mtimeMs ${expectedMtimeMs} size ${expectedSize}, found mtimeMs ${now.mtimeMs} size ${now.size}`,
    );
  }
  renameSync(temporary, real);
  created = false;
} catch (error) {
  removeTemporary();
  fail(`cannot save ${target}: ${error.message}`);
}

const saved = statSync(real);
process.stdout.write(`${JSON.stringify({ mtimeMs: saved.mtimeMs, size: saved.size })}\n`);
