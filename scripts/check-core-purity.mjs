#!/usr/bin/env node
// Purity lint for the shared core (design D-9, task T-0.2).
// Usage: node scripts/check-core-purity.mjs <core-dir>
//
// Parses every .ts, .tsx, .js and .mjs file under <core-dir>, tests and vendored code included,
// and prints one line per finding:
//   <file>:<line>: import <specifier>   an import, export-from, import() or require() whose
//                                       specifier is not a relative path ("./" or "../")
//   <file>:<line>: import() of a computed specifier
//   <file>:<line>: <token>              a reference to document, window, process or setTimeout
//                                       that no declaration in the same file binds
//   <file>:<line>: globalThis.<token>   the same name reached as a property of globalThis
//   <file>:<line>: $                    any identifier `$`, bound or free: the core takes no `$`
//                                       parameter anywhere
// A name inside a comment, a string, template text or a regular expression is not an identifier,
// and neither is a property name after `.` or an object-literal key, so none of those is flagged.
// A test file (*.test.ts, *.test.tsx) may import the test kit, `claude-code/testing`.
//
// "Binds" is per file: a vendored bundle that declares its own `var document` uses that local,
// while a file that never declares `document` reaches the DOM global.
// Exits 1 on any finding or a file it cannot parse, 2 when the directory is missing or holds no
// source file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const FREE_NAMES = new Set(["document", "window", "process", "setTimeout"]);
const ENGINE = "$";
const TEST_KIT = "claude-code/testing";
const LANG = { ".ts": "ts", ".tsx": "tsx", ".js": "js", ".mjs": "js" };
const TEST_FILE = /\.test\.tsx?$/;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function listSources(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") files.push(...listSources(path));
    } else if (extname(entry.name) in LANG) {
      files.push(path);
    }
  }
  return files.sort();
}

const isNode = (value) => value !== null && typeof value === "object" && typeof value.type === "string";

function children(node) {
  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) out.push([key, item]);
    } else if (isNode(value)) {
      out.push([key, value]);
    }
  }
  return out;
}

function walk(node, visit, parent = null, key = null) {
  visit(node, parent, key);
  for (const [childKey, child] of children(node)) walk(child, visit, node, childKey);
}

// Every name a binding pattern declares.
function patternNames(pattern, names) {
  if (!isNode(pattern)) return;
  switch (pattern.type) {
    case "Identifier":
      names.add(pattern.name);
      break;
    case "ObjectPattern":
      for (const property of pattern.properties) {
        patternNames(property.type === "RestElement" ? property.argument : property.value, names);
      }
      break;
    case "ArrayPattern":
      for (const element of pattern.elements) patternNames(element, names);
      break;
    case "AssignmentPattern":
      patternNames(pattern.left, names);
      break;
    case "RestElement":
      patternNames(pattern.argument, names);
      break;
    case "TSParameterProperty":
      patternNames(pattern.parameter, names);
      break;
  }
}

function boundNames(program) {
  const names = new Set();
  walk(program, (node) => {
    switch (node.type) {
      case "VariableDeclarator":
        patternNames(node.id, names);
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        if (node.id) names.add(node.id.name);
        for (const param of node.params) patternNames(param, names);
        break;
      case "ClassDeclaration":
      case "ClassExpression":
        if (node.id) names.add(node.id.name);
        break;
      case "CatchClause":
        patternNames(node.param, names);
        break;
      case "ImportSpecifier":
      case "ImportDefaultSpecifier":
      case "ImportNamespaceSpecifier":
        names.add(node.local.name);
        break;
    }
  });
  return names;
}

// True when the identifier under `parent[key]` is a name rather than a reference to a binding.
function isPropertyName(parent, key) {
  if (parent === null) return false;
  switch (parent.type) {
    case "MemberExpression":
      return key === "property" && !parent.computed;
    // A shorthand `{ document }` carries the name twice, as key and value; the value is checked.
    case "Property":
      return key === "key" && !parent.computed;
    case "MethodDefinition":
    case "PropertyDefinition":
    case "AccessorProperty":
    case "TSPropertySignature":
    case "TSMethodSignature":
      return key === "key" && !parent.computed;
    case "TSQualifiedName":
      return key === "right";
    case "TSEnumMember":
      return key === "id";
    case "ImportSpecifier":
      return key === "imported";
    case "ExportSpecifier":
      return key === "exported";
    case "LabeledStatement":
    case "BreakStatement":
    case "ContinueStatement":
      return key === "label";
    case "MetaProperty":
      return true;
    default:
      return false;
  }
}

const isRelative = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

function stringValue(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }
  return null;
}

function lineAt(text, offset) {
  let line = 1;
  for (let k = 0; k < offset; k++) if (text.charCodeAt(k) === 10) line++;
  return line;
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  let program;
  try {
    program = parseAst(text, { lang: LANG[extname(file)] }, file);
  } catch (error) {
    const reason = String(error?.message ?? error).split("\n").slice(0, 2).join(" ");
    return [{ line: 0, finding: `cannot parse: ${reason}` }];
  }
  const bound = boundNames(program);
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

  walk(program, (node, parent, key) => {
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
      case "CallExpression":
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          checkSpecifier(node, node.arguments[0] ?? null);
        }
        return;
      case "MemberExpression":
        if (node.object.type === "Identifier" && node.object.name === "globalThis") {
          const name = node.computed ? stringValue(node.property) : node.property.name;
          if (FREE_NAMES.has(name) || name === ENGINE) hit(node.property, `globalThis.${name}`);
        }
        return;
      case "Identifier":
        if (isPropertyName(parent, key)) return;
        if (node.name === ENGINE) hit(node, ENGINE);
        else if (FREE_NAMES.has(node.name) && !bound.has(node.name)) hit(node, node.name);
        return;
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
