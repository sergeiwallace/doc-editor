---
title: "doc-editor: a document viewer and editor inside the Claude Code TUI as a mod"
category: design
tags: [design, claude-code, mods, tui, markdown, html, pdf, doc-editor, mcp-apps]
status: approved
source: "claude-fable-5-1-orchestrated-2026-10-15"
template_version: "design-1.0.0"
delegation_provenance:
  version: 2
  contributors: []
task: DED-doc-doc-editor-prd-ecdb
related_docs:
  - docs/research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md
  - docs/asks/DED-epic-doc-editor-view-edit-b3p.md
---
<!-- Full structure: see TEMPLATE.md in ai-harness docs/designs/ -->

# doc-editor: a document viewer and editor inside the Claude Code TUI as a mod

## Founding Ask Coverage

`founding_ask_ref`: {"blob_oid":"d9877bd7de09b5cc6b5530e2b70c4e50a0772dca","capture_commit":"e268462559c1637483143d5ef93ee27419547dfb","content_sha256":"3c81b3326da40d819f9f52ddc26894debde4173c9a2890f0f599a0479dc98bb5","entry_ids":["A001","A002","A003","A004"],"generation":4,"path":"docs/asks/DED-epic-doc-editor-view-edit-b3p.md","previous_ref_sha256":"3aa248dbad7d3aa29eee5d601a91498894edbcb0a5dbf760b3b1f5c4ce7019a6","repository":"doc-editor","schema_version":1,"task_id":"DED-epic-doc-editor-view-edit-b3p"}

`founding_ask_ref_sha256`: 6a4315d4a33b55e01e0916b001b7dd89333e00746ff92dfea157b7f757de00c0

The raw record is [docs/asks/DED-epic-doc-editor-view-edit-b3p.md](../asks/DED-epic-doc-editor-view-edit-b3p.md). The record was rebased onto main before this doc was written, so its commit id differs from `capture_commit`; its bytes hash to `content_sha256` unchanged. This index is non-authoritative; the raw record governs.

| Authoritative raw entry | Coverage and disposition |
|---|---|
| A001 | ORIGINAL-ASK, 2026-10-14T23:46:37Z. "rendering markdown and other docs and doc-like file types and also making them interactive and being able to view them or render markdown / html / pdf etc in the claude mod doc viewer" is the product: requirements FR-1 to FR-9, D-1, D-2, D-6, D-7, D-8. "making them interactive" and the epic's "view and edit" are D-4 and Phase 1 to Phase 2; the evidence that a mod has no multi-line text field makes editing Claude-mediated first, which this doc states as a narrowing with evidence in D-4. "plugins for showing an entire functional web browser" is D-6 (hand live pages to terminal-browser). "existing open source popular claude code mod plugins" are reused as patterns in D-2, D-4, D-13. "pull inspiration ... from popular doc apps like confluence, notion, google docs, word" is the interaction design in the Mockups section and D-5. "we'll do it in phases so start with an MVP" is Implementation Phases. "the /doc --kind design will also contain all the PRD specs and acceptance criteria and details and diagrams and mockups and decisions and open questions and tasks" is this doc's structure. "they should use /decision-framework for any design decisions" is recorded on every decision. "open source ... public repo ... no secrets" governs D-10 and D-11. The beads-ui half of the message is out of scope. |
| A002 | FOLLOW-UP, 2026-10-14T23:46:38Z. The two Google AI summaries were treated as seeds; the research doc's section 1 surveyed every app they name from vendor pages. The canvas, slide and formula patterns they praise do not transfer to a cell grid and are excluded with reasons in the Mockups section. |
| A003 | FOLLOW-UP, 2026-10-14T23:46:39Z. "the doc viewer will be doc-editor" names this repo. The shared-components question raised for beads-ui is answered for doc-editor by D-9 and D-15: logic, types and design tokens are shared across the mod, the web app and the MCP App; UI components are shared between the web app and the MCP App only. |
| A004 | FOLLOW-UP, 2026-10-14T23:46:39Z. Repo creation, Copier configuration, README and GitHub metadata were done by the launching session (PR #1). D-10 keeps that scaffold and adds the plugin and package layout. The Copier template's visibility is D-16: keeping it private and saying so in the README was resolved and applied by the launching session (PR #7); making it public stays an outward-facing act for Sergei. |

**Status:** APPROVED (all 17 decisions resolved; a fully decided design is approved, Sergei, 2026-10-21). Phase 0 and Phase 1 are in build.

**Created:** 2026-10-15

**Task:** DED-doc-doc-editor-prd-ecdb (epic DED-epic-doc-editor-view-edit-b3p)

**Research:** [docs/research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md](../research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md)

<!-- doc:region name="overview" kind="replaceable" -->

## Table of Contents

- [Executive Summary](#executive-summary)
- [Problem Statement](#problem-statement)
- [Design Overview](#design-overview)
- [Product Requirements](#product-requirements)
  - [Users and jobs](#users-and-jobs)
  - [Functional requirements](#functional-requirements)
  - [Non-functional requirements](#non-functional-requirements)
  - [Out of scope](#out-of-scope)
- [Interaction Design and Mockups](#interaction-design-and-mockups)
  - [The pane](#the-pane)
  - [Outline and drill-in](#outline-and-drill-in)
  - [Point at a block and ask Claude](#point-at-a-block-and-ask-claude)
  - [Change review](#change-review)
  - [Key map](#key-map)
- [Architecture](#architecture)
  - [Packages and the shared core](#packages-and-the-shared-core)
  - [The windowed renderer](#the-windowed-renderer)
  - [The edit pipeline](#the-edit-pipeline)
  - [Format converters](#format-converters)
- [Data Model](#data-model)
- [Integration](#integration)
- [Implementation Phases](#implementation-phases)
  - [Phase 0: Spike and scaffold](#phase-0-spike-and-scaffold)
  - [Phase 1: MVP reader with Claude-mediated editing](#phase-1-mvp-reader-with-claude-mediated-editing)
  - [Phase 2: HTML and PDF as text, and the in-pane editor](#phase-2-html-and-pdf-as-text-and-the-in-pane-editor)
  - [Phase 3: Web app and MCP App](#phase-3-web-app-and-mcp-app)
  - [Phase 4: Enhancements](#phase-4-enhancements)
- [Implementation Audit](#implementation-audit)
- [Risks and Mitigations](#risks-and-mitigations)
- [Run Ledger](#run-ledger)
- [Design Decisions](#design-decisions)
  - [Decision Summary](#decision-summary)
  - [Decision Details](#decision-details)
  - [D-1: MVP scope](#d-1)
  - [D-2: Rendering model](#d-2)
  - [D-3: Block splitting and the Markdown parser](#d-3)
  - [D-4: Editing model](#d-4)
  - [D-5: Key map and input](#d-5)
  - [D-6: HTML route](#d-6)
  - [D-7: PDF route](#d-7)
  - [D-8: Other formats](#d-8)
  - [D-9: Shape and home of the shared core](#d-9)
  - [D-10: Repository layout and distribution](#d-10)
  - [D-11: Testing and the merge gate](#d-11)
  - [D-12: Write safety](#d-12)
  - [D-13: Transcript integration](#d-13)
  - [D-14: Pictures in the terminal](#d-14)
  - [D-15: Web app and MCP App timing](#d-15)
  - [D-16: Visibility of the private Copier template](#d-16)
  - [D-17: Where inline comments on a Markdown file live](#d-17)
- [Open Questions](#open-questions)
- [Approval Log](#approval-log)

## Executive Summary

doc-editor is a Claude Code plugin whose mod opens a pane beside the transcript and renders a Markdown file as a navigable document. The pane gives an outline that jumps to headings, folding, one section at a time, find, links followed in place, and callouts and tables fitted to the pane. Editing goes through Claude first: the reader points at a block, types the change, Claude edits the file, and the pane shows margin markers and a diff with keep, discard and refine. Small edits (a heading, a list item, a checkbox) happen in the pane. Editing applies to Markdown source in Phases 1 and 2; HTML, PDF and converted formats are view-only until a round-trip decision in Phase 4. HTML and PDF render as text in the terminal, through converters the mod runs as separate processes, because pictures do not draw inside tmux and the mod runtime cannot load pdf.js. The two consequential choices: the renderer draws only the rows in view through the engine's own `Markdown` element, which lifts the engine's 100,000-character ceiling for any document up to the 4 MiB the mod can read (D-2), and the MVP is a reader with Claude-mediated editing, because a mod has no multi-line text field today (D-1, D-4). A later `Client` caret editor, a web app and an MCP App share one dependency-free TypeScript core (D-9, D-15). Deferred: inline comments, transclusion, backlinks, collaboration, and every picture route outside kitty or Ghostty.

## Problem Statement

Claude Code shows a document only as the raw text a `Read` tool call returns, or as the Markdown of Claude's own replies. A person working beside the agent on a design doc, a README, an HTML page or a PDF has to leave the terminal to read it. There is no way to point at a paragraph and ask Claude to change it. There is no way to follow a link inside the repo, to see a table of contents, or to read a PDF's text without a separate program. Claude Code mods, generally available since 2026-10-01, let a plugin draw a pane beside the transcript, take keyboard and pointer input, read files and run commands, so a document viewer and editor can now live inside the session. The owner asked for exactly that, drawing on the best doc apps for its interaction design, built in phases from an MVP, and published as open source.

## Design Overview

**Status:** stub; to be filled during/after implementation.

## Product Requirements

### Users and jobs

The first user is a developer running Claude Code in a terminal, usually inside tmux on a remote host, who reads and edits Markdown beside the agent: design docs, plans, READMEs, research. The second user is the same developer in Claude Desktop's Code tab or in kitty or Ghostty on a laptop, where pictures draw. The third, later, is a reader in Claude web or Claude Desktop chat through an MCP App, or in a browser through the web app.

Jobs, in the order the research ranked them: open the file Claude just read or wrote; find the section I want in a long doc; ask Claude to change this paragraph and see what changed; follow the link to the research doc and come back; read a PDF or HTML page without leaving the terminal; tick the acceptance-criteria boxes; check what Claude changed this session.

### Functional requirements

| Id | Requirement | Phase |
|---|---|---|
| FR-1 | Open a Markdown file in a pane from a `/doc <path>` command, from a link the mod adds under a `Read`, `Write` or `Edit` row, from a `show` tool Claude calls, and from a path with `:line` or `#heading` | 1 |
| FR-2 | Render headings, paragraphs, lists, task lists, code blocks with highlighting, tables fitted to the pane or as cards, GitHub and Obsidian callouts as bordered boxes, block quotes and links, for a file up to the 4 MiB the mod can read, with the rows in view drawn and the rest windowed | 1 |
| FR-3 | Navigate: outline of headings with jump, previous and next heading, fold and unfold one heading and all headings, drill in to one section with its heading path shown, find in page with next and previous match, follow a link to a file or heading in place with Back, and a header row with path, heading path, mode and read time | 1 |
| FR-4 | Point at a block and ask Claude to change it: the request carries the file, the line range, the block's first words and the instruction; the pane shows the turn's state under the block and redraws when the file changes | 1 |
| FR-5 | Review Claude's edits: a margin marker per changed block grouped by turn, next and previous change, a unified diff of the turn in a `Code` element, and keep, discard or refine actions after the edit lands | 1 |
| FR-6 | Edit in the pane without Claude: a single-line field for a heading, a list item or a table cell, and a toggle on a task-list checkbox, saved through a safe write | 1 |
| FR-7 | Reload when the file changes on disk, keep the viewport still, and warn before writing over a file that changed since it was read | 1 |
| FR-8 | Render HTML as Markdown text, and a live page through terminal-browser when that plugin is installed | 2 |
| FR-9 | Render PDF as text one page range at a time, with pictures where `Image` draws | 2 |
| FR-10 | Edit Markdown source in place with a caret, selection, typed keys and undo, in fullscreen rendering | 2 |
| FR-11 | Render notebooks, CSV, EPUB and, where pandoc is installed, DOCX, ODT, RTF, AsciiDoc, reStructuredText, Org and LaTeX as Markdown text | 3 |
| FR-12 | The same document core serves a web app and an MCP App that open in Claude web and Claude Desktop | 3 |
| FR-13 | Inline comments, backlinks, transclusion, filing a block as a Beads issue, authorship colour for Claude's text | 4 |

Editing (FR-4, FR-5, FR-6 and FR-10) applies to Markdown source only in Phases 1 and 2. HTML, PDF and the formats of FR-11 are view-only, because every converter is one-way and an edit to the converted text has no place to go back to. Editing a converted format needs a round-trip decision per format and is deferred to Phase 4 with that reason. This narrows the ask's "view and edit" for non-Markdown formats, and the narrowing is stated here for review.

### Non-functional requirements

| Id | Requirement |
|---|---|
| NFR-1 | Every redraw stays under 100,000 characters per tree and 10,000 per element; a windowed slice of the pane is at most `bodyRows` times `bodyColumns` characters plus the header and footer |
| NFR-2 | Every feature works with the keyboard alone on the main screen; mouse and `Client` features are additions in fullscreen rendering |
| NFR-3 | Works inside tmux and over a remote link with no `Image`, no `Svg` and no shared memory; pictures draw as alt text, and as `Image` only where the terminal supports it (D-14) |
| NFR-4 | The mod makes no network request and calls no model of its own; the only model calls are the turns the user starts |
| NFR-5 | The mod never writes a file except through the safe-write path, and never writes a document it did not read in this session; the one new file it may create is the comment sidecar derived from a document it has read (D-17) |
| NFR-6 | Every external binary is feature-detected at call time and its absence degrades to text or a clear message, never an error row |
| NFR-7 | No GPL or AGPL code is vendored; such tools are called as separate binaries only |
| NFR-8 | The repository holds no secret, and every committed file is public |
| NFR-9 | Hooks that gate nothing fail open; the mod registers no `tool.check` hook and answers no `tool.call` for a tool it did not register itself; its own registered tools (`show` and the comment tools) answer their calls normally |

### Out of scope

Presence cursors, infinite canvas, slides, formulas and databases inside the document, synced blocks, real-time collaboration, a native desktop or mobile app, and a general web browser. The research doc's section 1.4 gives the reason for each: none fits a character grid, or each needs a storage or syntax decision that plain Markdown lacks.

## Interaction Design and Mockups

The mockups are terminal panes drawn as text, which is the medium they describe. Pane width is the docked width Claude Code gives the mod; the examples use 60 columns to fit this page.

### The pane

```text
┌ docs/designs/doc-editor-design.md › Architecture › The windowed renderer ┐
│ READ · 4 min · 3 changed this turn                       o t f e ? q    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ### The windowed renderer                                              │
│                                                                          │
│ ▌ The pane draws only the rows in view. A document is cut into blocks   │
│ ▌ at headings, paragraphs, fences and tables. Each block is one keyed    │
│   `Markdown` element of at most 9,000 characters.                        │
│                                                                          │
│   > [!NOTE]                                                              │
│   ┃ Anthropic's `/diff` mod answers `ui.scroll` itself and keeps the     │
│   ┃ engine's window still. This design copies that pattern.              │
│                                                                          │
│   | Element  | Cap     | Source     |                                    │
│   | Markdown | 10,000  | types file |                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
  o outline  t top  f find  e edit  n/p next/prev change  ? keys  q close
```

The header row is Confluence's breadcrumb and read time and claude-code-file-preview's stats header. The mode word (READ or EDIT) is always visible, because mode slips come from hidden state. The left margin marker (`▌`) is Word's Simple Markup: one coloured column per block Claude changed in this turn, with the full diff one key away. The key hint row is claude-mdview's: one dim line of keys, each also a button.

### Outline and drill-in

```text
┌ docs/designs/doc-editor-design.md › Outline ─────────────────────────────┐
│ OUTLINE · 42 headings · Enter jumps · z folds · d drills in              │
├──────────────────────────────────────────────────────────────────────────┤
│   Executive Summary                                                      │
│   Problem Statement                                                      │
│ ▸ Product Requirements                                    (folded, 4)    │
│   Interaction Design and Mockups                                         │
│     The pane                                                             │
│   › The windowed renderer                                                │
│     The edit pipeline                                                    │
│ ▸ Implementation Phases                                   (folded, 5)    │
│   Design Decisions                                                       │
│     D-1: MVP scope                                        ✅             │
│     D-2: Rendering model                                  ✅             │
└──────────────────────────────────────────────────────────────────────────┘
```

The outline is Google Docs' and Notion's; folding is Notion's toggle headings and Word's Outline view; drill-in shows one section with its heading path above it, which is Craft's page-in-a-block and Org mode's sparse tree. `$.ui.scroll` to the heading's key is the jump.

### Point at a block and ask Claude

```text
│ › The pane draws only the rows in view. A document is cut into blocks   │
│   at headings, paragraphs, fences and tables.                   [ ✎ ]   │
│   ┌ Ask Claude to change this block ─────────────────────────────────┐   │
│   │ make this two sentences and name the /diff mod                   │   │
│   └──────────────────────────────────────────────────────────── Enter ┘   │
│   ⏳ Claude is editing lines 212-214 ...                                 │
```

After the edit lands:

```text
│ ▌ The pane draws only the rows in view. A document is cut into blocks   │
│ ▌ at headings, paragraphs, fences and tables, the way Anthropic's /diff │
│ ▌ mod cuts a diff into hunks.                                            │
│   ✔ Updated   [ k keep ]  [ x discard ]  [ r refine ]  [ v view diff ]   │
```

This is claude-mdview's hover-to-edit (the pencil, the one-line field, the status under the block) with Word Copilot's keep, discard or refine. The request goes through `$.prompt.submit({ asUser: true })` as `Edit lines <start>-<end> of <path>` plus the section, the block's first words and the instruction.

### Change review

```text
┌ docs/designs/doc-editor-design.md › Changes this session ────────────────┐
│ DIFF · turn 3 of 3 · 2 blocks · n/p next/prev · v rendered · q back      │
├──────────────────────────────────────────────────────────────────────────┤
│ @@ -212,2 +212,3 @@                                                      │
│ -The pane draws only the rows in view. A document is cut into blocks     │
│ -at headings, paragraphs, fences and tables.                             │
│ +The pane draws only the rows in view. A document is cut into blocks     │
│ +at headings, paragraphs, fences and tables, the way Anthropic's /diff   │
│ +mod cuts a diff into hunks.                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

The diff is a `Code` element with `format: 'diff'`, grouped by Claude turn as the built-in `/diff` mod groups its picker. GitBook's diff navigator gives the next and previous change keys. Discard writes the previous text back through the safe-write path as a new edit; the mod keeps no tracked-change store.

### Key map

The pane's own hotkeys are limited to one digit or one lowercase letter, and Tab and the arrows belong to Claude Code (research doc, section 1.1). The MVP key map therefore uses lowercase letters and the arrow keys and avoids the `less` symbols:

| Key | Action | Exemplar |
|---|---|---|
| Up, Down, PageUp, PageDown | Move between blocks and scroll | Pane focus rules |
| `o` | Outline | Google Docs, VS Code `Ctrl+Shift+O` |
| `z` | Fold or unfold the current heading; `a` all | Org mode, vim-markdown |
| `d` | Drill in to the current section; `u` up one level | Craft, Org sparse trees |
| `f` | Find; Enter next match; `b` previous | md-tui, claude-mdview |
| `g` | Go to a path, line or heading | Obsidian quick switcher |
| Enter on a link | Follow in place; `b` back | Frogmouth, claude-mdview |
| `e` | Edit mode: single-line field on the current block | Obsidian `Ctrl+E` |
| `c` | Ask Claude to change the current block | claude-mdview, GitBook agent |
| `n`, `p` | Next and previous changed block | GitBook diff navigator |
| `v` | View the turn's diff | Built-in `/diff` |
| `k`, `x`, `r` | Keep, discard, refine after an edit | Word Copilot |
| `t` | Top | less |
| `?` | Not available as a pane hotkey; the hint row is the help | Confluence `shift+?` |
| `q` | Close | less |

Phase 2 may move to the `less` map (`/`, `n`, `N`, `G`, `{`, `}`) inside a `Client`, if the Phase 0 spike shows a focused `Client` receives Tab, capitals and `/`.

## Architecture

```mermaid
flowchart LR
  subgraph plugin["plugins/doc-editor (Claude Code plugin)"]
    hooks["hooks/register.ts\n(mods API calls, panes, commands, tools)"]
    core["core/ (shared core)\nparse, blocks, outline, find, links,\nwindow, edits, tokens"]
    client["hooks/editor.tsx (Phase 2 Client)"]
    hooks --> core
    client --> core
  end
  cc["Claude Code engine\nMarkdown, Code, Box, Input, Client\n$.fs, $.process.run, $.prompt.submit"]
  hooks <--> cc
  bins["converters as processes\npdftotext, pdftoppm, lynx/w3m,\npandoc, node save helper"]
  hooks -- "$.process.run" --> bins
  tb["terminal-browser $.browser"]
  hooks -. "when installed" .-> tb
  subgraph later["packages/ (Phase 3)"]
    web["web app"]
    mcp["MCP App view + MCP server"]
  end
  web --> core
  mcp --> core
```

### Packages and the shared core

The plugin lives under `plugins/doc-editor` with `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts` and a `core/` folder of plain TypeScript. The hooks module imports the core by relative path. The core is dependency-free: no DOM, no Node, no timers, no `eval`, no WebAssembly, erasable TypeScript syntax only, plain JSON in and out, and no `$` parameter anywhere. Every call to the mods API stays in `hooks/register.ts`. A root `.claude-plugin/marketplace.json` lists the plugin so the repository is a marketplace. In Phase 3, `packages/web` and `packages/mcp-app` import the core by path or a workspace alias; the plugin needs no build step because its own code is source, and only a vendored parser is bundled once and committed in chunks under 1 MB (D-3, D-9, D-10).

### The windowed renderer

The core cuts a Markdown file into blocks at headings, paragraphs, lists, fences, tables and block quotes, each with its source range. The hooks module keeps a view state: file, offset in blocks, focused block, fold set, drill-in section and search. It answers the pane's `ui.scroll` event itself, rewriting the offset and returning without calling `next`, so the engine's window never moves, as Anthropic's `/diff` mod does. The file is read once through `$.fs.read`, which caps a document at 4 MiB; a larger file is refused with its size named, and a converter-backed format is read by the converter in page ranges. Each render draws the header, the blocks that fit `bodyRows`, and the hint row. Each block is a keyed `Markdown` element of at most 9,000 characters; a block longer than that is split at paragraph boundaries. Code blocks draw as `Code`, callouts as a bordered `Box` with a label, and tables are fitted to `bodyColumns` or drawn as one card per row. `$.ui.scroll` to a block's key is the jump for the outline, find and links. Images draw as their alt text in the MVP.

### The edit pipeline

A Claude-mediated edit: the user presses `c` on a block, types an instruction in an `Input`, and the mod submits `Edit lines <start>-<end> of <path>: <instruction>` with the section heading and the block's first words through `$.prompt.submit({ asUser: true })`. The mod records the turn id and the block's source range, draws a status under the block, and watches the file through `$.fs.read` on a 1.5 s clock and after Claude's `Write` and `Edit` tool calls (`tool.call` observed, never answered). When the file changes, the core re-parses, aligns old and new blocks by source text, marks changed blocks with the turn id, and the pane redraws with margin markers, keeping the focused block in view with `$.ui.scroll` `nearest`.

A pane edit: `e` on a heading, list item or table cell opens an `Input` with the block's source line; Enter writes the new line through the safe-write path. A checkbox toggle flips `[ ]` and `[x]` the same way.

The safe-write path: the mod compares the file's `mtimeMs` with the one it last read; on a mismatch it asks with `$.ui.ask` (reload, overwrite, cancel). It then runs the plugin's own `bin/save.mjs` through `$.process.run(['node', ...])` with the content on stdin and the expected `mtimeMs` and size as arguments. The helper writes a temporary file beside the target, re-reads the target's `mtimeMs` and size immediately before the rename, and renames only if they still match; otherwise it removes the temporary file and exits non-zero with the observed values, so an edit that landed between the mod's check and the rename is never overwritten. `$.fs.write` is used only when `node` is absent, with the non-atomic risk stated in the status row.

### Format converters

Every converter is a separate process. Its presence is probed once per session by running the binary itself with `--version` through `$.process.run` as an argument vector with no shell; a spawn failure means absent. Nothing is assumed from a path list. HTML inside Markdown converts in-process through the core's small HTML-to-Markdown subset. A full HTML file converts through `lynx -dump -nolist` or `w3m -dump` when present, else through the in-process subset, else it shows as source in `Code`. A live page opens through `$.browser.open` when terminal-browser is installed. A PDF converts through `pdftotext -layout -f <first> -l <last>` one page range at a time; where `Image` draws (kitty or Ghostty outside tmux) `pdftoppm -png -r 72` renders the page and the mod shows it; elsewhere the text grid stands. pandoc, when present, converts DOCX, ODT, RTF, AsciiDoc, reStructuredText, Org and LaTeX to GFM. Notebooks, CSV and EPUB convert in-process (nbformat JSON to blocks; PapaParse-style parsing; fflate unzip plus the HTML subset per chapter). The EPUB unzip refuses an entry whose declared size exceeds 32 MiB, an archive whose total exceeds 128 MiB, or an entry path that is absolute or contains `..`. Converted text is cached in `$.store` per file and `mtimeMs`.

## Data Model

```text
# core/types.ts (plain JSON; shared by the mod, the web app and the MCP App)

Block        { id: string; kind: "heading"|"paragraph"|"list"|"fence"|"table"|"quote"|"callout"|"thematic"|"html"|"raw";
               level?: number; text: string; start: number; end: number;   # 1-based line range in the source
               children?: Block[] }                                         # list items, quote content
Document     { path: string; mtimeMs: number; source: string; blocks: Block[];
               outline: { id: string; level: number; title: string }[];
               links: { blockId: string; href: string; kind: "file"|"heading"|"url" }[] }
ViewState    { path: string; offset: number; focus: string | null; folded: string[];
               drill: string | null; find: { query: string; hits: string[]; at: number } | null;
               mode: "read"|"edit"|"diff"; history: { path: string; focus: string | null }[] }
Change       { turn: string; blockIds: string[]; before: string; after: string; start: number; end: number }
EditRequest  { path: string; start: number; end: number; heading: string; firstWords: string; instruction: string }
Converter    { name: "lynx"|"w3m"|"pdftotext"|"pdftoppm"|"pandoc"|"node"; present: boolean; checkedAt: number }

# Two stores, by lifetime. `$.state` is reactive session state: a write redraws the sites that read
# it, it survives a reload of the mod and is reset by /clear, /resume and /branch. `$.store` is the
# machine-wide key-value store every session shares: 4 MiB of JSON in total, get-then-set not atomic,
# so one key per item and no read-modify-write across keys.
$.state   view:      ViewState               (this session's pane)
$.state   changes:   Change[]                (this session's Claude edits)
$.state   converters: Converter[]            (probed once per session)
$.store   doc-editor.converted.<sha256(path)>   { mtimeMs: number; markdown: string }   (cache, one key per file)
$.store   doc-editor.recent                      string[]                                (last 20 paths)

# plugins/doc-editor/.claude-plugin/plugin.json
{ "name": "doc-editor", "version": "0.1.0", "description": "...", "author": {...}, "license": "MIT" }

# .claude-plugin/marketplace.json (repository root)
{ "name": "doc-editor", "owner": {...}, "plugins": [ { "name": "doc-editor", "source": "./plugins/doc-editor", "description": "...", "version": "0.1.0" } ] }
```

The source text with line ranges is the canonical document. Edits are source-range replacements. The core never holds a rich-text model; a Phase 3 web editor round-trips to Markdown source.

## Integration

- Claude Code mods API: `ui.render` on the pane site; `ui.scroll` answered by the mod; `$.ui.scroll`, `$.ui.ask`, `$.ui.status`, `$.ui.notify`; `$.fs.read`; `$.process.run` for converters and the save helper; `$.prompt.submit({ asUser: true })` for Claude-mediated edits; `$.command.register` for `/doc`; `prompt.autocomplete` for paths after `/doc`; `$.tool.register` for a `show` tool Claude calls; `ui.render` on `ToolUse` and `ToolGroup` to add an open link under `Read`, `Write` and `Edit` rows; `tool.call` observed for `Write` and `Edit` to trigger a reload.
- terminal-browser: `$.browser.open` when its `$.browser` namespace exists; never a hard dependency (D-6).
- External binaries: `pdftotext`, `pdftoppm`, `lynx`, `w3m`, `pandoc`, `node`, each feature-detected (D-7, D-8, D-12).
- The fleet's mods design (ai-harness): doc-editor is a first-party plugin installed from this repository as a git marketplace; it registers no `tool.check`, answers no `tool.call`, calls no model, and makes no network request, which satisfies that design's D-4 and D-7 rules. Its `claude plugin validate` output is the allowlist a fleet machine checks.
- beads-ui: the same package layout and core conventions (D-9, D-10); a Phase 4 action files a block as a Beads issue through beads-ui's command, never by writing the Beads store itself.
- MCP App and web app (Phase 3): one MCP server serves the MCP App view's app-only tools and the web app's API; the view is the web app's second entry point built with `vite-plugin-singlefile` (D-15).

## Implementation Phases

<!-- doc:ac-rules:mirror:begin -->
- Every AC is independently testable — a test can fail if only this AC is violated.
- Every AC is falsifiable — "works correctly" is not an AC.
- Use EARS as the default for textual behavioral ACs: `When <trigger>, the system shall <response>` (event-driven); `While <state>` / `Where <feature>` (state-driven / optional); `If <condition>, then the system shall <response>` (unwanted-behavior / failure path). When a decision table, state machine, formula, executable Gherkin, property, or contract expresses the behavior more clearly, wrap it in an `<!-- ac-format: <value> ... --> ... <!-- /ac-format -->` scope (`decision-table` / `state-machine` / `formula` / `gherkin` / `property` / `contract`; unmarked ACs default to `ears`). Full per-format `ac-format` schemas are normative at `task-authoring-standards.md` § Per-Format AC Schemas — **always check that live source directly for the current schemas before relying on this reminder; this mirrored block itself can drift out of date and must never be treated as authoritative on its own.**
- At least one failure-path AC per public function changed — EARS `If <condition>, then the system shall …`, or the marked format's own negative-path convention (a decision table's infeasible-combination row, a state machine's invalid-transition row, a formula's invalid-input row).
- Replacement/refactor tasks: inventory the existing behaviors, then a parity AC for each (preserved, or intentionally dropped + reason).
<!-- doc:ac-rules:mirror:end -->

The design is approved as fully decided (Sergei, 2026-10-21), so implementation proceeds phase by phase. Each phase is filed as a child Beads issue of the epic with these ACs as its body; a phase is done when its exit gate is green. Tests run with `claude plugin test` (the core and the hooks module) and, from Phase 3, Vitest for the web packages (D-11).

### Phase 0: Spike and scaffold

- **Scope:** measure the five unknowns the research left open, then lay down the plugin, the core and the gate.
- **Deliverables:**
  - Files created: `.claude-plugin/marketplace.json`, `plugins/doc-editor/.claude-plugin/plugin.json`, `plugins/doc-editor/hooks/hooks.json`, `plugins/doc-editor/hooks/register.ts`, `plugins/doc-editor/core/types.ts`, `plugins/doc-editor/README.md`, `docs/research/evidence/ded-doc-editor/phase-0-spike.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
  - Files modified: `.gitignore` (add `.claude-plugin/types/`, `plugins/*/tsconfig.json`), `README.md`, `package.json` (npm workspaces)
  - Tests added: `plugins/doc-editor/hooks/register.test.ts` (loads, registers `/doc`), `plugins/doc-editor/core/vendor.test.ts` (each candidate library loads and parses)
- **Tasks + acceptance criteria:**
  - **T-0.1 Spike the unknowns**, recorded verbatim in the evidence file:
    - [x] `When a gallery-style pane draws a task list, strikethrough, a tree of 110,000 characters and a terminal Link with a non-https href on this host's Claude Code, the evidence file shall record what each drew, quoted from the screen.`
    - [x] `When the same pane draws an HTML comment, a CriticMarkup comment and a %% comment inside a Markdown element, the evidence file shall record whether each is hidden, shown as text or breaks the block.`
    - [x] `When a focused Client receives Tab, a capital letter and a slash, the evidence file shall record which of the three reached onKey.`
    - [x] `When text is selected inside the pane in fullscreen, the evidence file shall record what $.ui.selection() returned.`
    - [x] `When claude plugin test imports a copied micromark with mdast-util-from-markdown (default export condition), @codemirror/state, prosemirror-model and yjs, the test shall record for each whether it loaded and parsed a sample.`
    - [x] `If a candidate library fails to load, then the evidence file shall record the refusal verbatim and D-3 shall be re-run with that result.`
  - **T-0.2 Marketplace, plugin and core skeleton**
    - [x] `When claude plugin validate . runs at the repository root, the system shall exit 0 and list the doc-editor plugin.`
    - [x] `When claude plugin validate plugins/doc-editor runs, the system shall exit 0 and list exactly the hooks and calls the plugin README declares.`
    - [x] `If a file under plugins/doc-editor/core/ imports anything but a relative path, then the core lint test shall fail naming the file and the import.`
    - [x] `If a file under plugins/doc-editor/core/ references document, window, process, setTimeout or $, then the core lint test shall fail naming the file and the token.`
  - **T-0.3 Repository hygiene**
    - [x] `When the repository is read, CONTRIBUTING.md, SECURITY.md and CODE_OF_CONDUCT.md shall exist and the README shall say the Copier template is private, or link it if D-16 made it public.`
    - [x] `When a plugin is loaded with --plugin-dir, git status shall report no untracked file under plugins/doc-editor.`
    - [x] `If any of CONTRIBUTING.md, SECURITY.md or CODE_OF_CONDUCT.md is missing, or the README neither states the template is private nor links a public template, then the hygiene test shall fail naming the file or sentence.`
- **Exit gate:** T-0.1's evidence file committed with every unknown answered or marked unanswerable with the reason; `claude plugin validate` green at the root and the plugin; `claude plugin test` green; D-3 and D-5 re-run on the spike's answers and their records updated.

### Phase 1: MVP reader with Claude-mediated editing

- **Scope:** FR-1 to FR-7 for Markdown.
- **Deliverables:**
  - Files created: `plugins/doc-editor/core/{parse,blocks,outline,find,links,window,changes,html-subset}.ts`, `plugins/doc-editor/hooks/{pane,header,hints,commands,tools,rows,watch}.ts`, `plugins/doc-editor/bin/save.mjs`, `plugins/doc-editor/core/vendor/` (the committed parser chunks, D-3)
  - Files modified: `plugins/doc-editor/hooks/register.ts`, `plugins/doc-editor/README.md`
  - Tests added: `plugins/doc-editor/core/*.test.ts` (parse, blocks, window, changes, find, links against fixture files including a 1,000-line and a 20,000-line doc), `plugins/doc-editor/hooks/*.test.ts` (pane render under the test kit, scroll handling, command and tool registration, row link, safe write)
- **Tasks + acceptance criteria:**
  - **T-1.1 Open and render**
    - [ ] `When the user runs /doc <path> for an existing Markdown file, the system shall open the pane with the header row, the first blocks and the hint row within one render.`
    - [ ] `When a path carries :N or #heading, the system shall scroll so that line N or that heading is the focused block.`
    - [ ] `When Claude's Read, Write or Edit row names a .md file, the system shall draw an open link under that row that opens the pane on that file.`
    - [ ] `When Claude calls the show tool with a path, the system shall open the pane on that path.`
    - [ ] `If the path does not exist, is over 4 MiB or is not UTF-8 text, then the system shall show one status row naming the reason and open no pane.`
  - **T-1.2 Window and budget**
    - [ ] `When a 20,000-line Markdown file is open, every render shall emit a tree under 100,000 serialized characters and no Markdown element over 9,000 characters.`
    - [ ] `When the pane receives ui.scroll, the system shall rewrite its own offset, return without calling next, and redraw the rows in view.`
    - [ ] `If a block exceeds 9,000 characters and contains paragraph boundaries, then the system shall split it at those boundaries into keyed elements that render in order.`
    - [ ] `If a single fence, table or other indivisible block exceeds 9,000 characters, then the system shall draw it as consecutive Code slices of at most 9,000 characters with a continuation marker on each, in order.`
  - **T-1.3 Navigate**
    - [ ] `When the user presses o, the system shall show the outline; when the user presses Enter on an entry, the system shall scroll the pane so that heading is the focused block.`
    - [ ] `When the user presses z on a heading, the system shall hide its section's blocks until z is pressed again; when the user presses a, the system shall fold or unfold every heading.`
    - [ ] `When the user presses d on a section, the system shall draw only that section with its heading path in the header; u shall return to the whole document.`
    - [ ] `When the user types a find query and presses Enter, the system shall focus the next block containing it and show the hit count in the header; b shall go to the previous hit.`
    - [ ] `When the user presses Enter on a link to a file or heading in the repository, the system shall open it in place and push the previous position; b shall return to it.`
    - [ ] `If a link points outside the repository or to a missing file, then the system shall show the reason in the status row and not navigate.`
  - **T-1.4 Ask Claude to change a block**
    - [ ] `When the user presses c on a block and submits an instruction, the system shall call $.prompt.submit with asUser true and a text that names the path, the line range, the heading, the block's first words and the instruction, and shall draw a waiting status under the block.`
    - [ ] `When the file changes after the request, the system shall re-parse and mark every changed block with the turn id.`
    - [ ] `When changed blocks are marked, the system shall redraw with a margin marker on each and keep the focused block in view.`
    - [ ] `When a turn's edit has landed, the system shall draw the keep, discard, refine and view-diff actions under the changed block.`
    - [ ] `If the session is busy when the request is made, then the system shall queue the request and say so in the status row; it shall not block the hook.`
  - **T-1.5 Review changes**
    - [ ] `When the user presses v, the system shall draw the turn's unified diff in a Code element with format diff, grouped by turn.`
    - [ ] `When the user presses n or p, the system shall focus the next or previous changed block.`
    - [ ] `When the user presses x on a changed block, the system shall write the block's previous text back through the safe-write path and clear its marker.`
    - [ ] `When the user presses r, the system shall open the ask field prefilled with the previous instruction.`
    - [ ] `If the file's current text at a changed block no longer matches the text recorded after the turn, then x shall refuse the discard and say the block changed again.`
  - **T-1.6 Edit in the pane**
    - [ ] `When the user presses e on a heading, list item or table cell, the system shall open a single-line field with that line's source; Enter shall save it through the safe-write path.`
    - [ ] `When the user presses Enter on a task-list checkbox, the system shall toggle [ ] and [x] on that line and save it.`
    - [ ] `If the field's text contains a newline, then the system shall refuse the save and say why.`
  - **T-1.7 Reload and write safety**
    - [ ] `When the file's mtimeMs changes, the system shall re-read it within 1.5 s or on the next Write or Edit tool call, redraw, and keep the focused block in view.`
    - [ ] `When a save is requested and the file's mtimeMs differs from the last read, the system shall ask through $.ui.ask (reload, overwrite, cancel) before writing.`
    - [ ] `When node is present, every save shall pass the expected mtimeMs and size to the helper, which shall write a temporary file beside the target, re-check both immediately before the rename, and rename only on a match.`
    - [ ] `If the helper's re-check finds a different mtimeMs or size, then it shall remove the temporary file, exit non-zero naming both values, and the target shall be unchanged.`
    - [ ] `If node is absent, then the system shall write with $.fs.write and state the non-atomic risk in the status row once per session.`
    - [ ] `If the save helper exits non-zero, then the system shall leave the target unchanged and show the helper's last stderr line.`
  - **T-1.8 Safety floor**
    - [ ] `While the plugin is loaded, claude plugin validate shall list no tool.check hook, no tool.call handler that returns a result, no model call and no network call.`
    - [ ] `If a change adds a tool.check hook, a tool.call handler that returns a result, a model call or a network call, then the gate test over the validate output shall fail naming the hook or call.`
- **Exit gate:** `claude plugin test` green on every Phase 1 test; `claude plugin validate` green; the pane observed live on this host inside tmux with a 1,000-line doc (open, outline jump, fold, find, link and back, one Claude-mediated edit with markers and diff, one checkbox toggle), with the session's `/plugin` line and screenshots quoted in the PR; fresh-context diff review against these ACs.

### Phase 2: HTML and PDF as text, and the in-pane editor

- **Scope:** FR-8, FR-9, FR-10, the `less` key map if the spike allowed it.
- **Deliverables:**
  - Files created: `plugins/doc-editor/core/{convert,pdf-pages}.ts`, `plugins/doc-editor/hooks/{converters,editor-host}.ts`, `plugins/doc-editor/hooks/editor.tsx` (the `Client` module), `plugins/doc-editor/bin/convert.mjs`
  - Tests added: converter detection and fallbacks with stubbed `$.process.run`, PDF page ranges, HTML subset conversion fixtures, editor state (caret, selection, undo) tests, `Client` module load test
- **Tasks + acceptance criteria:**
  - **T-2.1 HTML**
    - [ ] `When the user opens an .html file and lynx or w3m is present, the system shall convert it to text through that binary and render the result as blocks.`
    - [ ] `When neither is present, the system shall convert through the in-process subset and mark the header "subset".`
    - [ ] `When terminal-browser's $.browser namespace exists and the user presses w, the system shall open the file or URL through $.browser.open.`
    - [ ] `If the converter times out or exits non-zero, then the system shall show the source in a Code element and the reason in the status row.`
  - **T-2.2 PDF**
    - [ ] `When the user opens a .pdf and pdftotext is present, the system shall render pages 1 to 5 as text blocks with page markers and load further ranges as the user scrolls past them.`
    - [ ] `Where Image draws, when the user presses i, the system shall render the current page through pdftoppm and draw it as an Image; elsewhere the key shall say pictures are unavailable here.`
    - [ ] `If pdftotext is absent, then the system shall say so in one status row and open no pane.`
  - **T-2.3 In-pane editor**
    - [ ] `While the terminal is in fullscreen rendering and the user presses E on a block, the system shall mount a Client editor over the block's source with a caret and selection.`
    - [ ] `When the user types, deletes, moves the caret or selects, the editor shall update within one frame and post the change to the hooks module.`
    - [ ] `When the user presses ctrl+u, the editor shall undo the last change, up to 200 steps.`
    - [ ] `When the user presses Esc, the editor shall close, and Enter in the confirm row shall save through the safe-write path.`
    - [ ] `If the session is not in fullscreen or no click has focused the Client, then the system shall say the in-pane editor needs fullscreen and offer e and c instead.`
  - **T-2.4 Key map upgrade (only if T-0.1 showed Tab, capitals and slash reach a Client)**
    - [ ] `When the pane hosts the key Client, /, n, N, g, G, { and } shall act as in less and Claude Code's transcript mode, and the hint row shall list them.`
    - [ ] `If the key Client is not focused or does not receive a key the map expects, then the pane shall keep the lowercase map active and the hint row shall show it, with no key lost.`
- **Exit gate:** tests green; the HTML and PDF routes observed live on this host with `pdftotext` present; the `Client` editor observed live in fullscreen on a kitty or Ghostty terminal; fresh-context diff review against these ACs.

### Phase 3: Web app and MCP App

- **Scope:** FR-11, FR-12, D-15.
- **Deliverables:**
  - Files created: `packages/core` (if D-9 moves the core out of the plugin, with the copy step), `packages/web`, `packages/mcp-app`, `packages/mcp-server`
  - Tests added: Vitest suites for the web and MCP App packages; a single-file build check for the MCP App
- **Tasks + acceptance criteria:**
  - [ ] `When the web app opens a Markdown file, it shall render the same blocks the mod renders from the same core, with the same outline and link index.`
  - [ ] `When the MCP App view is built, the build shall produce one HTML file under the host's resource size and declare no undeclared domain in ui.csp.`
  - [ ] `When Claude Desktop runs the MCP server locally and the display_document tool is called, the view shall open full screen and call updateModelContext with the visible section.`
  - [ ] `If the MCP server receives a save from the view for a file that changed since it was read, then it shall refuse and return the conflict to the view.`
  - [ ] `When pandoc is present and the mod or server opens a DOCX, ODT, RTF, AsciiDoc, reStructuredText, Org or LaTeX file, the system shall convert it to GFM and render it; when pandoc is absent it shall say so.`
  - [ ] `When the mod opens an .ipynb, .csv or .epub file, the system shall convert it in-process and render it.`
  - [ ] `If an EPUB entry declares a size over 32 MiB, the archive's total declared size exceeds 128 MiB, or an entry path is absolute or contains .., then the system shall refuse the file and name the offending entry.`
- **Exit gate:** tests green; the MCP App observed in Claude Desktop; the web app observed in a browser; fresh-context diff review.

### Phase 4: Enhancements

FR-13, each started once the MVP has been used: inline comments per D-17 (first slice: pending comments in `$.state` sent to Claude in one batch; second slice: the MRSF-shaped sidecar with re-anchoring and the three comment tools), backlinks from a repository scan, transclusion only if a syntax is adopted, filing a block as a Beads issue through beads-ui, authorship colour for Claude's text from turn records, and picture routes beyond kitty and Ghostty if `Image` gains tmux passthrough upstream.

## Implementation Audit

| # | Phase | Section / Decision | Verified | Notes |
|---|-------|--------------------|---------|-------|
| 1 | N/A | **Design Overview filled**: confirm the `## Design Overview` section above is filled in with concrete implementation knowledge, not left as a stub | - [ ] | |
| 2 | Phase 0 | T-0.1 spike answers folded into D-3 and D-5; marketplace and core lint (D-9, D-10, D-11) | - [x] | PASS 2026-10-21. Spike evidence `docs/research/evidence/ded-doc-editor/phase-0-spike.md` answers every unknown; D-3 and D-5 re-run, both unchanged. D-9: the core is `plugins/doc-editor/core/`, `$`-free and DOM-free, held there by the scope-aware `scripts/check-core-purity.mjs`. D-10: root `.claude-plugin/marketplace.json` over `plugins/doc-editor`, npm workspaces. D-11: `npm test` runs the Vitest repository checks then `claude plugin test`, and the validate, declared-list, size and type checks run at commit and push; without a usable `claude` they report not run. Codex review findings fixed or justified in the Run Ledger |
| 3 | Phase 1 | D-1 scope, D-2 windowed renderer, D-4 Claude-mediated edit and review, D-12 safe write, D-13 transcript links, NFR-1 to NFR-9 | - [ ] | |
| 4 | Phase 2 | D-6 HTML, D-7 PDF, D-14 pictures, the `Client` editor | - [ ] | |
| 5 | Phase 3 | D-8 other formats, D-9 core home, D-15 web app and MCP App | - [ ] | |

**Audit completed:** <!-- YYYY-MM-DD -->

## Risks and Mitigations

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | The mods API is weeks old and changing; the reference lags the binary and the types file lags both | A pinned behaviour stops working after an update | Pin to 2.1.296 features, read the types the host writes, list 2.1.299+ props as enhancements; Phase 0 records the version each test ran on |
| 2 | Three vendor facts conflict (task lists, over-budget trees, terminal `Link`) | A renderer built on the wrong reading blanks the pane | T-0.1 settles each on this host before Phase 1; the renderer budgets to the stricter reading either way |
| 3 | The 1 MB module cap is reported by mod authors and absent from Anthropic's pages | A vendored parser silently fails to load | Commit vendor chunks under 1 MB and test each loads under `claude plugin test`; keep the hand-rolled splitter as the fallback (D-3) |
| 4 | A mod runs unsandboxed with the user's permissions, and converters run external binaries on untrusted documents | A crafted PDF or HTML file runs code as the user | Converters run with no shell, argument vectors only, a timeout, and on the user's explicit open; no converter output is executed; NFR-4 and NFR-9 keep the mod from calling models, the network or approving tool calls |
| 5 | `$.fs.write` is not atomic and an outside editor can race the mod | A half-written or clobbered file | D-12: write-then-rename helper, `mtimeMs` check, `$.ui.ask` on conflict; discard is a new edit, never a hidden store |
| 6 | Clicks and the `Client` work only in fullscreen, and tmux needs mouse mode | Keyboard-only sessions lose features | NFR-2: every MVP feature works with keys alone; the `Client` editor is Phase 2 and offers `e` and `c` as fallbacks |
| 7 | Redrawing transcript rows collides with other mods | A reply mod stops drawing | D-13: add a link under tool rows only, never redraw whole replies |
| 8 | Prior art is days old (0 to 19 stars) | A borrowed pattern has unknown bugs | Borrow patterns and small MIT pieces with attribution; install no third-party mod; every borrowed behaviour has its own AC |
| 9 | pandoc and MuPDF are GPL or AGPL | Licence contamination of an MIT repository | NFR-7: call them as binaries only after a licence review; vendor nothing from them |
| 10 | The sibling beads-ui fixes a different package layout | Two public repos with incompatible cores | D-9 and D-10 name the layout; compare with beads-ui's design before Phase 3 fixes package names |
| 11 | A document over 4 MiB cannot be read by `$.fs.read` | Large PDFs and notebooks fail | Converters read the file themselves and return page ranges; the mod reads only converted text |

## Run Ledger

`ledger-version`: 1

The restart contract for the build runs that implement this design. One authority row per run; transition rows record each stage verdict.

| Run ID | Contract | Decision classes | Push |
|---|---|---|---|
| `doc-editor-build-2026-10-21-aih-ec2-3` | `auto-flow/AIH-701#d-7` | `["adn:in-scope"]` | `true` |

| Transition | Round | Verdict | Basis | Items | Recorded by | Commit |
|---|---:|---|---|---|---|---|
| `entry->implement` | 0 | `advance` | `explicit` | Sergei, 2026-10-21: "it appears all the doc editor design doc decisions are already made. if they're already made, then why aren't you bilding them". All 17 decisions are resolved and no Open Question blocks Phase 0 or Phase 1. | `session` | `53b303b` |

Resolved plan for this run: stages Phase 0 (T-0.1 to T-0.3) then Phase 1 (T-1.1 to T-1.8); implementation by Claude engineer children on Opus (the machine profile's default delegation family); cross-family review of each merged child and each phase diff by Codex (`cx review`, read-only); integration mode `parent` with integration ownership; at most 2 concurrent children. Target: doc-editor `main` at `53b303b`; integration worktree `.worktrees/aih-ec2-3-agents/ded-build` on branch `wt/aih-ec2-3/ded-build`. Stage cursor: Phase 0. Last completed integration boundary: none.

Expression repairs this run made (Authority test Gate C, `✅ Resolved by Opus orchestrator (doc-editor build coordinator)`, model `claude-opus-5-5`):

1. D-11's mitigation sentence. Before: "the script skips `claude plugin test` with the runner's verbatim reason when the binary is absent or below the floor, never a false green". After: "when the binary is absent or below the floor, the script reports the plugin tests as not run and prints the runner's verbatim reason, never a false green". The ratified intent is that same sentence: no plugin-test run without the binary, the runner's reason printed, no false green. The fleet's lexical founding-ask check read the old verb as a requirement being given up; the new wording says the same thing affirmatively. Not changed: what the gate does when `claude` is missing or too old.

Phase 0 children (each Claude engineer on Opus, model `us.anthropic.claude-opus-5-5[1m]`, effort medium, in its own worktree): T-0.1 the spike (branch `wt/aih-ec2-3/ded-t-0-1-spike-five-qexn`); T-0.2 and T-0.3 the scaffold, gate and hygiene (branch `wt/aih-ec2-3/ded-t-0-2-marketplace-rngv`, which also carried the review fixes below).

Phase 0 cross-family review (Codex `review` role, model `gpt-5.6-sol`, effort medium, read-only), findings and dispositions:

| # | Finding | Disposition |
|---|---|---|
| 1 | The spike's tree case is 110,055 characters, not 110,000 | Justified. The criterion tests a tree over the 100,000 budget. `big1` holds 110,000 characters in one element and `big` 110,000 in eleven, each plus the 55-character header every pane draws; both are over budget, which is what was measured |
| 2 | Beads task ids and session names appear in public files | Justified by the owner's own words for this repository (A001): "its fine to have the beads store etc in the repo for that one. no need to scrub beads task ids or whatever. and no need to scrube any private repo names either." Host and employer names, which that sentence does not cover, were removed from every committed doc |
| 3 | A gate that cannot run exits 0, and pre-commit hides its "did NOT run" line behind `Passed` | Fixed: the skipping hooks print their output, and `npm test` ends with a line naming any gate that did not run (D-11's "never a false green") |
| 4 | The core purity lint resolved bindings per file, so a name bound in one scope hid a free use in another; it also missed `self.document`, aliases of `globalThis`, computed access and an aliased `require` | Fixed: scope-aware resolution, with a fixture for each case in both directions |
| 5 | The spike's vendor test never ran inside the finished plugin | Fixed: it ran in the tree after both branches merged (6 tests, 2 files, all pass), recorded in the spike's Gaps |
| 6 | The hygiene test checks a fixed list of files a load writes, not a live load | Justified: a commit hook cannot start a Claude Code session. The list is what a load was measured to write on 2.1.306, a live load at the integration tip left `git status` clean under the plugin, and the Phase 1 live check repeats that |
| 7 | T-0.1's screen findings have no regression assertions | Justified: T-0.1's criteria are measurements of the engine, recorded in the evidence file. The behaviours they call for (task-marker glyphs, dropped comments, link validation) are Phase 1 core work with their own tests |

<!-- /doc:region name="overview" -->

<!-- doc:region name="decisions" kind="replaceable" -->

## Design Decisions

### Decision Summary

| # | Decision | Options Considered | Recommended (AI) | Chosen | Diverged? | Rationale | Status |
|---|----------|-------------------|------------------|--------|-----------|-----------|--------|
| D-1 | MVP scope | (a) Markdown reader only, (b) reader plus Claude-mediated editing and single-line pane edits, (c) full in-pane editor in the MVP | (b) | | | A mod has no multi-line field, and three apps already route block edits through an agent; (b) is the smallest build that delivers "view and edit" (crit. 5) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-2 | Rendering model | (a) engine `Markdown` per block with the pane's `ui.scroll` answered by the mod, (b) own line renderer over `Text` and `Box`, (c) one `Markdown` element per file | (a) | | | Removes the 100,000-character ceiling and reuses the engine's renderer; the `/diff` mod proves the pattern (crit. 2, 5) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-3 | Block splitting and parser | (a) hand-rolled regex splitter, (b) vendored micromark plus mdast as committed chunks under 1 MB, (c) marked | (b), with (a) as the fallback if the spike fails | | | A real CommonMark parser gives positions, nesting and GFM; the loader rules make a committed bundle the only route (crit. 1, 3) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-4 | Editing model | (a) Claude-mediated point-and-ask plus `Input` single-line edits and checkbox toggles, then a `Client` editor in Phase 2, (b) `Client` editor in the MVP, (c) hand the file to `$EDITOR` | (a) | | | Works on the main screen and in tmux; the `Client` needs fullscreen and a click; davekiss/md proves Phase 2 is feasible (crit. 2, 5) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-5 | Key map and input | (a) lowercase hotkeys and arrow keys in the pane, (b) `less` map inside a `Client`, (c) both from the start | (a) for the MVP, (b) in Phase 2 if the spike permits | | | Pane hotkeys are one lowercase letter or digit; whether a `Client` gets Tab, capitals and `/` is unmeasured (crit. 1) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-6 | HTML route | (a) text: in-process subset, `lynx` or `w3m` when present, `$.browser.open` when terminal-browser is installed, (b) headless-Chrome screenshots, (c) no HTML in Phase 2 | (a) | | | Text works in tmux and remote; screenshots need `Image` and lose links; terminal-browser already exposes `$.browser` (crit. 2) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-7 | PDF route | (a) `pdftotext -layout` page ranges plus `pdftoppm` where `Image` draws, (b) pdf.js in a `node` sidecar, (c) no PDF | (a), (b) as a later fallback | | | poppler is on this host and needs no vendoring; pdf.js's worker exceeds the module cap and the sidecar needs a 35 MB vendor tree (crit. 3, 4) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-8 | Other formats | (a) pandoc feature-detected for Office and markup formats, in-process for notebooks, CSV and EPUB, (b) markitdown in Python, (c) none | (a) | | | pandoc covers twelve formats behind one binary; the three in-process formats are small JSON or ZIP work (crit. 3) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-9 | Shape and home of the shared core | (a) dependency-free TypeScript source inside the plugin directory, imported by path from the web and MCP App packages, (b) `packages/core` with a copy build into the plugin, (c) a symlink from the plugin into the marketplace | (a) for the MVP; (b) or (c) revisited in Phase 3 after the spike | | | An installed plugin copies only its own directory; (a) needs no build step and no drift check while the mod is the only consumer (crit. 1, 3) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-10 | Repository layout and distribution | (a) root `marketplace.json` over `plugins/doc-editor`, `packages/` for later surfaces, npm workspaces, (b) one flat plugin at the repository root, (c) publish into the ai-harness mods marketplace | (a) | | | Matches hamzafer's gate shape and beads-ui's plan; keeps the repo public and standalone (crit. 2) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-11 | Testing and the merge gate | (a) `claude plugin validate` and `claude plugin test` for the plugin, Vitest for the web packages, run by pre-commit and pre-push, (b) Vitest only, (c) validate only | (a) | | | `claude plugin test` runs without a session in the mod's own environment, so it is also the conformance check that the core loads there (crit. 2) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-12 | Write safety | (a) write-then-rename `node` helper, `mtimeMs` check, `$.ui.ask` on conflict, (b) `$.fs.write` directly, (c) Claude performs every write | (a) | | | `$.fs.write` is documented non-atomic; a lost update is a one-way door for the user's text (crit. 1) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-13 | Transcript integration | (a) `/doc` command, a `show` tool, and an open link under `Read`, `Write` and `Edit` rows; never redraw whole replies, (b) redraw reply rows to link paths, (c) command only | (a) | | | A mod that redraws a row without passing it on blocks later mods; a link under tool rows is what both Markdown mods do (crit. 2) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-14 | Pictures in the terminal | (a) alt text in the MVP, `Image` where it draws in Phase 2, no `Raster` thumbnails, (b) `Raster` half-block thumbnails everywhere, (c) `Image` only | (a) | | | `Image` fails in tmux and `Raster` thumbnails cannot show document pictures legibly; alt text costs nothing (crit. 5) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-15 | Web app and MCP App timing | (a) after the mod MVP, as Phase 3, the MCP App as the web app's second entry point, (b) in parallel with the mod, (c) never | (a) | | | The mod is the ask's first surface; the MCP App and web app share UI and need the core to settle first (crit. 3) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |
| D-16 | Visibility of the private Copier template | (a) make `sergeiwallace/project-template` public, (b) keep it private and say so in the README, (c) remove the `copier update` instruction | (b) | | | Only (a) is an outward-facing act (Authority test Gate A); (b) is reversible and within the launching session's authority, so aih-3 took it and applied it in PR #7 (merge 53ea548); Sergei may still choose (a) later | `✅ Resolved by aih-3 (Opus 5.5)` |
| D-17 | Where inline comments on a Markdown file live (Phase 4) | (a) in the text (CriticMarkup or HTML comments), (b) a repository sidecar with text-quote anchors (MRSF shape, JSON), (c) a Beads issue per comment quoting the block | (b), with (a) HTML comments as the fallback and (c) as a conversion a comment can become | | | GitHub hides only HTML comments and shows CriticMarkup raw; a sidecar keeps the source clean and re-anchors by quote as Hypothesis does; MRSF's orphan rule keeps every comment; Beads loses position (crit. 2, 5) | `✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb)` |

### Decision Details

Every decision below was run through the fleet's decision framework: the five criteria in order, the scorer, and the Authority test. Fresh authoring of open decisions in a doc this run was asked to author uses the scorer directly; the one item that fires a gate is D-16.

<a id="d-1"></a>

#### D-1: MVP scope — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (b)

**Context.** The ask is "view and edit". The research found that a mod has a one-line `Input` and no rich-text element, that no element reads the keyboard before a click except through the pane's hotkeys, and that GitBook, Confluence and Word already route block edits through an agent. The MVP decides what "edit" means on day one.

##### (a) Markdown reader only

**Pros:**
- Smallest build; every feature works with keys alone.

**Cons:**
- Delivers half the ask; the pane cannot change the file at all.

##### (b) Reader plus Claude-mediated editing and single-line pane edits

**Pros:**
- Delivers "edit" through the surface a Claude Code user already has (the prompt), with the pane supplying the file, the line range and the review.
- Single-line fields and checkbox toggles cover the small edits that are tedious to ask for.
- Works on the main screen, in tmux and over a remote link.

**Cons:**
- Every paragraph edit costs a Claude turn.
- In-place typing waits for Phase 2.

##### (c) Full in-pane editor in the MVP

**Pros:**
- Closest to Notion or Google Docs.

**Cons:**
- Needs a `Client`, which receives keys only after a click in fullscreen; a keyboard-only session cannot type into it.
- A large build (caret, selection, undo, wrapping) before the reader exists; one shipped example (davekiss/md) is 0 stars and eleven days old.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (b) Reader plus Claude-mediated editing and single-line pane edits
<!-- decision-record: chosen-option=(b); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-1; decision-topic=doc-editor-mvp-scope; governs=plan:doc-editor/phase-1; normalized-proposition=the-mvp-is-a-markdown-reader-with-claude-mediated-editing-and-single-line-pane-edits; applicability=repo:doc-editor; outcome-id=mvp-scope; relation=different-question; related-decision-id=DED-b3p/D-4; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 5 resolves it: Claude-mediated editing is structural for a product that is definitely being built beside an agent, and the in-pane editor is a feature the research shows needs a surface the MVP cannot assume. Mitigations for (b)'s cons: the per-turn cost is bounded by batching (Phase 4's pending comments) and by the single-line field for small edits; Phase 2 adds the `Client` editor with `e` and `c` as the keyboard fallbacks. This is a two-way door with a contained blast radius; the ask's wording "view and edit" is met, and the narrowing from in-place typing to Claude-mediated typing is stated here with its evidence for Sergei's review. Confidence: high.

---

<a id="d-2"></a>

#### D-2: Rendering model — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** One `Markdown` element takes at most 10,000 characters and a tree draws at most 100,000; a mod author reports an over-budget tree is refused outright. Every existing Markdown mod pages or caps the file. Anthropic's `/diff` mod answers `ui.scroll` itself and keeps the engine's window still.

##### (a) Engine `Markdown` per block, windowed by answering `ui.scroll`

**Pros:**
- Any document up to the 4 MiB read cap fits; each redraw is at most the visible rows.
- Reuses the engine's renderer, so headings, tables, fences and links look like Claude's replies.
- `$.ui.scroll` to a keyed block gives jump-to-heading, find and links for free.

**Cons:**
- The mod owns scrolling, so a bug there freezes the pane; `claude-code-file-preview` notes a scroll the mod starts may not reach its own hook.
- What the element draws for task lists and strikethrough is unsettled (T-0.1).

##### (b) Own line renderer over `Text` and `Box`

**Pros:**
- Full control over every glyph and wrap; needed for the `Client` editor's rows anyway.

**Cons:**
- Rebuilds what the engine already renders; drifts from Claude's reply style; large build.

##### (c) One `Markdown` element per file

**Pros:**
- Trivial.

**Cons:**
- Fails at 10,000 characters; claude-mdview's author reports the whole tree refused.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Engine `Markdown` per block, windowed by answering `ui.scroll`
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-2; decision-topic=doc-editor-rendering-model; governs=component:doc-editor/plugins/doc-editor/hooks/pane; normalized-proposition=render-one-keyed-markdown-element-per-block-and-window-the-visible-rows-by-answering-ui-scroll; applicability=repo:doc-editor; outcome-id=windowed-renderer; relation=different-question; related-decision-id=DED-b3p/D-3; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 2 resolves it: the renderer is the foundation every other feature draws on, and (c) is a one-way door into the cap. Mitigations for (a)'s cons: the scroll handler is table-tested under `claude plugin test` with a 20,000-line fixture (T-1.2), and the renderer budgets to 9,000 per element and 60,000 per tree as the shipped mods do, so a refused tree is unreachable; T-0.1 settles the task-list question before Phase 1, and the core's own glyph rewrite (as claude-gfm-render does) is the fallback. Confidence: high.

---

<a id="d-3"></a>

#### D-3: Block splitting and the Markdown parser — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (b)

**Context.** The engine renders Markdown, but the mod still needs block boundaries, source positions, an outline and a link index. A hooks module imports only its own files, has no npm resolution, and three mod authors report a 1 MB file cap. micromark with mdast-util-from-markdown is 16 kB gzipped, MIT, and documented DOM-free with the default export condition; it was not load-tested in the mod environment.

##### (a) Hand-rolled regex splitter

**Pros:**
- No vendoring; two shipped mods work this way.

**Cons:**
- Misses nested lists, fenced-in headings, tables with pipes in cells and HTML blocks; every bug is ours.

##### (b) Vendored micromark plus mdast-util-from-markdown as committed chunks under 1 MB

**Pros:**
- CommonMark and GFM correctness with source positions; the mdast tree is the document model the web app and MCP App share.
- Small enough for one chunk.

**Cons:**
- A developer-time bundle step whose output is committed; the fleet design's no-build-step rule now holds only for the mod's own code.
- One dependency's `browser` build calls `document.createElement`; the bundle must use the default condition.
- Load in the mod environment is unmeasured until T-0.1.

##### (c) marked

**Pros:**
- No dependencies, 14 kB.

**Cons:**
- Its lexer tokens carry no source positions by default; its licence reads "Other" on GitHub.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (b) Vendored micromark plus mdast-util-from-markdown as committed chunks under 1 MB, with (a) as the fallback if T-0.1 shows it does not load
<!-- decision-record: chosen-option=(b); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-3; decision-topic=doc-editor-markdown-parser; governs=component:doc-editor/plugins/doc-editor/core/parse; normalized-proposition=the-core-parses-markdown-with-a-vendored-micromark-and-mdast-bundle-committed-in-chunks-under-one-megabyte; applicability=repo:doc-editor; outcome-id=markdown-parser; relation=different-question; related-decision-id=DED-b3p/D-9; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 1 resolves it: the document model is what every surface and every edit depends on, so the parser is a one-way door once positions and block ids are in use. Mitigations for (b)'s cons: the bundle step is a script in the repository with its output committed and a pre-commit check that each chunk is under 1 MB and matches the script's output; the bundle is built with the default export condition and a core lint test fails on `document`; T-0.1 load-tests the bundle before Phase 1 and the hand-rolled splitter from the shipped mods is the recorded fallback. Confidence: medium, pending T-0.1.

> **Decision (re-run on the T-0.1 spike, 2026-10-21):** ✅ Resolved by Opus orchestrator (doc-editor build coordinator) — (b) stands: the vendored micromark plus mdast-util-from-markdown bundle, with the GFM extensions, as one committed chunk under 500 KB
<!-- decision-record: chosen-option=(b); ai-family=claude; ai-model=claude-opus-5-5; ai-effort=medium; ai-profile=architect -->

The spike ([phase-0-spike.md](../research/evidence/ded-doc-editor/phase-0-spike.md), section "Vendored libraries under claude plugin test") measured the bundle loading and parsing GFM with positions under `claude plugin test` on 2.1.306, and loading in a live hooks module. No library failed, so option (a) is not triggered and stays recorded as the fallback. The bundle is 297,031 bytes in one chunk, built by `scripts/bundle-vendor.mjs` with the default export condition, and a rebuild reproduces it byte for byte. Its nine `document` matches are micromark's own local binding, property names and strings; none reaches the DOM global, and the core purity lint resolves identifiers rather than words, so it passes the bundle and still fails on a free `document`. One finding changes how the core feeds the engine rather than which parser it uses: the `Markdown` element draws task markers `[ ]` and `[x]` as literal text and shows HTML, CriticMarkup and `%%` comments as text, so the core rewrites task markers to glyphs and drops comments from the text it hands the element (D-2's named fallback). The repository's 500 KB file limit is stricter than the 1 MB chunk rule and satisfies it. Same conclusion as the original call. Confidence: high.

---

<a id="d-4"></a>

#### D-4: Editing model — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** `Input` is single-line and a multi-line field is an open upstream request. A `Client` receives keys only after a click in fullscreen. claude-mdview's point-to-edit sends the file, the line range and the instruction through `$.prompt.submit`; davekiss/md ships a `Client` caret editor; md-tui hands the file to `$EDITOR`, which a mod cannot do with Claude Code's own terminal.

##### (a) Claude-mediated point-and-ask, `Input` single-line edits and checkbox toggles; `Client` editor in Phase 2

**Pros:**
- Every path works on the main screen and in tmux.
- The agent is the editor the user is already talking to; the pane adds precision (file, lines, block) and review (markers, diff, keep or discard).

**Cons:**
- A paragraph edit costs a turn; in-place typing waits.

##### (b) `Client` editor in the MVP

**Pros:**
- Direct typing from day one.

**Cons:**
- Fullscreen and a click are prerequisites; the reader would wait behind the editor's build.

##### (c) Hand the file to `$EDITOR`

**Pros:**
- Zero editor code.

**Cons:**
- A mod cannot give Claude Code's terminal to a process; it would need a separate window or tmux pane, outside the mod's control.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Claude-mediated point-and-ask, `Input` single-line edits and checkbox toggles in the MVP; a `Client` editor in Phase 2
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-4; decision-topic=doc-editor-editing-model; governs=component:doc-editor/plugins/doc-editor/hooks/edit; normalized-proposition=edits-go-through-claude-via-prompt-submit-with-single-line-pane-edits-and-a-client-editor-in-phase-two; applicability=repo:doc-editor; outcome-id=editing-model; relation=different-question; related-decision-id=DED-b3p/D-1; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 2 resolves it: the edit pipeline crosses the boundary between the pane and Claude's own tools, and the request format (`Edit lines <start>-<end> of <path>`) is the contract both sides depend on. Mitigations for (a)'s cons: the review loop (margin markers, diff, keep, discard, refine) is in the MVP so a turn is never wasted silently, and Phase 2's `Client` editor is scoped with davekiss/md as the proven shape and `e` and `c` as fallbacks. Door type: two-way for the pane's keys and fields, one-way for the request format once users and Claude depend on it; blast radius: the pane and the prompt, inside one plugin. Confidence: high.

---

<a id="d-5"></a>

#### D-5: Key map and input — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** A pane hotkey is one digit or one lowercase letter; Tab and the arrows belong to Claude Code; `Escape never arrives` at a `Client`. Whether a focused `Client` receives Tab, capitals and `/` is unmeasured. Every terminal pager uses `/`, `n`, `N`, `g`, `G`, and Claude Code's transcript mode uses `{` and `}`.

##### (a) Lowercase hotkeys and arrow keys in the pane

**Pros:**
- Works everywhere the pane draws, with no click.
- Matches claude-mdview and md-tui's letter substitutions.

**Cons:**
- No `/`, `N`, `G`, `?`; users who expect `less` relearn a few keys.

##### (b) `less` map inside a `Client`

**Pros:**
- The map every terminal user knows.

**Cons:**
- Needs fullscreen and a click; unmeasured whether the keys arrive at all.

##### (c) Both from the start

**Pros:**
- Each session gets the best map it supports.

**Cons:**
- Two key maps to document and test before the reader exists.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Lowercase hotkeys and arrow keys in the MVP; (b) added in Phase 2 if T-0.1 shows a focused `Client` receives Tab, capitals and `/`
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-5; decision-topic=doc-editor-key-map; governs=component:doc-editor/plugins/doc-editor/hooks/hints; normalized-proposition=the-mvp-key-map-uses-lowercase-hotkeys-and-arrow-keys-and-a-less-style-client-map-follows-if-the-spike-permits; applicability=repo:doc-editor; outcome-id=key-map; relation=different-question; related-decision-id=DED-b3p/D-4; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 1 resolves it: a key map is a two-way door with low decay, so the simple option that works everywhere ships first. Mitigation for (a)'s con: the hint row names every key, and T-2.4 adds the `less` map once measured. Confidence: high.

> **Decision (re-run on the T-0.1 spike, 2026-10-21):** ✅ Resolved by Opus orchestrator (doc-editor build coordinator) — (a) stands for the MVP; the condition this decision set for (b) in Phase 2 is met
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-opus-5-5; ai-effort=medium; ai-profile=architect -->

The spike ([phase-0-spike.md](../research/evidence/ded-doc-editor/phase-0-spike.md), section "Client: Tab, a capital letter and a slash") measured that a focused `Client` receives Tab, a capital letter and `/` at `onKey` after one click in fullscreen, and Shift-Tab and the arrows as well. That meets the condition for adding the `less` map in Phase 2 (T-2.4). It does not change the MVP: a `Client` still needs fullscreen and a click before it gets keys, and every MVP feature must work with the keyboard alone on the main screen (NFR-2), so the pane's lowercase hotkeys ship first. The spike also found fullscreen rendering on by default inside tmux under `--setting-sources project`, which puts the Phase 2 map within reach of more sessions than the research expected. Same conclusion as the original call. Confidence: high.

---

<a id="d-6"></a>

#### D-6: HTML route — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** `Image` fails in tmux, so a screenshot route draws nothing on this host's sessions. Readability needs a DOM; node-html-markdown and a hand-rolled subset do not. `lynx -dump` and `w3m -dump` give text with links; terminal-browser exposes `$.browser.open` where it is installed.

##### (a) Text: in-process subset, `lynx` or `w3m` when present, `$.browser.open` when terminal-browser is installed

**Pros:**
- Works in tmux and remote; links survive as text; live pages where the owner's local terminal supports them.

**Cons:**
- Layout, images and scripts are lost; two binaries to detect.

##### (b) Headless-Chrome screenshots

**Pros:**
- Faithful layout.

**Cons:**
- Needs Chrome and `Image`; nothing clickable; blank in tmux.

##### (c) No HTML in Phase 2

**Pros:**
- Less work.

**Cons:**
- The ask names HTML.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Text: in-process subset, `lynx` or `w3m` when present, `$.browser.open` when terminal-browser is installed
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-6; decision-topic=doc-editor-html-route; governs=component:doc-editor/plugins/doc-editor/core/convert; normalized-proposition=html-renders-as-markdown-text-through-an-in-process-subset-or-a-text-browser-and-live-pages-go-to-terminal-browser-when-installed; applicability=repo:doc-editor; outcome-id=html-route; relation=different-question; related-decision-id=DED-b3p/D-14; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 2 resolves it: the route must work on the sessions the fleet runs, which are tmux and remote. Mitigations for (a)'s cons: the header says which converter drew the page; T-2.1 tests every fallback; the Desktop Code tab's Browser pane and terminal-browser cover faithful layout where they exist. Door type: two-way, behind the `Converter` interface; blast radius: one converter module. Confidence: high.

---

<a id="d-7"></a>

#### D-7: PDF route — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** pdf.js's worker is 2,139,222 bytes, twice the reported module cap, so it cannot load in-process. ide-mod runs it in a `node` sidecar with a 35 MB vendor tree. `pdftotext` and `pdftoppm` are on this host and keep layout; MuPDF is AGPL.

##### (a) `pdftotext -layout` page ranges, `pdftoppm` where `Image` draws

**Pros:**
- Nothing vendored; present on this host; page ranges keep output under the caps.

**Cons:**
- Depends on poppler being installed; text layout loses columns and figures.

##### (b) pdf.js in a `node` sidecar

**Pros:**
- Glyph positions give a faithful text grid (ide-mod).

**Cons:**
- A 35 MB vendored tree in a public repo; needs `node`.

##### (c) No PDF

**Cons:**
- The ask names PDF.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) `pdftotext -layout` page ranges plus `pdftoppm` where `Image` draws; (b) kept as a later fallback where poppler is absent and `node` is present
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-7; decision-topic=doc-editor-pdf-route; governs=component:doc-editor/plugins/doc-editor/core/pdf-pages; normalized-proposition=pdf-renders-as-text-through-pdftotext-page-ranges-with-pdftoppm-pictures-where-image-draws; applicability=repo:doc-editor; outcome-id=pdf-route; relation=different-question; related-decision-id=DED-b3p/D-14; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criteria 3 and 4 resolve it: the route is long-lived but each option is a two-way door behind the `Converter` interface, and the weighted pass favours zero vendoring over a faithful grid. Mitigations for (a)'s cons: feature detection with a one-row message when poppler is absent (T-2.2); the sidecar recorded as the fallback with its vendor cost named; layout loss bounded by `-layout` now and by `-bbox-layout` word positions later for a text grid of the kind ide-mod draws, with each figure shown as a placeholder naming its page. Door type: two-way, behind the `Converter` interface; blast radius: one converter module. Confidence: high.

---

<a id="d-8"></a>

#### D-8: Other formats — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** pandoc reads DOCX, ODT, RTF, EPUB, notebooks, LaTeX, rST, Org and AsciiDoc and writes GFM, under GPL-2.0. mammoth covers DOCX only. markitdown is Python. Notebooks are JSON, CSV is a small parser, and EPUB is a ZIP of XHTML.

##### (a) pandoc feature-detected for Office and markup formats; in-process for notebooks, CSV and EPUB

**Pros:**
- Twelve formats behind one binary call; the three in-process formats are small, dependency-free work.

**Cons:**
- pandoc may be absent; GPL means binary-only use.

##### (b) markitdown in Python

**Pros:**
- One converter for Office and PDF.

**Cons:**
- A Python runtime and package install the user must manage; its 190,000-star adoption comes from the agent use case, and terminal rendering through it is unmeasured.

##### (c) None

**Cons:**
- Drops "other docs and doc-like file types".

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) pandoc feature-detected for Office and markup formats; in-process for notebooks, CSV and EPUB
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-8; decision-topic=doc-editor-other-formats; governs=component:doc-editor/plugins/doc-editor/core/convert; normalized-proposition=office-and-markup-formats-convert-through-a-feature-detected-pandoc-and-notebooks-csv-and-epub-convert-in-process; applicability=repo:doc-editor; outcome-id=other-formats; relation=different-question; related-decision-id=DED-b3p/D-7; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 3 resolves it: these formats are long-lived but low-frequency, so one well-maintained binary behind the `Converter` interface beats a per-format vendor tree. Mitigation for (a)'s cons: NFR-6 and NFR-7 (feature detection, binary-only use after a licence review). Door type: two-way, behind the `Converter` interface; blast radius: Phase 3 converters only. Confidence: high.

---

<a id="d-9"></a>

#### D-9: Shape and home of the shared core — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** A hooks module imports only files inside its plugin, has no DOM, no Node, no timers and no WebAssembly, and must not pass `$` to imported code. An installed plugin is a copy of its directory; `workspace:*` links get no install; a symlink inside the marketplace is dereferenced on a git install but unmeasured for in-place loads. baselane-sh/mods copies shared code into each plugin; terminal-browser duplicates its types.

##### (a) Dependency-free TypeScript source inside the plugin directory; the web and MCP App packages import it by path

**Pros:**
- No build step and no drift check while the mod is the only consumer.
- `claude plugin test` is the conformance check that the core loads in the mod environment.

**Cons:**
- The web packages import from under `plugins/`, which is unusual; when a second plugin needs the core, a copy or symlink step returns.

##### (b) `packages/core` with a copy build into the plugin

**Pros:**
- Conventional monorepo shape.

**Cons:**
- Committed copies plus a drift check from day one; the one exemplar is 1 star.

##### (c) A symlink from the plugin into the marketplace

**Pros:**
- No copy step.

**Cons:**
- Documented only for the git-install copy; unmeasured for `--plugin-dir` and local marketplaces, and fragile on Windows.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Dependency-free TypeScript source inside the plugin directory, imported by path from the later packages; (b) or (c) revisited in Phase 3 after T-0.1's symlink case
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-9; decision-topic=doc-editor-shared-core-home; governs=repo:doc-editor/plugins/doc-editor/core; normalized-proposition=the-shared-core-is-dependency-free-typescript-source-inside-the-plugin-directory-with-no-dom-node-timers-webassembly-or-dollar-parameter; applicability=repo:doc-editor; outcome-id=shared-core-home; relation=different-question; related-decision-id=DED-b3p/D-10; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criteria 1 and 3 resolve it: the core's shape (dependency-free, `$`-free, DOM-free) is the one-way part and is fixed here; its home is a two-way door with low decay while there is one consumer, so the simple option ships. Mitigations for (a)'s con: a core lint test enforces the shape (T-0.2), and Phase 3 re-runs this decision with the spike's symlink result before a second consumer exists. Confidence: high on the shape, medium on the home.

---

<a id="d-10"></a>

#### D-10: Repository layout and distribution — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** The repo is public, scaffolded by Copier with a TypeScript stack, and the sibling beads-ui plans a monorepo with one core and one package per surface. hamzafer's collection is a root marketplace over many mods with `validate` and `test` per mod in CI. Claude Code installs a plugin from a git marketplace, a `git-subdir` or a local path.

##### (a) Root `.claude-plugin/marketplace.json` over `plugins/doc-editor`, a `packages/` folder for later surfaces, npm workspaces

**Pros:**
- One repository is both the marketplace and the monorepo; `claude plugin validate .` gates the whole tree.
- Aligns with beads-ui.
- npm workspaces because Claude Code's dependency install skips `pnpm-lock.yaml`.

**Cons:**
- More structure than one mod needs today.

##### (b) One flat plugin at the repository root

**Pros:**
- Simplest install.

**Cons:**
- No home for the web app, MCP App or server; a later move breaks install paths.

##### (c) Publish into the ai-harness mods marketplace

**Pros:**
- One fleet install step.

**Cons:**
- ai-harness is private; this repo is public by the ask; the fleet installs public plugins as a git marketplace anyway.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Root `.claude-plugin/marketplace.json` over `plugins/doc-editor`, `packages/` for later surfaces, npm workspaces
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-10; decision-topic=doc-editor-repository-layout; governs=repo:doc-editor; normalized-proposition=the-repository-is-a-root-marketplace-over-plugins-doc-editor-with-a-packages-folder-and-npm-workspaces; applicability=repo:doc-editor; outcome-id=repo-layout; relation=different-question; related-decision-id=DED-b3p/D-9; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 1 resolves it: install paths and package names decay into one-way doors as soon as anyone installs the plugin, so the layout that holds every planned surface ships first. Mitigation for (a)'s con: Phase 0 creates only the plugin and the marketplace file; `packages/` appears in Phase 3. Confidence: high.

---

<a id="d-11"></a>

#### D-11: Testing and the merge gate — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** `claude plugin test` runs `*.test.ts` files with no session, in an environment like the hooks runtime, and a test can import the mod's own files, so it doubles as the proof that the core loads there. The repo's pre-commit already runs markdownlint and a pre-push test gate that detects Vitest.

##### (a) `claude plugin validate` and `claude plugin test` for the plugin; Vitest for the web packages; both wired into pre-commit and pre-push

**Pros:**
- The mod's tests run where the mod runs; the web tests run where the web runs.

**Cons:**
- Two runners; `claude plugin test` needs a Claude Code binary at or above the floor on the machine.

##### (b) Vitest only

**Cons:**
- Runs the core under Node, which proves nothing about the mod environment.

##### (c) `claude plugin validate` only

**Cons:**
- Validates shape and capability requests only; behaviour stays untested.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) `claude plugin validate` and `claude plugin test` for the plugin, Vitest for the web packages, wired into pre-commit and pre-push
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-11; decision-topic=doc-editor-test-gate; governs=gate:doc-editor/pre-commit; normalized-proposition=the-plugin-is-gated-by-claude-plugin-validate-and-claude-plugin-test-and-the-web-packages-by-vitest; applicability=repo:doc-editor; outcome-id=test-gate; relation=different-question; related-decision-id=DED-b3p/D-9; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 2 resolves it: the gate is shared infrastructure every phase depends on. Mitigations for (a)'s cons: one `npm test` script runs both runners in order, so the gate stays one command for a contributor and for the pre-push hook; when the binary is absent or below the floor, the script reports the plugin tests as not run and prints the runner's verbatim reason, never a false green, as the fleet's mods design does. Door type: two-way; blast radius: the repository's gate, shared by every phase. Confidence: high.

The mitigation sentence above was reworded on 2026-10-21 as an expression repair; the record is in the [Run Ledger](#run-ledger).

---

<a id="d-12"></a>

#### D-12: Write safety — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** `$.fs.write` "isn't atomic: it replaces the file's content in place". An outside editor or Claude can change the file between the mod's read and write. davekiss/md re-reads on `mtimeMs` change; the fleet's mods design uses a write-then-rename helper.

##### (a) Write-then-rename `node` helper, `mtimeMs` check, `$.ui.ask` on conflict

**Pros:**
- No half-written file; no silent lost update.

**Cons:**
- Needs `node`; a process spawn per save.

##### (b) `$.fs.write` directly

**Cons:**
- Documented non-atomic.

##### (c) Claude performs every write

**Cons:**
- A checkbox toggle would cost a turn.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Write-then-rename `node` helper, `mtimeMs` check, `$.ui.ask` on conflict
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-12; decision-topic=doc-editor-write-safety; governs=component:doc-editor/plugins/doc-editor/bin/save; normalized-proposition=every-mod-write-goes-through-a-write-then-rename-helper-after-an-mtime-check-and-asks-on-conflict; applicability=repo:doc-editor; outcome-id=write-safety; relation=different-question; related-decision-id=DED-b3p/D-4; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 1 resolves it: a lost update is a one-way door for the user's text. Mitigations for (a)'s cons: `node` is detected once per session, and its absence degrades to `$.fs.write` with the risk stated once (T-1.7). Confidence: high.

---

<a id="d-13"></a>

#### D-13: Transcript integration — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** A mod can redraw `ToolUse`, `ToolResult` and `AssistantMessage` rows. A mod that redraws a row without passing it on blocks every mod listed after it; claude-markdown-mod and claude-gfm-render redraw replies. Both Markdown mods add a link under `Read`, `Write` and `Edit` rows.

##### (a) `/doc` command, a `show` tool, and an open link under `Read`, `Write` and `Edit` rows; never redraw whole replies

**Pros:**
- Three entry points and no collision with reply mods.

**Cons:**
- Paths in Claude's prose are not clickable.

##### (b) Redraw reply rows to link paths

**Pros:**
- Every path becomes a link.

**Cons:**
- Collides with reply mods; streamed text cannot be restyled anyway.

##### (c) Command only

**Cons:**
- Loses the "open what Claude just read" job the research ranked first.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) `/doc` command, a `show` tool, and an open link under `Read`, `Write` and `Edit` rows; never redraw whole replies
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-13; decision-topic=doc-editor-transcript-integration; governs=component:doc-editor/plugins/doc-editor/hooks/rows; normalized-proposition=the-mod-adds-an-open-link-under-tool-rows-and-a-command-and-a-tool-and-never-redraws-reply-rows; applicability=repo:doc-editor; outcome-id=transcript-integration; relation=different-question; related-decision-id=DED-b3p/D-1; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 2 resolves it: the transcript rows are shared with every other mod the user runs. Mitigation for (a)'s con: `prompt.autocomplete` completes paths after `/doc`, and `g` in the pane goes to a typed path. Door type: two-way; blast radius: the transcript rows every other mod also draws on, which is why the conservative option ships. Confidence: high.

---

<a id="d-14"></a>

#### D-14: Pictures in the terminal — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** `Image` draws in kitty 0.28+ and Ghostty outside tmux and fails everywhere else; `Raster` half blocks draw everywhere but at about 100 by 80 pixels per pane, with 256 colours under tmux by default. claude-mdview and claude-lens ship half-block fallbacks.

##### (a) Alt text in the MVP; `Image` where it draws in Phase 2; no `Raster` thumbnails

**Pros:**
- Zero cost in the MVP; faithful pictures where the terminal can show them.

**Cons:**
- No picture at all in tmux.

##### (b) `Raster` half-block thumbnails everywhere

**Pros:**
- Something draws in tmux.

**Cons:**
- A document figure at 100 by 80 pixels is unreadable; a converter and a decoder are needed in-process or out.

##### (c) `Image` only

**Cons:**
- Nothing on this host's sessions, with no alt text.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) Alt text in the MVP; `Image` where it draws in Phase 2; no `Raster` thumbnails
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-14; decision-topic=doc-editor-terminal-pictures; governs=component:doc-editor/plugins/doc-editor/hooks/pane; normalized-proposition=pictures-draw-as-alt-text-in-the-mvp-and-as-image-where-the-terminal-supports-it-with-no-raster-thumbnails; applicability=repo:doc-editor; outcome-id=terminal-pictures; relation=different-question; related-decision-id=DED-b3p/D-7; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 5 resolves it: thumbnails are a speculative feature with no reader who can use them at that resolution. Mitigation for (a)'s con: the alt text names the image path so Claude or the user can open it elsewhere, and Phase 4 revisits if Claude Code gains tmux passthrough. Door type: two-way; blast radius: the pane's image blocks only. Confidence: high.

---

<a id="d-15"></a>

#### D-15: Web app and MCP App timing — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (a)

**Context.** The ask names the TUI mod first and raises the shared surfaces for beads-ui; this repo is its sibling. The MCP App and the web app share UI from one codebase with a single-file build; Claude Code is not an MCP Apps host; the Desktop Code tab already previews HTML and PDF.

##### (a) After the mod MVP, as Phase 3; the MCP App as the web app's second entry point

**Pros:**
- The core settles under one consumer before three depend on it; the official `server-pdf` example is the template.

**Cons:**
- Claude web and Desktop chat readers wait.

##### (b) In parallel with the mod

**Cons:**
- Three surfaces negotiating one unsettled core.

##### (c) Never

**Cons:**
- Drops the shared-surface half of the ask.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (a) After the mod MVP, as Phase 3; the MCP App as the web app's second entry point built with `vite-plugin-singlefile`
<!-- decision-record: chosen-option=(a); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-15; decision-topic=doc-editor-web-and-mcp-app-timing; governs=plan:doc-editor/phase-3; normalized-proposition=the-web-app-and-the-mcp-app-follow-the-mod-mvp-as-phase-three-and-share-one-codebase; applicability=repo:doc-editor; outcome-id=surfaces-timing; relation=different-question; related-decision-id=DED-b3p/D-9; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 3 resolves it: the core will be touched repeatedly, and sequencing its consumers is cheaper than coordinating them. Mitigations for (a)'s con: the Desktop Code tab's Browser pane already serves Desktop readers for HTML and PDF today, and Claude web readers get the hosted-server route the research doc's section 5.4 names when Phase 3 starts. Door type: two-way on timing, one-way once the core's public shape is consumed by three surfaces; blast radius: the whole repository. Confidence: high.

---

<a id="d-16"></a>

#### D-16: Visibility of the private Copier template — ✅ Resolved by aih-3 (Opus 5.5): (b)

**Context.** This repo's README told contributors to run `copier update` from `sergeiwallace/project-template`, which GitHub reports as private, so an outside contributor could not. The coordinator first escalated the whole decision under the Authority test's Gate A. The launching session (aih-3) re-ran the test and narrowed it: only option (a), making the template public, is an outward-facing act; option (b) is reversible and within its authority. The investigation behind it: the shared-core leg read both repos' `.copier-answers.yml` and the template's `copier.yml` through the GitHub API and confirmed the private flag.

##### (a) Make `sergeiwallace/project-template` public

**Pros:**
- Contributors can run `copier update`; the two public repos become fully reproducible.

**Cons:**
- Publishes a template that may carry fleet-internal conventions and ids; a scrub pass is needed first.

##### (b) Keep it private and say so in the README

**Pros:**
- Costs nothing and is reversible; contributors still have the rendered files.

**Cons:**
- `copier update` stays owner-only.

##### (c) Remove the `copier update` instruction

**Pros:**
- No dead instruction.

**Cons:**
- Loses the provenance note that the repo is Copier-managed.

##### Recommendation

> **Decision:** ✅ Resolved by aih-3 (Opus 5.5) — (b) Keep the template private and say so in the README
<!-- decision-record: chosen-option=(b); ai-family=claude; ai-model=claude-opus-5-5; ai-effort=high; ai-profile=interactive -->
<!-- decision-lineage: decision-id=DED-b3p/D-16; decision-topic=copier-template-visibility; governs=repo:sergeiwallace/project-template; normalized-proposition=the-private-copier-template-behind-the-public-repos-stays-private-and-the-readme-says-so-or-is-made-public-after-a-scrub; applicability=repo:doc-editor,beads-ui; outcome-id=template-visibility; relation=different-question; related-decision-id=; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criterion 1 resolves it: (b) is a two-way door that costs one README sentence, while (a) is a one-way publication that needs a scrub pass first. Implemented by aih-3 on 2026-10-15: both READMEs now say the Copier template is private and that `copier update` is maintainer-only (doc-editor PR #7, merge 53ea548; beads-ui PR #6). Sergei may still choose (a) later; that remains an outward-facing act for him. Blast radius: two public repositories' contributor instructions. Confidence: high. Phase 0's T-0.3 now checks the README sentence that PR #7 added.

---

<a id="d-17"></a>

#### D-17: Where inline comments on a Markdown file live — ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb): (b)

**Context.** Every collaborative doc app stores comments outside the text, and plain Markdown has no comment store. A Phase 4 feature (FR-13) needs one. The criteria: a comment must survive edits to the surrounding text, render harmlessly on GitHub, round-trip through other editors, reach Claude as context, and draw as a margin marker in the pane. The evidence is the comments spike, `docs/research/evidence/ded-doc-editor/comment-storage-for-markdown.md` (463 lines, 66 footnotes, 151 ledger rows, landed by PR #8). Its measurements: ten samples rendered through GitHub's Markdown API show that HTML comments are hidden (a `--` inside included) while CriticMarkup, `%%` and `:::` show as literal text; Claude reads HTML comments on every `Read` and Claude Code strips them only from auto-injected instruction files; of 19 agent-facing Markdown review tools created in 2026, 6 keep comments in a sidecar and 9 in the text; the MRSF v1.0 draft (31 stars, exploratory on adoption) specifies a sidecar with quote, line and commit anchors and an orphan rule, and Hypothesis's `matchQuote` is a dependency-light, DOM-free re-anchoring algorithm under BSD-2; `$.store` is per machine, 4 MiB, and deleted after 30 idle days, so it cannot be the store of record.

##### (a) In the text: CriticMarkup or HTML comments

**Pros:**
- Moves with the text; nothing to re-anchor; one file in git.

**Cons:**
- Pollutes the source; GitHub shows CriticMarkup raw and hides HTML comments; some tools strip them.

##### (b) A sidecar annotation file with text-quote anchors

**Pros:**
- The source stays clean; the W3C Web Annotation model is a standard; GitHub renders the doc unchanged.

**Cons:**
- Anchors break when the quoted text changes and need a re-anchoring algorithm; a second file to keep in sync.

##### (c) A Beads issue per comment quoting the block

**Pros:**
- Enters the fleet's work queue and is visible to the agent; no new store.

**Cons:**
- Position is lost beyond path and heading; not usable outside this fleet.

##### Recommendation

> **Decision:** ✅ Resolved by Fable coordinator (DED-doc-doc-editor-prd-ecdb) — (b) A repository sidecar beside the document, in MRSF's shape serialised as JSON, re-anchored by quoted text; HTML comments (a) as the documented fallback; a Beads issue (c) as something a comment can become
<!-- decision-record: chosen-option=(b); ai-family=claude; ai-model=claude-fable-5-1; ai-effort=high; ai-profile=architect -->
<!-- decision-lineage: decision-id=DED-b3p/D-17; decision-topic=doc-editor-comment-storage; governs=component:doc-editor/plugins/doc-editor/core/comments; normalized-proposition=inline-comments-live-in-a-repository-sidecar-in-mrsf-shape-re-anchored-by-quoted-text-with-html-comments-as-fallback; applicability=repo:doc-editor; outcome-id=comment-storage; relation=different-question; related-decision-id=DED-b3p/D-4; supersedes=; approval-log-decision-id=; approval-actor=; approval-date=; approval-commit= -->

Criteria 2 and 5 resolve it: the store is a contract the mod, the web app and the MCP App all read, and a comment that must outlive a session is a definite Phase 4 need. The sidecar follows MRSF v1.0's discovery rule (`<doc>.review.json` beside the document, or a `sidecar_root` from a root `.mrsf.yaml`), its comment fields (`id`, `author`, `timestamp`, `text`, `resolved`, `reply_to`, `line`, `end_line`, `selected_text`, `anchored_text`, `commit`) and its rule that an implementation never silently discards an orphan; W3C-style prefix and suffix context go in `x_prefix` and `x_suffix` extension fields. MRSF the format is exploratory by the fleet's Route A test; the anchor pattern passes Route B through the W3C Web Annotation model and Hypothesis. Mitigations for (b)'s cons: a sidecar edited outside the mod goes stale, so the core re-anchors on every open with a port of Hypothesis's `matchQuote` scoring (exact match, then fuzzy with prefix, suffix and a line hint, then orphan) under its BSD-2 licence; a rename breaks the pairing, so the mod offers to move the sidecar when it sees a document path with no sidecar and a sidecar with no document in the same directory; every committed comment is public in a public repository, so the save path warns before writing a comment that matches a secret pattern. Phase 4's first slice needs no storage at all: pending comments in `$.state`, a margin marker, and one key that sends them to Claude in a batch, each quote fenced as untrusted text, using the same comment shape the sidecar later serialises. Three registered tools let Claude list, add and resolve comments. Filing a comment as a Beads issue passes the path and heading as `--spec-id` and the anchor as `--metadata`, then resolves the comment. HTML comment carriers, if a repository refuses a second file, use a reserved prefix, sit only between blocks, never inside a `doc:region` marked `append_only` or `immutable`, and are removed from blocks before drawing. CriticMarkup, `%%`, `git notes`, `$.store` and pull-request comments are rejected as the store of record for the reasons the evidence doc gives. Door type: two-way with a migration path (the comment shape is shared across stores); blast radius: the Phase 4 comments module and the sidecar files in a user's repository. Confidence: high on the store, medium on MRSF's field set outliving its draft status.

---

> **Feedback Round 1:** Your approval/feedback on each decision:
> 1. D-1: <approval or feedback>
> 2. D-2: <approval or feedback>
> 3. D-3: <approval or feedback>
> 4. D-4: <approval or feedback>
> 5. D-5: <approval or feedback>
> 6. D-6: <approval or feedback>
> 7. D-7: <approval or feedback>
> 8. D-8: <approval or feedback>
> 9. D-9: <approval or feedback>
> 10. D-10: <approval or feedback>
> 11. D-11: <approval or feedback>
> 12. D-12: <approval or feedback>
> 13. D-13: <approval or feedback>
> 14. D-14: <approval or feedback>
> 15. D-15: <approval or feedback>
> 16. D-16: <approval or feedback>
> 17. D-17: <approval or feedback>
> - <enter feedback here>

## Open Questions

1. **[RESOLVED]** Does a focused `Client` receive Tab, capital letters and `/`? Decides T-2.4 and whether D-5's `less` map is possible. Measured by T-0.1.
   - **Resolution:** yes. After one click in fullscreen, Tab, `A` (with `shift`) and `/` all reached `onKey`, as did Shift-Tab and the arrows ([phase-0-spike.md](../research/evidence/ded-doc-editor/phase-0-spike.md), "Client: Tab, a capital letter and a slash"). D-5 was re-run: the MVP map stands and T-2.4 is unblocked.
2. **[RESOLVED]** Does `$.ui.selection()` return a selection made inside a mod's pane? Decides whether "ask Claude about this selection" can be a Phase 2 action. Measured by T-0.1.
   - **Resolution:** yes in fullscreen: a drag inside the pane returned `{"text":"SELECTME alpha bravo"}` with no `requestId`; on the main screen it returned `undefined`. No position comes with the text, so the mod maps it back to a block itself (spike, "$.ui.selection() for a selection inside the pane").
3. **[RESOLVED]** What does the `Markdown` element draw for task lists, strikethrough, an over-budget tree and a terminal `Link` with a non-`https` `href` on 2.1.296? Decides the core's glyph rewrite and the renderer's budget. Measured by T-0.1.
   - **Resolution (measured on 2.1.306):** task markers draw as literal `[ ]` and `[x]`, so the core rewrites them; `~~x~~` draws struck through; a 110,000-character tree is drawn to its first 100,000 characters with a "more characters, not drawn" row, not refused; a terminal `Link` writes any non-blank `href` into an OSC 8 hyperlink, `javascript:` included, so the mod validates every link before it draws one. HTML, CriticMarkup and `%%` comments show as text, so the core drops them. The 9,000-per-element and 60,000-per-tree budget stands.
4. **[RESOLVED]** Do the vendored micromark bundle, `@codemirror/state`, `prosemirror-model` and `yjs` load in the mod environment? Decides D-3's fallback and the Phase 2 editor's state model. Measured by T-0.1.
   - **Resolution:** all four loaded and parsed a sample under `claude plugin test`, and the micromark bundle loaded in a live hooks module. D-3 was re-run: (b) stands. A symlink whose target is outside the plugin directory is refused at load, so D-9's option (c) does not work for an in-place load; Phase 3 re-runs D-9 with that result.
5. **[RESOLVED]** Where should inline comments on a Markdown file live? Three options exist, so this is a decision, recorded as D-17.
   - **Resolution:** D-17 chose a repository sidecar in MRSF's shape with quote re-anchoring, on the comments spike's evidence (`docs/research/evidence/ded-doc-editor/comment-storage-for-markdown.md`). What stays open is whether the owner wants persistent comments at all, which only use of the MVP shows; the Phase 4 build waits on that.
6. Will Claude Code wrap kitty graphics for tmux passthrough? If it does, `Image` opens to every tmux session and D-14 is revisited. Upstream.
7. Does the beads-ui design fix a package layout compatible with D-9 and D-10? beads-ui's research doc landed on its main on 2026-10-15 (its PR #5) and proposes `packages/core`, a `packages/bd-node` adapter, `packages/web-ui` of React components and one package per surface, on pnpm workspaces with Turborepo or Nx. Two points diverge from this design: it places the core in `packages/core` from the start where D-9 keeps it inside the plugin until Phase 3, and it chooses pnpm where D-10 chooses npm workspaces because Claude Code's plugin install skips `pnpm-lock.yaml` and workspace links. Both repos should reconcile these two points before either fixes package names; the second is a fact about the plugin installer that beads-ui's design should check.

> **Feedback Round 1:** Your thoughts on the open questions:
> 1. <!-- Response to question 1 -->
> 2. <!-- Response to question 2 -->
> 3. <!-- Response to question 3 -->
> - <enter feedback here>

<!-- /doc:region name="decisions" -->

<!-- doc:region name="feedback_rounds" kind="append_only" -->

## Feedback Rounds

(none yet; APPEND_ONLY: prior rounds frozen byte-for-byte)

<!-- /doc:region name="feedback_rounds" -->

<!-- doc:region name="approval_log" kind="append_only" -->

## Approval Log

| Date | Decision | Actor | Notes |
|------|----------|-------|-------|

<!-- /doc:region name="approval_log" -->
