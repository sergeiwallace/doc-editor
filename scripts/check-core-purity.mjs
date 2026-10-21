#!/usr/bin/env node
// Purity lint for the shared core (design D-9, task T-0.2).
// Usage: node scripts/check-core-purity.mjs <core-dir>
//
// Parses every .ts, .tsx, .js and .mjs file under <core-dir>, tests and vendored code included,
// and prints one line per finding:
//   <file>:<line>: import <specifier>   an import, export-from or import() whose specifier is
//                                       not a relative path ("./" or "../")
//   <file>:<line>: import() of a computed specifier
//   <file>:<line>: <token>              a free reference to document, window, process or
//                                       setTimeout
//   <file>:<line>: <global>.<token>     the same name read as a property, plain or as a string
//                                       literal key, of a free globalThis, self or window
//   <file>:<line>: <global> aliased or indexed by a computed key
//                                       a free globalThis or self used other than as `x.name`
//   <file>:<line>: require              any free `require`, called or aliased
//   <file>:<line>: $                    any identifier `$`, bound or free: the core takes no `$`
//                                       parameter anywhere
// A name inside a comment, a string, template text or a regular expression is not an identifier,
// and neither is a property name after `.` or an object-literal key, so none of those is flagged.
// A test file (*.test.ts, *.test.tsx) may import the test kit, `claude-code/testing`.
//
// "Free" is resolved by scope (scripts/js-scope.mjs, which the safety floor's network check
// shares): a reference is free when no scope enclosing the use declares the name (function and
// block scopes, parameters, catch bindings, hoisted `var`, imports, class and function names). A
// vendored bundle's own `var document` is a local; the same name used outside that function
// reaches the DOM global.
// Exits 1 on any finding or a file it cannot parse, 2 when the directory is missing or holds no
// source file.
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
// Free names that are the global object; a forbidden name read as their property is flagged.
const GLOBAL_OBJECTS = new Set(["globalThis", "self", "window"]);
// Free global-object names that may be read only as `x.name` or `x["name"]`, never aliased.
const ALIASABLE_GLOBALS = new Set(["globalThis", "self"]);
const TEST_KIT = "claude-code/testing";
// The extensions the lint reads, of those js-scope.mjs parses.
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

  // The forbidden globals, free or read through a free global object, and an aliased global object.
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
