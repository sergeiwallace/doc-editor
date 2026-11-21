#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const LIMIT_BYTES = 1_000_000;
const GITLINK_MODE = "160000";

function git(dir, args, input) {
  const result = spawnSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const reason = result.error?.message ?? result.stderr.trim();
    console.log(`check-plugin-size: git ${args[0]} failed in ${dir}: ${reason}`);
    process.exit(2);
  }
  return result.stdout;
}

function indexedFiles(dir) {
  return git(dir, ["ls-files", "-z", "--stage", "--", "."])
    .split("\0")
    .filter((record) => record !== "")
    .map((record) => {
      const tab = record.indexOf("\t");
      const [mode, oid] = record.slice(0, tab).split(" ");
      return { mode, oid, path: record.slice(tab + 1) };
    })
    .filter((file) => file.mode !== GITLINK_MODE);
}

function blobSizes(dir, oids) {
  if (oids.length === 0) return new Map();
  const lines = git(
    dir,
    ["cat-file", "--batch-check=%(objectname) %(objectsize)"],
    oids.join("\n"),
  );
  return new Map(
    lines
      .trim()
      .split("\n")
      .map((line) => {
        const [oid, size] = line.split(" ");
        return [oid, Number(size)];
      }),
  );
}

function main() {
  const [dirArg] = process.argv.slice(2);
  if (!dirArg || !existsSync(dirArg)) {
    console.log(`check-plugin-size: no such directory: ${dirArg ?? "(none given)"}`);
    process.exit(2);
  }
  const files = indexedFiles(dirArg);
  const sizes = blobSizes(dirArg, [...new Set(files.map((file) => file.oid))]);
  const paths = new Set(files.map((file) => file.path));
  const over = files.filter((file) => (sizes.get(file.oid) ?? 0) > LIMIT_BYTES);

  for (const file of over) {
    console.log(
      `check-plugin-size: ${join(dirArg, file.path)}: ${sizes.get(file.oid)} bytes, over the 1 MB limit (${LIMIT_BYTES} bytes)`,
    );
  }
  if (over.length > 0) process.exit(1);
  console.log(`check-plugin-size: ${paths.size} file(s) under ${dirArg}, none over 1 MB`);
}

main();
