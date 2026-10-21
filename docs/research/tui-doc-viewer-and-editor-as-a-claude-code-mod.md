---
title: "A document viewer and editor inside the Claude Code TUI as a mod: doc-app UX, rendering routes and a shared core"
category: research
tags: [research, claude-code, mods, tui, markdown, html, pdf, doc-editor, ux, mcp-apps]
status: complete
source: "claude-fable-5-1-orchestrated-2026-10-15"
template_version: "research-1.2.0"
delegation_provenance:
  version: 2
  contributors: []
task: DED-research-doc-editor-uhke
related_docs:
  - docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md
  - docs/research/evidence/ded-doc-editor/render-and-edit-in-a-mod.md
  - docs/research/evidence/ded-doc-editor/shared-core-across-surfaces.md
  - docs/asks/DED-epic-doc-editor-view-edit-b3p.md
---

# A document viewer and editor inside the Claude Code TUI as a mod: doc-app UX, rendering routes and a shared core

## Founding Ask Coverage

`canonical_root_json`: {"blob_oid":"d9877bd7de09b5cc6b5530e2b70c4e50a0772dca","capture_commit":"e268462559c1637483143d5ef93ee27419547dfb","content_sha256":"3c81b3326da40d819f9f52ddc26894debde4173c9a2890f0f599a0479dc98bb5","entry_ids":["A001","A002","A003","A004"],"generation":4,"path":"docs/asks/DED-epic-doc-editor-view-edit-b3p.md","previous_ref_sha256":"3aa248dbad7d3aa29eee5d601a91498894edbcb0a5dbf760b3b1f5c4ce7019a6","repository":"doc-editor","schema_version":1,"task_id":"DED-epic-doc-editor-view-edit-b3p"}

`founding_ask_ref_sha256`: 6a4315d4a33b55e01e0916b001b7dd89333e00746ff92dfea157b7f757de00c0

The raw record is [docs/asks/DED-epic-doc-editor-view-edit-b3p.md](../asks/DED-epic-doc-editor-view-edit-b3p.md). The capture commit named above was rebased onto the repository's main branch before this doc was written, so the commit id of the record in this tree differs from `capture_commit`; the record's bytes hash to `content_sha256` unchanged (checked 2026-10-15). This index is non-authoritative; the raw record governs.

| Authoritative raw entry | Coverage and disposition |
|---|---|
| A001 | ORIGINAL-ASK, 2026-10-14T23:46:37Z. The first half of the message is the beads-ui epic and is out of this doc's scope. The second half founds this epic: "rendering markdown and other docs and doc-like file types and also making them interactive and being able to view them or render markdown / html / pdf etc in the claude mod doc viewer" is answered in §2 and §3; "plugins for showing an entire functional web browser in claude mods tui" and "any existing open source popular claude code mod plugins and repos" are answered in §3.2 and §3.3 and build on the ai-harness browser survey; "pull inspiration and ideas and frontend components and design elements etc from popular doc apps like confluence, notion, google docs, word, and any others" is answered in §1; the two Google AI summaries are treated as seeds only, per the ask; "we'll do it in phases so start with an MVP" and the design-doc contents are the companion design doc's; "open source ... public repo ... fine to have the beads store etc in the repo" governs what this doc may cite and name. |
| A002 | FOLLOW-UP, 2026-10-14T23:46:38Z. The verbatim text of the two Google AI summaries. Every app they name (Coda, Gamma, Craft, GitBook, Notion, ClickUp Docs, Miro, Mural, Microsoft Loop, Google Docs) is surveyed in §1 from primary sources; claims in the summaries are not relied on. |
| A003 | FOLLOW-UP, 2026-10-14T23:46:39Z. Names this repo ("the doc viewer will be doc-editor") and asks, for the sibling beads-ui, whether the mods TUI app, an MCP UI app and a web app "could share frontend components / code / modules". §4 answers that question for doc-editor. The beads-ui repo decisions themselves are out of scope. |
| A004 | FOLLOW-UP, 2026-10-14T23:46:39Z. Asks that the doc-editor repo be created, published as open source, configured as a Copier project with a README and GitHub metadata, and that the research and design agent be launched. The repo work was done by the launching session (PR #1 on this repo); this doc is the launched agent's research stage. |

**Status:** complete (the three evidence legs are folded in; the companion design doc carries the decisions)

**Created:** 2026-10-15

**Task:** DED-research-doc-editor-uhke (epic DED-epic-doc-editor-view-edit-b3p)

**Related docs:**
- The three evidence docs under `docs/research/evidence/ded-doc-editor/`, written by three Opus research leaves and cited throughout.
- ai-harness `docs/research/claude-code-mods-web-browser-in-the-tui.md` (the 2026-10-14 browser and doc-mod survey this doc extends).
- ai-harness `docs/research/claude-code-mods.md` and `docs/designs/aih-xhc5u-claude-code-mods.md` (the mods capability survey and the fleet's mods design).

## Table of Contents

- [Context](#context)
- [Temporal Scope](#temporal-scope)
- [Executive Summary](#executive-summary)
- [1. What the doc apps do, and what survives a character grid](#1-what-the-doc-apps-do-and-what-survives-a-character-grid)
  - [1.1 The mod surface filters every pattern](#11-the-mod-surface-filters-every-pattern)
  - [1.2 Patterns that transfer](#12-patterns-that-transfer)
  - [1.3 Review patterns](#13-review-patterns)
  - [1.4 Patterns that do not transfer](#14-patterns-that-do-not-transfer)
  - [1.5 The ranked MVP patterns](#15-the-ranked-mvp-patterns)
- [2. Rendering routes per format inside a mod](#2-rendering-routes-per-format-inside-a-mod)
  - [2.1 The runtime and its bounds](#21-the-runtime-and-its-bounds)
  - [2.2 The Markdown element and the tree budget](#22-the-markdown-element-and-the-tree-budget)
  - [2.3 Windowing: the /diff pattern](#23-windowing-the-diff-pattern)
  - [2.4 Pictures, colour and tmux](#24-pictures-colour-and-tmux)
  - [2.5 Routes by format](#25-routes-by-format)
- [3. Existing mods for documents and browsers](#3-existing-mods-for-documents-and-browsers)
- [4. Editing inside a mod](#4-editing-inside-a-mod)
- [5. What the mod can share with a web app and an MCP App](#5-what-the-mod-can-share-with-a-web-app-and-an-mcp-app)
  - [5.1 The loader's rules for shared code](#51-the-loaders-rules-for-shared-code)
  - [5.2 How published mods reach shared code today](#52-how-published-mods-reach-shared-code-today)
  - [5.3 Document models and cores](#53-document-models-and-cores)
  - [5.4 MCP Apps and the Desktop Code tab](#54-mcp-apps-and-the-desktop-code-tab)
  - [5.5 Repository layout and hygiene](#55-repository-layout-and-hygiene)
- [Gaps, blindspots and emergent findings](#gaps-blindspots-and-emergent-findings)
- [Comparison](#comparison)
- [Recommendation](#recommendation)
- [Open Questions](#open-questions)
- [Sources](#sources)
- [Ambiguous Items from Auto-Remediation (Post-Run Review)](#ambiguous-items-from-auto-remediation-post-run-review)
- [Appendix: Research Prompt](#appendix-research-prompt)
- [Appendix: Provenance Ledger](#appendix-provenance-ledger)
- [Run History](#run-history)

<!-- doc:region name="context" kind="immutable" -->

## Context

Sergei asked on 2026-10-14 for a Claude Code mod that renders Markdown, HTML, PDF and other doc-like file types inside the Claude Code terminal interface and makes them interactive, for viewing and for editing. He wants the design to draw on the UI, UX, components and design elements of the doc apps people use most and the ones judged most innovative (Confluence, Notion, Google Docs and Word first; then Coda, Gamma, Craft, GitBook, ClickUp Docs, Miro, Mural and Microsoft Loop), to account for the open-source Claude Code mods that already render documents or show a web browser, and to say what a terminal viewer can share with a later web app or MCP UI surface. The work is public and open source in the `doc-editor` repository. This doc is the research stage; a design doc with PRD specs, acceptance criteria, mockups, decisions and a phased plan starting with an MVP follows it, and then stops for Sergei's review.

**Primary period:** 2026 (Claude Code mods went generally available on 2026-10-01; the doc mods found are dated October 2026)
**Source weighting:** 2026 primary for everything about mods and their ecosystem. Doc-app UI and UX patterns are cited from each vendor's current documentation, whatever its date. Terminal renderers and editor cores that predate 2024 are cited as foundational, with their last-activity dates.

<!-- /doc:region name="context" -->

<!-- doc:region name="body" kind="replaceable" -->

## Temporal Scope

Primary focus: Anthropic's mods documentation, the public types file and the changelog as of 2026-10-15 (newest entry 2.1.300 of 2026-10-14; this host runs 2.1.296), the doc mods created in October 2026, and the vendor help pages of the doc apps as read on 2026-10-15. Every adoption figure is a dated reading. Terminal renderers and editor cores that predate 2024 are cited for how they work, with their last-activity dates. The three evidence legs read their sources between 2026-10-14 23:55Z and 2026-10-15 00:45Z; none ran a mod, a browser or a test, because another session held this host's test slot and the brief forbade installs.

Each claim carries an evidence word. `measured` means an evidence leg read it directly from a source, a source file, an API or a command on this host. `documented` means a vendor or project page states it. `inferred` means reasoning from those, with the reasoning given. The research template's tier tags sit beside them: `[VERIFIABLE]` for a claim backed by a fetched source and carrying a footnote, `[HEURISTIC]` for accepted practice without a citation, `[INFERENCE]` for a conclusion with its reasoning in the text, and `[NO SOURCE]` where nothing was found. "Route A" and "Route B" are the fleet's two tests for an external idea or tool: Route A passes on adoption and maintenance signals (stars, releases, recent pushes), Route B on independent corroboration of the pattern; anything that passes neither is exploratory. Footnotes [^1], [^2] and [^3] are the three evidence docs in this repository; each carries its own footnotes to the primary sources and a provenance ledger whose quotes were checked against the fetched text.

## Executive Summary

1. A document viewer inside the Claude Code TUI is buildable today, in tmux and over a remote link, as long as it draws text. The engine's own `Markdown` element renders blocks of at most 10,000 characters, a tree draws at most 100,000, and Anthropic's built-in `/diff` mod shows how a pane windows a document of any length up to the 4 MiB read cap by answering `ui.scroll` itself (documented and measured [VERIFIABLE][^2]).
2. The editor half of the ask has no native surface. `Input` is a one-line field and no element offers rich text, so editing is Claude-mediated first (point at a block, say the change, review the diff), with single-line fields and checkbox toggles in the pane, and a `Client` caret editor as a later phase that davekiss/md proves possible (documented and measured [VERIFIABLE][^1][^2]).
3. Most of what makes Notion, Confluence, Google Docs and Word good to read survives a 100 by 40 cell pane: an outline that jumps to headings, folding, drill-in to one section, find, callouts, a breadcrumb header, margin markers for changed blocks. Canvas, slide, formula and presence patterns do not. The highest-value exemplars are developer tools (GitBook, GitHub, VS Code, lazygit) and three Claude Code mods; the SaaS apps the ask named supplied the reading patterns and ranked lower on editing (measured [VERIFIABLE][^1]).
4. HTML and PDF render as text in tmux. `Image` fails there, colour clamps to 256 unless `CLAUDE_CODE_TMUX_TRUECOLOR` is set, and pdf.js cannot load in-process because its worker is twice the reported 1 MB module cap. The routes are `pdftotext`, `lynx -dump` or an HTML-to-Markdown converter, with `$.browser.open` handed to terminal-browser where that plugin is installed. On the Desktop Code tab the Browser pane already opens HTML and PDF, so a mod adds nothing there for viewing (documented and measured [VERIFIABLE][^2][^3]).
5. The mod can share logic, data types and design tokens with a web app and an MCP App, but no UI components: a hooks module allows only relative imports plus `claude-code`, has no DOM, no Node, no timers and no WebAssembly, and an installed plugin is a copy of its own directory. The web app and the MCP App share UI from one codebase with a single-file Vite build. A dependency-free TypeScript core that never takes `$` is the shareable layer (documented and measured [VERIFIABLE][^3]).

## 1. What the doc apps do, and what survives a character grid

Most of what makes Notion, Confluence, Google Docs and Word good to read survives a pane of about 100 by 40 cells. The editing surface does not. This section rests on the doc-app evidence leg, which read 11 Anthropic pages, the vendor help pages of 20 apps and 25 terminal projects (measured [VERIFIABLE][^1]).

### 1.1 The mod surface filters every pattern

A mod "never reads the keyboard itself" in a pane. While the pane has focus Tab, the arrows, Enter, the page keys and Esc have fixed meanings. A `Button` hotkey is "one digit or one lowercase letter", and "A mod can't bind Tab or the arrow keys to anything else" (documented [VERIFIABLE][^1]). So the keys every terminal pager uses for capitals and symbols (`G`, `N`, `/`, `?`, `{`, `}`) cannot be pane hotkeys. A `Client` element receives raw keys through `onKey`, but "Escape never arrives: it returns the focus" (documented [VERIFIABLE][^1]). A pager-style key map therefore needs a `Client`; a pane built from `Markdown` and `Button` elements is limited to lowercase letters and digits [INFERENCE].

`Input` is a field whose `onSubmit` "Runs on Enter with the text", so a field holds one line. A multi-line `Input` is an open request on Anthropic's design issue. No element offers a multi-line rich-text editor (documented [VERIFIABLE][^1]). A block editor in the Notion sense would have to be written from scratch inside a `Client`, a large build with no prior art [INFERENCE].

One `Markdown` element takes "At most 10000 characters" and one tree draws "The first 100,000 characters". The claude-mdview mod hits the same wall and splits long files into parts (documented [VERIFIABLE][^1]). `$.ui.scroll` targets "never a row number, always a thing", so an outline entry that jumps to a keyed heading element is a native operation (documented [VERIFIABLE][^1]). Clicks reach a mod only in fullscreen rendering, and `onLinkPress` lets the mod answer a link press (documented [VERIFIABLE][^1]). `Code` draws source "with Claude Code's own syntax colors, or a diff", so a diff of Claude's edits needs no renderer of its own (documented [VERIFIABLE][^1]).

### 1.2 Patterns that transfer

Every major app ships an outline of headings that jumps to the heading: Google Docs' outline, Notion's side table of contents, Confluence's macro, Obsidian's draggable outline and VS Code's go-to-header shortcut (documented [VERIFIABLE][^1]). Confluence shows breadcrumbs and a read time at 265 words per minute; the claude-code-file-preview mod already draws "A breadcrumb and stats header" (documented [VERIFIABLE][^1]). Craft treats a block with nested content as a page to drill into, and Org mode's sparse trees show one subtree with the headline structure above it (documented [VERIFIABLE][^1]). In a 40-row pane, one section at a time with its heading path above it is the cheapest way to read a long design doc [INFERENCE].

Collapsing is universal: Notion toggle headings, Confluence's expand macro, Word's Outline view, Obsidian folds, vim-markdown's `zR` and `zM`, Org mode's `TAB` cycling (documented [VERIFIABLE][^1]). Tab is reserved in a pane, so the cycle needs another key unless a `Client` receives Tab, which is unmeasured [NO SOURCE]. A one-key read-and-edit toggle (Obsidian `Ctrl+E`, Confluence `E`) transfers directly, and the mode belongs in the pane header, since Nielsen Norman Group names mode slips as a failure of status visibility (documented [VERIFIABLE][^1]).

Find in page is universal, with `f` or `/` and `n` and `N` in md-tui and Claude Code's own transcript mode; claude-mdview uses `f` and Enter for the next match (documented [VERIFIABLE][^1]). In a mod the prompt is already a command palette: `/` commands and `prompt.autocomplete` rows can carry open-file, jump-to-heading and find without a second palette [INFERENCE]. Callouts transfer as a bordered `Box` with a coloured label; GitHub alerts and Obsidian callouts share the blockquote syntax (documented [VERIFIABLE][^1]). Tables are the hardest common block at 100 columns; claude-code-file-preview fits columns, wraps cells and shows "one card per row" when too wide (documented [VERIFIABLE][^1]).

### 1.3 Review patterns

Google Docs' suggesting mode and Word's four markup views are the review models. Ink & Switch's Upwelling study (2023) found that "Common user interfaces for reviewing changes suffer from readability and usability problems" and that Docs and Word cannot group edits into anything like a commit (documented [VERIFIABLE][^1]). GitBook's change requests give "the floating diff navigator" to jump between changed blocks, and GitHub renders prose diffs in source and rendered views (documented [VERIFIABLE][^1]). For a terminal pane this argues for Word's Simple Markup, a margin marker per changed block, with the full diff one key away and Claude's edits grouped by turn [INFERENCE].

Agent-mediated editing is already the norm in these apps: GitBook's agent takes a block tagged in a comment, Confluence's Rovo agents work from a comment, and Word's Copilot result offers "keep it, discard it, or continue refining it". The claude-mdview mod does the same in a Claude Code pane: hover a block, press the pencil, type the change, and "Claude gets the file, the lines and how they begin" (documented [VERIFIABLE][^1]). Claude Desktop's diff view batches line comments and sends them to Claude at once, and GitHub states the reason to batch (documented [VERIFIABLE][^1]).

### 1.4 Patterns that do not transfer

Miro's and Mural's infinite canvas, Gamma's fixed 16:9 slides, Coda's formulas and buttons (Coda is "now Superhuman Docs"), Craft's cover images and every presence cursor contribute nothing that fits a cell grid in tmux without pictures (documented and inferred [VERIFIABLE][^1]). Notion's synced blocks, Confluence excerpts and Loop components need a transclusion syntax plain Markdown lacks. Inline comments need a storage decision first, because every collaborative app stores comments outside the text [INFERENCE].

### 1.5 The ranked MVP patterns

The evidence leg's ranking, by value to a developer reading a design doc beside Claude divided by build cost, puts these first: open the rendered file from a path in the transcript or a tool row; an outline that jumps to a heading; point at a block and ask Claude to change it; a diff of Claude's edit with next and previous change; live reload with a stable viewport; collapsible headings with fold-all and unfold-all; find in page; links followed in place with Back; a header row with path, heading path, mode and read time; margin markers on changed blocks; keep, discard or refine after an edit; callouts and tables drawn for a narrow pane; the read-and-edit toggle; checklist toggles; and a key hint row (measured [VERIFIABLE][^1]). The full transfer table of 53 patterns is in the evidence doc.

The highest-ranked exemplars came from developer tools (GitBook, GitHub, VS Code, lazygit) and from three Claude Code mods; the SaaS apps the ask named supplied the reading patterns. The evidence leg added the developer tools deliberately and says the ranking would differ on the named apps alone (measured [VERIFIABLE][^1]).

## 2. Rendering routes per format inside a mod

A mod can view documents today, inside tmux and over a remote link, as long as it draws text. This section rests on the render evidence leg, which read 14 Anthropic pages, the public types file, Anthropic's built-in `/diff` mod source, all 256 comments on Anthropic's mods design issue, the source of 11 doc mods and the metadata of 35 libraries (measured [VERIFIABLE][^2]).

### 2.1 The runtime and its bounds

The hooks module's globals are "these and no others (no DOM, no Node)". `eval` and `new Function` throw, and "there is no `WebAssembly` (deliberately; a module that needs compiled code runs it in a process of its own through `$.process.run`)" (documented [VERIFIABLE][^2]). No `DecompressionStream` is declared, so a ZIP container (DOCX, ODT, EPUB) needs a pure-JavaScript inflate such as fflate [INFERENCE].

A module file over 1 MB is not read. Anthropic's pages state no such limit. Three independent mod authors report it: a practitioner on the design issue, the figures mod ("the build splits the bundle into chunks") and claude-gfm-render ("a hooks module may not import a file over 1 MiB") (measured [VERIFIABLE][^2]). The shared-core leg searched the same pages and found no cap (measured [VERIFIABLE][^3]). So the cap is reported, and a design should respect it until a measurement refutes it. Third-party code reaches the module in three ways. Files that are already relative-import ES modules with no Node imports can be copied into the plugin as they are. Anything else is bundled once on a developer machine into committed chunks under 1 MB, as figures does. Code that needs Node or WebAssembly runs in a sidecar process, as ide-mod and mermaid-inline do. The second route refines the fleet mods design's no-build-step rule, which still holds for the mod's own code (documented and inferred [VERIFIABLE][^2][^3][^6]).

`$.fs.read` rejects a file over 4 MiB. `$.fs.write` "isn't atomic". `$.process.run` runs an argument vector with no shell, 30 seconds by default and 10 minutes at most, and returns stdout "as text, cut at the output limit", a limit with no published number (documented [VERIFIABLE][^2]). A converter that outputs binary therefore writes a file, and an atomic save needs a helper process [INFERENCE].

### 2.2 The `Markdown` element and the tree budget

`Markdown` draws "a block of markdown every surface draws as it draws an assistant reply's text: its own renderer, links, tables, fences". Its `text` is "At most 10000 characters". With `onLinkPress`, a press "is a plain single click where the surface reports clicks (the fullscreen terminal)" (documented [VERIFIABLE][^2]). One tree draws "The first 100,000 characters" per the reference, while the claude-mdview author reports that an over-budget tree "gets the whole tree refused and the engine draws its own". The safe reading is the stricter one (documented and inferred [VERIFIABLE][^2]). Every Markdown mod read budgets below the caps: 9,000 characters per element and 60,000 per page (measured [VERIFIABLE][^2]).

What the element renders is partly unsettled. The changelog says task-list checkboxes and strikethrough render since mid-2026; claude-gfm-render reports task lists drawn raw on 2.1.286. Footnotes, math, Mermaid, GitHub alerts and images are drawn by no source read (measured [VERIFIABLE][^2]). One live gallery-style pane settles the conflict [INFERENCE].

### 2.3 Windowing: the `/diff` pattern

A mod can own the scrolling of its pane. The `ui.scroll` event fires before the window moves, and "`offset` is the hook's to rewrite; nothing moved yet". Anthropic's built-in `/diff` mod "answers the pane's `ui.scroll` itself", moves its hunks under a pinned header and keeps the engine's window still (measured [VERIFIABLE][^2]). A doc viewer can draw only the rows in view and keep its own offset. That keeps a document of any length up to the 4 MiB `$.fs.read` cap inside the tree budget. The budget is in characters while the pane is in rows, and wrapping, wide characters and tables change how many rows a block takes, so each redraw sizes its slice by rows and checks the character count before drawing [INFERENCE]. The render leg's arithmetic: a 1,000-line file at 60 characters per line is 60,000 characters in six elements and fits; at 100 characters per line it fails; a windowed slice of 50 rows by 110 cells is at most 5,500 characters per redraw, independent of length [INFERENCE].

### 2.4 Pictures, colour and tmux

`Image` fails inside tmux and screen in every terminal. Inside tmux Claude Code also "clamps to 256 colors when `$TMUX` is set" unless `CLAUDE_CODE_TMUX_TRUECOLOR` is set; claude-lens reports that half-block thumbnails share "a palette of 1024 color pairs per frame" (documented [VERIFIABLE][^2]). `Svg` draws on Desktop only. In the fleet's tmux sessions, HTML and PDF render as text plus block pictures; real pictures need kitty or Ghostty outside tmux (documented and inferred [VERIFIABLE][^2][^4]).

### 2.5 Routes by format

The render leg's route matrix, condensed:

| Format | In-process route (pure JavaScript) | External binary through `$.process.run` | Fallback without pictures |
|---|---|---|---|
| Markdown | Engine `Markdown`; micromark, markdown-it or marked for block structure | pandoc | Native |
| GFM extras (alerts, footnotes, task lists) | Own rewrite to boxes and glyphs, as claude-gfm-render does | pandoc | Text glyphs |
| Mermaid, math | beautiful-mermaid's ASCII renderer (84 KB); MathJax to SVG (figures) | mermaid-ascii, resvg | Box art; TeX source |
| HTML | node-html-markdown, or parse5 or htmlparser2 plus own conversion; Readability needs a DOM | `lynx -dump`, w3m, Chawan; terminal-browser's `$.browser.open` for a live page | Markdown text |
| PDF | None: pdf.js's worker is 2,139,222 bytes, twice the reported module cap | `pdftotext -layout`, `pdftoppm -png`, `mutool draw`; pdf.js in a `node` helper (ide-mod) | Text grid |
| DOCX, ODT, RTF | mammoth (DOCX only, 1.67 MB unpacked) | pandoc; markitdown | Markdown text |
| EPUB | fflate unzip, then the HTML route per chapter | pandoc; `mutool draw` | Markdown text |
| Jupyter | JSON cells to Markdown and `Code` blocks | pandoc | Text outputs |
| CSV, TSV | PapaParse | pandoc | Aligned `Text` grid |
| AsciiDoc, rST, Org, LaTeX | asciidoctor.js too large for one file; uniorg is GPL-3.0 | pandoc | Markdown text |
| SVG, images | Source only; no decoder in-process | `rsvg-convert`, resvg, ImageMagick, `sips` | Half, quadrant or sextant blocks |

(measured [VERIFIABLE][^2]). On this host only `pdftotext`, `pdftoppm`, `node` and `python3` were found on `PATH` among the binaries named (measured [VERIFIABLE][^2]). pandoc is GPL-2.0 and MuPDF is AGPL-3.0; calling them as binaries and vendoring code into an MIT repository are different cases (measured and inferred [VERIFIABLE][^2]).

Every converter runs an external binary on an untrusted document, outside any sandbox, as the user. The render leg names the risk and the evidence: a mod's processes run with the user's permissions, and Readability's own README asks for a sanitiser on untrusted input (documented [VERIFIABLE][^2]). No source read specifies a security model for this. The design must: argument vectors with no shell, a timeout per call, no network for the converter, output read as text and never executed, archive and path checks for ZIP containers, and a plain failure row when a converter exits non-zero [INFERENCE].

On the Desktop Code tab the rendering half of the ask is already met with no mod: its Browser pane opens static HTML, PDFs, images and video (documented [VERIFIABLE][^2][^3]).

## 3. Existing mods for documents and browsers

The ai-harness browser survey listed eight doc mods on 2026-10-14 (documented [VERIFIABLE][^4]). The render leg read their source and found seven more (measured [VERIFIABLE][^2]). The ones that matter for the design:

| Mod | What to take from it | Licence, stars, last push (2026-10-15) |
|---|---|---|
| claude-mdview (xuanji86) | Engine `Markdown` at 9,000 per element and 60,000 per page; links followed in place with Back; contents, find, parts; hover-to-edit through `$.prompt.submit`; path links under `Read`, `Write` and `Edit` rows; live reload | MIT, 6, 2026-10-03 |
| claude-code-file-preview (abonckus) | Own block renderer over `Box`, `Text`, `Code`, `Markdown`; tables fitted or as cards; GitHub callouts as boxes; Mermaid as box text; fuzzy search; breadcrumb and stats header | MIT, 0, 2026-10-05 |
| davekiss/md | A working `Client` editor: caret, selection, drag, typed keys, a 200-step undo stack, file writes, re-read on `mtimeMs` change, nine tools Claude calls, anchored comments | MIT, 0, 2026-10-13 |
| ide-mod (jkf87) | PDF through pdf.js in a `node` helper laying glyph positions into a character grid; `pdftoppm` pictures; its own `ui.scroll` hook | MIT, 7, 2026-10-13 |
| claude-gfm-render (briangtn) | Alerts, task lists, strikethrough and Mermaid as Unicode art in-process; vendored 84 KB renderer | MIT, 19, 2026-10-05 |
| figures (natsukium) | MathJax in-process through its lite adaptor; a chunked vendor bundle under 1 MB per file | Apache-2.0, 7, 2026-10-14 |
| claude-lens (minhdevtree) | Images, SVG and PDF first pages under tool rows; sextant, quadrant or half-block fallbacks | MIT, 0, 2026-10-12 |
| html-preview (JAICHANGPARK) | Calls `$.browser.open` when terminal-browser is installed, else a headless-Chrome screenshot | MIT, 0, 2026-10-02 |
| claude-code-converter (zrdqns) | Converts PDF and Office files to Markdown before Claude reads them, through `tool.call` | MIT, 0, 2026-10-08 |
| terminal-browser (zenbu-labs) | The only live browser in a pane; kitty or Ghostty outside tmux only | MIT, 3,871, 2026-10-07 |

(measured [VERIFIABLE][^2]). Every doc mod is exploratory under Route A of the fleet's source-vetting procedure: 0 to 19 stars, all created in October 2026. terminal-browser's host project is established (measured and inferred [VERIFIABLE][^2][^4]). No mod was found that views EPUB, DOCX, ODT, RTF, AsciiDoc, reStructuredText, Org or Jupyter notebooks in a pane, across a 3,836-entry catalogue, the 211-entry directory and the GitHub topic (measured [VERIFIABLE][^2]).

Two integration facts shape the design. A mod can redraw the `ToolUse` and `ToolResult` rows for a `Read` of a `.md` or `.pdf`, which changes what the person sees; changing what Claude reads is a `tool.call` job (documented [VERIFIABLE][^2]). And a mod that redraws a reply row without passing it on blocks every mod after it, so a doc viewer that redrew whole replies would collide with claude-markdown-mod or claude-gfm-render (measured and inferred [VERIFIABLE][^2]).

## 4. Editing inside a mod

`Input` is "every surface's one-line text field". A multi-line field is an open request on Anthropic's design issue, and the changelog through 2.1.300 adds none (documented [VERIFIABLE][^1][^2]). Three editing routes exist today.

The first is point-and-ask. claude-mdview sends `Edit lines <start>-<end> of <path>` with the section, the block's first words and the instruction through `$.prompt.submit({ asUser: true })`, then tracks the turn under the block and redraws when the file changes (measured [VERIFIABLE][^2]). GitBook, Confluence and Word's Copilot route block edits through an agent the same way, and Word's result offers keep, discard or refine (documented [VERIFIABLE][^1]). This route works with keyboard focus alone and costs a turn.

The second is a `Client` editor. The surface function runs "on the drawing thread, a second per call at most", receives keys through `onKey` only after a click has given it focus, and posts at most 100,000 characters per frame (documented [VERIFIABLE][^2]). davekiss/md ships one: "Click to place the caret and drag to select", undo on `ctrl+u` because "ctrl+z suspends Claude Code", the document as an array of lines, writes with `$.fs.write` and a re-read when `mtimeMs` changes (measured [VERIFIABLE][^2]). Because keys reach the `Client` only after a click, a keyboard-only session cannot type into it [INFERENCE].

The third is single-line in-place edits through `Input` for headings, list items and table cells, plus checkbox toggles, which are one-character file edits the mod makes itself (documented and inferred [VERIFIABLE][^1]).

Write-back has two hazards. `$.fs.write` can leave a half-written file, so a save needs a write-then-rename helper. An outside editor can change the file between a read and a write, so the mod compares `mtimeMs` first and asks with `$.ui.ask` on a conflict (documented and inferred [VERIFIABLE][^2]). Undo is an in-memory stack; the file-level history is git and Claude Code's own `/rewind` [INFERENCE].

No editor core is needed for Markdown source editing. davekiss/md shows a line array and a 200-step stack suffice. CodeMirror 6 state (16.7 kB gzipped, "strictly functional") is the candidate if structured editing is wanted later, and Yjs the candidate if Claude's file edits must merge with unsaved local edits. Lexical (a bare `setTimeout`, a `happy-dom` dependency), BlockNote (`jsdom`), Automerge and Loro (WebAssembly) cannot run in the mod (measured [VERIFIABLE][^2][^3]).

## 5. What the mod can share with a web app and an MCP App

The mod shares logic, data types and design tokens with a web app and an MCP App. It shares no UI components with them. The web app and the MCP App share UI components with each other, because both run in a browser DOM. These three statements rest on the loader rules Anthropic documents and the evidence leg quoted (measured [VERIFIABLE][^3]).

### 5.1 The loader's rules for shared code

A hooks module may import files inside its own plugin by relative path. The one bare import is `claude-code`. A dynamic `import()` fails (documented [VERIFIABLE][^3]). The module runs with "no Node.js APIs, no timer globals such as `setTimeout`, and no network or file access of its own", and the types file adds "no DOM, no Node" for the module "and every file it imports from the plugin". `eval` and `new Function` throw, and "there is no `WebAssembly`" (documented [VERIFIABLE][^3]).

JSX in a mod compiles to the engine's own `h` calls, so a React component library cannot run there (documented and inferred [VERIFIABLE][^3]). Passing `$` to an imported function is refused by the create page, while the 2.1.299 changelog says that refusal was fixed for source-loaded mods. A core that never takes `$` is valid under both readings (documented [VERIFIABLE][^3]).

An installed plugin is a copy of its own directory. "Files outside the plugin directory aren't copied", `workspace:*` dependencies get no install, and `pnpm-lock.yaml` is skipped (documented [VERIFIABLE][^3]). A symlink to elsewhere in the same marketplace is dereferenced into the cache on a git install; whether the static analysis accepts an import through a symlink for an in-place load is unmeasured (documented and inferred [VERIFIABLE][^3]).

The brief named a 1 MB module-file cap. The evidence leg found no such cap in any Anthropic page, the types file or the changelog. The documented bounds are 2,000 nested scopes, a 10,000-character `Markdown` text, 100,000 drawn characters per tree and 4 MiB per `$.fs` file (measured [VERIFIABLE][^3]). The earlier fleet survey reported the 1 MB figure from a practitioner's design-issue comment, so it is reported, not documented [INFERENCE].

### 5.2 How published mods reach shared code today

Three mods show three routes. terminal-browser keeps its plugin outside its pnpm workspace and hand-duplicates its bridge types, under the comment "we cannot use libraries inside the claude code sandbox, hence this gross code". baselane-sh/mods runs a copy build that stamps a shared engine into every plugin and commits the output. ide-mod runs pdf.js in a Node sidecar called with `$.process.run` (measured [VERIFIABLE][^3]). Anthropic's own built-in `diff` mod imports about twenty local modules by relative path, so a mod may span many files inside its plugin (measured [VERIFIABLE][^3]).

### 5.3 Document models and cores

Three Markdown parsers fit a mod once copied in with DOM-free build conditions: micromark (15.9 kB gzipped), mdast-util-from-markdown (16.6 kB) and marked (14 kB), all MIT with tens of millions of weekly downloads (measured [VERIFIABLE][^3]). One micromark dependency maps the `browser` export condition to a file that calls `document.createElement` at import time, so the copy must use the default condition (measured [VERIFIABLE][^3]).

Among editor cores, CodeMirror 6 state is "strictly functional" and 16.7 kB gzipped, the strongest candidate for a shared plain-text editing state. ProseMirror's model, state and transform packages are separate from its view (27.1 kB together), but whether `prosemirror-model` loads with no `document` is unmeasured. Lexical's core calls a bare `setTimeout`, BlockNote's server path needs `jsdom`, and Automerge and Loro are WebAssembly, so none of those can run in the mod (measured [VERIFIABLE][^3]). Yjs could load; its only `setTimeout` calls sit in an optional class (measured [VERIFIABLE][^3]). ProseMirror and CodeMirror moved off GitHub in April 2026; their npm downloads stand in for activity (measured [VERIFIABLE][^3]).

### 5.4 MCP Apps and the Desktop Code tab

An MCP App is HTML in a sandboxed iframe speaking JSON-RPC over `postMessage`, with the network closed by default. Claude web and Claude Desktop are hosts; Claude Code is not, and Claude Code 2.1.281 hides MCP Apps UI resources from its resource lists (documented [VERIFIABLE][^3]). Anthropic's design guidelines list "Document editing" among full-screen uses and warn against long static content inline, so a doc-editor MCP App opens full screen with an inline card as a launcher (documented and inferred [VERIFIABLE][^3]). The official `server-pdf` example is a working template: a model-visible `display_pdf` tool, app-only tools for reading chunks and saving, chunked streaming, and `updateModelContext` for the visible page (documented [VERIFIABLE][^3]). The SDK's `convert-web-app` skill and excalidraw-mcp show a web app and an MCP App built from one codebase with `vite-plugin-singlefile`; two independent sources, so the pattern passes Route B (measured [VERIFIABLE][^3]).

The Desktop Code tab's Browser pane already opens "static HTML files, PDFs, images, and videos". On Desktop a doc-editor mod adds value for Markdown structure and nothing for HTML, PDF or video viewing (documented and inferred [VERIFIABLE][^3]).

### 5.5 Repository layout and hygiene

The sibling beads-ui README plans "one core package for data access, state, layout and theme, and one package per surface" and already states that surfaces "share logic and design tokens rather than UI components". Both repos were scaffolded from the same private Copier template at the same version (measured [VERIFIABLE][^3]). GitHub scores doc-editor's community profile at 57%: no code of conduct, contributing guide, issue template or `SECURITY.md`. The `.gitignore` does not cover `.claude-plugin/types/` or the `tsconfig.json` Claude Code writes on load. Three Python scripts from the template sit in a TypeScript repo (measured [VERIFIABLE][^3]).

## Gaps, blindspots and emergent findings

- Nothing was run. Every drawing claim comes from vendor pages, the types file, mod source and issue reports. Three conflicts need one live pane to settle: whether `Markdown` draws task lists and strikethrough, whether an over-budget tree is truncated or refused, and whether a terminal `Link` with a non-`https` `href` refuses its tree (measured [VERIFIABLE][^2]).
- Two keyboard questions decide the key map and the editor: whether a focused `Client` receives Tab, capital letters and `/`, and whether `$.ui.selection()` returns a selection made inside a pane [NO SOURCE].
- The 1 MB module cap is reported by three mod authors and documented nowhere; the `$.process.run` output limit is named with no number [NO SOURCE].
- Two Anthropic sources disagree on passing `$` to an imported function (the create page refuses it; the 2.1.299 changelog says the refusal was fixed). A core that never takes `$` is valid under both (measured [VERIFIABLE][^2][^3]).
- No library was load-tested in the mod environment. "Expected to load" rests on documented browser or Deno support and the absence of Node imports (measured [VERIFIABLE][^3]).
- No web or social search ran: native WebSearch does not work on this host and the host's web-search MCP tool was absent from every leg's tool set. A doc mod or practitioner report found only on Twitter, Reddit or Hacker News is missing (measured [VERIFIABLE][^1][^2][^3]).
- Coda, ClickUp and Miro help centres answered 403, so their rows rest on product pages; their signature patterns are mostly non-transferable, so the impact is low (measured [VERIFIABLE][^1]).
- Emergent: ProseMirror and CodeMirror moved off GitHub in April 2026, so their star counts are frozen; npm downloads stand in for activity (measured [VERIFIABLE][^3]). MCP Apps already render on Claude's iOS and Android apps through a WebView, which bears on the sibling repo's later mobile decision (documented [VERIFIABLE][^3]). The sibling beads-ui repo's shared-core research existed only in a local worktree at read time, so the two designs should compare package layouts before either fixes names [INFERENCE].
- Anchor bias, named by the legs: the doc-app ranking would differ on the named SaaS apps alone, and the shared-core question moved most sharing below the UI (measured [VERIFIABLE][^1][^3]).
- Scope narrowing, stated: the UI survey judged every pattern by what survives a character grid, because the ask's first surface is the TUI mod. Visual design for the web app and the MCP App (layout, typography, responsive behaviour, sidebars, comment threads) was not surveyed and is Phase 3's research; the headless-component findings in section 5.3 are what carries over [INFERENCE].
- Security of converters: no source read gives a security model for running `pdftotext`, `lynx`, `pandoc` or an unzip on an untrusted document as the user; section 2.5 names what the design must specify [NO SOURCE].
- Not surveyed, and so excluded from the recommendation rather than weighed: pager position marks and resume on reopen, editor crash recovery, e-reader annotations and reading position, IDE virtual documents, screen-reader accessibility of a pane, CJK width and right-to-left text (Claude Code 2.1.300 adds a `dir` prop on `Text`; this host runs 2.1.296), and terminal capability negotiation beyond the `Image` detection the gallery page documents [NO SOURCE].

## Comparison

Which route gives a doc viewer and editor, for each surface the owner's sessions use.

| # | Criterion | Mod pane, text only (tmux, remote) | Mod pane with pictures (kitty or Ghostty, local) | Desktop Code tab | MCP App (Claude web and Desktop chat) | Web app |
|---|---|---|---|---|---|---|
| 1 | Renders Markdown with structure | Yes, through `Markdown` blocks and a windowed pane | Yes | Yes, plus `Svg` and `Text` sizes | Yes, any web renderer | Yes |
| 2 | Renders HTML and PDF as pages | No; text through `pdftotext`, `lynx` or a converter | Pictures through `pdftoppm` and `Image`; live pages through terminal-browser | Native Browser pane, no mod needed | Yes, in the iframe | Yes |
| 3 | Edits in place | Single-line `Input` and checkbox toggles anywhere; a `Client` caret editor in fullscreen rendering once a click has focused it (tmux needs mouse mode; pictures are not required) | Same | Plus the native file pane's spot edits | A rich editor from the web codebase | Yes |
| 4 | Edits through Claude | `$.prompt.submit` point-and-ask; registered tools | Same | Same | `tools/call` to the same MCP server; `updateModelContext` | Through the MCP server's API |
| 5 | Mouse | Fullscreen only; tmux needs mouse mode | Fullscreen | Yes | Yes | Yes |
| 6 | Works on this host's sessions | Yes | No (tmux, remote) | No (no Desktop here) | No (Claude Code is not an MCP Apps host) | Hosted or local server |
| 7 | Shares code with the others | Core logic and types only | Same | Same | UI with the web app; core with all | UI with the MCP App; core with all |
| 8 | Prior art | claude-mdview, claude-code-file-preview, `/diff` | Plus claude-lens, ide-mod, terminal-browser | Built in | `server-pdf`, excalidraw-mcp, `convert-web-app` | Any |
| 9 | Build cost for the MVP | A mod plus a vendored splitter | Adds picture routes | None | A Vite single-file build plus an MCP server | A web app |

The cells come from sections 1 to 5. Route A of the source-vetting procedure passes for terminal-browser's host project, for `@modelcontextprotocol/ext-apps` (v2.0.3, about 5.2 million weekly downloads) and for the parser libraries; every doc mod is exploratory (measured [VERIFIABLE][^2][^3]).

## Recommendation

1. Scope the MVP as a Markdown reader in a pane with Claude-mediated editing, and say so in the design doc. Render one keyed `Markdown` element per block of at most 9,000 characters, window the rows in view by answering `ui.scroll` as the `/diff` mod does, and open the pane from a `/doc` command or a tool-row link so it places at any width (sections 1.1, 2.2, 2.3; the premises are cited there) [INFERENCE].
2. Make the outline, fold-all and unfold-all, drill-in to one section, find, in-place link following with Back, and a header row with path, heading path, mode and read time the MVP's navigation (section 1.5; the premises are cited there) [INFERENCE].
3. Edit in two phases. Phase one is point-and-ask through `$.prompt.submit({ asUser: true })` with file, line range and instruction, keep-discard-refine buttons after the edit lands, margin markers per changed block grouped by Claude turn, and the full diff in `Code` with `format: 'diff'` one key away. Phase two is a `Client` caret editor modelled on davekiss/md, offered in fullscreen only. Use no editor core in the MVP (sections 1.3, 4; the premises are cited there) [INFERENCE].
4. Save through a write-then-rename helper process, compare `mtimeMs` before every write, and ask with `$.ui.ask` when the file changed on disk (section 4; the premises are cited there) [INFERENCE].
5. Render HTML as Markdown text in-process (a hand-rolled subset or node-html-markdown), full pages through `lynx -dump` or w3m when present, and live pages through `$.browser.open` when terminal-browser is installed. Render PDF as text with `pdftotext -layout` one page range at a time, with `pdftoppm` pictures only where `Image` draws. Treat pandoc as an optional, feature-detected converter for Office and markup formats and keep GPL and AGPL code out of the repository (sections 2.4, 2.5; the premises are cited there) [INFERENCE].
6. Define the shared core as dependency-free TypeScript with erasable syntax, no DOM, no Node, no timers, no WebAssembly and no `$` parameter: the document model (Markdown source with block positions), the block cutter and windowing, outline, find and link index, edit operations as source-range replacements, and design tokens. Put its source inside the plugin directory for the MVP, vendor any parser as committed chunks under 1 MB, and let the web and MCP App packages import it by path (sections 2.1, 5; the premises are cited there) [INFERENCE].
7. Lay the repository out as a root `.claude-plugin/marketplace.json` over `plugins/doc-editor`, with the core's source inside that plugin as recommendation 6 says, a `packages/` folder for the web app and the MCP App added in Phase 3 (a move of the core into `packages/core` is a Phase 3 decision, after the symlink spike), npm workspaces, and a gate of `claude plugin validate .` plus per-plugin `validate` and `test`. Align package names with beads-ui. Add `CONTRIBUTING.md`, `SECURITY.md`, a code of conduct, and ignore `.claude-plugin/types/` and the generated `tsconfig.json` (section 5.5; the premises are cited there) [INFERENCE].
8. Ship the MCP App as the web app's second entry point, built with `vite-plugin-singlefile`, opened full screen, following `@modelcontextprotocol/server-pdf`, after the mod MVP (section 5.4; the premises are cited there) [INFERENCE].
9. Run one spike on this host before freezing the design, under `claude plugin test` or a live pane: the three `Markdown` and `Link` conflicts, whether a focused `Client` receives Tab, capitals and `/`, whether `$.ui.selection()` sees a pane selection, and whether micromark, `@codemirror/state` and yjs load in the mod environment (Gaps; the premises are cited there) [INFERENCE].
10. Do not build HTML, PDF or video viewing for the Desktop Code tab; its Browser pane does it. Add value there with Markdown structure and Claude integration only (sections 2.5, 5.4; the premises are cited there) [INFERENCE].

Every recommendation above is an inference from the evidence in sections 1 to 5 and was not tested in a session; the premises carry their own footnotes in those sections.

## Open Questions

1. Does a focused `Client` receive Tab, capital letters and `/`? The answer decides whether the pane can use the `less` key map Claude Code's transcript mode uses, or must substitute lowercase letters as claude-mdview does.
2. Does `$.ui.selection()` return a selection made inside a mod's pane? Selecting text to ask Claude about it depends on it.
3. Does the `Markdown` element draw task lists and strikethrough on 2.1.296, and is an over-budget tree truncated or refused? One gallery-style pane settles both.
4. Do micromark with `mdast-util-from-markdown`, `@codemirror/state`, `prosemirror-model` and `yjs` load in the mod environment when copied into a plugin with DOM-free export conditions? A `claude plugin test` run settles it once the test slot is free.
5. Where should inline comments on a Markdown file live: a sidecar file, HTML comments in the source, or Beads issues? Every collaborative app stores them outside the text, and plain Markdown has no comment store.
6. Should the private Copier template behind this public repo's `copier update` instruction be made public, or should the README say the template is private? This is an outward-facing choice for the owner (section 5.5).

## Sources

[^1]: doc-editor. (2026). [Doc app UI and UX survey for the TUI doc viewer and editor](evidence/ded-doc-editor/doc-app-ux-survey.md). `docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md`, landed on main by PR #3 (merge e9db961) on 2026-10-15. Written by an Opus 5.5 researcher leaf; 1,023 lines, 95 footnotes to vendor and project pages read 2026-10-15, 180 provenance-ledger rows. (The mod-surface filter, per-app pattern inventory, the 53-row transfer table, the ranked MVP list.)
[^2]: doc-editor. (2026). [Rendering and editing Markdown, HTML, PDF and other doc formats inside a Claude Code mod](evidence/ded-doc-editor/render-and-edit-in-a-mod.md). `docs/research/evidence/ded-doc-editor/render-and-edit-in-a-mod.md`, landed on main by PR #4 (merge ee48242) on 2026-10-15. Written by an Opus 5.5 researcher leaf; 1,199 lines, 68 footnotes to Anthropic pages, the types file, the `/diff` mod source, 256 design-issue comments and 16 mod repositories read 2026-10-15, 193 provenance-ledger rows. (Runtime bounds, element contracts, the `/diff` windowing pattern, the mod table, the format-by-route matrix, editing options.)
[^3]: doc-editor. (2026). [What a Claude Code mod doc viewer can share with a web app and an MCP App](evidence/ded-doc-editor/shared-core-across-surfaces.md). `docs/research/evidence/ded-doc-editor/shared-core-across-surfaces.md`, landed on main by PR #2 (merge c6743ea) on 2026-10-15. Written by an Opus 5.5 researcher leaf; 765 lines, 61 footnotes to Anthropic pages, the MCP Apps specification and SDK, 10 repositories and 24 npm packages read 2026-10-15, 92 provenance-ledger rows. (Loader constraints, document models and cores, the share matrix, layout patterns, repository hygiene.)
[^4]: ai-harness. (2026). [A working web browser inside the Claude Code TUI through mods: what exists and what it takes](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods-web-browser-in-the-tui.md). `docs/research/claude-code-mods-web-browser-in-the-tui.md` in the private ai-harness repository; read in full on this host 2026-10-14. (terminal-browser, the picture mods, `Raster` and `Image` limits in tmux, the first doc-mod list.)
[^5]: ai-harness. (2026). [Claude Code mods: capabilities, ecosystem and fit for the fleet](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods.md). `docs/research/claude-code-mods.md` in the private ai-harness repository; read in full on this host 2026-10-14. (Mods anatomy and trust model, drawing surfaces, `$.mcp.call`, the ecosystem survey.)
[^6]: ai-harness. (2026). [Claude Code mods for ai-harness and every project](https://github.com/sergeiwallace/ai-harness/blob/main/docs/designs/aih-xhc5u-claude-code-mods.md). `docs/designs/aih-xhc5u-claude-code-mods.md` in the private ai-harness repository; read in full on this host 2026-10-14. (D-3 TypeScript with no build step, D-4 guards stay hooks, D-10 file contracts.)

<!-- /doc:region name="body" -->

<!-- doc:region name="ambiguous_items" kind="replaceable" -->

## Ambiguous Items from Auto-Remediation (Post-Run Review)

(none yet; auto-populated by verify_and_remediate node)

<!-- /doc:region name="ambiguous_items" -->

<!-- doc:region name="appendix_research_prompt" kind="immutable" -->

## Appendix: Research Prompt

**Registry ID:** none (orchestrated `/orchestrate` plus `/auto-flow` run on a Linux development host; no ai-core registry on this host)
**Model:** `us.anthropic.claude-fable-5-1` (coordinator: decomposition, briefs, synthesis and authorship of this doc); three research leaves launched through the Claude Code Agent tool as the `researcher` persona at tier opus, model `us.anthropic.claude-opus-5-5`, effort high, `isolation: worktree`
**Date:** 2026-10-15

```text
COORDINATOR STAGE FRAMING (research stage), as received from the aih-3 session on 2026-10-14:

Stage 1, research. Run /orchestrate /research-doc (Fable may refine with /research-doc --refine),
going beyond Sergei's two search summaries, which are seeds only. Pull UI and UX ideas, frontend
components and design elements from popular, widely adopted, acclaimed or innovative doc apps:
Confluence, Notion, Google Docs and Word first, then Coda, Gamma, Craft, GitBook, ClickUp Docs,
Miro and Mural, Microsoft Loop and any others worth it. Cover how to render and make interactive
markdown, HTML, PDF and other doc-like formats inside a Claude Code mod, viewing and editing;
existing open-source Claude Code mods and plugins for docs and for showing a web browser; and
what a doc viewer in the TUI can share with a later web or MCP UI surface. Start from these docs,
read in full: ai-harness docs/research/claude-code-mods-web-browser-in-the-tui.md (it names
claude-mdview, ide-mod's PDF text grid, html-preview and zenbu-labs/terminal-browser),
docs/research/claude-code-mods.md and docs/designs/aih-xhc5u-claude-code-mods.md. Land the
research doc on doc-editor main, then close DED-research-doc-editor-uhke with its path.

METHOD: the coordinator read the founding ask record (four entries) and the three seed docs in
full, then decomposed the research into three legs, each an Opus researcher leaf with its own
Tier 3 founding-ask carrier, the canonical research prompt template's grounding instructions
(role identity filled per leg), scope-note and independent-exploration blocks, a retrieval
enforcement clause, the sub-agent completion contract and the destructive-operation floor. Each
leg wrote one evidence doc under docs/research/evidence/ded-doc-editor/ and opened a PR. The
coordinator reviewed each evidence doc by content, merged it, and wrote this synthesis itself.
The research-doc skill's five-perspective critic pass and citation validation were applied to
this doc by the coordinator before landing.

LEG A (ded-research-docapps, DED-research-leg-doc-app-rkdy). Objective: survey the UI, UX,
components and interaction patterns of the doc apps named below and others you find, and rank
which patterns transfer to a document viewer and editor drawn inside the Claude Code TUI as a
mod (a pane beside the transcript or above the prompt, keyboard first, mouse in fullscreen
mode, character cells, no pictures inside tmux). Questions: (1) for each of Confluence, Notion,
Google Docs, Microsoft Word, Coda, Gamma, Craft, GitBook, ClickUp Docs, Miro, Mural and
Microsoft Loop, the signature viewing patterns, editing patterns and keyboard model, cited from
vendor documentation; (2) which other apps add a pattern the first list lacks (Obsidian, Typora,
iA Writer, Bear, Dropbox Paper, Slite, Nuclino, Outline, Anytype, Logseq, HackMD, Quip, Zoho
Writer, Apple Pages, Overleaf, Dillinger, StackEdit, Marktext as candidates); (3) which patterns
already exist in terminal programs (glow, mdcat, frogmouth, bat, less, vim and neovim markdown
plugins, Emacs org-mode, helix, micro, nano, zellij, lazygit-style panels); (4) for a pane of
about 100 by 40 cells, which patterns transfer directly, in a reduced form, or not at all;
(5) what reviewers and usability studies say makes these editors feel good or bad; (6) which
patterns make a doc viewer inside Claude Code useful beside a coding agent. Tables: per-app
pattern inventory, transfer table, ranked top-15 pattern list for the MVP.

LEG B (ded-research-render, DED-research-leg-tnah). Objective: establish how Markdown, HTML, PDF
and other doc-like formats can be rendered, navigated and edited inside a Claude Code mod, what
the mods API permits and limits for a viewer and editor, what every existing open-source mod for
docs or browsers does and how (code read), and which terminal rendering routes exist per format.
Questions: (1) the mods API contract for a viewer and editor, quoted from the interface,
reference, api and events pages and the public types file (Markdown, Code, Text, Box, Input,
Select, Button, Link, Client, Raster, Image, pane scroll props, fullscreen and mouse rules,
$.ui.selection, $.ui.ask, $.ui.notify, $.fs limits, $.process.run, $.http.fetch,
$.command.register, prompt.autocomplete, the ToolResult and ToolUse render sites,
$.prompt.submit, the text, module and import limits); (2) every existing mod for docs and
browsers, source read; (3) rendering routes per format outside mods (Markdown parsers, HTML
parsers and text browsers, PDF extractors and rasterisers, DOCX, RTF, ODT, EPUB, notebooks,
CSV, AsciiDoc, reStructuredText, Org, LaTeX, SVG, Mermaid, images) with their fit for a hooks
module; (4) editing inside a mod and DOM-free editor cores; (5) terminal prior art;
(6) performance and limits. Tables: API contract, existing mods, format-by-route matrix,
editing options.

LEG C (ded-research-shared, DED-research-leg-what-kwss). Objective: establish what a TUI document
viewer and editor built as a Claude Code mod can share with a later web app and an MCP UI (MCP
Apps) surface, and what the mod loader forbids sharing. Questions: (1) the loader's constraints
on shared code, quoted; (2) document models and headless cores (mdast, unified, remark,
micromark, markdown-it, ProseMirror, TipTap, Milkdown, BlockNote, Lexical, Slate, CodeMirror 6,
Yjs, Automerge); (3) MCP Apps rendering, hosts and packaging; (4) the Claude Desktop Code tab's
surface and built-in Browser pane; (5) the sibling beads-ui repo's shared-core plan; (6) repo
layout patterns for one TypeScript core and several renderers with a no-bundler mod consumer;
(7) open-source hygiene for a public mod repo. Tables: loader constraints, document model
comparison, share and do-not-share matrix, layout patterns.

Each leg's full brief (26 to 29 KB) was rendered by the fleet's ask-fidelity renderer; their
SHA-256 digests were 97f8e0700cbec47232efaa2a4f30c98c48ebdf0b88521bea239ae2b429ce5fd9 (leg A),
24eac88c6783777af9a5f7053e05a81a93b28de7fef392d23bdcc004aece82fc (leg B) and
9771a8315b36d000f44348fbbc0dca3d16f48fc4ede5f57cc7f6c29d0ecf2439 (leg C). The grounding
instructions, scope note and independent-exploration blocks were lifted verbatim from
ai-harness docs/research/prompts/TEMPLATE.md on 2026-10-14.
```

<!-- /doc:region name="appendix_research_prompt" -->

<!-- doc:region name="appendix_provenance" kind="replaceable" -->

## Appendix: Provenance Ledger

This doc cites three evidence docs in this repository and three seed docs in ai-harness. Every claim tagged `[VERIFIABLE]` above names the evidence doc it rests on, and that doc's own provenance ledger carries the claim, the fetched URL, the verbatim quote and a verdict: 180 rows in [^1], 193 rows in [^2] and 92 rows in [^3], 465 in all, each quote checked against the fetched text by the leg that wrote it before commit. The coordinator spot-checked the rows behind the main claims of sections 1 to 5 (the hotkey and `Input` rules, the 10,000 and 100,000 character caps, the `/diff` `ui.scroll` pattern, the loader import rules, the no-WebAssembly rule, the `Markdown` task-list conflict, the davekiss/md editor) against the evidence docs' quoted text on 2026-10-15. Where the legs disagreed (the 1 MB module cap), both readings are recorded in section 2.1.

| Claim | Source | Verbatim quote (as recorded in the evidence doc's ledger) | Verdict | Live? |
|---|---|---|---|---|
| Button hotkeys are one digit or one lowercase letter | [^1], from the interface page | "give it a `hotkey` of one digit or one lowercase letter" | SUPPORTED | Yes (2026-10-15) |
| Input submits on Enter | [^1], from the types file | "Runs on Enter with the text, in the plugin's own environment" | SUPPORTED | Yes (2026-10-15) |
| A `Markdown` element holds at most 10,000 characters | [^1][^2], from the types file | "At most 10000 characters, tab and newline its only control characters" | SUPPORTED | Yes (2026-10-15) |
| One tree draws its first 100,000 characters | [^1][^2], from the reference | "The first 100,000 characters are drawn" | SUPPORTED | Yes (2026-10-15) |
| The `/diff` mod answers `ui.scroll` itself | [^2], from the `/diff` README | "(the plugin answers the pane's `ui.scroll` itself)" | SUPPORTED | Yes (2026-10-15) |
| No WebAssembly in a hooks module | [^2][^3], from the types file | "there is no `WebAssembly` (deliberately; a module that needs compiled code runs it in a process of its own through `$.process.run`)" | SUPPORTED | Yes (2026-10-15) |
| Imports are relative files plus `claude-code` | [^2][^3], from the create page | "Import only from files inside the plugin directory, by relative path. The one bare import allowed is `claude-code`, for types and a few helpers." | SUPPORTED | Yes (2026-10-15) |
| Files outside the plugin are not copied on install | [^3], from the loading page | "Files outside the plugin directory aren't copied" | SUPPORTED | Yes (2026-10-15) |
| davekiss/md edits in a `Client` with caret and selection | [^2], from its README | "In the text, type to edit. Click to place the caret and drag to select." | SUPPORTED | Yes (2026-10-15) |
| A module file over 1 MB is not read | [^2], from a design-issue comment | "A module file over 1 MB is not read." | PLAUSIBLE (reported by three mod authors; absent from every Anthropic page [^3]) | Yes (2026-10-15) |

<!-- /doc:region name="appendix_provenance" -->

<!-- doc:region name="run_history" kind="append_only" -->

## Run History

- 2026-10-15 (Fable coordinator, launched by aih-3 on a Linux development host, worktree `ded-auto-flow`): scaffolded from the canonical research STUB; Founding Ask Coverage, Context and the research prompt appendix written; three Opus research leaves launched at 00:02Z into isolated worktrees. The body awaits their evidence docs.
- 2026-10-15, later the same night (Fable coordinator): all three legs collected by artifact and merged (PR #2 shared core, 765 lines; PR #3 doc-app UX, 1,023 lines; PR #4 rendering and editing, 1,199 lines). Sections 1 to 5, Gaps, Comparison, Recommendation and Open Questions written from them; the critic pass and the writing pre-ship pass were run before landing. Status set to `complete`.

<!-- /doc:region name="run_history" -->
