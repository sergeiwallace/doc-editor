#!/usr/bin/env node
// Declared-list gate for the mod's hooks and calls (design D-11, task T-0.2).
// Usage: node scripts/check-plugin-declared.mjs <plugin-dir>
// Runs `claude plugin validate --strict --json <plugin-dir>` and compares every
// "<module> <kind>: <values>" note it reports (hooks, calls, env reads, env writes,
// surface modules, gating hooks) with the list <plugin-dir>/README.md declares, both ways:
// a reported value the README does not declare fails, and so does a declared value validate
// does not report. It prints one line per difference.
// Adapted from the sibling beads-ui repository's allow-list gate, which reads a JSON file.
// Then it scans the sources, because validate files every call under the module that reached
// it, even one made in a helper the module handed `on` or `$` to, so the report alone cannot
// show where a call sits. It fails naming the file and line of:
//   - any `$.` outside the hooks modules that hooks/hooks.json names;
//   - outside those modules, any reference to a claude-code type that carries the engine
//     (ENGINE_TYPES: the engine interface, the registrar and the hook signatures), by a named
//     import (aliased or not), a re-export, a namespace member or an inline `import("claude-code")`;
//   - inside a hooks module, a bare `$` that is neither a parameter nor followed by a member
//     access, such as `helper($)`. validate --strict already refuses `$` bound to a name
//     (`const engine = $`) but accepts it passed straight to a call.
// Test files (*.test.*, *.spec.*, test/ and tests/) and .claude-plugin/ are skipped.
//
// A static scan is not a proof. It does not see: a helper whose engine parameter is untyped or
// typed `any` or `unknown`, when the hooks module hands it the engine under another name than
// `$` (a hook may name its first parameter anything); a noun handed out, such as `helper($.ui)`;
// an engine type rebuilt structurally or derived from a hooks module's export
// (`Parameters<typeof register>`). `claude plugin test` and review cover those.
// Exits 1 on any difference or validation error, 2 when validate cannot run.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import { requireClaude } from "./claude-floor.mjs";

const NOTE =
  /^(\.\/\S+) (hooks|calls|env reads|env writes|surface modules|gating hook with \.catch|gating hook without \.catch): (.*)$/;
const VIA = / \(via [\w$.]+\)$/;
const ENGINE_CALL = /(?<![\w$])\$\.[A-Za-z_]/;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
// .claude-plugin holds the manifest and the mod types Claude Code writes there when it loads the
// plugin (.claude-plugin/types/, ignored by the repository), whose declarations name every
// engine type.
const SKIPPED_DIRS = new Set(["node_modules", ".turbo", ".claude-plugin", "test", "tests"]);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
// The exported names of the "claude-code" module (mods/types/claude-code.d.ts) whose type is or
// takes the engine `$`.
const ENGINE_TYPES = new Set([
  "AnyEventHook",
  "CatchHandler",
  "CoreEngineInterface",
  "EngineCreateResult",
  "EngineInterface",
  "EngineInterfaceBuilt",
  "Events",
  "GlobHook",
  "Hook",
  "HookFor",
  "HookOf",
  "HooksModule",
  "MatchedHook",
  "MatchedStreamHook",
  "On",
  "Register",
  "Registration",
  "StreamHook",
]);
const FROM_CLAUDE_CODE =
  /\b(?:import|export)\s+(?:type\s+)?([^;'"`]*?)\s*from\s*(["'])claude-code\2/g;
const INLINE_IMPORT = /\bimport\s*\(\s*(["'])claude-code\1\s*\)\s*\.\s*([\w$]+)/g;
const BARE_ENGINE = /(?<![\w$.])\$(?![\w$])/g;
const PARAMETER_LIST_OPENER = /(?:\bfunction\s*[\w$]*|\basync)\s*$/;

function splitTopLevel(values) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < values.length; i++) {
    const char = values[i];
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0 && values.startsWith(", ", i)) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }
    current += char;
  }
  if (current !== "") parts.push(current);
  return parts;
}

function validate(pluginDir) {
  const result = spawnSync("claude", ["plugin", "validate", "--strict", "--json", pluginDir], {
    encoding: "utf8",
  });
  if (result.error) {
    console.log(
      `check-plugin-declared: cannot run claude plugin validate: ${result.error.message}`,
    );
    process.exit(2);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    console.log("check-plugin-declared: claude plugin validate printed no JSON report");
    console.log(result.stdout + result.stderr);
    process.exit(2);
  }
}

function reportedOf(report, problems) {
  const modules = {};
  for (const content of report.contents ?? []) {
    if (content.type !== "hooks") continue;
    for (const note of content.notes ?? []) {
      const match = NOTE.exec(note);
      if (!match) {
        problems.push(`unrecognised validate note: ${note}`);
        continue;
      }
      const [, module, kind, values] = match;
      modules[module] ??= {};
      modules[module][kind] ??= [];
      if (values === "nothing") continue;
      const listed = splitTopLevel(values);
      modules[module][kind].push(
        ...(kind === "calls" ? listed.map((call) => call.replace(VIA, "")) : listed),
      );
    }
  }
  return modules;
}

// The source with every comment and string literal blanked, newlines kept so line numbers
// hold; a template literal's `${...}` stays, as it is code.
function codeOnly(source) {
  let out = "";
  let mode = "code";
  let braces = 0;
  const interpolations = [];
  const blank = (char) => (char === "\n" ? "\n" : " ");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1] ?? "";
    if (mode === "code") {
      if (char === "/" && (next === "/" || next === "*")) {
        mode = next === "/" ? "line" : "block";
        out += "  ";
        i++;
      } else if (char === '"' || char === "'" || char === "`") {
        mode = char;
        out += " ";
      } else if (char === "}" && interpolations.at(-1) === braces) {
        interpolations.pop();
        mode = "`";
        out += " ";
      } else {
        if (char === "{") braces++;
        if (char === "}") braces--;
        out += char;
      }
    } else if (mode === "line") {
      if (char === "\n") mode = "code";
      out += blank(char);
    } else if (mode === "block") {
      if (char === "*" && next === "/") {
        mode = "code";
        out += "  ";
        i++;
      } else {
        out += blank(char);
      }
    } else if (char === "\\") {
      out += blank(char) + blank(next);
      i++;
    } else if (mode === "`" && char === "$" && next === "{") {
      interpolations.push(braces);
      mode = "code";
      out += "  ";
      i++;
    } else {
      if (char === mode || (char === "\n" && mode !== "`")) mode = "code";
      out += blank(char);
    }
  }
  return out;
}

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...sourceFiles(path));
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !TEST_FILE.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const lineAt = (text, offset) => text.slice(0, offset).split("\n").length;

// Each engine type the file names from "claude-code", as [offset, name].
function engineTypeReferences(source, code) {
  const found = [];
  const inCode = (offset) => code[offset] !== " ";
  for (const match of source.matchAll(FROM_CLAUDE_CODE)) {
    if (!inCode(match.index)) continue;
    const clause = match[1];
    const clauseAt = match.index + match[0].indexOf(clause);
    const braces = /\{([^}]*)\}/.exec(clause);
    if (braces) {
      let cursor = clauseAt + braces.index + 1;
      for (const item of braces[1].split(",")) {
        const name = item
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0];
        if (ENGINE_TYPES.has(name)) found.push([source.indexOf(name, cursor), name]);
        cursor += item.length + 1;
      }
    }
    const namespace = /\*\s*as\s+([\w$]+)/.exec(clause);
    if (namespace) {
      const escaped = namespace[1].replace(/\$/g, "\\$");
      const member = new RegExp(`(?<![\\w$.])${escaped}\\s*\\.\\s*([\\w$]+)`, "g");
      for (const use of code.matchAll(member)) {
        if (ENGINE_TYPES.has(use[1])) found.push([use.index, use[1]]);
      }
    }
  }
  for (const match of source.matchAll(INLINE_IMPORT)) {
    if (inCode(match.index) && ENGINE_TYPES.has(match[2])) found.push([match.index, match[2]]);
  }
  return found;
}

// True when the `$` at `offset` is declared in a parameter list: the innermost bracket around
// it is a `(` that opens a function's parameters, not a call's arguments.
function isParameter(code, offset) {
  let depth = 0;
  let open = -1;
  for (let k = offset - 1; k >= 0 && open === -1; k--) {
    const char = code[k];
    if (char === ")" || char === "]" || char === "}") depth++;
    else if (char === "(" || char === "[" || char === "{") {
      if (depth === 0) {
        if (char !== "(") return false;
        open = k;
      } else depth--;
    }
  }
  if (open === -1) return false;
  if (PARAMETER_LIST_OPENER.test(code.slice(Math.max(0, open - 60), open))) return true;
  depth = 0;
  for (let k = open; k < code.length; k++) {
    if (code[k] === "(") depth++;
    else if (code[k] === ")" && --depth === 0) {
      return /^\s*(=>|\{)/.test(code.slice(k + 1, k + 40));
    }
  }
  return false;
}

// Each bare `$` in a hooks module that is not a parameter or a member access's object.
function engineHandedOut(code) {
  const found = [];
  for (const match of code.matchAll(BARE_ENGINE)) {
    const after = code.slice(match.index + 1).trimStart();
    if (after.startsWith(".") || after.startsWith("?.") || after.startsWith("[")) continue;
    if (!isParameter(code, match.index)) found.push(match.index);
  }
  return found;
}

function engineEscapes(pluginDir) {
  const hooksDir = join(pluginDir, "hooks");
  const declared = JSON.parse(readFileSync(join(hooksDir, "hooks.json"), "utf8")).modules ?? [];
  const modules = new Set(declared.map((module) => resolve(hooksDir, module)));
  const named = declared.join(", ");
  const problems = [];
  for (const file of sourceFiles(pluginDir)) {
    const source = readFileSync(file, "utf8");
    const code = codeOnly(source);
    const at = (offset) => `${relative(pluginDir, file)}:${lineAt(source, offset)}`;
    if (modules.has(file)) {
      for (const offset of engineHandedOut(code)) {
        problems.push(`${at(offset)}: $ handed on rather than called, in the hooks module`);
      }
      continue;
    }
    code.split("\n").forEach((line, index) => {
      if (ENGINE_CALL.test(line)) {
        problems.push(
          `${relative(pluginDir, file)}:${index + 1}: a $ call outside the hooks module (${named})`,
        );
      }
    });
    for (const [offset, name] of engineTypeReferences(source, code)) {
      problems.push(`${at(offset)}: the engine type ${name} outside the hooks module (${named})`);
    }
  }
  return problems.sort();
}

// The declared list: the one ```json block between the README's declared-list markers, an object
// keyed by hooks module ("./register.ts") whose values map each note kind to its values.
const BEGIN = "<!-- validate-declared:begin -->";
const END = "<!-- validate-declared:end -->";

function declaredOf(readmePath) {
  let text;
  try {
    text = readFileSync(readmePath, "utf8");
  } catch (error) {
    return { problem: `cannot read ${shown(readmePath)}: ${error.message}` };
  }
  const from = text.indexOf(BEGIN);
  const to = text.indexOf(END, from);
  if (from === -1 || to === -1) {
    return { problem: `${shown(readmePath)} has no ${BEGIN} ... ${END} block` };
  }
  const block = /```json\n([\s\S]*?)\n```/.exec(text.slice(from, to));
  if (!block?.[1]) return { problem: `${shown(readmePath)}: the declared block holds no json fence` };
  try {
    return { declared: JSON.parse(block[1]) };
  } catch (error) {
    return { problem: `${shown(readmePath)}: the declared block is not JSON: ${error.message}` };
  }
}

function compare(reported, declared, problems) {
  for (const module of new Set([...Object.keys(reported), ...Object.keys(declared)])) {
    const got = reported[module] ?? {};
    const want = declared[module];
    if (!want) {
      problems.push(`${module}: module not declared in the README`);
      continue;
    }
    for (const kind of new Set([...Object.keys(got), ...Object.keys(want)])) {
      const gotSet = new Set(got[kind] ?? []);
      const wantSet = new Set(want[kind] ?? []);
      for (const value of gotSet) {
        if (!wantSet.has(value)) problems.push(`${module} ${kind}: ${value} is not declared`);
      }
      for (const value of wantSet) {
        if (!gotSet.has(value)) {
          problems.push(`${module} ${kind}: ${value} is declared but not reported`);
        }
      }
    }
  }
}

function shown(path) {
  const inside = relative(process.cwd(), path);
  return inside === "" ? "." : inside.startsWith("..") ? path : inside;
}

function fail(problems, pluginDir, readmePath) {
  for (const problem of problems) console.log(`check-plugin-declared: ${problem}`);
  console.log(
    `check-plugin-declared: ${shown(pluginDir)} differs from the list ${shown(readmePath)} declares`,
  );
  process.exit(1);
}

function main() {
  const [pluginArg] = process.argv.slice(2);
  if (!pluginArg) {
    console.log("usage: check-plugin-declared.mjs <plugin-dir>");
    process.exit(2);
  }
  const pluginDir = resolve(pluginArg);
  const readmePath = join(pluginDir, "README.md");
  const { declared, problem } = declaredOf(readmePath);
  if (problem) fail([problem], pluginDir, readmePath);
  requireClaude("check-plugin-declared", `claude plugin validate ${pluginArg}`);
  const report = validate(pluginDir);
  const problems = [];

  if (report.success !== true) {
    for (const part of [report.manifest, ...(report.contents ?? [])]) {
      for (const error of part?.errors ?? []) problems.push(`validate error: ${error.message}`);
      for (const warning of part?.warnings ?? []) {
        problems.push(`validate warning: ${warning.message}`);
      }
    }
    if (problems.length === 0) problems.push("claude plugin validate reported failure");
    fail(problems, pluginDir, readmePath);
  }

  compare(reportedOf(report, problems), declared, problems);
  problems.push(...engineEscapes(pluginDir));

  if (problems.length > 0) fail(problems, pluginDir, readmePath);
  console.log(
    `check-plugin-declared: ${shown(pluginDir)} matches the list ${shown(readmePath)} declares`,
  );
}

main();
