#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildScopes,
  declares,
  globalReferences,
  isPropertyName,
  LANG,
  lineAt,
  parseSource,
  stringValue,
  walkScoped,
} from "./js-scope.mjs";

const FREE_NAMES = new Set(["document", "window", "process", "setTimeout"]);
const ENGINE = "$";
const GLOBAL_OBJECTS = new Set(["globalThis", "self", "window"]);
const ALIASABLE_GLOBALS = new Set(["globalThis", "self"]);
const TEST_KIT = "claude-code/testing";
const READ = new Set([".ts", ".tsx", ".js", ".mjs"]);
const TEST_FILE = /\.test\.tsx?$/;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function listSources(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") files.push(...listSources(path));
    } else if (READ.has(extname(entry.name)) && extname(entry.name) in LANG) {
      files.push(path);
    }
  }
  return files.sort();
}

const isRelative = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  let program;
  try {
    program = parseSource(text, file);
  } catch (error) {
    const reason = String(error?.message ?? error).split("\n").slice(0, 2).join(" ");
    return [{ line: 0, finding: `cannot parse: ${reason}` }];
  }
  const scopes = buildScopes(program);
  const allowsTestKit = TEST_FILE.test(file);
  const hits = [];
  const hit = (node, finding) => hits.push({ line: lineAt(text, node.start), finding });
  const checkSpecifier = (node, source) => {
    if (!source) return;
    const specifier = stringValue(source);
    if (specifier === null) {
      hit(node, "import() of a computed specifier");
    } else if (!isRelative(specifier) && !(allowsTestKit && specifier === TEST_KIT)) {
      hit(source, `import ${specifier}`);
    }
  };

  for (const { node, finding } of globalReferences(program, scopes, {
    freeNames: FREE_NAMES,
    memberNames: new Set([...FREE_NAMES, ENGINE]),
    globalObjects: GLOBAL_OBJECTS,
    aliasable: ALIASABLE_GLOBALS,
  })) {
    hit(node, finding);
  }

  walkScoped(program, scopes, scopes.get(program), (node, parent, key, scope) => {
    switch (node.type) {
      case "ImportDeclaration":
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
      case "ImportExpression":
        checkSpecifier(node, node.source);
        return;
      case "TSImportType":
        checkSpecifier(node, node.argument?.literal ?? node.argument);
        return;
      case "Identifier": {
        if (isPropertyName(parent, key)) return;
        if (node.name === ENGINE) hit(node, ENGINE);
        else if (node.name === "require" && !declares(scope, node.name)) hit(node, "require");
        return;
      }
    }
  });
  return hits.sort((a, b) => a.line - b.line);
}

function display(file) {
  const rel = relative(REPO_ROOT, file);
  return rel.startsWith("..") || isAbsolute(rel) ? file : rel;
}

function main(args) {
  if (args.length !== 1) {
    console.error("usage: check-core-purity.mjs <core-dir>");
    return 2;
  }
  const coreRoot = resolve(args[0]);
  let isDir = false;
  try {
    isDir = statSync(coreRoot).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    console.error(`check-core-purity: ${args[0]} is not a directory`);
    return 2;
  }
  const files = listSources(coreRoot);
  if (files.length === 0) {
    console.error(`check-core-purity: no source file under ${args[0]}, nothing was checked`);
    return 2;
  }
  let count = 0;
  for (const file of files) {
    for (const { line, finding } of scanFile(file)) {
      console.log(`${display(file)}:${line}: ${finding}`);
      count++;
    }
  }
  if (count > 0) {
    console.error(`check-core-purity: ${count} finding(s) in ${args[0]}`);
    return 1;
  }
  console.log(`check-core-purity: ${files.length} file(s) clean`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
