// Scope resolution over a parsed source file, shared by the core purity lint
// (check-core-purity.mjs) and the safety floor's network check (safety-floor.mjs): which
// identifiers are free (no enclosing scope declares them), which are names rather than references,
// and the references to the global object and to chosen global names a file makes.
//
// "Free" is resolved by scope: a reference is free when no scope enclosing the use declares the
// name (function and block scopes, parameters, catch bindings, hoisted `var`, imports, class and
// function names). A file's own `const fetch = ...` is a local; `globalThis.fetch` is not.
import { extname } from "node:path";
import { parseAst } from "rolldown/parseAst";

/** The parser's language for a source file's extension, or undefined for one it does not read. */
export const LANG = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".mts": "ts",
  ".cts": "ts",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".cjs": "js",
};

/** Parses `text` as the language of `file`'s extension; throws on a syntax error. */
export function parseSource(text, file) {
  return parseAst(text, { lang: LANG[extname(file)] ?? "js" }, file);
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

/**
 * The scope tree: each scope-making node mapped to its scope, holding every name declared there.
 * `var` hoists to the nearest function or module scope; `let`, `const` and classes stay in their
 * block; a function declaration's name goes to the scope that holds it, its parameters to its own.
 */
export function buildScopes(program) {
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

/** Whether `scope` or a scope enclosing it declares `name`. */
export function declares(scope, name) {
  for (let current = scope; current !== null; current = current.parent) {
    if (current.names.has(name)) return true;
  }
  return false;
}

/** Visits every node depth first with its parent, its key there and the scope it sits in. */
export function walkScoped(node, scopes, scope, visit, parent = null, key = null) {
  const inner = scopes.get(node) ?? scope;
  visit(node, parent, key, inner);
  for (const [childKey, child] of children(node)) {
    walkScoped(child, scopes, inner, visit, node, childKey);
  }
}

/** True when the identifier under `parent[key]` is a name rather than a reference to a binding. */
export function isPropertyName(parent, key) {
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

/** A string literal's or a plain template's value, else null. */
export function stringValue(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }
  return null;
}

/** The 1-based line of `offset` in `text`. */
export function lineAt(text, offset) {
  let line = 1;
  for (let k = 0; k < offset; k++) if (text.charCodeAt(k) === 10) line++;
  return line;
}

// The property a member access names: its identifier, or a computed string literal; else null.
const propertyName = (member) => (member.computed ? stringValue(member.property) : member.property.name);

/** The nearest scope enclosing `scope` that declares `name`, or null when the name is free. */
export function declaringScope(scope, name) {
  for (let current = scope; current !== null; current = current.parent) {
    if (current.names.has(name)) return current;
  }
  return null;
}

// Wrappers that leave an expression's value as it is: parentheses, TypeScript casts and `!`.
const unwrap = (node) => {
  let current = node;
  while (
    current?.type === "ParenthesizedExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "TSNonNullExpression" ||
    current?.type === "TSTypeAssertion"
  ) {
    current = current.expression;
  }
  return current;
};

/**
 * The references a parsed file makes to chosen globals, resolved by scope:
 *   - `freeNames`: a free reference to the name, as `name`;
 *   - `memberNames`: the name read as a property, plain or as a string literal key, of a free
 *     global object or a chain of them (`globalThis.self.fetch`), as the dotted path;
 *   - `aliasable`: a free global object used other than as `x.name` or `x["name"]` (bound to a
 *     name, destructured, passed on, indexed by a computed key), as `<global> aliased or indexed
 *     by a computed key`, since what it reaches can then no longer be read.
 * With `resolveAliases`, a name bound to a global object (`const g = globalThis`, or a choice of
 * global objects such as `typeof globalThis !== "undefined" ? globalThis : window`) is followed
 * instead: `g.fetch` and `g["fetch"]` are read as `globalThis.fetch`, a computed key that is a
 * string constant never reassigned is read as its value, and only a use that loses track (passing
 * the alias on, destructuring it, another computed key) is a finding. `typeof x` reads no value.
 * A name in a comment, a string or a regular expression is no identifier, a property name after
 * `.` or an object key is no reference, and a name some enclosing scope declares is a local.
 *
 * @returns `{ node, finding }` per reference, in source order
 */
export function globalReferences(program, scopes, { freeNames, memberNames, globalObjects, aliasable, resolveAliases = false }) {
  const hits = [];
  // Bindings, as `scope` and `name`, that hold a global object, and string constants never reassigned.
  const aliases = new Map();
  const constants = new Map();
  const assigned = new Set();
  const keyOf = (scope, name) => scope === null ? null : `${scopeIds.get(scope)}:${name}`;
  const scopeIds = new Map([...new Set(scopes.values())].map((scope, k) => [scope, k]));
  const rootOf = (node, scope) => {
    const value = unwrap(node);
    if (value?.type !== "Identifier") return null;
    if (globalObjects.has(value.name) && declaringScope(scope, value.name) === null) return value.name;
    const alias = aliases.get(keyOf(declaringScope(scope, value.name), value.name));
    return alias ?? null;
  };
  // Whether an expression's value is a global object: one, a member chain of them, or a choice.
  const isGlobalValue = (node, scope) => {
    const value = unwrap(node);
    if (value?.type === "ConditionalExpression") return isGlobalValue(value.consequent, scope) || isGlobalValue(value.alternate, scope);
    if (value?.type === "LogicalExpression") return isGlobalValue(value.left, scope) || isGlobalValue(value.right, scope);
    if (value?.type === "MemberExpression") return rootOf(value.object, scope) !== null && globalObjects.has(propertyName(value));
    return rootOf(value, scope) !== null;
  };

  if (resolveAliases) {
    walkScoped(program, scopes, scopes.get(program), (node, _parent, _key, scope) => {
      if (node.type === "AssignmentExpression" && unwrap(node.left)?.type === "Identifier") {
        assigned.add(keyOf(declaringScope(scope, node.left.name), node.left.name));
      } else if (node.type === "UpdateExpression" && node.argument.type === "Identifier") {
        assigned.add(keyOf(declaringScope(scope, node.argument.name), node.argument.name));
      }
    });
    walkScoped(program, scopes, scopes.get(program), (node, _parent, _key, scope) => {
      if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier" || node.init === null) return;
      const key = keyOf(declaringScope(scope, node.id.name), node.id.name);
      if (key === null || assigned.has(key)) return;
      const text = stringValue(unwrap(node.init));
      if (text !== null) constants.set(key, text);
      else if (isGlobalValue(node.init, scope)) aliases.set(key, node.id.name);
    });
  }

  // Inside an alias's own initialiser a global object is the alias's value, not a use of it.
  const initialisers = new Set();
  const markInit = (node) => {
    const value = unwrap(node);
    initialisers.add(value);
    if (value?.type === "ConditionalExpression") {
      markInit(value.consequent);
      markInit(value.alternate);
    } else if (value?.type === "LogicalExpression") {
      markInit(value.left);
      markInit(value.right);
    }
  };

  walkScoped(program, scopes, scopes.get(program), (node, parent, key, scope) => {
    if (resolveAliases && node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init !== null) {
      if (aliases.has(keyOf(declaringScope(scope, node.id.name), node.id.name))) markInit(node.init);
    }
    if (node.type === "MemberExpression") {
      const path = [];
      let object = node.object;
      while (object.type === "MemberExpression" && globalObjects.has(propertyName(object))) {
        path.unshift(propertyName(object));
        object = object.object;
      }
      const root = resolveAliases ? rootOf(object, scope) : object.type === "Identifier" && globalObjects.has(object.name) && !declares(scope, object.name) ? object.name : null;
      if (root === null) return;
      let name = propertyName(node);
      if (name === null && resolveAliases && node.property.type === "Identifier") {
        name = constants.get(keyOf(declaringScope(scope, node.property.name), node.property.name)) ?? null;
      }
      if (name !== null && memberNames.has(name)) hits.push({ node: node.property, finding: [root, ...path, name].join(".") });
      if (name === null && resolveAliases) hits.push({ node, finding: `${root} aliased or indexed by a computed key` });
      return;
    }
    if (node.type !== "Identifier" || isPropertyName(parent, key)) return;
    const isAlias = resolveAliases && aliases.has(keyOf(declaringScope(scope, node.name), node.name));
    if (!isAlias && declares(scope, node.name)) return;
    if (!isAlias && freeNames.has(node.name)) {
      hits.push({ node, finding: node.name });
      return;
    }
    if (!isAlias && !aliasable.has(node.name)) return;
    if (resolveAliases) {
      // The alias's own binding, a value inside its initialiser, a member access's object (checked
      // above) and a `typeof` operand are no loss of track.
      if (isAlias && parent?.type === "VariableDeclarator" && key === "id") return;
      if (initialisers.has(node)) return;
      if (parent?.type === "MemberExpression" && key === "object") return;
      if (parent?.type === "UnaryExpression" && parent.operator === "typeof") return;
      hits.push({ node, finding: `${isAlias ? (aliases.get(keyOf(declaringScope(scope, node.name), node.name)) ?? node.name) : node.name} aliased or indexed by a computed key` });
      return;
    }
    const plainAccess = parent?.type === "MemberExpression" && key === "object" && propertyName(parent) !== null;
    if (!plainAccess) hits.push({ node, finding: `${node.name} aliased or indexed by a computed key` });
  });
  return hits;
}
