// The sample documents the gallery draws, one per spike case (phase-0-spike.md).

export const TASKS = [
  "Task list:",
  "",
  "- [ ] open task",
  "- [x] done task",
  "  - [ ] nested open task",
  "",
  "1. [ ] ordered open task",
  "",
  "Controls: **bold control** and `code control`.",
  "",
  "- plain item control",
  "* star item control",
].join("\n");

export const STRIKE = [
  "Strike: before ~~two tildes~~ after.",
  "",
  "Single: before ~one tilde~ after.",
  "",
  "Inline <del>del tag</del> and <s>s tag</s>.",
].join("\n");

/** One element's text: `lines` paragraphs of exactly 98 characters plus a blank line. */
export const bigText = (element: number, lines: number): string => {
  const rows: string[] = [];
  for (let line = 1; line <= lines; line += 1) {
    const head = `E${String(element).padStart(2, "0")} L${String(line).padStart(3, "0")} `;
    rows.push(head.padEnd(98, "x"));
  }
  return rows.join("\n\n") + "\n\n";
};

export const COMMENTS: readonly { label: string; text: string }[] = [
  { label: "C1 inline HTML comment", text: "C1 before <!-- html comment C1 --> after." },
  {
    label: "C2 block HTML comment",
    text: "<!-- block html comment C2 -->\n\nC2 paragraph after the block comment.",
  },
  {
    label: "C3 CriticMarkup comment",
    text: "C3 before {>>critic comment C3<<} after. {==highlight C3==}{>>note C3<<} end.",
  },
  { label: "C4 inline %% comment", text: "C4 before %% obsidian comment C4 %% after." },
  {
    label: "C5 block %% comment",
    text: "%%\nblock obsidian comment C5\n%%\n\nC5 paragraph after the block comment.",
  },
  {
    label: "C6 HTML comment inside a list item",
    text: "- C6 item one <!-- html comment C6 -->\n- C6 item two",
  },
];

export const LINKS: readonly { label: string; href: string }[] = [
  { label: "L1 https", href: "https://example.com/l1" },
  { label: "L2 http", href: "http://example.com/l2" },
  { label: "L3 file", href: "file:///tmp/l3.md" },
  { label: "L4 mailto", href: "mailto:l4@example.com" },
  { label: "L5 vscode", href: "vscode://file/tmp/l5.md" },
  { label: "L6 relative", href: "./l6.md" },
  { label: "L7 fragment", href: "#l7-heading" },
  { label: "L8 javascript", href: "javascript:void(0)" },
  { label: "L9 blank", href: "" },
];

export const MARKDOWN_LINKS = [
  "M1 [https](https://example.com/m1) M2 [file](file:///tmp/m2.md)",
  "M3 [mailto](mailto:m3@example.com) M4 [relative](./m4.md)",
  "M5 [fragment](#m5-heading) M6 [vscode](vscode://file/tmp/m6.md)",
].join("\n\n");

export const SELECTABLE =
  "SELECTME alpha bravo charlie delta echo foxtrot. Select these words with the mouse, then run /gallery sel.";
