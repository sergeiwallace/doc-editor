---
title: "doc-editor: a document viewer and editor inside the Claude Code TUI as a mod"
category: design
tags: [design, claude-code, mods, tui, markdown, html, pdf, doc-editor, mcp-apps]
status: draft
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

The raw record is [docs/asks/DED-epic-doc-editor-view-edit-b3p.md](../asks/DED-epic-doc-editor-view-edit-b3p.md). This index is non-authoritative; the raw record governs.

| Authoritative raw entry | Coverage and disposition |
|---|---|
| A001 | ORIGINAL-ASK, 2026-10-14T23:46:37Z. (coverage rows are written with the design) |
| A002 | FOLLOW-UP, 2026-10-14T23:46:38Z. (coverage rows are written with the design) |
| A003 | FOLLOW-UP, 2026-10-14T23:46:39Z. (coverage rows are written with the design) |
| A004 | FOLLOW-UP, 2026-10-14T23:46:39Z. (coverage rows are written with the design) |

**Status:** DRAFT (scaffold; the design is written once the research doc lands)

**Created:** 2026-10-15

**Task:** DED-doc-doc-editor-prd-ecdb (epic DED-epic-doc-editor-view-edit-b3p)

**Research:** [docs/research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md](../research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md)

<!-- doc:region name="overview" kind="replaceable" -->

## Table of Contents

- [Executive Summary](#executive-summary)
- [Problem Statement](#problem-statement)
- [Design Overview](#design-overview)
- [Implementation Phases](#implementation-phases)
- [Implementation Audit](#implementation-audit)
- [Risks and Mitigations](#risks-and-mitigations)
- [Design Decisions](#design-decisions)
- [Open Questions](#open-questions)
- [Approval Log](#approval-log)

## Executive Summary

(written with the design)

## Problem Statement

Claude Code shows a document only as the raw text a `Read` tool call returns, or as the Markdown of Claude's own replies. A person working beside the agent on a design doc, a README, an HTML page or a PDF has to leave the terminal, open the file somewhere else, read it, and come back. There is no way to point at a paragraph and ask Claude to change it, to follow a link inside the repo, to see a table of contents, or to read a PDF's text without a separate program. Claude Code mods, generally available since 2026-10-01, let a plugin draw a pane beside the transcript, take keyboard and pointer input, read files and run commands, so a document viewer and editor can now live inside the session. The owner asked for exactly that, drawing on the best doc apps for its interaction design, built in phases from an MVP, and published as open source.

## Design Overview

**Status:** stub; to be filled during/after implementation.

## Implementation Phases

(written with the design)

## Implementation Audit

| # | Phase | Section / Decision | Verified | Notes |
|---|-------|--------------------|---------|-------|
| 1 | N/A | **Design Overview filled**: confirm the `## Design Overview` section above is filled in with concrete implementation knowledge, not left as a stub | - [ ] | |

**Audit completed:** <!-- YYYY-MM-DD -->

## Risks and Mitigations

(written with the design)

<!-- /doc:region name="overview" -->

<!-- doc:region name="decisions" kind="replaceable" -->

## Design Decisions

### Decision Summary

(written with the design)

### Decision Details

(written with the design)

## Open Questions

(written with the design)

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
