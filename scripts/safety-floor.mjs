// The safety floor (design NFR-4 and NFR-9, task T-1.8), which check-plugin-declared.mjs runs as
// part of the one declared-list gate. What the plugin never does, whether or not the README
// declares it:
//   - over validate's report: any tool.check hook (a glob that could match one included); any
//     tool.call hook but the observed Write and Edit one and a hook for the plugin's own
//     registered tools (mcp__doc-editor__<name>); any model call ($.model.*, $.agent.spawn); any
//     network call ($.http.*, $.mcp.*);
//   - over the sources, since validate reports a tool.call hook the same way whether its handler
//     passes the call on or answers it: a tool.call handler (and its .catch handler) that returns
//     anything but next(...)'s result; an mcp__doc-editor__<name> hook with no
//     $.tool.register({ name: "<name>" }) for it; a use of next(...)'s result other than returning
//     it; a reference to fetch, WebSocket, XMLHttpRequest or EventSource, free or read through
//     globalThis, self or window, and any alias of those global objects (`const g = globalThis`,
//     a destructuring, a computed key), resolved by scope as the core purity lint resolves it
//     (scripts/js-scope.mjs), so a local named fetch passes; an import of a module
//     that reaches the network or starts processes (node:http, node:net, node:child_process and
//     the like); a $.process.run that is not node --version or node on one of the plugin's own
//     bin/*.mjs scripts; and, over the report, any $.process.spawn.
// A static pass reads the code as text, so it is strict rather than complete: a handler it
// cannot read (one passed by name, a return it cannot parse) fails rather than passes.

import { buildScopes, globalReferences, parseSource } from "./js-scope.mjs";

const OBSERVED_TOOL_CALLS = new Set(["tool.call{tool=Write|Edit}"]);
const OWN_PREFIX = "mcp__doc-editor__";
const OWN_TOOL_CALL = /^tool\.call\{tool=(mcp__doc-editor__[\w-]+(?:\|mcp__doc-editor__[\w-]+)*)\}$/;
const MODEL_CALL = /^\$\.(model\.\w+|agent\.spawn)$/;
const NETWORK_CALL = /^\$\.(http|mcp)\.\w+$/;
const NETWORK_APIS = new Set(["fetch", "WebSocket", "XMLHttpRequest", "EventSource"]);
const GLOBAL_OBJECTS = new Set(["globalThis", "self", "window"]);
const ON_TOOL_CALL = /(?<![\w$.])on\s*\(\s*(["'`])tool\.call\1/g;
const PROCESS_RUN = /\$\s*\.\s*process\s*\.\s*run\s*\(/g;
const TOOL_REGISTER = /\$\s*\.\s*tool\s*\.\s*register\s*\(\s*\{/g;
const STRING = /^(["'`])([^"'`$]*)\1$/;
const PLUGIN_SCRIPT = /^`\$\{\s*\$\s*\.\s*plugin\s*\.\s*root\s*\}\/bin\/([\w.-]+\.mjs)`$/;
const BIN_SCRIPT = /^bin\/([\w.-]+\.mjs)$/;
// A module that reaches the network or starts a process, by import, dynamic import or require.
const ESCAPE_MODULE =
  /(?<![\w$.])(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)(["'`])((?:node:)?(?:http|https|http2|net|tls|dgram|dns|child_process|worker_threads|cluster|inspector)(?:\/[\w/]*)?)\1/g;

const lineAt = (text, offset) => text.slice(0, offset).split("\n").length;

// The network APIs a source reaches, resolved by scope: a free `fetch`, `globalThis.fetch` or
// `self["fetch"]`, and any alias of a global object, through which one could be reached unseen.
function networkBreaches(path, source) {
  let program;
  try {
    program = parseSource(source, path);
  } catch (error) {
    const reason = String(error?.message ?? error).split("\n")[0];
    return [`safety floor: ${path}: cannot be parsed to check for network APIs (${reason})`];
  }
  const hits = globalReferences(program, buildScopes(program), {
    freeNames: NETWORK_APIS,
    memberNames: NETWORK_APIS,
    globalObjects: GLOBAL_OBJECTS,
    aliasable: GLOBAL_OBJECTS,
    resolveAliases: true,
  });
  return hits.map(({ node, finding }) => {
    const at = `${path}:${lineAt(source, node.start)}`;
    const name = finding.split(".").at(-1);
    return NETWORK_APIS.has(name)
      ? `safety floor: ${at}: references ${name}, a network API; the mod makes no network request`
      : `safety floor: ${at}: ${finding}, through which a network API could be reached; the mod makes no network request`;
  });
}
const eventOf = (hook) => hook.split("{")[0];

function eventMatches(pattern, event) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(event);
}

const OPEN = { "(": ")", "[": "]", "{": "}" };

// The offset of the bracket closing the one at `open`, in code with strings and comments blanked.
function closing(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] in OPEN) depth++;
    else if (code[i] === ")" || code[i] === "]" || code[i] === "}") {
      if (--depth === 0) return i;
    }
  }
  return -1;
}

// The [start, end) spans of the comma-separated items between `from` and `to`, at depth 0.
// `text` decides whether the last item is empty: pass the source when an item may be only a
// string literal, which `code` blanks.
function items(code, from, to, text = code) {
  const spans = [];
  let depth = 0;
  let start = from;
  for (let i = from; i < to; i++) {
    if (code[i] in OPEN) depth++;
    else if (code[i] === ")" || code[i] === "]" || code[i] === "}") depth--;
    else if (code[i] === "," && depth === 0) {
      spans.push([start, i]);
      start = i + 1;
    }
  }
  if (text.slice(start, to).trim() !== "") spans.push([start, to]);
  return spans;
}

const trimmed = (text, [start, end]) => {
  const raw = text.slice(start, end);
  const lead = raw.length - raw.trimStart().length;
  return [start + lead, start + lead + raw.trim().length];
};

const literal = (source, span) => STRING.exec(source.slice(...trimmed(source, span)))?.[2];

/** The tool names a matcher's `tool:` names as string literals, or [] when it names none. */
function matcherTools(source) {
  const tool = /\btool\s*:\s*(\[[^\]]*\]|(["'`])[^"'`]*\2)/.exec(source);
  if (!tool?.[1]) return [];
  return [...tool[1].matchAll(/(["'`])([^"'`]*)\1/g)].map((match) => match[2] ?? "");
}

// Why the handler in code[start, end) may return something other than next(...)'s result, or
// undefined when every return is next's result.
function answers(code, start, end) {
  const text = code.slice(start, end);
  const head =
    /^\s*(?:async\s+)?(?:function\s*[\w$]*\s*)?\(([^)]*)\)\s*(=>)?\s*/.exec(text) ??
    /^\s*(?:async\s+)?([\w$]+)\s*(=>)\s*/.exec(text);
  if (!head) return "is not an inline function, so its returns cannot be read";
  const params = (head[1] ?? "").split(",").map((param) => param.split(/[:=]/)[0]?.trim() ?? "");
  const next = params[2];
  if (!next) return "takes no next, so it cannot pass the call on";
  const escaped = next.replace(/\$/g, "\\$");
  const bodyAt = start + head[0].length;
  const isNextCall = (exprStart, exprEnd) => {
    const expr = code.slice(exprStart, exprEnd);
    const call = new RegExp(`^\\s*(?:await\\s+)?${escaped}\\s*\\(`).exec(expr);
    if (!call) return false;
    const close = closing(code, exprStart + call[0].length - 1);
    return close !== -1 && code.slice(close + 1, exprEnd).trim() === "";
  };

  if (code[bodyAt] !== "{") {
    return isNextCall(bodyAt, end) ? undefined : "returns something other than next(...)'s result";
  }

  const bodyEnd = closing(code, bodyAt);
  const body = code.slice(bodyAt, bodyEnd);
  // Each binding whose initializer is exactly a next(...) call, with the body offset of its name.
  const fromNext = new Map();
  const declaration = /\b(?:const|let|var)\s+([\w$]+)\s*=\s*/g;
  for (const match of body.matchAll(declaration)) {
    const exprStart = bodyAt + (match.index ?? 0) + match[0].length;
    let exprEnd = exprStart;
    while (exprEnd < bodyEnd && code[exprEnd] !== ";" && code[exprEnd] !== "\n") {
      if (code[exprEnd] in OPEN) exprEnd = closing(code, exprEnd);
      exprEnd++;
    }
    const name = match[1] ?? "";
    if (isNextCall(exprStart, exprEnd)) fromNext.set(name, (match.index ?? 0) + match[0].indexOf(name, match[0].search(/\s/)));
  }

  let returns = 0;
  const returned = new Set();
  for (const match of body.matchAll(/(?<![\w$.])return(?![\w$])/g)) {
    returns++;
    const exprStart = bodyAt + (match.index ?? 0) + match[0].length;
    let exprEnd = exprStart;
    while (exprEnd < bodyEnd && code[exprEnd] !== ";" && code[exprEnd] !== "}") {
      if (code[exprEnd] in OPEN) exprEnd = closing(code, exprEnd);
      exprEnd++;
    }
    const expr = code.slice(exprStart, exprEnd).trim();
    if (fromNext.has(expr)) {
      returned.add(code.indexOf(expr, exprStart) - bodyAt);
    } else if (!isNextCall(exprStart, exprEnd)) {
      return `returns ${expr === "" ? "nothing" : `\`${expr.replace(/\s+/g, " ")}\``} rather than next(...)'s result`;
    }
  }
  if (returns === 0) return "returns nothing rather than next(...)'s result";

  // next's result goes back exactly as received: its binding appears only where it is declared
  // and where it is returned, so nothing assigns to it or its properties, deletes from it, spreads
  // it, or hands it to a function that could.
  for (const [name, declaredAt] of fromNext) {
    const use = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g");
    for (const match of body.matchAll(use)) {
      const at = match.index ?? 0;
      if (at !== declaredAt && !returned.has(at)) {
        return `uses next(...)'s result \`${name}\` other than by returning it, at \`${body
          .slice(at, body.indexOf("\n", at) === -1 ? undefined : body.indexOf("\n", at))
          .trim()}\``;
      }
    }
  }
  return undefined;
}

/**
 * The validate-report half of the floor.
 *
 * @param reported validate's notes, by module and kind
 * @param ownTools the tool names the sources register with $.tool.register
 */
export function reportBreaches(reported, ownTools) {
  const problems = [];
  for (const [module, kinds] of Object.entries(reported)) {
    for (const hook of kinds.hooks ?? []) {
      const event = eventOf(hook);
      const own = OWN_TOOL_CALL.exec(hook)?.[1]?.split("|");
      if (eventMatches(event, "tool.check")) {
        problems.push(
          `safety floor: ${module} registers the tool.check hook ${hook}; the mod approves or denies no tool call`,
        );
      } else if (own) {
        for (const tool of own) {
          if (!ownTools.has(tool.slice(OWN_PREFIX.length))) {
            problems.push(
              `safety floor: ${module} registers the tool.call hook ${hook}, but no $.tool.register names ${tool.slice(OWN_PREFIX.length)}; the mod answers only tools it registers`,
            );
          }
        }
      } else if (eventMatches(event, "tool.call") && !OBSERVED_TOOL_CALLS.has(hook)) {
        problems.push(
          `safety floor: ${module} registers the tool.call hook ${hook}, which can answer a tool call; the mod only observes ${[...OBSERVED_TOOL_CALLS].join(", ")} and answers its own ${OWN_PREFIX} tools`,
        );
      }
    }
    for (const call of kinds.calls ?? []) {
      if (MODEL_CALL.test(call)) {
        problems.push(`safety floor: ${module} makes the model call ${call}; the mod calls no model`);
      } else if (NETWORK_CALL.test(call)) {
        problems.push(
          `safety floor: ${module} makes the network call ${call}; the mod makes no network request`,
        );
      } else if (call === "$.process.spawn") {
        problems.push(
          `safety floor: ${module} makes the call $.process.spawn; the mod runs processes only through $.process.run, which the source pass checks`,
        );
      }
    }
  }
  return problems;
}

/**
 * The tool names the hooks modules register with `$.tool.register({ name: "<name>" })`.
 *
 * @param files `{ path, source, code, isHooksModule }` per source file, `code` blanked
 */
export function registeredTools(files) {
  const names = new Set();
  for (const { source, code, isHooksModule } of files) {
    if (!isHooksModule) continue;
    for (const match of code.matchAll(TOOL_REGISTER)) {
      const open = (match.index ?? 0) + match[0].length - 1;
      const object = source.slice(open, closing(code, open) + 1);
      const name = /\bname\s*:\s*(["'`])([\w-]+)\1/.exec(object)?.[2];
      if (name) names.add(name);
    }
  }
  return names;
}

// Why the argv at code[start] is not one the floor allows, or undefined when it is: a literal
// array that is exactly ["node", "--version"], or "node" followed by a
// `${$.plugin.root}/bin/<name>.mjs` template naming a script the plugin ships, then any arguments
// (they reach the script, not node). A plain string path is refused: a relative one resolves
// against the session's directory and an absolute one can name any file, so neither proves the
// script is the plugin's own.
function processRunBreach(code, source, start, scripts) {
  if (code[start] !== "[") return "takes an argv that is not a literal array";
  const elements = items(code, start + 1, closing(code, start), source);
  const [first, second] = elements;
  if (!first || literal(source, first) !== "node") {
    return `runs ${first === undefined ? "nothing" : `\`${source.slice(...trimmed(source, first))}\``} rather than node`;
  }
  if (!second) return "runs node with no script";
  const script = source.slice(...trimmed(source, second));
  const flag = literal(source, second);
  if (flag === "--version" && elements.length === 2) return undefined;
  if (flag?.startsWith("-")) return `passes node the flag ${flag}`;
  const own = PLUGIN_SCRIPT.exec(script)?.[1];
  if (own === undefined) return `runs node on ${script}, which is not a \${$.plugin.root}/bin/<name>.mjs path`;
  if (!scripts.has(own)) return `runs node on bin/${own}, which the plugin does not ship`;
  return undefined;
}

/**
 * The source half of the floor.
 *
 * @param files `{ path, source, code, isHooksModule }` per source file, `path` as shown
 * @param ownTools the tool names the sources register
 */
export function sourceBreaches(files, ownTools) {
  const scripts = new Set(
    files.map(({ path }) => BIN_SCRIPT.exec(path)?.[1]).filter((name) => name !== undefined),
  );
  const problems = [];
  for (const { path, source, code, isHooksModule } of files) {
    const at = (offset) => `${path}:${lineAt(source, offset)}`;
    problems.push(...networkBreaches(path, source));
    // A module name is a string, which `code` blanks, so the search runs on the source and keeps
    // only the matches that start in code.
    for (const match of source.matchAll(ESCAPE_MODULE)) {
      if (code[match.index ?? 0] === " ") continue;
      problems.push(
        `safety floor: ${at(match.index ?? 0)}: imports ${match[2]}, which reaches the network or starts processes; the mod does neither on its own`,
      );
    }
    if (!isHooksModule) continue;

    // The event name is a string, which `code` blanks, so the search runs on the source and keeps
    // only the matches whose `on` is code.
    for (const match of source.matchAll(ON_TOOL_CALL)) {
      if (code[match.index ?? 0] === " ") continue;
      const open = (match.index ?? 0) + match[0].indexOf("(");
      const close = closing(code, open);
      const args = items(code, open + 1, close, source);
      const handler = args.at(-1);
      if (args.length < 2 || !handler) continue;
      const tools = args.length >= 3 && args[1] ? matcherTools(source.slice(...args[1])) : [];
      const hook = tools.length > 0 ? `tool.call{tool=${tools.join("|")}}` : "tool.call";
      const isOwn =
        tools.length > 0 &&
        tools.every((tool) => tool.startsWith(OWN_PREFIX) && ownTools.has(tool.slice(OWN_PREFIX.length)));
      if (isOwn) continue;
      const handlers = [["handler", trimmed(code, handler)]];
      const caught = /^\s*\.\s*catch\s*\(/.exec(code.slice(close + 1));
      if (caught) {
        const catchOpen = close + 1 + caught[0].length - 1;
        const catchArg = items(code, catchOpen + 1, closing(code, catchOpen), source)[0];
        if (catchArg) handlers.push([".catch handler", trimmed(code, catchArg)]);
      }
      for (const [kind, [start, end]] of handlers) {
        const reason = answers(code, start, end);
        if (reason) {
          problems.push(
            `safety floor: ${at(start)}: the ${hook} ${kind} ${reason}; a tool.call hook the mod does not own must pass the call on`,
          );
        }
      }
    }

    for (const match of code.matchAll(PROCESS_RUN)) {
      const open = (match.index ?? 0) + match[0].length - 1;
      const argv = items(code, open + 1, closing(code, open), source)[0];
      if (!argv) continue;
      const [start] = trimmed(code, argv);
      const reason = processRunBreach(code, source, start, scripts);
      if (reason) {
        problems.push(
          `safety floor: ${at(start)}: $.process.run ${reason}; the mod runs only node --version or node on one of its own bin/*.mjs scripts`,
        );
      }
    }
  }
  return problems;
}
