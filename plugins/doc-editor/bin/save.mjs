#!/usr/bin/env node
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
  } catch {}
};

try {
  const fd = openSync(temporary, "wx", before.mode & 0o7777);
  created = true;
  try {
    for (let written = 0; written < content.length; ) {
      written += writeSync(fd, content, written, content.length - written);
    }
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

try {
  const saved = statSync(real);
  writeSync(1, `${JSON.stringify({ mtimeMs: saved.mtimeMs, size: saved.size })}\n`);
} catch {}
process.exit(0);
