---
title: "A document viewer and editor inside the Claude Code TUI as a mod: doc-app UX, rendering routes and a shared core"
category: research
tags: [research, claude-code, mods, tui, markdown, html, pdf, doc-editor, ux, mcp-apps]
status: draft
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

**Status:** draft (research stage of the doc-editor epic; the companion design doc follows)

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

(to be written when the evidence legs return)

## Executive Summary

(to be written when the evidence legs return)

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

The highest-ranked exemplars came from developer tools (GitBook, GitHub, VS Code, lazygit) and from three Claude Code mods, not from the SaaS apps the ask named. The evidence leg added them deliberately and says the ranking would differ on the named apps alone (measured [VERIFIABLE][^1]).

## 2. Rendering routes per format inside a mod

(to be written when the render leg returns)

## 3. Existing mods for documents and browsers

(to be written when the render leg returns)

## 4. Editing inside a mod

(to be written when the render leg returns)

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

## Comparison

(to be written when the evidence legs return)

## Recommendation

(to be written when the evidence legs return)

## Open Questions

(to be written when the evidence legs return)

## Sources

(footnote definitions populated as sources are cited)

<!-- /doc:region name="body" -->

<!-- doc:region name="ambiguous_items" kind="replaceable" -->

## Ambiguous Items from Auto-Remediation (Post-Run Review)

(none yet; auto-populated by verify_and_remediate node)

<!-- /doc:region name="ambiguous_items" -->

<!-- doc:region name="appendix_research_prompt" kind="immutable" -->

## Appendix: Research Prompt

**Registry ID:** none (orchestrated `/orchestrate` plus `/auto-flow` run on sem-kg-ec2; no ai-core registry on this host)
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

(none yet; populated from the evidence docs' ledgers when the synthesis is written)

<!-- /doc:region name="appendix_provenance" -->

<!-- doc:region name="run_history" kind="append_only" -->

## Run History

- 2026-10-15 (Fable coordinator, launched by aih-3 on sem-kg-ec2, worktree `ded-auto-flow`): scaffolded from the canonical research STUB; Founding Ask Coverage, Context and the research prompt appendix written; three Opus research leaves launched at 00:02Z into isolated worktrees. The body awaits their evidence docs.

<!-- /doc:region name="run_history" -->
