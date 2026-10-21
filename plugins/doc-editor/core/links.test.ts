import { describe, expect, test } from "claude-code/testing";

import { parseBlocks } from "./blocks.ts";
import { fixtureDoc, linkedDoc } from "./fixture-docs.ts";
import { checkTarget, classifyHref, isDrawableHref, normalizePath, parseLocation, resolveLink } from "./links.ts";
import { outline } from "./outline.ts";

const ROOT = "/repo";
const FROM = "/repo/docs/test/fixtures/thousand-line-doc.md";
const LINKED = "/repo/docs/test/fixtures/linked-doc.md";
const linkedOutline = outline(parseBlocks(linkedDoc()).blocks);
const ownOutline = outline(parseBlocks(fixtureDoc(1000)).blocks);

describe("classifyHref", () => {
  test("should call a fragment a heading, a scheme or host a url, and anything else a file", () => {
    expect(["#a", "https://e.com", "javascript:x", "//host/p", "mailto:a@b", "a.md", "../b.md#h"].map(classifyHref)).toEqual([
      "heading",
      "url",
      "url",
      "url",
      "url",
      "file",
      "file",
    ]);
  });
});

describe("resolveLink and checkTarget", () => {
  test("should open a link to another repository file at its heading when the file exists and has that heading", () => {
    const target = resolveLink("linked-doc.md#second-section", FROM, ROOT);

    expect(target).toEqual({ ok: true, path: "/repo/docs/test/fixtures/linked-doc.md", heading: "second-section" });
    expect(checkTarget(target, { exists: true, realPath: LINKED, outline: linkedOutline }, ROOT)).toEqual({
      ok: true,
      path: "/repo/docs/test/fixtures/linked-doc.md",
      headingId: "h1.1",
    });
  });

  test("should open a fragment link in the current file at that heading", () => {
    const target = resolveLink("#chapter-2-topic-2", FROM, ROOT);

    expect(target).toEqual({ ok: true, path: FROM, heading: "chapter-2-topic-2" });
    expect(checkTarget(target, { exists: true, realPath: FROM, outline: ownOutline }, ROOT)).toMatchObject({ ok: true, path: FROM });
  });

  test("should read a path that starts with a slash from the repository root and decode escapes", () => {
    expect(resolveLink("/docs/My%20File.md?x=1", FROM, ROOT)).toEqual({
      ok: true,
      path: "/repo/docs/My File.md",
      heading: null,
    });
  });

  test("should refuse a link that climbs out of the repository and say so", () => {
    expect(resolveLink("../../../../outside.md", FROM, ROOT)).toEqual({
      ok: false,
      reason: "outside the repository: ../../../../outside.md",
    });
  });

  test("should refuse a missing file with its path", () => {
    const target = resolveLink("missing-file.md", FROM, ROOT);

    expect(checkTarget(target, { exists: false, realPath: null }, ROOT)).toEqual({
      ok: false,
      reason: "missing file: /repo/docs/test/fixtures/missing-file.md",
    });
  });

  test("should refuse a heading the target file does not have", () => {
    const target = resolveLink("linked-doc.md#nowhere", FROM, ROOT);

    expect(checkTarget(target, { exists: true, realPath: LINKED, outline: linkedOutline }, ROOT)).toEqual({
      ok: false,
      reason: "no heading #nowhere in /repo/docs/test/fixtures/linked-doc.md",
    });
  });

  test("should refuse a url, a blank href and a malformed escape without navigating", () => {
    expect(resolveLink("javascript:void(0)", FROM, ROOT)).toEqual({
      ok: false,
      reason: "not a file in the repository: javascript:void(0)",
    });
    expect(resolveLink("  ", FROM, ROOT)).toEqual({ ok: false, reason: "the link has no target" });
    expect(resolveLink("bad%E0.md", FROM, ROOT)).toEqual({ ok: false, reason: "the link is not a valid address: bad%E0.md" });
  });

  test("should refuse an in-repository path whose real path, through a symlink, is outside the repository", () => {
    const target = resolveLink("linked-doc.md", FROM, ROOT);

    expect(checkTarget(target, { exists: true, realPath: "/etc/passwd" }, ROOT)).toEqual({
      ok: false,
      reason: "outside the repository: /repo/docs/test/fixtures/linked-doc.md resolves to /etc/passwd",
    });
    expect(checkTarget(target, { exists: true, realPath: "/repository/x.md" }, ROOT)).toMatchObject({ ok: false });
  });

  test("should refuse an existing target whose real path the host did not give", () => {
    const target = resolveLink("linked-doc.md", FROM, ROOT);

    expect(checkTarget(target, { exists: true, realPath: null }, ROOT)).toEqual({
      ok: false,
      reason: "outside the repository: no real path for /repo/docs/test/fixtures/linked-doc.md",
    });
  });

  test("should pass a refusal through checkTarget unchanged", () => {
    const refused = { ok: false, reason: "why" } as const;

    expect(checkTarget(refused, { exists: true, realPath: FROM }, ROOT)).toEqual(refused);
  });
});

describe("isDrawableHref", () => {
  test("should draw only https, http and in-repository file or heading links as hyperlinks", () => {
    const hrefs = ["https://e.com", "http://e.com", "a.md", "#h", "javascript:alert(1)", "file:///etc/passwd", "vscode://x", "../../../../x.md", ""];

    expect(hrefs.map((href) => isDrawableHref(href, FROM, ROOT))).toEqual([true, true, true, true, false, false, false, false, false]);
  });
});

describe("normalizePath", () => {
  test("should collapse dot segments and stop at the root of an absolute path", () => {
    expect(normalizePath("/a/./b//c/../d")).toBe("/a/b/d");
    expect(normalizePath("/../x")).toBe("/x");
    expect(normalizePath("a/../../b")).toBe("../b");
    expect(normalizePath("")).toBe(".");
  });
});

describe("parseLocation", () => {
  test("should split a :N line and a #heading from the path", () => {
    expect(parseLocation("docs/a.md:42")).toEqual({ path: "docs/a.md", line: 42, heading: null });
    expect(parseLocation("docs/a.md#The Windowed Renderer")).toEqual({
      path: "docs/a.md",
      line: null,
      heading: "the-windowed-renderer",
    });
  });

  test("should keep the whole text as the path when it names no line or heading", () => {
    expect(parseLocation("docs/a.md")).toEqual({ path: "docs/a.md", line: null, heading: null });
    expect(parseLocation("docs/a.md#")).toEqual({ path: "docs/a.md", line: null, heading: null });
  });
});
