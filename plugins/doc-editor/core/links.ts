// The link index and link resolution. Every href is classified before it reaches a terminal
// `Link`, because the terminal writes any non-blank href into a hyperlink, `javascript:` included
// (Phase 0 spike, "Link: non-https hrefs"). The core never touches the file system: whether a
// resolved target exists is a fact the caller supplies.

import type { LinkKind, OutlineEntry } from "./types.ts";
import { headingSlugs, slug } from "./outline.ts";

const SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

/** `heading` for a bare fragment, `url` for anything with a scheme or a `//` host, else `file`. */
export function classifyHref(href: string): LinkKind {
  const trimmed = href.trim();
  if (trimmed.startsWith("#")) return "heading";
  if (SCHEME.test(trimmed) || trimmed.startsWith("//")) return "url";
  return "file";
}

/** Normalizes a POSIX path: collapses `.`, `..` and repeated slashes. Keeps a leading slash. */
export function normalizePath(path: string): string {
  const absolute = path.startsWith("/");
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length > 0 && parts.at(-1) !== "..") parts.pop();
      else if (!absolute) parts.push("..");
    } else {
      parts.push(part);
    }
  }
  const joined = parts.join("/");
  return absolute ? `/${joined}` : joined === "" ? "." : joined;
}

const dirOf = (path: string): string => {
  const cut = path.lastIndexOf("/");
  return cut <= 0 ? (path.startsWith("/") ? "/" : ".") : path.slice(0, cut);
};

const absoluteIn = (repoRoot: string, path: string): string =>
  path.startsWith("/") ? normalizePath(path) : normalizePath(`${repoRoot}/${path}`);

const inside = (repoRoot: string, path: string): boolean => {
  const root = normalizePath(repoRoot);
  return path === root || path.startsWith(root === "/" ? "/" : `${root}/`);
};

const decode = (text: string): string | null => {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
};

export type LinkTarget =
  | { ok: true; path: string; heading: string | null }
  | { ok: false; reason: string };

/**
 * Resolves an href from the current file to a path inside the repository and a heading slug.
 * `fromPath` and the result are absolute; a relative `fromPath` is taken from `repoRoot`. A path
 * starting with `/` is read from the repository root, as GitHub reads it.
 */
export function resolveLink(href: string, fromPath: string, repoRoot: string): LinkTarget {
  const trimmed = href.trim();
  if (trimmed === "") return { ok: false, reason: "the link has no target" };
  const kind = classifyHref(trimmed);
  const from = absoluteIn(repoRoot, fromPath);
  if (kind === "url") return { ok: false, reason: `not a file in the repository: ${trimmed}` };
  const hash = trimmed.indexOf("#");
  const rawPath = (hash < 0 ? trimmed : trimmed.slice(0, hash)).replace(/\?.*$/, "");
  const rawHeading = hash < 0 ? null : trimmed.slice(hash + 1);
  const pathText = decode(rawPath);
  const headingText = rawHeading === null ? null : decode(rawHeading);
  if (pathText === null || (rawHeading !== null && headingText === null)) {
    return { ok: false, reason: `the link is not a valid address: ${trimmed}` };
  }
  const path =
    kind === "heading"
      ? from
      : pathText.startsWith("/")
        ? normalizePath(`${normalizePath(repoRoot)}/${pathText}`)
        : normalizePath(`${dirOf(from)}/${pathText}`);
  if (!inside(repoRoot, path)) {
    return { ok: false, reason: `outside the repository: ${trimmed}` };
  }
  const heading = headingText === null || headingText === "" ? null : slug(headingText);
  return { ok: true, path, heading };
}

export interface TargetFacts {
  /** Whether the target path exists as a readable file, as the host found it. */
  exists: boolean;
  /** The target file's outline, when a heading is asked for and the file was read. */
  outline?: OutlineEntry[];
}

export type CheckedTarget =
  | { ok: true; path: string; headingId: string | null }
  | { ok: false; reason: string };

/** Checks a resolved target against what the host found: the file and, when named, the heading. */
export function checkTarget(target: LinkTarget, facts: TargetFacts): CheckedTarget {
  if (!target.ok) return target;
  if (!facts.exists) return { ok: false, reason: `missing file: ${target.path}` };
  if (target.heading === null) return { ok: true, path: target.path, headingId: null };
  const entries = facts.outline ?? [];
  const slugs = headingSlugs(entries);
  const at = slugs.indexOf(target.heading);
  const entry = at < 0 ? undefined : entries[at];
  if (entry === undefined) {
    return { ok: false, reason: `no heading #${target.heading} in ${target.path}` };
  }
  return { ok: true, path: target.path, headingId: entry.id };
}

/**
 * Whether an href may be drawn as a terminal hyperlink: `https:` and `http:` URLs, and file or
 * heading links that resolve inside the repository. Everything else is drawn as text.
 */
export function isDrawableHref(href: string, fromPath: string, repoRoot: string): boolean {
  const trimmed = href.trim();
  if (trimmed === "") return false;
  const kind = classifyHref(trimmed);
  if (kind === "url") return /^https?:\/\/[^\s]/i.test(trimmed);
  return resolveLink(trimmed, fromPath, repoRoot).ok;
}

export interface Location {
  path: string;
  line: number | null;
  heading: string | null;
}

/** Splits `path:N` or `path#heading` into the path and the place to scroll to. */
export function parseLocation(spec: string): Location {
  const trimmed = spec.trim();
  const line = /^(.*\S):(\d+)$/.exec(trimmed);
  if (line?.[1] !== undefined && line[2] !== undefined) {
    return { path: line[1], line: Number(line[2]), heading: null };
  }
  const hash = trimmed.indexOf("#");
  if (hash > 0) {
    const heading = decode(trimmed.slice(hash + 1)) ?? trimmed.slice(hash + 1);
    return { path: trimmed.slice(0, hash), line: null, heading: heading === "" ? null : slug(heading) };
  }
  return { path: trimmed, line: null, heading: null };
}
