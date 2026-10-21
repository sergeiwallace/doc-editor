// Deterministic fixture documents for the core tests and the Phase 1 live check. A 20,000-line
// document committed as a file would pass the repository's 500 KB file limit, so both sizes are
// generated here from a fixed pattern; `docs/test/fixtures/thousand-line-doc.md` is the committed
// copy of `fixtureDoc(1000)`, checked byte for byte by test/fixture-doc.spec.ts.
//
// Every chapter holds each block kind: headings at all six levels, paragraphs with inline syntax,
// nested lists, task lists, a fence, a wide table, a callout, a quote, links to a second file, to
// its heading and to this file's headings, an image, HTML and an HTML comment. Chapter 1 also holds
// a quote over 9,000 characters with paragraph breaks and a fence over 9,000 characters.

/** The second fixture file the documents link to, and the heading they link to in it. */
export const LINKED_FILE = "linked-doc.md";
export const LINKED_HEADING = "second-section";

const WORDS = [
  "block",
  "window",
  "outline",
  "heading",
  "render",
  "section",
  "anchor",
  "budget",
  "parser",
  "marker",
];

const sentence = (seed: number, words: number): string => {
  const out: string[] = [];
  for (let k = 0; k < words; k++) out.push(WORDS[(seed * 7 + k * 3) % WORDS.length] ?? "word");
  const text = out.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
};

/** The title of chapter `n`, whose GitHub anchor is `chapter-<n>-topic-<n>`. */
export const chapterTitle = (n: number): string => `Chapter ${n}: topic ${n}`;

const LONG_QUOTE_PARAGRAPHS = 12;
const LONG_QUOTE_WORDS = 130;
const LONG_FENCE_LINES = 260;

function longBlocks(): string[] {
  const lines = ["# Long blocks", ""];
  for (let p = 0; p < LONG_QUOTE_PARAGRAPHS; p++) {
    if (p > 0) lines.push(">");
    lines.push(`> Long quote paragraph ${p + 1}. ${sentence(p, LONG_QUOTE_WORDS)}`);
  }
  lines.push("", "```text");
  for (let k = 0; k < LONG_FENCE_LINES; k++) {
    lines.push(`long fence line ${String(k + 1).padStart(3, "0")} ${"x".repeat(24)}`);
  }
  lines.push("```", "");
  return lines;
}

function chapter(n: number, chapters: number): string[] {
  const next = (n % chapters) + 1;
  return [
    `# ${chapterTitle(n)}`,
    "",
    `${sentence(n, 14)} It has **bold**, *emphasis*, \`code\`, ~~struck~~ and a <kbd>key</kbd>.`,
    `See [the linked doc](${LINKED_FILE}), [its second section](${LINKED_FILE}#${LINKED_HEADING}) and [chapter ${next}](#chapter-${next}-topic-${next}).`,
    "",
    `## Lists ${n}`,
    "",
    `- First item ${n}`,
    `  - Nested item ${n}`,
    `    - Deeper item ${n}`,
    `- Second item ${n}`,
    "",
    `- [ ] Open task ${n}`,
    `- [x] Done task ${n}`,
    "",
    `1. Ordered one ${n}`,
    `2. Ordered two ${n}`,
    "",
    `### Code ${n}`,
    "",
    "```ts",
    `export const chapter${n} = ${n};`,
    `console.log(chapter${n} * 2);`,
    "```",
    "",
    `#### Quotes ${n}`,
    "",
    `> ${sentence(n + 1, 12)}`,
    `> ${sentence(n + 2, 9)}`,
    "",
    "> [!NOTE]",
    `> Callout body ${n}. ${sentence(n + 3, 10)}`,
    "",
    `##### Table ${n}`,
    "",
    "| Element | Cap | Source | Owner | Status | Notes | Updated | Extra column |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    `| Markdown ${n} | 9,000 | types file | core | ok | ${sentence(n, 6)} | 2026-10-21 | wide |`,
    `| Code ${n} | 9,000 | types file | core | ok | ${sentence(n + 1, 6)} | 2026-10-21 | wide |`,
    "",
    `###### Media ${n}`,
    "",
    `![Figure ${n}](images/figure-${n}.png)`,
    "",
    `<details><summary>Details ${n}</summary>Hidden text ${n}<br>second line.</details>`,
    "",
    `<!-- comment ${n} -->`,
    "",
    "---",
    "",
  ];
}

const BAD_LINKS = [
  "Bad links: [outside](../../../../outside.md), [missing](missing-file.md) and [script](javascript:void(0)).",
  "",
];

/**
 * A document of exactly `lines` lines, each ending in a newline. Below 120 lines it is chapters
 * only, without the long blocks.
 */
export function fixtureDoc(lines: number): string {
  const out: string[] = ["---", "title: Fixture document", "---", "", "Preamble paragraph before any heading.", ""];
  out.push(...BAD_LINKS);
  if (lines >= 400) out.push(...longBlocks());
  const size = chapter(1, 1).length;
  const chapters = Math.max(Math.floor((lines - out.length - 2) / size), 1);
  for (let n = 1; n <= chapters && out.length + size <= lines - 2; n++) out.push(...chapter(n, chapters));
  out.push("# Closing");
  let k = 0;
  while (out.length < lines) out.push(`Closing line ${(k += 1)}.`);
  return `${out.slice(0, lines).join("\n")}\n`;
}

/** The second fixture file. */
export function linkedDoc(): string {
  return [
    "# Linked document",
    "",
    "The fixture documents link here.",
    "",
    "## Second section",
    "",
    "Back to [the fixture document](thousand-line-doc.md#chapter-1-topic-1).",
    "",
  ].join("\n");
}
