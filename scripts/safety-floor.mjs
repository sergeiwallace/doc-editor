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
//     $.tool.register({ name: "<name>" }) for it; a reference to fetch, WebSocket, XMLHttpRequest
//     or EventSource; a $.process.run whose literal argv starts with a binary the README's
//     "safety floor" entry does not allow, or whose argv is not a literal array and whose call
//     site the README does not declare.
// A static pass reads the code as text, so it is strict rather than complete: a handler it
// cannot read (one passed by name, a return it cannot parse) fails rather than passes.

const OBSERVED_TOOL_CALLS = new Set(["tool.call{tool=Write|Edit}"]);
const OWN_PREFIX = "mcp__doc-editor__";
const OWN_TOOL_CALL = /^tool\.call\{tool=(mcp__doc-editor__[\w-]+(?:\|mcp__doc-editor__[\w-]+)*)\}$/;
const MODEL_CALL = /^\$\.(model\.\w+|agent\.spawn)$/;
const NETWORK_CALL = /^\$\.(http|mcp)\.\w+$/;
const NETWORK_API = /(?<![\w$.])(fetch|WebSocket|XMLHttpRequest|EventSource)(?![\w$])/g;
const GLOBAL_NETWORK_API =
  /(?<![\w$.])(?:globalThis|window|self)\s*\.\s*(fetch|WebSocket|XMLHttpRequest|EventSource)(?![\w$])/g;
const ON_TOOL_CALL = /(?<![\w$.])on\s*\(\s*(["'`])tool\.call\1/g;
const PROCESS_RUN = /\$\s*\.\s*process\s*\.\s*run\s*\(/g;
const TOOL_REGISTER = /\$\s*\.\s*tool\s*\.\s*register\s*\(\s*\{/g;
const STRING = /^(["'`])([^"'`]*)\1$/;

const lineAt = (text, offset) => text.slice(0, offset).split("\n").length;
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
function items(code, from, to) {
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
  if (code.slice(start, to).trim() !== "") spans.push([start, to]);
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
  const fromNext = new Set();
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+([\\w$]+)\\s*=\\s*`, "g");
  for (const match of body.matchAll(declaration)) {
    const name = match[1] ?? "";
    const exprStart = bodyAt + (match.index ?? 0) + match[0].length;
    let exprEnd = exprStart;
    while (exprEnd < bodyEnd && code[exprEnd] !== ";" && code[exprEnd] !== "\n") {
      if (code[exprEnd] in OPEN) exprEnd = closing(code, exprEnd);
      exprEnd++;
    }
    const assignments = body.match(new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}\\s*=(?!=)`, "g"));
    if (isNextCall(exprStart, exprEnd) && assignments?.length === 1) fromNext.add(name);
  }

  let returns = 0;
  for (const match of body.matchAll(/(?<![\w$.])return(?![\w$])/g)) {
    returns++;
    const exprStart = bodyAt + (match.index ?? 0) + match[0].length;
    let exprEnd = exprStart;
    while (exprEnd < bodyEnd && code[exprEnd] !== ";" && code[exprEnd] !== "}") {
      if (code[exprEnd] in OPEN) exprEnd = closing(code, exprEnd);
      exprEnd++;
    }
    const expr = code.slice(exprStart, exprEnd).trim();
    if (!fromNext.has(expr) && !isNextCall(exprStart, exprEnd)) {
      return `returns ${expr === "" ? "nothing" : `\`${expr.replace(/\s+/g, " ")}\``} rather than next(...)'s result`;
    }
  }
  return returns === 0 ? "returns nothing rather than next(...)'s result" : undefined;
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

/**
 * The source half of the floor.
 *
 * @param files `{ path, source, code, isHooksModule }` per source file, `path` as shown
 * @param floor the README's "safety floor" entry: `process.run binaries` and
 *   `process.run argv expressions` (each `<path>: <argv expression>`)
 * @param ownTools the tool names the sources register
 */
export function sourceBreaches(files, floor, ownTools) {
  const binaries = new Set(floor["process.run binaries"] ?? []);
  const declaredArgv = new Set(floor["process.run argv expressions"] ?? []);
  const problems = [];
  for (const { path, source, code, isHooksModule } of files) {
    const at = (offset) => `${path}:${lineAt(source, offset)}`;
    for (const pattern of [NETWORK_API, GLOBAL_NETWORK_API]) {
      for (const match of code.matchAll(pattern)) {
        problems.push(
          `safety floor: ${at(match.index ?? 0)}: references ${match[1]}, a network API; the mod makes no network request`,
        );
      }
    }
    if (!isHooksModule) continue;

    // The event name is a string, which `code` blanks, so the search runs on the source and keeps
    // only the matches whose `on` is code.
    for (const match of source.matchAll(ON_TOOL_CALL)) {
      if (code[match.index ?? 0] === " ") continue;
      const open = (match.index ?? 0) + match[0].indexOf("(");
      const close = closing(code, open);
      const args = items(code, open + 1, close);
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
        const catchArg = items(code, catchOpen + 1, closing(code, catchOpen))[0];
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
      const argv = items(code, open + 1, closing(code, open))[0];
      if (!argv) continue;
      const [start, end] = trimmed(code, argv);
      if (code[start] === "[") {
        const first = items(code, start + 1, closing(code, start))[0];
        const binary = first === undefined ? undefined : literal(source, first);
        if (binary === undefined || !binaries.has(binary)) {
          problems.push(
            `safety floor: ${at(start)}: $.process.run runs ${binary === undefined ? "a binary that is not a string literal" : binary}; the README's safety floor allows ${[...binaries].join(", ") || "no binary"}`,
          );
        }
      } else {
        const site = `${path}: ${source.slice(start, end).replace(/\s+/g, " ")}`;
        if (!declaredArgv.has(site)) {
          problems.push(
            `safety floor: ${at(start)}: $.process.run's argv is not a literal array and the README's safety floor does not declare "${site}"`,
          );
        }
      }
    }
  }
  return problems;
}
