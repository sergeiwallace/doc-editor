---
title: "Where inline comments on a Markdown file should live when the viewer is a Claude Code mod"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods]
status: complete
source: "claude-opus-5-5-2026-10-15"
task: DED-research-spike-where-kans
parent_task: DED-doc-doc-editor-prd-ecdb
---

# Where inline comments on a Markdown file should live when the viewer is a Claude Code mod

D-17 (formerly Open Question 5) can be resolved now as its option (b), a sidecar with text-quote anchors. Put persistent comments in a sidecar file in the repository, next to the document, in the shape the Markdown Review Sidecar Format (MRSF) v1.0 draft specifies, serialised as JSON. Anchor each comment by its quoted text plus line hints and the commit it was made on, and re-anchor it on every open with a quote-matching algorithm of the kind Hypothesis ships. Hand open comments to Claude through a registered tool and a batched prompt. Treat a Beads issue as something a comment can become, not as where comments live. In-text HTML comments are the strongest runner-up and the right fallback where a second file is unwelcome. What stays open is whether the owner wants persistent comments at all, which only use of the MVP can show; the design doc keeps building them in Phase 4.

This file is evidence for the doc-editor coordinator. It extends, and does not repeat, the research doc `docs/research/tui-doc-viewer-and-editor-as-a-claude-code-mod.md`, the three evidence docs beside this one, and three ai-harness seed docs: `docs/research/claude-code-mods-web-browser-in-the-tui.md`, `docs/research/claude-code-mods.md` and `docs/designs/aih-xhc5u-claude-code-mods.md`.

## Method

Read dates: 2026-10-15 01:09Z to 01:25Z (UTC, measured with `date -u`). Host: sem-kg-ec2, Claude Code 2.1.296 per the brief (not re-measured). The doc-editor worktree was at `d733854`, equal to `origin/main` after a fetch at 01:10Z. A fetch at 01:38Z found `origin/main` at `53ea548`: a Codex review fold had turned Open Question 5 into decision D-17. Every design-doc quote below was re-checked against `53ea548`, and the two that no longer exist were replaced. Nothing was installed, built, tested or launched. No mod, session or browser ran.

What was read this run:

- The founding ask record (all four entries), the doc-editor design doc in full, the research doc in full, and the comment passages of the three evidence docs beside this one. The three ai-harness seed docs: the browser survey in full, and the sections of the mods survey (Executive Summary, §1.6, §1.7, §3.5, §5.1) and of the fleet mods design (Executive Summary, state contract, D-3, D-4, D-10, D-12) that bear on where a mod keeps data and how Claude reads it.
- Anthropic documentation, 14 pages fetched as Markdown with `curl`, all HTTP 200: the mods overview, interface, reference, api, events, gallery, test and troubleshoot pages, plus fullscreen, desktop, memory, settings, settings-reference and the changelog. The public types file `mods/types/claude-code.d.ts` (517,451 bytes, header "Written by Claude Code 2.1.277"), fetched raw through `ghp api` and grepped locally.
- 38 further web pages answered HTTP 200: the CommonMark 0.31.2 and GFM specifications, five GitHub Docs articles, the Pandoc manual, three W3C Web Annotation documents, two git-scm pages, three Gerrit pages, three Reviewable pages, the Google Docs, Notion, Confluence Cloud, Confluence Data Center, Google Drive API, Word, VS Code, two Quarto and two GitBook pages, two Hypothesis pages, three CommonMark forum pages, and two pages that served only an application shell (Obsidian's help site and an HTML preview of the Djot syntax). criticmarkup.com timed out twice over HTTPS; over HTTP it answered 200 with a registrar's parked page. An unauthenticated GitHub code search answered 401 and was repeated through `ghp`. The Hypothesis orphaned-annotations help URL answered 200 but served the site's home page.
- GitHub, through `ghp api`: metadata (stars, licence, created and pushed dates) for 17 repositories through the repository API and for the 48 result rows of six repository searches; READMEs of 31 repositories; source files of davekiss/md (all of `hooks/` and `types/`, from a shallow clone), the Hypothesis client (`match-quote.ts`, `types.ts`, `LICENSE`), the MRSF specification, the Beads CLI reference pages for `create` and `comments`, the Obsidian help source for basic formatting, the Djot syntax document, and one ai-harness script; three code searches.
- One measurement: ten Markdown samples rendered through GitHub's Markdown API (`POST /markdown`, `gfm` mode), which stores nothing. Inputs and outputs are quoted in Finding 2.
- npm download counts for two MRSF packages from `api.npmjs.org`.

The host's web-search MCP tool was not in this run's tool set and native WebSearch does not work on this host, so no general web or social search ran. GitHub repository search stood in for discovery (see Gaps).

Each claim carries a tier tag. The VERIFIABLE tier has a footnote to a source fetched this run. The INFERENCE tier gives its reasoning in the text. The NO SOURCE tier marks what was searched for and not found. Quotes are verbatim; quotes from HTML pages were checked against the page text with tags stripped.

## Findings

### 1. The question as the design doc frames it, and what it leaves out

The design doc holds the question as D-17, "`⏳ PENDING (evidence)`", for the Phase 4 feature FR-13. Its options are "(a) in the text (CriticMarkup or HTML comments), (b) a sidecar annotation file with text-quote anchors (W3C Web Annotation shape), (c) a Beads issue per comment quoting the block". It sets five criteria: "a comment must survive edits to the surrounding text, render harmlessly on GitHub, round-trip through other editors, reach Claude as context, and draw as a margin marker in the pane." It adds that the decision "blocks nothing before Phase 4." [VERIFIABLE][^1] The premise comes from the doc-app survey: "Every collaborative app stores comments outside the text." [VERIFIABLE][^2]

D-17 still bundles two questions. One is whether the owner wants persistent comments at all, which only use of the MVP can show. The other is where a comment lives once it exists, which the evidence below settles without use. Separating them lets the design resolve D-17 now and keep the build in Phase 4 [INFERENCE: the storage choice depends on rendering, anchoring and agent access, all of which are documented; demand is the only input that needs use]. Findings 2 to 9 answer D-17's "evidence needed" list in order: edit and delete behaviour, GitHub and `Markdown` rendering, davekiss/md's anchoring, and Hypothesis's re-anchoring [VERIFIABLE][^1].

Three constraints in the design bind the answer. NFR-4: "The mod makes no network request and calls no model of its own". NFR-5: the mod "never writes a file it did not read in this session". NFR-9: the mod "registers no `tool.check` hook and answers no `tool.call` with a result" [VERIFIABLE][^1]. D-12 adds the write-then-rename helper and the `mtimeMs` check for every save [VERIFIABLE][^1].

Comments in this product serve three jobs, and they need different stores [INFERENCE: drawn from the design's FR-4 and FR-13 and the prior art in Findings 3 and 6]:

- An instruction to Claude about a passage ("make this two sentences"). The design's point-and-ask (FR-4) already covers this; it lives until the turn ends.
- A remark that should outlast the session: an open question, a note for a later reader, a review thread across days or across the owner's two hosts.
- A remark that turns into work: something to track, assign and close.

### 2. In-text carriers: what each syntax does in GitHub, Claude Code and other editors

HTML comments are the only in-text carrier GitHub hides by design. GitHub Docs: "You can tell GitHub to hide content from the rendered Markdown by placing the content in an HTML comment." [VERIFIABLE][^3]

I measured ten samples through GitHub's Markdown rendering endpoint, which the REST docs describe as a way "to render a markdown document as an HTML page or as raw text" [VERIFIABLE][^4]. The outputs, verbatim:

| Sample input | GitHub output |
|---|---|
| A block `<!-- reviewer: tighten this paragraph -->` between two paragraphs | `<p dir="auto">Before.</p>` and `<p dir="auto">After.</p>`; the comment is gone |
| `A sentence <!-- note: cite the source --> continues here.` | `<p dir="auto">A sentence  continues here.</p>` |
| `Run it <!-- never pass --no-verify here --> with care.` | `<p dir="auto">Run it  with care.</p>` |
| `Paragraph text.<!-- c:7f3a {"author":"sergei","text":"why 1.5 s?"} -->` | `<p dir="auto">Paragraph text.</p>` |
| `[//]: # (a hidden note)` above a paragraph | Only the paragraph renders |
| `This is {==highlighted text==}{>>a reviewer comment<<} in place.` | `{==highlighted text==}{&gt;&gt;a reviewer comment&lt;&lt;}` shown as text |
| `swap {~~this~>that~~}` (CriticMarkup substitution) | `{~~this~&gt;that~~}` shown as text |
| `Visible text %%an Obsidian comment%% more text.` | `%%an Obsidian comment%%` shown as text |
| A Pandoc fenced div `::: comment` | `::: comment` shown as text |

(measured [VERIFIABLE][^4]). Every sample returned exit 0. A JSON payload inside an HTML comment, and a comment containing `--`, were both hidden. D-17's option (a) states that "GitHub shows CriticMarkup raw and hides HTML comments; some tools strip them." The render test confirms the first two parts [VERIFIABLE][^1][^4].

The two specifications disagree on `--` inside a comment. CommonMark 0.31.2: "An HTML comment consists of <!-->, <!--->, or <!--, a string of characters not including the string -->, and -->" [VERIFIABLE][^5]. The GFM specification still says the text "does not contain --" [VERIFIABLE][^6]. GitHub's renderer follows the newer rule in practice, so a CLI flag inside a comment is safe there [VERIFIABLE][^4]. A parser that follows the GFM text literally would show such an inline comment as text [INFERENCE: from the GFM definition; no such parser was tested].

Claude reads HTML comments when it reads a file. Anthropic's memory page: "Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before the content is injected into Claude's context." The same paragraph says "When you open a CLAUDE.md file directly with the Read tool, comments remain visible." [VERIFIABLE][^7] The change dates from 2.1.72: "Changed CLAUDE.md HTML comments (`<!-- ... -->`) to be hidden from Claude when auto-injected." [VERIFIABLE][^8] The types file carries the same rule for instruction files: "The text as loaded (comments and frontmatter already stripped)." [VERIFIABLE][^9] So Anthropic itself treats an HTML comment as a note for humans that Claude does not need. A comment in an ordinary document is visible to Claude on every `Read` and costs context each time [INFERENCE: the stripping applies only to auto-injected instruction files].

What the mods `Markdown` element draws for an HTML comment is not documented. Its contract says the text is drawn "as an assistant reply would write it" and is "At most 10000 characters, tab and newline its only control characters" [VERIFIABLE][^9]. Whether it hides `<!-- -->`, shows it, or shows CriticMarkup literally was not found in any page or the types file [NO SOURCE]. The windowed renderer can sidestep the question by removing comment carriers before it hands a block to `Markdown` [INFERENCE: D-2 already cuts the file into blocks in the core].

Pandoc passes HTML comments through unless told otherwise: `--strip-comments` will "Strip out HTML comments in the Markdown or Textile source, rather than passing them on to Markdown, Textile or HTML output as raw HTML." [VERIFIABLE][^10] Its Word reader keeps Word comments only with `--track-changes=all`; otherwise "Both accept and reject ignore comments." [VERIFIABLE][^10] mdast, the tree the design's D-3 parser produces, has one node for both block and inline HTML: "**Html** ([**Literal**][dfn-literal]) represents a fragment of raw [HTML][]." [VERIFIABLE][^11] So the core can find comment carriers without a second parser [INFERENCE].

CommonMark has no comment syntax of its own, and its author wants one. In the forum's 2015 thread, John MacFarlane wrote "I do think it would be great to have a way to put comments in the source." [VERIFIABLE][^12] Ten years on, a 2026 thread by an editor author describes using an HTML comment for presentation state: "A comment renders as nothing everywhere else, so the file stays valid and readable in any other editor." A forum regular answered that it is a "Markdown processing instruction looking like an HTML comment" and that "Everything else would be more invasive or more brittle or both." [VERIFIABLE][^13] MacFarlane's later language, Djot, has comments inside attributes: "Material between two `%` characters in an attribute will be ignored and" treated as a comment [VERIFIABLE][^14]. Djot is not Markdown and nothing in this repository reads it [INFERENCE].

The fleet's own docs already use HTML comments as machine metadata. The design doc is fenced by markers such as `<!-- doc:region name="feedback_rounds" kind="append_only" -->` and states "(none yet; APPEND_ONLY: prior rounds frozen byte-for-byte)" [VERIFIABLE][^1]. ai-harness scripts parse these markers: `scripts/check_cc_task_id_refs.py` compiles a pattern beginning `r"<!--\s*doc:region\b[^>]*\bkind=` that finds regions whose kind is `immutable` [VERIFIABLE][^15]. Comment carriers in fleet docs would share a syntax with these markers, so they need a reserved prefix, and an insertion inside an append-only or immutable region breaks that region's promise [INFERENCE: no enforcing hook for append-only regions was found in a grep of ai-harness `scripts/`, `.githooks/` and `hooks/`; the promise is a convention].

The fleet also reviews design docs in the text already, in visible form. The design-doc workflow: "The template includes `> **Feedback Round 1:**` stubs after each major section." [VERIFIABLE][^16] These are section-level, committed, and read by Claude like any other text.

Obsidian's `%%` comment is Obsidian-only. Its help source: "You can add comments by wrapping text with `%%`. Comments are only visible in Editing view." It then advises: "To hide text in other apps, use an HTML comment, `<!-- -->`." [VERIFIABLE][^17] GitHub shows `%%` text literally (measured above).

CriticMarkup is the one in-text syntax designed for review, and it shows on GitHub. Its toolkit README: "Critic Markup is intended to provide basic editorial change tracking in plain text files." It defines five marks, including "Comment `{>> <<}`" and "Highlight `{== ==}{>> <<}`", and says "Critic Markup supports generic comments for metadata." [VERIFIABLE][^18] Its caveat bears on block editing: "Newlines should be avoided as much as possible within CriticMarkup tags." [VERIFIABLE][^18] The toolkit repository has 850 stars, no licence file GitHub recognises (the README states Apache 2.0), and a last push on 2021-03-04 [VERIFIABLE][^18]. The project site criticmarkup.com now serves a registrar's parked page that says the domain "is a totally awesome idea still being worked on." [VERIFIABLE][^19]

CriticMarkup tooling is alive in 2026 in editors, not on code hosts. The Obsidian plugin Commentator has 260 stars, MIT, last push 2026-08-07, and extends the syntax: "Extend `Comment` markup to support comment threads". It warns: "There is a non-zero risk of text being removed when using e.g. the suggestion mode." [VERIFIABLE][^20] MultiMarkdown 6 parses it as an extension ("Critic Markup Support") but describes itself as "This project is now deprecated." [VERIFIABLE][^21] Four of the 19 tools in Finding 3's 2026 census store review comments as CriticMarkup [VERIFIABLE][^22][^23][^24].

### 3. Sidecar stores and how they re-attach a comment after edits

The W3C Web Annotation Data Model (a Recommendation of 23 February 2017, foundational) defines the anchors every sidecar reuses. The Text Quote Selector "describes a range of text by copying it, and including some of the text immediately before (a prefix) and after (a suffix) it". The Text Position Selector records start and end offsets but "is very brittle with regards to changes to the resource" [VERIFIABLE][^25]. For plain text the model names RFC 5147 fragments, "Example: char=0,10" [VERIFIABLE][^25]. Web annotation: no significant post-2024 developments to the standard itself were found [NO SOURCE].

Hypothesis implements the quote-plus-context anchor in a small pure-string function. Its `matchQuote` returns "`null` if no match exceeding the minimum quality threshold was found" and scores each candidate with fixed weights: "const quoteWeight = 50; // Similarity of matched text to quote." with prefix and suffix at 20 each and position as a tie-breaker [VERIFIABLE][^26]. It calls `approx-string-match`, MIT, last push 2026-10-09 [VERIFIABLE][^27]. The client is under a two-clause BSD licence, "Copyright (c) 2013-2019 Hypothes.is Project and contributors", last push 2026-10-14 [VERIFIABLE][^26]. Hypothesis's 2013 design note (background) explains the fallback: context-first fuzzy matching "can handle both structure and content changes." [VERIFIABLE][^28] Neither file touches the DOM, so the algorithm fits the design's dependency-free core [INFERENCE: `match-quote.ts` imports only `approx-string-match`].

A 2026 specification for Markdown sidecars exists. MRSF, also called Sidemark, describes itself as "a portable, version-controlled, and machine-actionable way to store review comments" outside the Markdown file, and names the problem plainly: "Inline comments can’t move with the text" and "GitHub/GitLab reviews vanish with edits" [VERIFIABLE][^29]. It ships a CLI, an MCP server, a VS Code extension and renderer plugins for markdown-it, Marked and rehype [VERIFIABLE][^29]. The specification fixes the details a design would otherwise invent [VERIFIABLE][^30]. They are these.

- Naming: the document path plus `.review.yaml`, co-located by default ("Tools discover the sidecar by appending `.review.yaml` to the document path"), or under a `sidecar_root` set in a root `.mrsf.yaml`. "MRSF may also be serialized as JSON; when JSON is used, a `.review.json` suffix MAY be used."
- Anchoring: "`selected_text` SHOULD always be provided alongside targeting fields; it is content-based and survives positional shifts." Line and column fields disambiguate repeats, and an optional `commit` lets a tool "detect that line/column values may be stale".
- Resolution: exact text, then line and column, then context, then orphan. "Implementations MUST NOT silently discard orphaned comments."
- Agents: "Use `selected_text` as the primary anchor and line/column as secondary."
- Privacy: "In public repositories, sidecar files are visible to all readers."

MRSF is young. The repository has 31 stars, MIT, created 2026-03-02, last push 2026-09-26, and "The MRSF specification is currently **v1.0 Draft**." [VERIFIABLE][^29][^30] Its npm packages had 218 (`@mrsf/cli`) and 62 (`@mrsf/mcp`) downloads between 2026-09-13 and 2026-10-12 [VERIFIABLE][^31]. One independent implementation exists: the Obsidian plugin Sidemark keeps comments "stored **next to** each note instead of inside it" in `.review.yaml` files, and lists orphans: "comments whose passage was deleted are listed as orphaned" [VERIFIABLE][^32]. By the fleet's source-vetting rule the format itself is exploratory, because it fails the adoption test. The pattern under it passes on corroboration. The W3C model and Hypothesis define the same anchor of quote plus position, and unrelated tools below converge on sidecars [INFERENCE: Route A fails on 31 stars; Route B passes on two independent sources for the anchor pattern].

I read the READMEs of 19 Markdown review tools, all created in 2026, that hand comments to a coding agent; GitHub repository search found them. I also read four tools outside that search: Commentator (2023), Plannotator, Plannotator TUI and davekiss/md. Where each keeps comments:

| Store | Of the 19 | Tools (stars) | Sources |
|---|---|---|---|
| Sidecar file beside the document | 6 | MRSF and Sidemark (31, 2); md-review, `paper.md.comments.json` (1); typora-side-comments, `.md.comments.json` (0); revdown, `.rd.json` (9); Ano, "sidecar JSON files alongside your code" (2) | [^24][^29][^32][^33][^34] |
| Hidden HTML markers in the file | 4 | md-redline, "Comments are stored as invisible HTML markers in the `.md` file itself." (42); markdown-review-comments, an "`<!-- review-note: ID -->` anchor" (0); a VS Code extension with `<!--@c...-->` anchors (3); orfc, which inlines comment blocks as HTML comments for the agent (8) | [^24][^35][^36] |
| CriticMarkup in the file | 4 | Quoin, "no sidecar database, no proprietary format" (12); Margin for Tern, "Appended to the line the block's text ends on: `…text.{>>comment<<}`" (2); two Obsidian plugins (14, 5). Outside the 19: Commentator (260) | [^20][^22][^23][^24] |
| Visible text in the file | 1 | spec-workbench, annotations "stored *inside the file itself*" as blockquotes (1) | [^24] |
| Elsewhere, outside the repository | 4 | Human Review, "Your agent receives all your feedback in one batch" (1,386); pinpoint, browser `sessionStorage` (4); sidenote, a localhost comment store (4); mdxg-redline, a feedback JSON file per review round (15). Outside the 19: Plannotator, annotations "stay local by default" (9,422); Plannotator TUI, "Nothing is written next to your files." (176); davekiss/md, `$.store` (0) | [^24][^37][^38][^39][^40] |

(measured from each README [VERIFIABLE][^20][^22][^23][^24][^29][^32][^33][^34][^35][^36][^37][^38][^39][^40]). No store dominates. The two most-starred tools read, Plannotator and Human Review, keep nothing in the repository. Among the 19, the tools that keep comments in the repository split between a sidecar (6) and in-text markers (9, counting HTML, CriticMarkup and visible text) [INFERENCE: from the table; stars are a weak signal for tools under a year old].

Two failure modes recur in these READMEs. A sidecar loses its pairing when the document moves: typora-side-comments warns that moving, renaming, "Save as" or sharing a document requires handling its companion file too ("移动、改名、另存为或分享文稿时，需要一并处理配套文件") [VERIFIABLE][^34]. An in-text marker is removed with the comment: markdown-review-comments says "**Resolve removes.**", leaving git history as the record [VERIFIABLE][^36]. Margin for Tern tests that "Adding and then deleting a comment restores the file exactly" [VERIFIABLE][^23].

### 4. Review tools that comment on Markdown in pull requests

GitHub anchors a review comment to a commit and a line, and marks it outdated when the line changes. The REST reference: "Not using the latest commit SHA may render your comment outdated if a subsequent commit modifies the line you specify as the position." The old diff-relative field is being retired: "This parameter is closing down. Use line instead." [VERIFIABLE][^41] A comment records both `line` and `original_line` [VERIFIABLE][^41]. GitHub also routes feedback that outgrows the pull request to an issue: "you can open a new issue that tracks the feedback and links back to the original comment." [VERIFIABLE][^42]

Reviewable keeps the old revision so a comment can still be read against it. A revision is labelled "An immutable revision (even if the branch is rebased)", and an outdated one is "Retained so you can still diff against it." [VERIFIABLE][^43]

Gerrit stores review comments in git and carries them forward on request. "NoteDb is the storage backend for code review metadata. It is based on Git, so code reviews are stored together with the code under review." [VERIFIABLE][^44] Its `ported_comments` endpoint "Ports comments of other revisions to the requested revision", and warns that "Callers of this endpoint shouldn’t rely on the exact logic of which comments are ported" [VERIFIABLE][^45].

What these teach a sidecar design: record the commit a comment was made against, keep the quoted text, and when the text cannot be found, keep the comment and show it against the version it was written on [INFERENCE: GitHub's `original_line`, Reviewable's retained revisions and MRSF's `commit` field are the same move]. Pull-request comments themselves do not fit doc-editor: they exist only while a pull request is open, they live on GitHub, and reaching them would break NFR-4's no-network rule [INFERENCE: from NFR-4 and the REST model].

### 5. Git-native stores: notes and in-repository trackers

`git notes` attach text to objects without changing them: "Adds, removes, or reads notes attached to objects, without touching the objects themselves." [VERIFIABLE][^46] Rewriting a commit drops its notes unless the user opted in: `notes.rewriteRef` "Does not have a default value; you must configure this variable to enable note rewriting." [VERIFIABLE][^47] A note attaches to a commit or a blob, never to a line range, and a blob's id changes with every edit [INFERENCE: from the git object model the notes page describes]. A squash merge creates a new commit with no note, and a rebase without `notes.rewriteRef` does the same [INFERENCE: from the rewrite rule above].

git-appraise built code review on notes: "The code review data is stored in [git-notes]". It has 5,326 stars, Apache-2.0, and its last push was 2023-08-12 [VERIFIABLE][^48]. git-bug keeps issues inside the repository: it "**is fully integrated in git**: you only need your git repository to have a bug tracker"; 10,765 stars, GPL-3.0, last push 2026-10-14 [VERIFIABLE][^49]. Neither is a Markdown comment store, and a mod would reach either only through `$.process.run` [INFERENCE].

### 6. A comment as a task-tracker record

Beads can carry most of what a comment needs. It is a "Distributed graph issue tracker for AI agents, powered by [Dolt]", with "cell-level merge" across machines [VERIFIABLE][^50]. `bd create` takes `--spec-id` ("Link to specification document"), `--external-ref` and `--metadata` ("Set custom metadata (JSON string or @file.json to read from file)") [VERIFIABLE][^51]. `bd comments` will "View or manage comments on an issue." [VERIFIABLE][^52]

An issue per comment gains workflow and loses position. It gains status, priority, an owner, the ready queue, and visibility to every agent that runs `bd` [INFERENCE: these are Beads' core fields]. It loses the passage: an issue has no anchor, so `--spec-id` can name a path and heading, and `--metadata` can hold a quote, but nothing re-anchors it when the doc changes [INFERENCE: no Beads command reads document text]. It also floods the tracker with notes that were never work, and it ties a public, general-purpose mod to one tracker most of its users will not run [INFERENCE: the repository is public by the ask].

The design already places this at the edge. Its Integration section says a Phase 4 action "files a block as a Beads issue through beads-ui's command, never by writing the Beads store itself." [VERIFIABLE][^1] GitHub's issue-from-comment route and ClickUp's "convert any comment to a task in one click" are the same shape: a comment can become a task, and the task links back [VERIFIABLE][^2][^42].

### 7. Collaborative apps keep comments outside the text, anchored to a version

Google's Drive API defines the anchor as version-bound: "An anchored comment is associated with a specific location, such as a sentence in a word-processing document, within a specific version of a document." For anchors a developer defines, "Google Workspace editor apps treat these comments as unanchored comments." [VERIFIABLE][^53] Confluence resolves a comment to "remove the highlight" [VERIFIABLE][^54]. GitBook comments attach to a page or "a specific block" [VERIFIABLE][^55]. Quarto, a docs-as-code tool, offers comments only through outside stores: `comments: hypothesis: true`, or Utterances, where "you need to specify at least the GitHub repo you want to use for storing comments" [VERIFIABLE][^56].

What Google Docs, Notion, Confluence and Word do when the anchored text is deleted is not stated in the help pages read: Google Docs comments, Notion comments, Confluence Cloud and Data Center comments, and Word's insert-or-delete-a-comment page [NO SOURCE]. The Hypothesis help page on orphaned annotations redirected to the home page [NO SOURCE]. davekiss/md and MRSF both answer the question in writing: mark the comment stale or orphaned and keep it [VERIFIABLE][^30][^40].

### 8. The mod side: where a mod can keep comments, and how Claude reads them

A mod has three places to keep state, each with a lifetime. On the interface page, `$.state` lasts until "The session ends, or the user runs `/clear`, `/resume`, or `/branch`". `$.store` lasts until "Your mod deletes it, or no session reads or writes the store for [`cleanupPeriodDays`]". It is "saved as a JSON file of your plugin's own under `~/.claude/plugins/store/`." [VERIFIABLE][^57] The store holds "4 MiB of JSON in total" [VERIFIABLE][^58]. `cleanupPeriodDays` has "**Default**: `30`" [VERIFIABLE][^59]. Sessions race on it: "Every session on your machine that runs your mod shares one `$.store`. A `get` followed by a `set` isn't atomic." [VERIFIABLE][^57] So `$.store` suits pending drafts and view state. As a record of review it falls short: it is one machine's, it expires after a month unused, and git never sees it [INFERENCE].

davekiss/md shows the `$.store` route working. It keeps comments per file with `await $.store.set('comments:' + doc.path, comments)` [VERIFIABLE][^40]. Its re-anchoring is exact-match only. The function's comment says it "Moves each comment to where its quoted lines went after an edit", and that "a comment whose lines are gone is marked stale." [VERIFIABLE][^40] Its README promises "Every comment stays on its words, even after the paragraph above it changes." [VERIFIABLE][^40] An edit inside the quoted lines therefore makes the comment stale, where Hypothesis's fuzzy match would keep it [INFERENCE: `reanchor` compares joined lines with `===`]. The repository has 0 stars, MIT, created 2026-10-03, last push 2026-10-13 [VERIFIABLE][^40].

davekiss/md also shows how Claude reads and writes comments. It registers `view`, `comment` and `reply` tools. The `comment` tool tells Claude to "Prefer quote (a few words copied from the file) over line numbers: it lands on the right lines even after edits." [VERIFIABLE][^40] Its key `x` sends every open note at once, and the prompt asks Claude to "call mcp__md__reply for each id with a one-line summary" [VERIFIABLE][^40]. A registered tool works this way by design: the api page has you handle its calls in a `tool.call` hook "filtered to that full name", and the hook returns `{ result }` [VERIFIABLE][^60].

A mod has four routes to put comments in front of Claude, documented on the api and events pages [VERIFIABLE][^60][^61]. They are these.

- A registered tool Claude calls, as above.
- `$.prompt.submit`, where "Claude reads the text after a sentence that names your mod as the sender"; with `asUser: true` it is sent as the user's own words.
- A `prompt.submit` hook that will "Add text only Claude reads, after the prompt"; the events page warns that "Text from these hooks that changes between requests" invalidates the prompt cache.
- The file itself, when Claude reads it with `Read`: in-text comments arrive this way unasked, and a sidecar in the repository is a file Claude can read too.

Claude Desktop's diff view and GitHub's review flow both batch comments into one send. Desktop: "To comment on specific lines, click any line in the diff to open a comment box", and "Claude reads your comments and makes the requested changes, which appear as a new diff you can review." [VERIFIABLE][^62] The doc-app survey already ranked "Batch comments, then send to Claude" as a later pattern [VERIFIABLE][^2].

Comment text from someone else is untrusted input to Claude. MRSF says comments "MAY inadvertently contain secrets" and that tools "SHOULD warn authors before committing comments that match known secret patterns" [VERIFIABLE][^30]. Anthropic's own types mark third-party free text in an inbound event: "The `data` keys whose values are free text a third party wrote" [VERIFIABLE][^9]. A comment read from a public repository should reach Claude fenced as quoted material, the way davekiss/md fences the quoted lines [INFERENCE: davekiss/md wraps quotes in a fenced `markdown` block in `askPrompt` and `reviewPrompt`].

The design's own rules collide with every comment store that Claude can use, so two of them need rewording. NFR-9 forbids answering any `tool.call` with a result, yet the design registers a `show` tool, and a registered tool answers only through that hook [VERIFIABLE][^1][^60]. NFR-5 forbids writing a file the mod did not read this session, which blocks creating a new sidecar [VERIFIABLE][^1]. The fleet design states its rule as "no fleet mod returns `{ result }` from `tool.call` (answering in place)" [VERIFIABLE][^63]. The phrase "answering in place" means answering a call in Claude Code's place, which a mod's own registered tool does not do, so NFR-9 is stricter than its source [INFERENCE: from the fleet design's wording and the api page's tool contract]. NFR-9 could forbid answering a `tool.call` only for tools the mod did not register, and NFR-5 could allow creating the one sidecar path derived from a document the mod read [INFERENCE].

The fleet design's file-contract rule points the same way as a sidecar. D-10 chose "File contract: Python writes state atomically, the mod reads and renders", and notes that "`$.fs.write` is not atomic" [VERIFIABLE][^63]. A sidecar written through doc-editor's D-12 helper meets the same bar [INFERENCE].

### 9. How each store would show in the pane

The pane already has one margin column. The design draws `▌` beside each block Claude changed this turn [VERIFIABLE][^1]. davekiss/md draws a gutter mark per line, with one glyph each for "You commented on this line", "Only Claude commented on this line" and "Claude suggested a change here" [VERIFIABLE][^40]. Google Docs' "Minimize comments" form, which "Reduces comments to icons", is the narrow-pane precedent the doc-app survey recorded [VERIFIABLE][^2].

Every store renders the same way in the pane once the core has resolved anchors to blocks: a marker in the margin, the thread under the block on focus, and a list view with jump-to-block through `$.ui.scroll` [INFERENCE: the pane draws from block ids, not from where the comment came from]. The stores differ in three pane behaviours [INFERENCE]:

- Orphans. A sidecar or a machine-local store can lose an anchor, so the list needs an "orphaned" group; an in-text carrier cannot be orphaned, only deleted with its text.
- Write traffic. Adding a comment to an in-text carrier is a write to the document, through D-12's `mtimeMs` check, racing Claude's own edits; a sidecar write leaves the document untouched.
- Rendering cost. An in-text carrier must be removed from each block before it reaches the `Markdown` element, or it will count against the 9,000-character element budget and may draw.

One margin column cannot show both "changed this turn" and "commented". The pane needs a second column or a precedence rule, as davekiss/md resolves with "The person's own notes win the mark" [VERIFIABLE][^40] [INFERENCE: two states in one cell].

## Comparison of stores

The columns from "Survives text edits" to "Pane rendering" are D-17's five criteria. Their cells cite Findings 2 to 9. "Round trip" means another editor or tool reading and writing the file without losing the comments.

| Option | Where stored | Survives text edits | GitHub rendering | Round trip | Agent readability | Pane rendering | Licence of tooling | Adoption signal (2026-10-15) |
|---|---|---|---|---|---|---|---|---|
| Repository sidecar (MRSF shape, JSON) | `<doc>.review.json` beside the doc, or under `sidecar_root` | Yes while the quote matches or fuzzy-matches; otherwise kept as orphan; lost on rename unless the tool moves it | Shown as a separate JSON or YAML file; not in the rendered doc | Yes with MRSF tools (VS Code, Obsidian Sidemark, CLI, MCP); other editors ignore it and can strand it | Read the file, call the mod's tool, or the MRSF MCP server | Margin marker, thread on focus, list with an orphaned group | MIT (MRSF); BSD-2 and MIT (Hypothesis matcher) | Spec 31 stars, CLI 218 downloads a month; pattern in 6 of 19 surveyed tools |
| HTML comment carrier | In the doc, `<!-- … -->` beside the block | Yes; moves with the text; deleted with it | Hidden (measured, `--` included) | Survives any editor that keeps raw text; Pandoc keeps it unless `--strip-comments` | Seen on every `Read`, unasked; costs context each read | Marker from the parsed `html` node; carrier removed before drawing | None needed | 4 of 19 surveyed tools; md-redline 42 stars |
| CriticMarkup | In the doc, `{>> <<}` and `{== ==}` | Yes; moves with the text | Shown as literal text (measured) | Obsidian, Emacs, MultiMarkdown, Quoin; plain editors show marks | Seen on every `Read`; Claude can write marks too | Same as HTML comments, plus suggestion marks | Apache-2.0 per README (toolkit), MIT (plugins) | Toolkit 850 stars, last push 2021; Commentator 260 |
| Obsidian `%%` | In the doc | Yes | Shown as literal text (measured) | Obsidian only | Seen on `Read` | Same as in-text | The Obsidian app | Obsidian's own syntax |
| Visible blockquote (the fleet's Feedback Round) | In the doc, after a section | Section-level only | Rendered as a quote | Every editor | Read as prose | Rendered as part of the doc | None needed | The fleet's design-doc template |
| Machine-local store | `$.store` or the tool's data directory | As good as its re-anchoring (exact-only in davekiss/md) | Not in the repository | No | Only through the mod's tool | Same as sidecar | Platform | Plannotator 9,422 stars; davekiss/md 0 |
| Send-and-forget batch | Nowhere after the turn | Not applicable | Not applicable | Not applicable | The prompt itself | Pending list until sent | Platform | Claude Desktop diff view; Human Review 1,386 stars |
| `git notes` | `refs/notes/*` on a commit | Lost on rebase and squash unless `notes.rewriteRef` is set | Not shown | Git only | Needs `git notes show` | Needs a commit-to-block mapping | git itself, called as a binary | git-appraise 5,326 stars, idle since 2023 |
| Beads issue per comment | Beads store (Dolt) | No anchor; `--spec-id` names path and heading | Not in the repository | `bd` only | Strong: `bd ready`, `bd show` | Marker only if the mod re-derives an anchor from `--metadata` | MIT | Beads 27,886 stars |
| PR review comment | GitHub | Marked outdated when the line changes | In the PR only | GitHub only | Through `gh`, network | Not reachable under NFR-4 | Platform | Universal on GitHub |

## Gaps, blindspots and emergent findings

- The brief's snapshot moved during the run. It named Open Question 5; by 01:38Z `origin/main` held D-17 with the same three options and a pending status. The findings were re-anchored to D-17 and every design-doc quote re-checked against `53ea548` (measured; see Method).
- Nothing was run in a session. What the mods `Markdown` element draws for `<!-- -->`, for CriticMarkup and for `%%` is unmeasured [NO SOURCE]. Phase 0's T-0.1 already draws a gallery-style pane; adding these three samples settles it.
- The vendor behaviour when anchored text is deleted is undocumented in the Google Docs, Notion, Confluence and Word pages read [NO SOURCE]. The brief named this; the answer rests on MRSF, davekiss/md and the review tools instead.
- Rename is unsolved by every sidecar read. MRSF keys the sidecar to the path, and typora-side-comments tells users to move the companion file by hand [VERIFIABLE][^30][^34]. Detecting a rename needs `git log --follow` or a content hash, which the mod would run through `$.process.run` [INFERENCE].
- Edits made outside the mod leave a sidecar stale until the next open. Claude's own `Edit` tool, a merge or another editor can change the doc in a session without the mod. Re-anchoring on open handles it, at the cost of possible orphans [INFERENCE].
- Concurrent edits to one sidecar on two hosts will conflict in git like any JSON file. MRSF stores all of a document's comments in one array. One file per comment, or a merge driver, would avoid it; neither was measured [NO SOURCE].
- `git notes` push and fetch defaults were not found on the two git pages read, so the claim that notes do not travel with an ordinary push is left out [NO SOURCE].
- Social and general web search did not run. A storage convention discussed only on forums, Hacker News or X is missing. GitHub repository search found the 2026 tools; a tool with an unrelated name could be missed [NO SOURCE].
- Emergent: the brief named three options. The evidence added six it did not name: CriticMarkup, the machine-local store, the send-and-forget batch, `git notes`, pull-request comments, and a published sidecar format (MRSF), which the brief's mention of `.annotations.json`-style conventions anticipated without naming. I widened the search deliberately to counter anchor bias toward the three listed options.
- Emergent: a 2026 wave of agent-facing Markdown review tools exists (19 READMEs read, all created in 2026). It did not appear in the ai-harness browser survey's §4.3 or the render leg's mod table, because those searched for mods; most of these are browser apps, editor plugins or MCP servers [VERIFIABLE][^64][^65].
- Emergent: two design rules (NFR-5 and NFR-9) conflict with the design's own `show` tool and with any comment store Claude can use (Finding 8). Rewording the two rules resolves it; no design option depends on it.
- Contrarian: the two most-starred tools in the census (Plannotator and Human Review) keep nothing in the repository. Their users treat review comments as messages to the agent, not as part of the document. If the owner's use matches theirs, the send-and-forget batch is all doc-editor needs, and the sidecar is never built [INFERENCE: from the census; this is the demand question that only use of the MVP answers].
- Suspected and unresolved: whether Claude, editing a file with in-text comment carriers, preserves them. `Edit` replaces exact strings, so a comment inside the replaced span disappears unless Claude copies it. No source measures how often this happens [NO SOURCE].

### Alignment with the founding ask

The ask (A001) asks for "rendering markdown and other docs and doc-like file types and also making them interactive" in the doc viewer, built in phases from an MVP, with open questions investigated by Opus spikes "to try to resolve them" [VERIFIABLE][^66]. Comments are not named in the ask. They entered through the doc-app survey of Notion, Confluence and Google Docs, which the ask requested as inspiration [VERIFIABLE][^2]. Building them is therefore a broadening that the design already holds in Phase 4, and this spike does not move it earlier. The spike lets D-17 be resolved: the storage format is decidable now, and only the build timing waits on use. That serves the ask's instruction to resolve open questions where evidence allows [INFERENCE]. Nothing the ask requested is dropped or deferred by this evidence.

## Recommendations to the coordinator

1. Resolve D-17 now and keep the build in Phase 4, started once the owner has used the MVP and asks for persistent comments. Rests on Findings 1, 3 and the contrarian Gaps entry.
2. Choose D-17's option (b), the repository sidecar, as the store of record, in MRSF's shape rather than a bare W3C annotation file. Follow MRSF v1.0's discovery rules (co-located `<doc>.review.json`, or `sidecar_root` from a root `.mrsf.yaml`), its comment fields (`id`, `author`, `timestamp`, `text`, `resolved`, `reply_to`, `line`, `end_line`, `selected_text`, `anchored_text`, `commit`), and its orphan rule. Write JSON, which `JSON.parse` reads in the mod with nothing vendored; reading YAML sidecars made by other MRSF tools is a later addition. Store W3C-style context as `x_prefix` and `x_suffix` extension fields. Rests on Findings 3, 4 and 8. The con: a sidecar goes stale when the document is edited by anything other than the mod, it loses its pairing on a rename, and in a public repository every committed comment is public. Mitigations: re-anchor on every open; never delete an orphan; record `commit`; show the orphaned group in the list; warn before a comment with a secret pattern is written.
3. Put re-anchoring in the core as a port of Hypothesis's `matchQuote` scoring over `approx-string-match`, with attribution under their BSD-2 and MIT licences. Exact match first, then fuzzy with prefix, suffix and a line hint, then orphan. davekiss/md's exact-only `reanchor` is the minimum and loses comments on small edits inside the quote. Rests on Findings 3 and 8.
4. Build the MVP-compatible layer first and with no storage decision: pending comments in `$.state`, a margin marker, and one key that sends them all to Claude through `$.prompt.submit`, each quote fenced as untrusted text. Use the same comment shape the sidecar will serialise, so persistence later is one write path. Rests on Findings 1 and 8 and the Desktop and Human Review precedents.
5. Give Claude three registered tools, modelled on davekiss/md: one that lists open and orphaned comments with their resolved block ranges, one that adds a comment by quote, and one that replies or resolves by id. Rests on Finding 8.
6. Make filing a comment as a Beads issue an action on the comment, through beads-ui's command as the design's Integration section already says. Pass the path and heading as `--spec-id` and the anchor as `--metadata`, record the issue id on the comment, and resolve the comment. Do not use Beads as the comment store. Rests on Findings 4 and 6.
7. Keep HTML comment carriers as the documented fallback, for repositories that refuse a second file. If used, reserve a prefix (for example `<!-- de:c id=... -->`), place carriers only between blocks, never inside a `doc:region` marked `append_only` or `immutable`, and remove them from blocks before drawing. Rests on Finding 2.
8. Do not use CriticMarkup, `%%`, `git notes`, `$.store` or pull-request comments as the store of record. CriticMarkup shows on GitHub and its toolkit is idle; `%%` is Obsidian-only; notes do not survive rebase by default; `$.store` expires after 30 idle days on one machine; pull-request comments need the network. CriticMarkup's suggestion marks stay worth reading for Claude's suggest-and-accept flow. Rests on Findings 2, 4, 5 and 8.
9. Leave the fleet's Feedback Round blockquotes alone. They are section-level human review in the text, and they already work with Claude. Rests on Finding 2.
10. Reword NFR-9 so it forbids answering a `tool.call` only for tools the mod did not register, and NFR-5 to allow creating the sidecar path derived from a document the mod read. Add three samples to T-0.1's gallery pane: an HTML comment, a CriticMarkup comment and a `%%` comment. Rests on Findings 2 and 8.

Ranked: the repository sidecar first (2, 3, 5), the send-and-forget batch as the first slice (4), the Beads action as a conversion (6), HTML comment carriers as the fallback (7). These recommendations are inferences from the evidence above and were not tested in a session.

## Sources


[^1]: doc-editor. (2026). [doc-editor: a document viewer and editor inside the Claude Code TUI as a mod](https://github.com/sergeiwallace/doc-editor/blob/main/docs/designs/doc-editor-design.md). `docs/designs/doc-editor-design.md`, read at `d733854` and re-checked at `origin/main` `53ea548` (01:38Z). Verified accessible (GitHub API 200) 2026-10-15. (D-17, NFR-4, NFR-5, NFR-9, D-12, D-13, the pane mockup, Integration, region markers.)
[^2]: doc-editor. (2026). [Doc app UI and UX survey for the TUI doc viewer and editor](https://github.com/sergeiwallace/doc-editor/blob/main/docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md). `docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md`. Verified accessible (GitHub API 200) 2026-10-15. (Comments stored outside the text, minimized comments, batch-then-send, ClickUp comment to task.)
[^3]: GitHub. (2026). [Basic writing and formatting syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax). GitHub Docs. Verified accessible (HTTP 200, article API) 2026-10-15.
[^4]: GitHub. (2026). [REST API endpoints for Markdown](https://docs.github.com/en/rest/markdown/markdown). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15. Ten samples rendered through `POST https://api.github.com/markdown` (`mode=gfm`, `context=sergeiwallace/doc-editor`) with `ghp api` at 01:16Z; all returned exit 0; outputs quoted in Finding 2.
[^5]: MacFarlane, J. (2024). [CommonMark Spec, version 0.31.2](https://spec.commonmark.org/0.31.2/). Verified accessible (HTTP 200) 2026-10-15. (HTML comment definition; HTML block start condition 2.)
[^6]: GitHub. (2019). [GitHub Flavored Markdown Spec](https://github.github.com/gfm/). Verified accessible (HTTP 200) 2026-10-15. (Older HTML comment definition excluding `--`. Background.)
[^7]: Anthropic. (2026). [How Claude remembers your project](https://code.claude.com/docs/en/memory.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^8]: Anthropic. (2026). [Claude Code changelog](https://code.claude.com/docs/en/changelog). Claude Code Documentation. Verified accessible (HTTP 200, 1,096,437 bytes) 2026-10-15. (2.1.72 entry of March 10, 2026.)
[^9]: Anthropic. (2026). [claude-code: mods/types/claude-code.d.ts](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts). GitHub. Verified accessible (GitHub API 200, raw, 517,451 bytes, header "Written by Claude Code 2.1.277") 2026-10-15. (`InstructionFile.content`, `MarkdownProps.text`, `SessionReceiveEvent.untrustedKeys`.)
[^10]: MacFarlane, J. (2026). [Pandoc User's Guide](https://pandoc.org/MANUAL.html). pandoc.org. Verified accessible (HTTP 200) 2026-10-15. (`--strip-comments`, `--track-changes`; no CriticMarkup reader in the manual.)
[^11]: syntax-tree. (2026). [mdast: Markdown Abstract Syntax Tree format](https://github.com/syntax-tree/mdast). GitHub. README read via `ghp api` 2026-10-15 (1,478 stars, last push 2026-02-04).
[^12]: CommonMark Discussion. (2015). ["comment" facility in commonmark?](https://talk.commonmark.org/t/1271). talk.commonmark.org. Verified accessible (HTTP 200, JSON) 2026-10-15. (Background; post by jgm, 2015-12-18.)
[^13]: CommonMark Discussion. (2026). [Three things I decided not to parse, building a live-preview editor](https://talk.commonmark.org/t/9126). talk.commonmark.org. Verified accessible (HTTP 200, JSON) 2026-10-15. (Posts of 2026-08-24 and 2026-08-27.)
[^14]: MacFarlane, J. (2026). [Djot syntax reference](https://github.com/jgm/djot/blob/main/doc/syntax.md). GitHub. Read via `ghp api` 2026-10-15 (jgm/djot: 2,044 stars, MIT, last push 2026-07-01).
[^15]: ai-harness. (2026). [scripts/check_cc_task_id_refs.py](https://github.com/sergeiwallace/ai-harness/blob/main/scripts/check_cc_task_id_refs.py). Private ai-harness repository. Verified accessible (GitHub API 200, 16,576 bytes) 2026-10-15.
[^16]: ai-harness. (2026). [Design doc workflow](https://github.com/sergeiwallace/ai-harness/blob/main/docs/procedures/design-doc-workflow.md). `docs/procedures/design-doc-workflow.md` in the private ai-harness repository. Verified accessible (GitHub API 200) 2026-10-15.
[^17]: Obsidian. (2026). [Basic formatting syntax, help source](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Basic%20formatting%20syntax.md). GitHub (obsidianmd/obsidian-help: 1,934 stars, last push 2026-10-11). Verified accessible (HTTP 200, raw) 2026-10-15. The rendered page at help.obsidian.md returned only an application shell.
[^18]: Weatherhead, G., & Hess, E. (2021). [CriticMarkup-toolkit](https://github.com/CriticMarkup/CriticMarkup-toolkit). GitHub. README and metadata read via `ghp api` 2026-10-15 (850 stars, no detected licence file, README states Apache 2.0, created 2013-01-10, last push 2021-03-04).
[^19]: CriticMarkup. (2026). [criticmarkup.com](http://criticmarkup.com/spec.php). HTTPS timed out twice (`curl` exit 28, 30 s) 2026-10-15; HTTP answered 200 with a Hover registrar parked page. Failure class: domain parked.
[^20]: Fevol. (2026). [obsidian-criticmarkup (Commentator)](https://github.com/Fevol/obsidian-criticmarkup). GitHub. README and metadata read via `ghp api` 2026-10-15 (260 stars, MIT, created 2023-02-20, last push 2026-08-07).
[^21]: Penney, F. (2026). [MultiMarkdown-6](https://github.com/fletcher/MultiMarkdown-6). GitHub. README and metadata read via `ghp api` 2026-10-15 (679 stars, last push 2026-07-29; description "This project is now deprecated.  Please use MultiMarkdown-7 instead!").
[^22]: 2389-research. (2026). [Quoin](https://github.com/2389-research/Quoin). GitHub. README and metadata read via `ghp api` 2026-10-15 (12 stars, MIT, created 2026-07-16, last push 2026-08-19).
[^23]: Noctivoro. (2026). [tern-margin](https://github.com/Noctivoro/tern-margin). GitHub. README and metadata read via `ghp api` 2026-10-15 (2 stars, MIT, created 2026-10-08).
[^24]: GitHub. (2026). READMEs and metadata read via `ghp api` 2026-10-15 for the rest of the 2026 census: [Roenbaeck/revdown](https://github.com/Roenbaeck/revdown) (9 stars, MIT), [vedpawar2254/Ano](https://github.com/vedpawar2254/Ano) (2, MIT), [jinqishen0725/markdown-review](https://github.com/jinqishen0725/markdown-review) (3, MIT), [titunian/rfc](https://github.com/titunian/rfc) (8, MIT), [philphilphil/obsidian-track-changes](https://github.com/philphilphil/obsidian-track-changes) (14, MIT), [ShotaShirai1719/obsidian-review-comments](https://github.com/ShotaShirai1719/obsidian-review-comments) (5, AGPL-3.0), [trisiak/spec-workbench](https://github.com/trisiak/spec-workbench) (1, no licence), [vinitkumargoel/pinpoint](https://github.com/vinitkumargoel/pinpoint) (4, MIT), [bharadwaj-pendyala/sidenote](https://github.com/bharadwaj-pendyala/sidenote) (4, MIT) and [oubakiou/mdxg-redline](https://github.com/oubakiou/mdxg-redline) (15, MIT); all created in 2026. Found through [GitHub repository search](https://api.github.com/search/repositories?q=markdown+comments+sidecar).
[^25]: Sanderson, R., Ciccarese, P., & Young, B. (2017). [Web Annotation Data Model](https://www.w3.org/TR/annotation-model/). W3C Recommendation, 23 February 2017. Verified accessible (HTTP 200) 2026-10-15. (Foundational.)
[^26]: Hypothesis. (2026). [client: src/annotator/anchoring/match-quote.ts](https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/match-quote.ts). GitHub. Source and `LICENSE` read via `ghp api` 2026-10-15 (hypothesis/client: 737 stars, two-clause BSD text, last push 2026-10-14).
[^27]: Knight, R. (2026). [approx-string-match-js](https://github.com/robertknight/approx-string-match-js). GitHub. README and metadata read via `ghp api` 2026-10-15 (55 stars, MIT, last push 2026-10-09).
[^28]: Csillag, K. (2013, April 22). [Fuzzy Anchoring](https://web.hypothes.is/blog/fuzzy-anchoring/). Hypothesis blog. Verified accessible (HTTP 200) 2026-10-15. (Background.)
[^29]: Wilen, W. (2026). [MRSF: Markdown Review Sidecar Format](https://github.com/wictorwilen/MRSF). GitHub. README and metadata read via `ghp api` 2026-10-15 (31 stars, MIT, created 2026-03-02, last push 2026-09-26).
[^30]: Wilen, W. (2026). [Markdown Review Sidecar Format (MRSF) v1.0 (Draft)](https://github.com/wictorwilen/MRSF/blob/main/MRSF-v1.0.md). GitHub. Read in full sections 3, 7, 8, 9 and 13 via `ghp api` 2026-10-15 (25,118 bytes).
[^31]: npm. (2026). [Download counts for @mrsf/cli](https://api.npmjs.org/downloads/point/last-month/@mrsf/cli) and [@mrsf/mcp](https://api.npmjs.org/downloads/point/last-month/@mrsf/mcp). api.npmjs.org. Verified accessible (HTTP 200) 2026-10-15 (period 2026-09-13 to 2026-10-12; registry: cli 0.7.1, mcp 0.7.0, both MIT).
[^32]: coddingtonbear. (2026). [obsidian-sidemark](https://github.com/coddingtonbear/obsidian-sidemark). GitHub. README and metadata read via `ghp api` 2026-10-15 (2 stars, MIT, created 2026-09-16, last push 2026-10-03).
[^33]: mustafaakben. (2026). [md-review](https://github.com/mustafaakben/md-review). GitHub. README and metadata read via `ghp api` 2026-10-15 (1 star, MIT, created 2026-09-25, last push 2026-10-07).
[^34]: catisamaomao. (2026). [typora-side-comments](https://github.com/catisamaomao/typora-side-comments). GitHub. README and metadata read via `ghp api` 2026-10-15 (0 stars, MIT, created 2026-09-29, last push 2026-10-07).
[^35]: dejuknow. (2026). [md-redline](https://github.com/dejuknow/md-redline). GitHub. README and metadata read via `ghp api` 2026-10-15 (42 stars, MIT, created 2026-03-23, last push 2026-09-26).
[^36]: ainova-systems. (2026). [markdown-review-comments](https://github.com/ainova-systems/markdown-review-comments). GitHub. README and metadata read via `ghp api` 2026-10-15 (0 stars, MIT, created 2026-06-30, last push 2026-10-07).
[^37]: Yang, P. (2026). [human-review](https://github.com/petergyang/human-review). GitHub. README and metadata read via `ghp api` 2026-10-15 (1,386 stars, MIT, created 2026-07-27, last push 2026-09-17).
[^38]: backnotprop. (2026). [Plannotator](https://github.com/backnotprop/plannotator). GitHub. README and metadata read via `ghp api` 2026-10-15 (9,422 stars, Apache-2.0, created 2025-12-28, last push 2026-10-15).
[^39]: Plannotator. (2026). [plannotator-tui](https://github.com/plannotator/plannotator-tui). GitHub. README and metadata read via `ghp api` 2026-10-15 (176 stars, MIT, created 2026-08-28, last push 2026-10-07).
[^40]: davekiss. (2026). [md](https://github.com/davekiss/md). GitHub. README, `hooks/register.tsx`, `hooks/doc.ts` and `types/index.d.ts` read from a shallow clone 2026-10-15; metadata via `ghp api` (0 stars, MIT, created 2026-10-03, last push 2026-10-13).
[^41]: GitHub. (2026). [REST API endpoints for pull request review comments](https://docs.github.com/en/rest/pulls/comments). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15.
[^42]: GitHub. (2026). [Commenting on a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15.
[^43]: Reviewable. (2026). [Changes and files](https://docs.reviewable.io/files.html). Reviewable docs. Verified accessible (HTTP 200) 2026-10-15.
[^44]: Gerrit Code Review. (2026). [NoteDb Backend](https://gerrit-review.googlesource.com/Documentation/note-db.html). Documentation version v3.14.4. Verified accessible (HTTP 200) 2026-10-15.
[^45]: Gerrit Code Review. (2026). [REST API: List Ported Comments](https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html). Verified accessible (HTTP 200) 2026-10-15.
[^46]: Git. (2026). [git-notes documentation](https://git-scm.com/docs/git-notes). git-scm.com. Verified accessible (HTTP 200) 2026-10-15.
[^47]: Git. (2026). [git-config documentation: notes.rewriteRef](https://git-scm.com/docs/git-config). git-scm.com. Verified accessible (HTTP 200) 2026-10-15.
[^48]: Google. (2023). [git-appraise](https://github.com/google/git-appraise). GitHub. README and metadata read via `ghp api` 2026-10-15 (5,326 stars, Apache-2.0, last push 2023-08-12).
[^49]: git-bug. (2026). [git-bug](https://github.com/git-bug/git-bug). GitHub. README and metadata read via `ghp api` 2026-10-15 (10,765 stars, GPL-3.0, last push 2026-10-14).
[^50]: gastownhall. (2026). [Beads](https://github.com/gastownhall/beads). GitHub. README and metadata read via `ghp api` 2026-10-15 (27,886 stars, MIT, created 2025-10-12, last push 2026-10-14).
[^51]: gastownhall. (2026). [bd create, CLI reference](https://github.com/gastownhall/beads/blob/main/docs/cli-reference/create.md). GitHub. Read via `ghp api` 2026-10-15.
[^52]: gastownhall. (2026). [bd comments, CLI reference](https://github.com/gastownhall/beads/blob/main/docs/cli-reference/comments.md). GitHub. Read via `ghp api` 2026-10-15.
[^53]: Google. (2026). [Manage comments and replies](https://developers.google.com/workspace/drive/api/guides/manage-comments). Google Drive API guides. Verified accessible (HTTP 200) 2026-10-15.
[^54]: Atlassian. (2026). [Comment on pages and blog posts](https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^55]: GitBook. (2026). [Comments](https://gitbook.com/docs/collaboration/comments.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^56]: Quarto. (2026). [HTML Basics: Commenting](https://quarto.org/docs/output-formats/html-basics.html). quarto.org. Verified accessible (HTTP 200) 2026-10-15.
[^57]: Anthropic. (2026). [Draw in the interface with a mod: Keep state](https://code.claude.com/docs/en/plugins/mods/interface.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^58]: Anthropic. (2026). [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Limits table.)
[^59]: Anthropic. (2026). [Settings reference: cleanupPeriodDays](https://code.claude.com/docs/en/settings-reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^60]: Anthropic. (2026). [Call the mods API: Add a tool; Start a turn from a background job](https://code.claude.com/docs/en/plugins/mods/api.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^61]: Anthropic. (2026). [Mods events: Rewrite or add to a prompt](https://code.claude.com/docs/en/plugins/mods/events.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^62]: Anthropic. (2026). [Claude Code on desktop: Review changes with diff view](https://code.claude.com/docs/en/desktop.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^63]: ai-harness. (2026). [Claude Code mods for ai-harness and every project](https://github.com/sergeiwallace/ai-harness/blob/main/docs/designs/aih-xhc5u-claude-code-mods.md). `docs/designs/aih-xhc5u-claude-code-mods.md` in the private ai-harness repository. Verified accessible (GitHub API 200) 2026-10-15. (D-4, D-10.)
[^64]: ai-harness. (2026). [A working web browser inside the Claude Code TUI through mods](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods-web-browser-in-the-tui.md). `docs/research/claude-code-mods-web-browser-in-the-tui.md` in the private ai-harness repository. Verified accessible (GitHub API 200) 2026-10-15. (§4.3 prior art for doc-view.)
[^65]: doc-editor. (2026). [Rendering and editing Markdown, HTML, PDF and other doc formats inside a Claude Code mod](https://github.com/sergeiwallace/doc-editor/blob/main/docs/research/evidence/ded-doc-editor/render-and-edit-in-a-mod.md). `docs/research/evidence/ded-doc-editor/render-and-edit-in-a-mod.md`. Verified accessible (GitHub API 200) 2026-10-15. (Mod table; davekiss/md as an editor.)
[^66]: doc-editor. (2026). [Founding Ask Record: DED-epic-doc-editor-view-edit-b3p](https://github.com/sergeiwallace/doc-editor/blob/main/docs/asks/DED-epic-doc-editor-view-edit-b3p.md). `docs/asks/DED-epic-doc-editor-view-edit-b3p.md`, entries A001 to A004. Read in this worktree 2026-10-15; the file is on `origin/main`.

## Provenance ledger

Quotes from HTML pages were matched against the page text with tags stripped; quotes from Markdown, JSON and source files were matched against the raw bytes. "Live?" records this run's fetch.

| Claim | Source URL | Verbatim quote | Verdict | Live? |
|---|---|---|---|---|
| D-17 is pending this spike | https://github.com/sergeiwallace/doc-editor/blob/main/docs/designs/doc-editor-design.md | "`⏳ PENDING (evidence)`" | SUPPORTED (at `53ea548`) | Yes (GitHub API 200) |
| D-17's five criteria | same | "a comment must survive edits to the surrounding text, render harmlessly on GitHub, round-trip through other editors, reach Claude as context, and draw as a margin marker in the pane." | SUPPORTED (at `53ea548`) | Yes |
| D-17 blocks nothing earlier | same | "blocks nothing before Phase 4." | SUPPORTED (at `53ea548`) | Yes |
| D-17's option (a) cons | same | "GitHub shows CriticMarkup raw and hides HTML comments; some tools strip them." | SUPPORTED (at `53ea548`; confirmed by the render test) | Yes |
| The design's no-network rule | same | "The mod makes no network request and calls no model of its own" | SUPPORTED | Yes |
| NFR-5 forbids writing an unread file | same | "never writes a file it did not read in this session" | SUPPORTED | Yes |
| NFR-9 forbids answering a tool call | same | "answers no `tool.call` with a result" | SUPPORTED | Yes |
| The design's append-only region marker | same | "(none yet; APPEND_ONLY: prior rounds frozen byte-for-byte)" | SUPPORTED | Yes |
| Beads filing goes through beads-ui | same | "files a block as a Beads issue through beads-ui's command, never by writing the Beads store itself" | SUPPORTED | Yes |
| Collaborative apps store comments outside the text | https://github.com/sergeiwallace/doc-editor/blob/main/docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md | "Every collaborative app stores comments outside the text." | SUPPORTED | Yes |
| GitHub hides HTML comments | https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax | "You can tell GitHub to hide content from the rendered Markdown by placing the content in an HTML comment." | SUPPORTED | Yes (HTTP 200) |
| The render endpoint exists | https://docs.github.com/en/rest/markdown/markdown | "Use the REST API to render a markdown document as an HTML page or as raw text." | SUPPORTED | Yes (HTTP 200) |
| An inline comment with `--` is hidden by GitHub | https://api.github.com/markdown (POST, measured) | `<p dir="auto">Run it  with care.</p>` | SUPPORTED (measured) | Yes (exit 0) |
| CriticMarkup shows literally on GitHub | https://api.github.com/markdown (POST, measured) | `{==highlighted text==}{&gt;&gt;a reviewer comment&lt;&lt;}` | SUPPORTED (measured) | Yes (exit 0) |
| Obsidian `%%` shows literally on GitHub | https://api.github.com/markdown (POST, measured) | `Visible text %%an Obsidian comment%% more text.` | SUPPORTED (measured) | Yes (exit 0) |
| CommonMark's comment definition | https://spec.commonmark.org/0.31.2/ | "An HTML comment consists of <!-->, <!--->, or <!--, a string of characters not including the string -->, and -->" | SUPPORTED | Yes (HTTP 200) |
| GFM's older definition excludes `--` | https://github.github.com/gfm/ | "does not end with -, and does not contain --" | SUPPORTED | Yes (HTTP 200) |
| CLAUDE.md comments are stripped when injected | https://code.claude.com/docs/en/memory.md | "are stripped before the content is injected into Claude's context" | SUPPORTED | Yes (HTTP 200) |
| Read still shows comments | same | "When you open a CLAUDE.md file directly with the Read tool, comments remain visible." | SUPPORTED | Yes |
| The change shipped in 2.1.72 | https://code.claude.com/docs/en/changelog | "Changed CLAUDE.md HTML comments (`<!-- ... -->`) to be hidden from Claude when auto-injected" | SUPPORTED | Yes (HTTP 200) |
| Instruction files load with comments stripped | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "The text as loaded (comments and frontmatter already stripped)." | SUPPORTED | Yes (GitHub API 200) |
| The `Markdown` element's text contract | same | "At most 10000 characters, tab and newline its only control characters" | SUPPORTED | Yes |
| Anthropic marks third-party free text | same | "The `data` keys whose values are free text a third party wrote" | SUPPORTED | Yes |
| Pandoc strips comments on request | https://pandoc.org/MANUAL.html | "Strip out HTML comments in the Markdown or Textile source, rather than passing them on to Markdown, Textile or HTML output as raw HTML." | SUPPORTED | Yes (HTTP 200) |
| Pandoc's Word reader drops comments by default | same | "Both accept and reject ignore comments." | SUPPORTED | Yes |
| mdast has one raw HTML node | https://github.com/syntax-tree/mdast | "represents a fragment of raw" | SUPPORTED | Yes (GitHub API 200) |
| CommonMark's author wants a comment syntax | https://talk.commonmark.org/t/1271 | "I do think it would be great to have a way to put comments in the source." | SUPPORTED | Yes (HTTP 200) |
| A 2026 editor uses HTML comments for state | https://talk.commonmark.org/t/9126 | "A comment renders as nothing everywhere else, so the file stays valid and readable in any other editor." | SUPPORTED | Yes (HTTP 200) |
| A forum regular calls it a processing instruction | same | "Markdown processing instruction looking like an HTML comment" | SUPPORTED | Yes |
| Djot comments live in attributes | https://github.com/jgm/djot/blob/main/doc/syntax.md | "Material between two `%` characters in an attribute will be ignored and" | SUPPORTED | Yes (GitHub API 200) |
| The fleet template has feedback stubs | https://github.com/sergeiwallace/ai-harness/blob/main/docs/procedures/design-doc-workflow.md | "The template includes `> **Feedback Round 1:**` stubs after each major section." | SUPPORTED | Yes (GitHub API 200) |
| Obsidian comments are Obsidian-only | https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Basic%20formatting%20syntax.md | "Comments are only visible in Editing view." | SUPPORTED | Yes (HTTP 200) |
| Obsidian points to HTML comments elsewhere | same | "To hide text in other apps, use an HTML comment, `<!-- -->`." | SUPPORTED | Yes |
| CriticMarkup's purpose | https://github.com/CriticMarkup/CriticMarkup-toolkit | "Critic Markup is intended to provide basic editorial change tracking in plain text files." | SUPPORTED | Yes (GitHub API 200) |
| CriticMarkup comment mark | same | "Critic Markup supports generic comments for metadata." | SUPPORTED | Yes |
| CriticMarkup newline caveat | same | "Newlines should be avoided as much as possible within CriticMarkup tags." | SUPPORTED | Yes |
| criticmarkup.com is parked | http://criticmarkup.com/spec.php | "is a totally awesome idea still being worked on." | SUPPORTED (parked page) | HTTPS timeout ×2; HTTP 200 |
| Commentator extends comments to threads | https://github.com/Fevol/obsidian-criticmarkup | "Extend `Comment` markup to support comment threads" | SUPPORTED | Yes (GitHub API 200) |
| Commentator's data-loss warning | same | "There is a non-zero risk of text being removed when using e.g. the suggestion mode." | SUPPORTED | Yes |
| MultiMarkdown 6 is deprecated | https://github.com/fletcher/MultiMarkdown-6 | "This project is now deprecated." | SUPPORTED | Yes (GitHub API 200) |
| W3C text quote selector | https://www.w3.org/TR/annotation-model/ | "describes a range of text by copying it, and including some of the text immediately before (a prefix) and after (a suffix) it" | SUPPORTED | Yes (HTTP 200) |
| W3C position selector is brittle | same | "is very brittle with regards to changes to the resource" | SUPPORTED | Yes |
| W3C plain-text fragment | same | "Example: char=0,10" | SUPPORTED | Yes |
| Hypothesis returns null below threshold | https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/match-quote.ts | "@return `null` if no match exceeding the minimum quality threshold was found." | SUPPORTED | Yes (GitHub API 200) |
| Hypothesis weights the quote at 50 | same | "const quoteWeight = 50; // Similarity of matched text to quote." | SUPPORTED | Yes |
| Hypothesis licence | https://github.com/hypothesis/client/blob/main/LICENSE | "Copyright (c) 2013-2019 Hypothes.is Project and contributors" | SUPPORTED | Yes (GitHub API 200) |
| approx-string-match licence | https://github.com/robertknight/approx-string-match-js | "MIT" (API `license.spdx_id`) | SUPPORTED | Yes (GitHub API 200) |
| Fuzzy anchoring handles content changes | https://web.hypothes.is/blog/fuzzy-anchoring/ | "This strategy can handle both structure and content changes." | SUPPORTED | Yes (HTTP 200) |
| MRSF's purpose | https://github.com/wictorwilen/MRSF | "machine-actionable way to store review comments" | SUPPORTED | Yes (GitHub API 200) |
| MRSF states the in-text problem | same | "Inline comments can’t move with the text" | SUPPORTED | Yes |
| MRSF is a draft | same | "The MRSF specification is currently **v1.0 Draft**." | SUPPORTED | Yes |
| MRSF naming | https://github.com/wictorwilen/MRSF/blob/main/MRSF-v1.0.md | "MRSF may also be serialized as JSON; when JSON is used, a `.review.json` suffix MAY be used." | SUPPORTED | Yes (GitHub API 200) |
| MRSF anchors by quote | same | "`selected_text` SHOULD always be provided alongside targeting fields; it is content-based and survives positional shifts." | SUPPORTED | Yes |
| MRSF never drops orphans | same | "Implementations MUST NOT silently discard orphaned comments." | SUPPORTED | Yes |
| MRSF agent rule | same | "Use `selected_text` as the primary anchor and line/column as secondary." | SUPPORTED | Yes |
| MRSF public-repo warning | same | "In public repositories, sidecar files are visible to all readers." | SUPPORTED | Yes |
| MRSF secret warning | same | "SHOULD warn authors before committing comments that match known secret patterns" | SUPPORTED | Yes |
| MRSF CLI downloads | https://api.npmjs.org/downloads/point/last-month/@mrsf/cli | `"downloads":218` | SUPPORTED | Yes (HTTP 200) |
| MRSF MCP downloads | https://api.npmjs.org/downloads/point/last-month/@mrsf/mcp | `"downloads":62` | SUPPORTED | Yes (HTTP 200) |
| Sidemark stores beside the note | https://github.com/coddingtonbear/obsidian-sidemark | "stored **next to** each note instead of inside it" | SUPPORTED | Yes (GitHub API 200) |
| Sidemark lists orphans | same | "comments whose passage was deleted are listed as orphaned" | SUPPORTED | Yes |
| md-review uses a JSON sidecar | https://github.com/mustafaakben/md-review | "paper.md.comments.json" | SUPPORTED | Yes (GitHub API 200) |
| typora-side-comments uses a JSON sidecar | https://github.com/catisamaomao/typora-side-comments | "md.comments.json" | SUPPORTED | Yes (GitHub API 200) |
| A sidecar must move with its document | same | "移动、改名、另存为或分享文稿时，需要一并处理配套文件" | SUPPORTED | Yes |
| md-redline stores HTML markers in the file | https://github.com/dejuknow/md-redline | "Comments are stored as invisible HTML markers in the `.md` file itself." | SUPPORTED | Yes (GitHub API 200) |
| markdown-review-comments anchor | https://github.com/ainova-systems/markdown-review-comments | "The link to the source is an `<!-- review-note: ID -->` anchor" | SUPPORTED | Yes (GitHub API 200) |
| markdown-review-comments resolve deletes | same | "**Resolve removes.**" | SUPPORTED | Yes |
| Quoin keeps review in the file | https://github.com/2389-research/Quoin | "no sidecar database, no proprietary format" | SUPPORTED | Yes (GitHub API 200) |
| Margin for Tern appends CriticMarkup | https://github.com/Noctivoro/tern-margin | "Appended to the line the block's text ends on: `…text.{>>comment<<}`" | SUPPORTED | Yes (GitHub API 200) |
| Margin for Tern restores bytes on delete | same | "Adding and then deleting a comment restores the file exactly" | SUPPORTED | Yes |
| Plannotator TUI writes nothing beside files | https://github.com/plannotator/plannotator-tui | "Nothing is written next to your files." | SUPPORTED | Yes (GitHub API 200) |
| A Plannotator reply review is in memory only | same | "A reply review keeps its annotations in memory only" | SUPPORTED | Yes |
| Plannotator keeps data local | https://github.com/backnotprop/plannotator | "Plans, diffs, annotations, drafts, history, and configuration stay local by default." | SUPPORTED | Yes (GitHub API 200) |
| Human Review sends one batch | https://github.com/petergyang/human-review | "Your agent receives all your feedback in one batch, updates the source, and refreshes the page for another review." | SUPPORTED | Yes (GitHub API 200) |
| GitHub marks comments outdated | https://docs.github.com/en/rest/pulls/comments | "Not using the latest commit SHA may render your comment outdated if a subsequent commit modifies the line you specify as the position." | SUPPORTED | Yes (HTTP 200) |
| GitHub retires `position` | same | "This parameter is closing down. Use line instead." | SUPPORTED | Yes |
| GitHub routes feedback to an issue | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request | "you can open a new issue that tracks the feedback and links back to the original comment" | SUPPORTED | Yes (HTTP 200) |
| Reviewable keeps revisions immutable | https://docs.reviewable.io/files.html | "An immutable revision (even if the branch is rebased)." | SUPPORTED | Yes (HTTP 200) |
| Reviewable retains force-pushed revisions | same | "Retained so you can still diff against it." | SUPPORTED | Yes |
| Gerrit stores reviews in git | https://gerrit-review.googlesource.com/Documentation/note-db.html | "It is based on Git, so code reviews are stored together with the code under review." | SUPPORTED | Yes (HTTP 200) |
| Gerrit ports comments | https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html | "Ports comments of other revisions to the requested revision." | SUPPORTED | Yes (HTTP 200) |
| Gerrit's porting logic is not a contract | same | "Callers of this endpoint shouldn’t rely on the exact logic of which comments are ported" | SUPPORTED | Yes |
| git notes do not touch objects | https://git-scm.com/docs/git-notes | "Adds, removes, or reads notes attached to objects, without touching the objects themselves." | SUPPORTED | Yes (HTTP 200) |
| Note rewriting is off by default | https://git-scm.com/docs/git-config | "Does not have a default value; you must configure this variable to enable note rewriting." | SUPPORTED | Yes (HTTP 200) |
| git-appraise uses notes | https://github.com/google/git-appraise | "The code review data is stored in [git-notes]" | SUPPORTED | Yes (GitHub API 200) |
| git-bug lives in git | https://github.com/git-bug/git-bug | "**is fully integrated in git**: you only need your git repository to have a bug tracker" | SUPPORTED | Yes (GitHub API 200) |
| Beads is an agent tracker on Dolt | https://github.com/gastownhall/beads | "Distributed graph issue tracker for AI agents, powered by [Dolt]" | SUPPORTED | Yes (GitHub API 200) |
| Beads has a spec link field | https://github.com/gastownhall/beads/blob/main/docs/cli-reference/create.md | "Link to specification document" | SUPPORTED | Yes (GitHub API 200) |
| Beads has a metadata field | same | "Set custom metadata (JSON string or @file.json to read from file)" | SUPPORTED | Yes |
| Beads issues carry comments | https://github.com/gastownhall/beads/blob/main/docs/cli-reference/comments.md | "View or manage comments on an issue." | SUPPORTED | Yes (GitHub API 200) |
| Drive anchors are version-bound | https://developers.google.com/workspace/drive/api/guides/manage-comments | "within a specific version of a document" | SUPPORTED | Yes (HTTP 200) |
| Workspace editors ignore custom anchors | same | "Google Workspace editor apps treat these comments as unanchored comments" | SUPPORTED | Yes |
| Confluence resolve removes the highlight | https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/ | "You can resolve an inline comment whether you are editing or viewing content to remove the highlight." | SUPPORTED | Yes (HTTP 200) |
| GitBook comments attach to a block | https://gitbook.com/docs/collaboration/comments.md | "You can also comment on a specific block by hovering over a block" | SUPPORTED | Yes (HTTP 200) |
| Quarto stores comments outside | https://quarto.org/docs/output-formats/html-basics.html | "you need to specify at least the GitHub repo you want to use for storing comments" | SUPPORTED | Yes (HTTP 200) |
| Hypothesis orphan help page | https://web.hypothes.is/help/what-are-orphaned-annotations/ | (served the home page; no orphan text) | UNVERIFIABLE (soft 404) | HTTP 200, wrong content |
| `$.store` location and lifetime | https://code.claude.com/docs/en/plugins/mods/interface.md | "saved as a JSON file of your plugin's own under `~/.claude/plugins/store/`" | SUPPORTED | Yes (HTTP 200) |
| `$.store` is shared and not atomic | same | "A `get` followed by a `set` isn't atomic." | SUPPORTED | Yes |
| `$.store` size cap | https://code.claude.com/docs/en/plugins/mods/reference.md | "4 MiB of JSON in total" | SUPPORTED | Yes (HTTP 200) |
| `cleanupPeriodDays` default | https://code.claude.com/docs/en/settings-reference.md | "**Default**: `30`" (in the `cleanupPeriodDays` section) | SUPPORTED | Yes (HTTP 200) |
| davekiss/md stores comments in `$.store` | https://github.com/davekiss/md | "await $.store.set('comments:' + doc.path, comments)" | SUPPORTED | Yes (clone) |
| davekiss/md marks lost comments stale | same | "a comment whose lines are gone is marked stale." | SUPPORTED | Yes |
| davekiss/md tells Claude to prefer quotes | same | "Prefer quote (a few words copied from the file) over line numbers: it lands on the right lines even after edits." | SUPPORTED | Yes |
| davekiss/md gutter glyphs | same | "Only Claude commented on this line" | SUPPORTED | Yes |
| davekiss/md mark precedence | same | "The person's own notes win the mark" | SUPPORTED | Yes |
| A registered tool answers through `tool.call` | https://code.claude.com/docs/en/plugins/mods/api.md | "hook filtered to that full name" | SUPPORTED | Yes (HTTP 200) |
| `$.prompt.submit` names the sender | same | "Claude reads the text after a sentence that names your mod as the sender." | SUPPORTED | Yes |
| A `prompt.submit` hook adds context | https://code.claude.com/docs/en/plugins/mods/events.md | "Add text only Claude reads, after the prompt" | SUPPORTED | Yes (HTTP 200) |
| Changing context invalidates the cache | same | "Text from these hooks that changes between requests" | SUPPORTED | Yes |
| Desktop sends line comments to Claude | https://code.claude.com/docs/en/desktop.md | "Claude reads your comments and makes the requested changes, which appear as a new diff you can review." | SUPPORTED | Yes (HTTP 200) |
| Fleet rule against answering in place | https://github.com/sergeiwallace/ai-harness/blob/main/docs/designs/aih-xhc5u-claude-code-mods.md | "no fleet mod returns `{ result }` from `tool.call` (answering in place)" | SUPPORTED | Yes (GitHub API 200) |
| Fleet file contract | same | "File contract: Python writes state atomically, the mod reads and renders" | SUPPORTED | Yes |
| The browser survey's doc-view prior art | https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods-web-browser-in-the-tui.md | "### 4.3 Prior art for doc-view" | SUPPORTED | Yes (GitHub API 200) |
| The render leg lists davekiss/md as an editor | https://github.com/sergeiwallace/doc-editor/blob/main/docs/research/evidence/ded-doc-editor/render-and-edit-in-a-mod.md | "davekiss/md proves the pattern in a shipped mod." | SUPPORTED | Yes (GitHub API 200) |
| D-17's three options | https://github.com/sergeiwallace/doc-editor/blob/main/docs/designs/doc-editor-design.md | "(a) in the text (CriticMarkup or HTML comments), (b) a sidecar annotation file with text-quote anchors (W3C Web Annotation shape), (c) a Beads issue per comment quoting the block" | SUPPORTED (at `53ea548`) | Yes (GitHub API 200) |
| The design's margin marker per changed block | same | "The left margin marker (`▌`) is Word's Simple Markup" | SUPPORTED | Yes |
| Minimized comments as icons | https://github.com/sergeiwallace/doc-editor/blob/main/docs/research/evidence/ded-doc-editor/doc-app-ux-survey.md | "Reduces comments to icons" | SUPPORTED | Yes (GitHub API 200) |
| Batch-then-send ranked as a later pattern | same | "Batch comments, then send to Claude" | SUPPORTED | Yes |
| ClickUp turns a comment into a task | same | "convert any comment to a task in one click" | SUPPORTED | Yes |
| The `Markdown` element draws reply-style text | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "as an assistant reply would write it" | SUPPORTED | Yes (GitHub API 200) |
| ai-harness parses region markers | https://github.com/sergeiwallace/ai-harness/blob/main/scripts/check_cc_task_id_refs.py | `r"<!--\s*doc:region\b[^>]*\bkind=` | SUPPORTED | Yes (GitHub API 200) |
| Obsidian comment syntax | https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Basic%20formatting%20syntax.md | "You can add comments by wrapping text with `%%`." | SUPPORTED | Yes (HTTP 200) |
| CriticMarkup highlight mark | https://github.com/CriticMarkup/CriticMarkup-toolkit | "Highlight `{== ==}{>> <<}`" | SUPPORTED | Yes (GitHub API 200) |
| CriticMarkup README licence | same | "Licensed under the Apache License, Version 2.0" | SUPPORTED | Yes |
| MultiMarkdown 6 parses CriticMarkup | https://github.com/fletcher/MultiMarkdown-6 | "Critic Markup Support" | SUPPORTED | Yes (GitHub API 200) |
| Hypothesis matcher depends only on approx-string-match | https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/match-quote.ts | "import approxSearch from 'approx-string-match';" | SUPPORTED | Yes (GitHub API 200) |
| MRSF names the review problem | https://github.com/wictorwilen/MRSF | "GitHub/GitLab reviews vanish with edits" | SUPPORTED | Yes (GitHub API 200) |
| MRSF discovers by path | https://github.com/wictorwilen/MRSF/blob/main/MRSF-v1.0.md | "Tools discover the sidecar by appending `.review.yaml` to the document path." | SUPPORTED | Yes (GitHub API 200) |
| MRSF's commit field flags stale positions | same | "detect that line/column values may be stale" | SUPPORTED | Yes |
| Census: revdown sidecar | https://github.com/Roenbaeck/revdown | "document.md.rd.json" | SUPPORTED | Yes (GitHub API 200) |
| Census: Ano sidecar | https://github.com/vedpawar2254/Ano | "All data stored in sidecar JSON files alongside your code" | SUPPORTED | Yes (GitHub API 200) |
| Census: VS Code extension anchors | https://github.com/jinqishen0725/markdown-review | "Internal `<!--@c...-->` review anchors never appear in Edit mode or its diff." | SUPPORTED | Yes (GitHub API 200) |
| Census: orfc inlines comments | https://github.com/titunian/rfc | "inlined as <!-- [COMMENT by alice@co.com] ... --> blocks" | SUPPORTED | Yes (GitHub API 200) |
| Census: Obsidian track-changes | https://github.com/philphilphil/obsidian-track-changes | "straight back into the markdown, no sidecar state" | SUPPORTED | Yes (GitHub API 200) |
| Census: Obsidian review-comments | https://github.com/ShotaShirai1719/obsidian-review-comments | "Comments are stored directly in `.md` files as **CriticMarkup**" | SUPPORTED | Yes (GitHub API 200) |
| Census: spec-workbench in-file | https://github.com/trisiak/spec-workbench | "stored *inside the file itself*" | SUPPORTED | Yes (GitHub API 200) |
| Census: pinpoint session storage | https://github.com/vinitkumargoel/pinpoint | "stored in `sessionStorage`" | SUPPORTED | Yes (GitHub API 200) |
| Census: sidenote localhost store | https://github.com/bharadwaj-pendyala/sidenote | "localhost comment store" | SUPPORTED | Yes (GitHub API 200) |
| Census: mdxg-redline feedback file | https://github.com/oubakiou/mdxg-redline | "feedback.json" | SUPPORTED | Yes (GitHub API 200) |
| GitHub keeps the original line | https://docs.github.com/en/rest/pulls/comments | "`original_line`: integer" | SUPPORTED | Yes (HTTP 200) |
| Beads merges by cell | https://github.com/gastownhall/beads | "cell-level merge" | SUPPORTED | Yes (GitHub API 200) |
| `$.state` lifetime | https://code.claude.com/docs/en/plugins/mods/interface.md | "The session ends, or the user runs `/clear`, `/resume`, or `/branch`" | SUPPORTED | Yes (HTTP 200) |
| Sessions share one store | same | "Every session on your machine that runs your mod shares one `$.store`." | SUPPORTED | Yes |
| `asUser` sends as the user's words | https://code.claude.com/docs/en/plugins/mods/api.md | "To send it as the user's own words, without that sentence, add `asUser: true`." | SUPPORTED | Yes (HTTP 200) |
| Desktop line comments | https://code.claude.com/docs/en/desktop.md | "To comment on specific lines, click any line in the diff to open a comment box." | SUPPORTED | Yes (HTTP 200) |
| davekiss/md README promise | https://github.com/davekiss/md | "Every comment stays on its words, even after the paragraph above it changes." | SUPPORTED | Yes (clone) |
| davekiss/md moves comments by quote | same | "Moves each comment to where its quoted lines went after an edit" | SUPPORTED | Yes |
| davekiss/md review prompt | same | "call mcp__md__reply for each id with a one-line summary" | SUPPORTED | Yes |
| Repository figures in Sources | the repository URLs in Sources | API fields `stargazers_count`, `license.spdx_id`, `created_at`, `pushed_at` as quoted | SUPPORTED (dated reading) | Yes (GitHub API 200) |
| The ask asks for open questions to be resolved | https://github.com/sergeiwallace/doc-editor/blob/main/docs/asks/DED-epic-doc-editor-view-edit-b3p.md | "to try to resolve them" | SUPPORTED | Yes (worktree, on origin/main) |
| The ask asks for interactive rendering | https://github.com/sergeiwallace/doc-editor/blob/main/docs/asks/DED-epic-doc-editor-view-edit-b3p.md | "rendering markdown and other docs and doc-like file types and also making them interactive" | SUPPORTED | Yes (worktree, on origin/main) |
