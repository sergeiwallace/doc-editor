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
