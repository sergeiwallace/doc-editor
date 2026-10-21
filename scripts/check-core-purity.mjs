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
// "Free" is resolved by scope: a reference is free when no scope enclosing the use declares the
// name (function and block scopes, parameters, catch bindings, hoisted `var`, imports, class and
// function names). A vendored bundle's own `var document` is a local; the same name used outside
// that function reaches the DOM global.
// Exits 1 on any finding or a file it cannot parse, 2 when the directory is missing or holds no
// source file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const FREE_NAMES = new Set(["document", "window", "process", "setTimeout"]);
const ENGINE = "$";
// Free names that are the global object; a forbidden name read as their property is flagged.
const GLOBAL_OBJECTS = new Set(["globalThis", "self", "window"]);
// Free global-object names that may be read only as `x.name` or `x["name"]`, never aliased.
const ALIASABLE_GLOBALS = new Set(["globalThis", "self"]);
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

const FUNCTION_SCOPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const BLOCK_SCOPES = new Set([
  "BlockStatement",
  "StaticBlock",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "SwitchStatement",
  "CatchClause",
  "ClassDeclaration",
  "ClassExpression",
  "TSModuleBlock",
]);

const newScope = (parent, isFunction) => ({ parent, isFunction, names: new Set() });

function functionScopeOf(scope) {
  let current = scope;
  while (!current.isFunction) current = current.parent;
  return current;
}

// The scope tree: each scope-making node mapped to its scope, holding every name declared there.
// `var` hoists to the nearest function or module scope; `let`, `const` and classes stay in their
// block; a function declaration's name goes to the scope that holds it, its parameters to its own.
function buildScopes(program) {
  const root = newScope(null, true);
  const scopes = new Map([[program, root]]);
  const visit = (node, scope) => {
    let inner = scope;
    if (FUNCTION_SCOPES.has(node.type)) {
      if (node.type === "FunctionDeclaration" && node.id) scope.names.add(node.id.name);
      inner = newScope(scope, true);
      if (node.type === "FunctionExpression" && node.id) inner.names.add(node.id.name);
      for (const param of node.params) patternNames(param, inner.names);
      scopes.set(node, inner);
    } else if (BLOCK_SCOPES.has(node.type)) {
      if (node.type === "ClassDeclaration" && node.id) scope.names.add(node.id.name);
      inner = newScope(scope, false);
      if (node.type === "ClassExpression" && node.id) inner.names.add(node.id.name);
      if (node.type === "CatchClause") patternNames(node.param, inner.names);
      scopes.set(node, inner);
    }
    switch (node.type) {
      case "VariableDeclaration": {
        const target = node.kind === "var" ? functionScopeOf(inner) : inner;
        for (const declarator of node.declarations) patternNames(declarator.id, target.names);
        break;
      }
      case "ImportSpecifier":
      case "ImportDefaultSpecifier":
      case "ImportNamespaceSpecifier":
        root.names.add(node.local.name);
        break;
    }
    for (const [, child] of children(node)) visit(child, inner);
  };
  visit(program, root);
  return scopes;
}

function declares(scope, name) {
  for (let current = scope; current !== null; current = current.parent) {
    if (current.names.has(name)) return true;
  }
  return false;
}

function walkScoped(node, scopes, scope, visit, parent = null, key = null) {
  const inner = scopes.get(node) ?? scope;
  visit(node, parent, key, inner);
  for (const [childKey, child] of children(node)) {
    walkScoped(child, scopes, inner, visit, node, childKey);
  }
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

  // The property a member access names: its identifier, or a computed string literal; else null.
  const propertyName = (member) =>
    member.computed ? stringValue(member.property) : member.property.name;

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
      case "MemberExpression": {
        const object = node.object;
        if (object.type !== "Identifier" || !GLOBAL_OBJECTS.has(object.name)) return;
        if (declares(scope, object.name)) return;
        const name = propertyName(node);
        if (FREE_NAMES.has(name) || name === ENGINE) hit(node.property, `${object.name}.${name}`);
        return;
      }
      case "Identifier": {
        if (isPropertyName(parent, key)) return;
        const name = node.name;
        if (name === ENGINE) {
          hit(node, ENGINE);
          return;
        }
        if (declares(scope, name)) return;
        if (FREE_NAMES.has(name)) {
          hit(node, name);
        } else if (name === "require") {
          hit(node, "require");
        } else if (ALIASABLE_GLOBALS.has(name)) {
          const plainAccess =
            parent?.type === "MemberExpression" && key === "object" && propertyName(parent) !== null;
          if (!plainAccess) hit(node, `${name} aliased or indexed by a computed key`);
        }
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
