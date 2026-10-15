---
title: "Doc app UI and UX survey for the TUI doc viewer and editor"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods]
status: complete
source: "claude-opus-5-5-2026-10-15"
task: DED-research-leg-doc-app-rkdy
parent_task: DED-research-doc-editor-uhke
---

# Doc app UI and UX survey for the TUI doc viewer and editor

Most of what makes Notion, Confluence, Google Docs and Word good to read survives a 100 by 40 cell
pane: an outline that jumps to headings, collapsible sections, a read and edit toggle, find in
page, callouts and a status line with breadcrumbs and read time. What does not survive is the
editing surface itself. A Claude Code mod has no multi-line text field, so the editor half of
doc-editor has to be built on Claude doing the edit (point at a block, say the change, review the
diff), with small in-pane edits through single-line fields. Canvas apps (Miro, Mural), slide apps
(Gamma) and app-like docs (Coda formulas and buttons) contribute almost nothing that fits a
character grid. The patterns with the most value for a developer beside a coding agent come
from tools that already treat documents as code: GitBook's change requests and diff navigator,
GitHub's rich prose diff and batched review, VS Code's Markdown outline and link tooling, and three
existing Claude Code mods that render Markdown in a pane.

## Method

Read date for every source: 2026-10-15 (UTC), between 00:04Z and 00:40Z, unless a row says
otherwise.

Seed documents read in full before any search (established, cited, not re-derived):

- ai-harness `docs/research/claude-code-mods-web-browser-in-the-tui.md` (680 lines).
- ai-harness `docs/research/claude-code-mods.md` (1,149 lines).
- ai-harness `docs/designs/aih-xhc5u-claude-code-mods.md` (1,402 lines).
- The founding ask record `docs/asks/DED-epic-doc-editor-view-edit-b3p.md` (entries A001 to A004),
  read at the coordinator's worktree; it is committed on branch `wt/aih-3/ded-auto-flow`.

Primary sources fetched this run, by class. Each count is pages that returned HTTP 200 and were
read; failures are counted separately and classified in the ledger and in the Gaps section.

| Class | Fetched and read | Failed | Route |
|---|---|---|---|
| Anthropic Claude Code docs (mods overview, interface, reference, API, events, gallery, test, troubleshoot; fullscreen; desktop; changelog) | 11 | 0 | `curl` of the `.md` pages |
| Claude Code mods types file and the built-in `diff` mod README | 2 | 0 | `ghp api` raw |
| Notion help and blog | 8 | 0 | `curl` |
| Google Docs help | 10 | 1 (document tabs answer id, 404) | `curl` |
| Microsoft Word, Copilot and Loop support | 4 | 3 (navigation pane, focus mode and navigate-to-heading article ids, 404) | `curl` |
| Atlassian Confluence Cloud support | 12 | 4 (guessed slugs, 404; correct slugs then harvested from the site nav) | `curl` |
| GitBook docs (`.md` endpoints and `llms.txt`) | 11 | 0 | `curl` |
| Coda, Gamma, Craft, ClickUp, Miro, Mural vendor pages | 11 | 6 (Coda, ClickUp and Miro Zendesk help centres answered 403; their Zendesk search APIs 404; Craft `documentation.craft.do` DNS failure) | `curl`, one WebFetch |
| Obsidian help (the `obsidianmd/obsidian-help` repo) | 11 | 0 | raw GitHub |
| Typora, iA Writer, HackMD, Bear, Apple Pages, Overleaf, Nuclino, Slite, Anytype, Outline, Logseq, Dropbox Paper pages | 13 | 4 (Overleaf twice and Dropbox Paper, 404; Logseq and Outline docs render only with JavaScript) | `curl` |
| VS Code, GitHub Docs, Cursor docs | 5 | 1 (Cursor's inline-edit URL redirected to an unrelated page) | `curl` |
| Terminal and editor projects (READMEs and metadata) | 25 repositories | 0 | `ghp api` |
| Terminal docs (Org manual, Helix, Zellij, nano, Textual) | 8 | 1 (the `less` man page URL, 404) | `curl` |
| Usability and practitioner sources (NN/g, ABScribe, Ink & Switch, Textual blog, Notion engineering blog) | 8 | 1 (an NN/g article slug, 404) | `curl` |
| Hacker News Algolia search, one query for 2024 to 2026 block-editor stories | 1 | 0 | WebFetch |

Native WebSearch does not work on this host and no `web_search` tool was in this run's tool set,
so discovery used vendor site navigation, `llms.txt` indexes, GitHub repository trees and the
GitHub API. Reddit, Twitter and YouTube were not tried; the fleet survey records them as
unreachable from this host (ai-harness `docs/research/claude-code-mods.md` §3.4).

Every quoted passage below was copied from the fetched text and checked by a script against the
saved copy of that page before commit. Fetched copies were kept outside the repository and
deleted after the check; the URLs in Sources are the record.

Tier tags follow the research template: [VERIFIABLE] with a footnote for a fetched source,
[INFERENCE] with the reasoning in the sentence, [HEURISTIC] for common practice without a citation,
and [NO SOURCE] where nothing was found. Sources dated before 2024 are marked as background.

## Findings

### 1. What the mod surface allows decides what transfers

The constraints below are the filter every later finding passes through. Most are in the seed
docs; the keyboard, text-field and per-element size rules are new here.

A mod "never reads the keyboard itself" in a pane or band; Claude Code routes keys to the
mod's controls, and while the pane has focus Tab, the arrows, Enter, the page keys and Esc have
fixed meanings [VERIFIABLE][^1]. A `Button` hotkey is "one digit or one lowercase
letter", and "A mod can't bind Tab or the arrow keys to anything else" [VERIFIABLE][^1].
So `G`, `N`, `/`, `?`, `{` and `}`, the keys every terminal pager uses, cannot be pane hotkeys.
A `Client` element gets raw keys through `onKey`, with named keys and modifiers, but "Escape never
arrives: it returns the focus" [VERIFIABLE][^2]. This is new relative to the seed docs:
a pager-style keymap needs a `Client`, and a pane built from `Markdown` and `Button` elements is
limited to single lowercase letters and digits [INFERENCE: from the two quoted rules].

`Input` is a field whose `onSubmit` "Runs on Enter with the text"
[VERIFIABLE][^2]; Enter submits, so a field holds one line. A multi-line `Input` is an open
request on Anthropic's mods design issue, recorded in the fleet survey [VERIFIABLE][^3].
No element offers a multi-line rich-text editor. A block editor in the Notion sense would have to
be written from scratch inside a `Client` (draw the text, track a cursor, handle every key), which
is a large build with no prior art located [INFERENCE: no element provides it, and none of the
three Markdown mods located edits text in place].

One `Markdown` element takes "At most 10000 characters" [VERIFIABLE][^2], and only
"The first 100,000 characters are drawn" in one tree [VERIFIABLE][^4]. The `claude-mdview`
mod hits the same wall: "One markdown element holds at most 10,000 characters and a pane about
100,000, so long files come in parts" [VERIFIABLE][^5]. A long design doc therefore renders as
one `Markdown` element per block or section, which happens to be the block model Notion and Craft
use [INFERENCE].

What `$.ui.scroll` brings into view is "never a row number, always a thing"
drawn on screen, for example an element by its `key` [VERIFIABLE][^2]. An outline entry that jumps to its
heading is therefore a native operation: give each heading block a key and scroll to it.

Clicks reach a mod only in fullscreen rendering: `claude-mdview` says "Clicks need the
fullscreen layout" [VERIFIABLE][^5], and the seed survey records tmux mouse mode and the
missing sub-cell positions inside tmux (ai-harness `docs/research/claude-code-mods-web-browser-in-the-tui.md` §2.2).
A plain click on a `Markdown` link can be answered by the mod through `onLinkPress`
[VERIFIABLE][^2], which is what in-repo link following needs.

`$.ui.selection()` "returns the text you last selected in fullscreen mode", with the
row only when it lies in one transcript row [VERIFIABLE][^6]. Whether a selection inside
a pane is returned is not stated [NO SOURCE].

In a narrow terminal "the pane sits above the prompt instead of beside the
transcript", and there its default height "is a third of the space" [VERIFIABLE][^1].
A 100 by 40 reading surface exists only when the pane docks beside the transcript in a wide
fullscreen terminal [INFERENCE: from the placement rules].

No picture draws inside tmux; only `Raster` half blocks do (seed: ai-harness
`docs/research/claude-code-mods-web-browser-in-the-tui.md` §2.1). Every image, diagram and PDF
page in a doc becomes alt text, a half-block thumbnail or a text rendering.

Claude Code 2.1.299 added `size`, `weight`, `mono` and `tabular` to `Text`
[VERIFIABLE][^6]. In a terminal every cell is one size, so heading hierarchy has to be
carried by weight, colour, rules and indentation [INFERENCE: a cell grid has one font size; the
`size` prop is useful on Desktop only, which this run did not measure].

`Code` "draws source text with Claude Code's own syntax colors, or a diff", and with
`format: 'diff'` it takes unified diff hunks [VERIFIABLE][^7]. A diff view of Claude's
edits needs no renderer of its own.

### 2. Navigation and structure

Every major app ships an outline of headings that jumps to the heading. Google Docs: "The outline
detects and lists headings from your text to help organize your document" [VERIFIABLE][^8].
Notion's table of contents can sit "At the right side of your page as you scroll through it, as a
page-level setting", and a click on an entry goes "to that heading in the page"
[VERIFIABLE][^9]. Confluence's macro "scans the headings on the current Confluence page or
live doc" [VERIFIABLE][^10]. Obsidian adds reordering: "To rearrange sections in the note,
click and drag the heading within the outline" [VERIFIABLE][^11]. VS Code gives the
keyboard form: "Use ⇧⌘O (Windows, Linux Ctrl+Shift+O) to quickly jump to a header in the current
file" [VERIFIABLE][^12].

Heading-to-heading motion without the outline is a keyboard pattern in Google Docs ("Move to the
next or previous item with Ctrl + Alt + n or Ctrl + Alt + p followed by another key")
[VERIFIABLE][^13] and in Org mode, whose motion commands include `org-goto`, which
lets you "Jump to a different place without changing the current outline visibility"
[VERIFIABLE][^14]. Claude Code's own transcript mode binds `{` and `}` to "Jump to the
previous or next prompt" [VERIFIABLE][^15]; the same keys for previous and next heading
would match what a Claude Code user already knows [INFERENCE].

Confluence shows "Breadcrumbs : Navigation path that shows the location
of the page in the content tree", plus a read time "based on an average reading speed of 265 words
per minute" [VERIFIABLE][^16]. Notion offers a breadcrumb block (`/bread`) and a
shortcut to go up one level in the page hierarchy [VERIFIABLE][^17]. The
`claude-code-file-preview` mod already draws "A breadcrumb and stats header, headings with rules
under them, a capped reading width and spacing between blocks" [VERIFIABLE][^18]. For a
repository file the breadcrumb is the path plus the heading path to the current block
[INFERENCE].

Craft treats a block with nested content as a page: "You can click on a page block to
navigate inside it and see all its nested content" [VERIFIABLE][^19]. Org mode's sparse
trees fold the document "as much as possible, but the selected information is made visible along
with the headline structure above it" [VERIFIABLE][^20]. In a 40-row pane, showing one
section at a time with its heading path above it is the cheapest way to read a long design doc
[INFERENCE].

Obsidian links to a heading with `[[#`, previews a link target on hover
"without needing to navigate to that page", and lists backlinks, where "A backlink for a note is a
link from another note to that note" [VERIFIABLE][^21][^22][^23].
md-tui has a select-link mode and a key to "Preview link targets without following them"
[VERIFIABLE][^24]. Frogmouth keeps "a familiar browser-like navigation stack, history,
bookmarks, and table of contents" [VERIFIABLE][^25], and Textual's `MarkdownViewer`
"adds browser-like functionality on top of the Markdown widget" [VERIFIABLE][^26].
`claude-mdview` follows links between files in place with a Back key [VERIFIABLE][^5].

Confluence's content tree and Notion's sidebar hierarchy are workspace navigation.
In a repository the equivalent is the file tree, which md-tui offers as "File tree for browsing
Markdown files" [VERIFIABLE][^24]. A doc viewer beside Claude needs a file picker more than a
tree, because Claude names the files [INFERENCE: every Markdown mod located opens files from paths
in the transcript].

### 3. Reading modes and focus

A read and edit toggle with a one-key switch is common. Obsidian toggles Reading view and editing
with `Ctrl+E` [VERIFIABLE][^27]. Confluence live docs let a reader "switch yourself to “view
only” mode to prevent yourself from making accidental edits", with `E` to resume editing
[VERIFIABLE][^28]. HackMD has three: edit, view and "Both: See both in split view."
[VERIFIABLE][^29]. Obsidian's Live Preview "shows formatted text inline while hiding most
Markdown syntax. When your cursor enters formatted content, the underlying syntax becomes visible
for editing" [VERIFIABLE][^27], and render-markdown.nvim does the same in a terminal with
"Anti-conceal: hides virtual text added by this plugin on cursor line" [VERIFIABLE][^30].
markview.nvim offers a hybrid mode and a split view [VERIFIABLE][^31].

Focus modes dim everything but the current unit. Typora "will fade out other contents except
current line/block" [VERIFIABLE][^32]; iA Writer offers sentence, paragraph and
typewriter settings [VERIFIABLE][^33]. Typewriter mode "scrolls the article to keep current
caret fixed when typing" [VERIFIABLE][^32]. iA Writer warns that "A conflict between the
area you will select to edit and Focus Mode’s attempt to vertically center the cursor might result
in the screen jumping vertically" [VERIFIABLE][^33]. `Text` takes `dimColor`
[VERIFIABLE][^1], so dimming every block but the focused one is direct.

Google Docs' pageless mode lets a reader "select a text width of narrow,
medium, or wide" [VERIFIABLE][^34]. Word's Read Mode shows "a horizontal sequence of
pages, which you can quickly browse using the Left and Right arrow keys" [VERIFIABLE][^35].
In a docked pane the width is fixed by the terminal, so the useful control is a capped measure
inside it, as `claude-code-file-preview` does [VERIFIABLE][^18].

### 4. Search, palettes and switchers

Find in page is universal. md-tui uses `f` or `/` and `n` or `N` [VERIFIABLE][^24]; Claude
Code's transcript mode uses `/` and `n`/`N` [VERIFIABLE][^15]; `claude-mdview` uses `f`
and "Enter again for the next match" [VERIFIABLE][^5]. `claude-code-file-preview` offers a
fuzzy search where "Enter jumps to the first, and each match is a button that scrolls to it"
[VERIFIABLE][^18].

Obsidian's palette puts "recently used commands appear at the top
of the Command palette", and its quick switcher matches fuzzily: "File suggestions match letters in
order, even if you skip some" [VERIFIABLE][^36][^37]. Google Docs calls its
palette "Tool finder (formerly search the menus)" on `Alt + /` [VERIFIABLE][^13];
Word puts search on `Alt+Q` [VERIFIABLE][^35]; Notion opens search with `cmd/ctrl + P`
or `cmd/ctrl + K` [VERIFIABLE][^17]; GitBook's quick find lists "Results from the
section you're currently in appear at the top" [VERIFIABLE][^38]. Helix groups pickers
under a leader key: Space mode is "Accessed by typing Space in normal mode" [VERIFIABLE][^39].

Confluence opens its shortcut list "When viewing a page or live doc, press shift+?"
[VERIFIABLE][^40]; glow keeps `less` keys and "you can press `?` to list the hotkeys"
[VERIFIABLE][^41]; micro has a "nano-like menu to help you remember the keybindings"
[VERIFIABLE][^42]. `claude-mdview` "lists its keys in one dim row under the file's name, each a
click away too" [VERIFIABLE][^5]. NN/g's 2024 guidance on accelerators is that they "should
be readily available, yet easy to ignore" [VERIFIABLE][^43].

In a mod, the prompt is already a palette. `/` commands and `prompt.autocomplete`, whose rows are
"shown below Claude Code's own" and where "Choosing a row writes its `text` over the word"
[VERIFIABLE][^4], can carry open-file, jump-to-heading and find commands without a
second palette in the pane [INFERENCE].

### 5. Collapsible content

Toggles, folds and expand blocks appear in every app. Notion headings "can also be toggles so that
you can open and close them" [VERIFIABLE][^9]. Confluence's Expand macro "displays an
expandable/collapsible section of text on your page" [VERIFIABLE][^44]. GitBook has an
expandable block for FAQs [VERIFIABLE][^45]. Word's Outline view has "Expand the text
under a heading" and expand-or-collapse-all shortcuts [VERIFIABLE][^35]. Obsidian
folds headings and lists, and "Folded sections show an arrow regardless of if you hover it or not"
[VERIFIABLE][^46]. vim-markdown: "Folding is enabled for headers by default", with `zR`
opening all folds and `zM` closing them [VERIFIABLE][^47]. Org mode cycles visibility with two
keys: "Org uses just two commands, bound to TAB and S-TAB, to change the visibility in the buffer"
[VERIFIABLE][^48].

In a pane, Tab is reserved [VERIFIABLE][^1], so Org's TAB cycling needs another key
(`z` or Enter on a heading) unless a `Client` receives Tab. The types list `tab` among the key
names a `Client` can receive [VERIFIABLE][^2]; whether Claude Code delivers Tab to a
focused `Client` or keeps it for focus movement was not measured [NO SOURCE].

### 6. Block model and editing

The block model is the shared core of Notion, Craft and Confluence. In Craft "everything you create
is a block" and "any block can become a page" [VERIFIABLE][^19]. Notion: "Everything in
Notion is a block" [VERIFIABLE][^17].

Block selection mode is the part that maps best to a keyboard. Notion: "Press esc to select the
block you're currently in", arrow keys move the block selection, "Hold cmd/ctrl + shift + arrow
keys to move a selected block around", and "Press cmd/ctrl + / to edit or change one or more
selected blocks" [VERIFIABLE][^17]. Word's F8 grows a selection outward: "F8
repeatedly to expand the selection to the entire word, sentence, paragraph, section, and document"
[VERIFIABLE][^35]. A viewer pane that is always in block-selection mode, with a
highlighted current block and actions on it, matches this directly [INFERENCE: the pane's Up and
Down already move between controls, and each block can be a pressable `Button` or a keyed
`Markdown` element].

"Pressing / in Notion brings up a full menu of content blocks
you can choose to insert" [VERIFIABLE][^17]. Confluence, Loop and Craft have the
same `/` insert menu [VERIFIABLE][^28][^49][^50].
Google Docs added Markdown auto-formatting and "Paste from Markdown" and can export a document "as
Markdown" [VERIFIABLE][^51]. For a Markdown file the source already is the format, so
slash insertion matters only for inserting blocks Claude Code's prompt cannot (a table skeleton,
a callout); and `/` in the pane is not a bindable hotkey [VERIFIABLE][^1].

Notion's `/turn` changes a block's type [VERIFIABLE][^17],
and "Hover over any block and use the ⋮⋮ icon that appears as a handle to drag it around"
[VERIFIABLE][^52]. Drag is possible in a `Client` with pointer capture in fullscreen
(seed: ai-harness `docs/research/claude-code-mods-web-browser-in-the-tui.md` §2.2). A keyboard move
(Notion's `cmd/ctrl + shift + arrow`, Word Outline's `Alt+Shift+Up`) needs no pointer at all
[VERIFIABLE][^17][^35].

The only in-place editing a mod pane supports today is a single-line `Input`
(Finding 1). Three workable routes follow: a single-line field for headings, list items and table
cells; asking Claude to change a block (Finding 9); or handing the file to an editor, as md-tui
does with "Edit file in `$EDITOR`" [VERIFIABLE][^24]. A mod cannot hand Claude Code's own
terminal to `$EDITOR` [INFERENCE: the mod draws inside Claude Code's renderer and `$.process.run`
runs a process without the terminal; not measured], so the third route means opening the file in a
separate window or tmux pane.

### 7. Inline references and transclusion

`@` mentions are universal: Notion mentions people, pages, dates and reminders after `@`
[VERIFIABLE][^17]; Google Docs smart chips start when you type `@` "anywhere in your
document or click the" `@` button [VERIFIABLE][^53]; building blocks are
reached the same way [VERIFIABLE][^54]. Claude Code already owns `@` in the prompt for
file mentions, and its `prompt.mention` event fires when "Claude Code is about to read a file that
a prompt @-mentions" [VERIFIABLE][^4]. A doc mod can extend that with `@file#heading`
completions, as VS Code completes links to headers across a workspace when you "type ## in a
Markdown link" [VERIFIABLE][^12].

Notion's synced blocks propagate edits: "If you make a change in one instance of a
synced block, that change will also appear in all other places where that synced block exists"
[VERIFIABLE][^55]. Confluence's insert excerpt macro shows "an excerpt of content from
one page or live doc on another" [VERIFIABLE][^56]. Loop components are live across apps:
"No matter where people are editing, the component will always show the latest updates"
[VERIFIABLE][^49]. Obsidian embeds files "to reuse content across multiple places" [VERIFIABLE][^57]. Plain
Markdown has no transclusion syntax, so this applies only if doc-editor adopts an embed convention;
it is not an MVP need [INFERENCE].

Confluence opens a linked page in a side panel so "You can read, comment, or edit
the page, then return to your Jira work item without losing your place" [VERIFIABLE][^58].
Inside Claude Code the transcript is the main surface and the pane is that side panel
[INFERENCE].

### 8. Callouts, tables, code and diagrams

Callouts are one shared syntax family. GitHub: "Alerts, also sometimes known as callouts or
admonitions, are a Markdown extension based on the blockquote syntax" [VERIFIABLE][^59].
Obsidian: "To create a callout, add `[!info]` to the first line of a blockquote"
[VERIFIABLE][^60]. `claude-code-file-preview` draws `[!NOTE]` to `[!CAUTION]` "as coloured
boxes" [VERIFIABLE][^18], and render-markdown.nvim ships "Github & Obsidian defaults" for
callouts [VERIFIABLE][^30]. A bordered `Box` with a coloured label transfers directly
[INFERENCE: `Box` takes `borderStyle` per the interface page].

Tables are the hardest common block at 100 columns. `claude-code-file-preview` fits columns to the
pane, wraps cells, and "A table too wide for the pane is shown as one card per row"
[VERIFIABLE][^18]. `claude-mdview` turns "too-wide tables" into "something a terminal can
show" [VERIFIABLE][^5].

Code blocks transfer with Claude Code's own highlighter through `Code` [VERIFIABLE][^7].
Mermaid is drawn as box-drawing text by `claude-code-file-preview` through `mermaid-ascii`, with the
source shown when a diagram type is unsupported [VERIFIABLE][^18]. `claude-mdview` shows
math and Mermaid "as written" [VERIFIABLE][^5].

### 9. Review, history and AI assist

Notion: "Select any text and choose Comment from the menu that pops up"
[VERIFIABLE][^61]. Confluence: "Select Comment from the floating toolbar that appears
above the highlighted text" [VERIFIABLE][^62]. Google Docs can "Minimize comments",
which "Reduces comments to icons" [VERIFIABLE][^63], the form that fits a narrow pane:
a margin marker per commented block [INFERENCE].

Google Docs suggesting mode lets you "suggest changes to a document
without changing the original text", and you can preview the document "with or without the
changes" [VERIFIABLE][^64]. Word has four views of tracked changes: "Simple Markup
displays tracked changes with a red line in the margin" and "No Markup hides the markup to show
the document with changes incorporated", beside All Markup and Original [VERIFIABLE][^65].
GitBook's change requests are branches, "familiar to anyone who uses pull requests in GitHub", and
"the floating diff navigator lets you jump between changed blocks", in split or inline view
[VERIFIABLE][^66]. GitHub renders prose diffs: pull requests "that include prose documents have
the ability to represent those documents with source and rendered views" [VERIFIABLE][^67].

Evidence against copying tracked changes comes from Ink & Switch's Upwelling study (March 2023,
background), which found that "Common user interfaces for reviewing changes suffer from readability and usability problems",
quoted a dyslexic editor who finds Track Changes "nearly impossible", and noted that Docs and Word
"do not provide any way of grouping related edits into anything resembling a commit"
[VERIFIABLE][^68]. Upwelling marks deletions with a symbol and shows the deleted text on
hover, avoiding strikethrough to cut visual noise [VERIFIABLE][^68]. For a TUI this argues for
Word's Simple Markup (a margin bar per changed block) as the default, with the full diff one key
away, and for grouping Claude's edits by turn [INFERENCE: the turn is Claude's natural unit of
change, as Upwelling's commits are a writer's].

Notion: "A new version of a particular page will be recorded every 10 minutes as you
actively edit it" [VERIFIABLE][^69]; Google Docs browses earlier versions in a side panel
[VERIFIABLE][^70]. In a repository, git is the history, and the built-in `/diff` pane
already compares against the session start, HEAD or the merge base, and "A picker shows one
earlier turn's edits" [VERIFIABLE][^71].

GitBook: "If you want the Agent to review a specific block on
your page, you can tag it in a comment and tell it what you need" [VERIFIABLE][^72].
Confluence: an agent mentioned in a comment "uses the comment and page context to help with first
drafts, quick summaries, and specific tasks" [VERIFIABLE][^73]. Notion AI "Helps you
improve your writing inline on a page" [VERIFIABLE][^74]. Word's Copilot result offers:
"You can keep it, discard it, or continue refining it with a follow-up prompt"
[VERIFIABLE][^75]. `claude-mdview` already does this in a Claude Code pane: hover a
block, press the pencil, type the change, and "Claude gets the file, the lines and how they begin",
with a status line under the block from "Waiting for Claude" to "Updated" [VERIFIABLE][^5].

Claude Desktop's diff view: "To comment on specific lines,
click any line in the diff to open a comment box", then submit all, and "Claude reads your comments
and makes the requested changes, which appear as a new diff you can review" [VERIFIABLE][^76].
GitHub states the reason to batch: it "prevents Copilot from starting to work on individual
comments before you have completed your review" [VERIFIABLE][^77]. The built-in diff mod
has a lighter form: "A file's ask button arms that file: its hunks ride the next prompt as context,
once" [VERIFIABLE][^71].

ABScribe (CHI 2024) stores AI rewrites "adjacently within text fields
for rapid in-place comparisons using mouse-over interactions on a popup toolbar", and in a 12-writer
study it "significantly reduces task workload (d = 1.20, p < 0.001)" against a baseline workflow
[VERIFIABLE][^78]. iA Writer marks authorship: "Your own words speak in black and white. AI
stands out in color." [VERIFIABLE][^79]. A doc pane could colour the margin of blocks
Claude wrote this session, using the turn records the diff mod already reads [INFERENCE].

### 10. Terminal programs that already do this, and their key maps

| Program | What it shows | Keys and mouse | Source |
|---|---|---|---|
| Claude Code transcript mode | `less`-style review of the transcript | `/` search, `n`/`N`, `j`/`k`, `g`/`G`, `{`/`}` previous or next prompt, `Ctrl+u`/`Ctrl+d`; selection copies on mouse release | [VERIFIABLE][^15] |
| glow (27,688 stars, MIT, pushed 2026-10-05) | Markdown pager and file stash | "Most of the keystrokes you know from `less` are the same", `?` lists them; mouse wheel option | [VERIFIABLE][^41] |
| md-tui (554 stars, AGPL-3.0, pushed 2026-10-02) | Markdown reader with link and details modes | `j`/`k`, `f` or `/`, `n`/`N`, `s` select-link mode, `D` cycle `<details>`, `K` hover preview, `b` back, `t` files, `e` `$EDITOR` | [VERIFIABLE][^24] |
| Frogmouth (3,308 stars, MIT, last push 2024-08-01) | Markdown browser on Textual | Tab between controls, mouse; history, bookmarks, contents | [VERIFIABLE][^25] |
| render-markdown.nvim (5,163 stars, MIT, pushed 2026-10-10) | In-buffer rendering in Neovim | Normal editing keys; rendering hidden on the cursor line | [VERIFIABLE][^30] |
| markview.nvim (3,662 stars, Apache-2.0, pushed 2026-10-08) | Hybrid and split preview | Editor keys | [VERIFIABLE][^31] |
| vim-markdown (4,816 stars, no licence field, pushed 2025-10-23) | Header folding | `zr`/`zR`, `zm`/`zM`, `za`, `zo`/`zc` | [VERIFIABLE][^47] |
| Org mode | Outline visibility, sparse trees, heading motion | `TAB` subtree cycle, `S-TAB` global cycle, `C-c C-n`/`C-c C-p` | [VERIFIABLE][^14][^48] |
| Helix (46,592 stars, MPL-2.0) | Modal editor | Minor modes that "typically switch back to normal mode after a command"; Space mode pickers | [VERIFIABLE][^39] |
| lazygit (83,181 stars, MIT, pushed 2026-10-14) | Panels over git | Hunk staging: "The selection covers a whole hunk to begin with, so `<space>` stages that hunk and moves on to the next one"; `z` undo | [VERIFIABLE][^80] |
| bat (60,774 stars, Apache-2.0) | Highlighted file view | Git gutter: "`bat` communicates with `git` to show modifications with respect to the index" | [VERIFIABLE][^81] |
| micro (29,705 stars, MIT) | Editor | Mouse drag, double and triple click; "nano-like menu" of keys | [VERIFIABLE][^42] |
| Zellij (35,732 stars, MIT) | Multiplexer modes | Scroll mode entered by scrolling or focus; status bar shows mode keys | [VERIFIABLE][^82] |
| mdcat (2,410 stars, MPL-2.0) | `cat` for Markdown | None (no pager); the repository is archived | [VERIFIABLE][^83] |

Repository figures were read through `ghp api` on 2026-10-15 [VERIFIABLE][^83].

The shared terminal convention is `less`: `j`/`k`, `/`, `n`/`N`, `g`/`G`, `q`, `?`. Claude Code
users meet it in transcript mode [VERIFIABLE][^15]. A pane limited to lowercase hotkeys
can carry `j`, `k`, `n`, `g`, `q`, `f` and `t` but not `G`, `N`, `/` or `?` (Finding 1), so either
the pane uses a `Client` for its key map, or it substitutes letters (`f` for find as `claude-mdview`
and md-tui do) [INFERENCE].

Modes in terminal tools are signalled on screen: Helix's minor modes return to normal after one
command [VERIFIABLE][^39], and Zellij enters scroll mode implicitly when "Focusing a pane that is
scrolled back" [VERIFIABLE][^82]. NN/g's guidance (2019, background) is "Clear visibility of
the current active mode", because "Mode slips happen because the system doesn’t clearly indicate
its status to the user" [VERIFIABLE][^84].

### 11. What makes these editors feel good or bad

Notion's 2024 engineering post reports that a local SQLite cache "improved page navigation
times by 20 percent in all modern browsers" [VERIFIABLE][^85]. Nuclino sells itself as
"Built for speed from the ground up" [VERIFIABLE][^86]. For a mod, the comparable costs are
the 30-redraws-a-second pane throttle and file reads through `$.fs` (seed: ai-harness
`docs/research/claude-code-mods.md` §1.6); the built-in diff pane "fetches before it opens" so it
"never lands on `Loading diff…`" [VERIFIABLE][^71].

Claude Code's fullscreen mode "eliminates flicker" and redraws only visible messages,
which matters most "in terminal emulators where rendering throughput is the bottleneck, such as the
VS Code integrated terminal, tmux, and iTerm2" [VERIFIABLE][^15]. Textual's compositor
(2024) avoids flicker with partial updates: "if you click a button and it changes color, the
compositor can update just the region occupied by the button" [VERIFIABLE][^87]. A mod
inherits Claude Code's renderer, so its flicker budget is Claude Code's, but a mod that rebuilds a
100,000-character tree on every keypress will feel slow [INFERENCE: the tree limit and the throttle
are documented; per-keystroke cost was not measured].

iA Writer's focus-mode warning about "the screen jumping vertically"
[VERIFIABLE][^33] and Textual's 2025 note that "the terminal reports the mouse coordinates in
cells", which makes scrollbars jerky [VERIFIABLE][^88], point the same way: keep the
viewport still when content changes. `$.ui.scroll`'s `nearest` block "moves the least that shows the
row whole" [VERIFIABLE][^2], and `claude-mdview`'s edit
bar "follows its block" when the file shifts under it [VERIFIABLE][^5].

Notion leads its own shortcut page with a short list because "If you're not a born
shortcutter, we get it" [VERIFIABLE][^17]; Confluence binds `shift+?` to the list
[VERIFIABLE][^40]; NN/g (2024) wants accelerators "readily available, yet easy to ignore"
[VERIFIABLE][^43]. A one-line key hint row, as `claude-mdview` draws, satisfies both
[INFERENCE].

lazygit's `z` undo and its stated limit ("we can't undo changes to the working tree")
[VERIFIABLE][^80] show the trap a doc mod falls into: an edit Claude makes is a file write,
and the mod's undo is git or Claude Code's own `/rewind` [INFERENCE: the mod has no transaction log
of its own unless it keeps one].

NN/g on modes (2019, background) [VERIFIABLE][^84] and the read and edit
toggles in Finding 3 agree: show the mode in the pane header, and make the destructive mode (edit,
or an armed Claude request) visibly different [INFERENCE].

ABScribe's measured workload drop [VERIFIABLE][^78] and Upwelling's interview
evidence [VERIFIABLE][^68] are the only peer-reviewed or lab sources located on how AI edits
and tracked changes feel. 2025 to 2026 peer-reviewed work on terminal document viewers: no
significant post-2024 developments found [NO SOURCE].

### 12. What a developer beside a coding agent needs

`claude-mdview` turns `.md` paths into links "in replies,
under `Read` / `Write` / `Edit` rows and under your own prompts", and "`path:42` and `path#heading`
land on the spot" [VERIFIABLE][^5]. `claude-code-file-preview` does the same for Markdown, JSON
and YAML [VERIFIABLE][^18]. VS Code's reverse jump is "double clicking an element in the
Markdown preview will automatically open the editor for the file and scroll to the line nearest the
clicked element" [VERIFIABLE][^12].

`claude-mdview`: "A file Claude writes redraws at once; one changed
elsewhere within 1.5 s" [VERIFIABLE][^5]. Claude Desktop's file pane warns "If the file changed
on disk since you opened it" [VERIFIABLE][^76].

A diff of Claude's edits can use `Code` with `format: 'diff'` [VERIFIABLE][^7]; the built-in diff
pane's pinned header and list, where "The header, the file list and its toggles stay put while the
wheel moves the hunks under them" [VERIFIABLE][^71]; GitHub's rendered prose diff
[VERIFIABLE][^67]; GitBook's diff navigator [VERIFIABLE][^66]; lazygit's hunk-by-hunk
action [VERIFIABLE][^80].

VS Code's link validation "checks local links in your Markdown code to
make sure they are valid", and Rename on a header "updates the header and automatically updates all
links to that header" [VERIFIABLE][^12]. Both are cheap for a mod that already parses the
file, and both catch the most common breakage when Claude renames a heading [INFERENCE].

Every outline in Finding 2 applies; for fleet design docs the Decision
Summary and Open Questions headings are the usual jump targets [INFERENCE: from the structure of the
seed design doc].

GitHub task lists use `[ ]` and `[x]` [VERIFIABLE][^59]; Notion's
`cmd/ctrl + enter` checks or unchecks a to-do [VERIFIABLE][^17]. Toggling a checkbox is
a one-character file edit the mod can make itself, with no model call [INFERENCE].

ClickUp can "convert any comment to a task in one click" [VERIFIABLE][^89].
For this fleet the analogue is filing a block as a Beads issue, which ties doc-editor to the
beads-ui epic in the same founding ask [INFERENCE].

### 13. Apps whose signature patterns do not fit a cell grid

Miro sells "one, infinite, multiplayer canvas" [VERIFIABLE][^90]. Mural's facilitation features
include "Make sure everyone is looking at the same content at the same time" and "hiding/revealing
of next steps" [VERIFIABLE][^91]. Gamma's unit is a slide: "Slides in Gamma are the fundamental
building blocks of your presentations, documents, or webpages", on "a fixed 16:9 canvas"
[VERIFIABLE][^92]. Coda "blends the best of docs, spreadsheets, and applications", and
the product page now says "Coda is now Superhuman Docs" [VERIFIABLE][^93]. Craft's card style
can carry cover images [VERIFIABLE][^19]. None of these signature patterns survives a 100 by 40
grid in tmux without pictures; what does survive is generic (a Craft drill-in, Mural's reveal as
progressive disclosure, Gamma's one-section-at-a-time reading) [INFERENCE].

GitBook's OpenAPI pages "let your users test endpoints right on the page with interactive blocks"
[VERIFIABLE][^94]. A mod could draw a similar test row with `$.http.fetch`, but an API
console is outside a Markdown viewer's scope [INFERENCE].

Craft adds one constraint to copy: it limits indentation to five levels, and "The 5-level
limit is intentional, not a technical limitation" [VERIFIABLE][^95]. At 100 columns with
two or four cells per indent level the same cap keeps nested lists readable [INFERENCE].

## Pattern inventory, transfer table and MVP ranking

### Table A: per-app pattern inventory

"Doc" means a vendor page fetched this run states the pattern. Cells that a finding rests on are
cited in Findings; the rest come from the pages counted in Method and carry no tier tag of their
own. A blank cell means not checked, not absent.

| App | Viewing patterns | Editing patterns | Keyboard model | Fetched? |
|---|---|---|---|---|
| Notion | Right-side TOC, toggle headings, breadcrumb block, database peek view, version history every 10 min | Block editor, `/` menu, Markdown shortcuts, `/turn`, drag handle, Esc block select, synced blocks, `@` mentions, AI inline | `cmd/ctrl+P/K` search, `cmd/ctrl+/` block actions, `cmd/ctrl+shift+arrows` move block | Doc |
| Confluence | TOC macro, breadcrumbs, read time (265 wpm), side preview panel, expand macro, excerpt include, avatars and telepointers | Live docs, `/` insert, Markdown shortcuts, inline comments from floating toolbar, Rovo agents in comments | `shift+?` help, view-only toggle `Cmd+Shift+E` and `E` | Doc |
| Google Docs | Outline from headings, pageless widths, minimized comments, version history panel | Suggesting mode, smart chips and building blocks on `@`, Markdown on/off, paste and export Markdown | Tool finder `Alt+/`, chorded next or previous heading, suggestion and comment navigation | Doc |
| Word (desktop and web) | Read Mode, Outline view expand and collapse, four markup views | Track changes, Copilot keep, discard or refine | `Alt+Q` search, F8 grow selection, `Alt+Shift+arrows` outline moves | Doc |
| Coda | Docs plus tables plus apps | Formulas, buttons (help centre 403) | | Product page only |
| Gamma | Slides on a fixed canvas, filmstrip | AI-generated slides | | Doc |
| Craft | Page blocks as drill-in, cards | Blocks, `/` menu, 5-level indent cap | | Doc |
| GitBook | Quick find, expandable blocks, OpenAPI blocks | Change requests as branches, diff navigator, Git Sync, agent on a block | Keyboard shortcuts page | Doc |
| ClickUp Docs | Subpages, Docs Hub | Comment to task, live cursors | | Product page only (help 403) |
| Miro | Infinite canvas | Diagrams, AI on canvas | | Product page only (help 403) |
| Mural | Canvas, outline of steps, reveal | Facilitation controls | | Product page only |
| Microsoft Loop | Live components in chats and docs | `/` insert, `//` comment, coloured cursors | | Doc (Teams article) |
| Obsidian | Reading view, Live Preview, outline with drag, page preview on hover, backlinks, folding, tabs | Callouts, heading and block links, embeds | `Ctrl+E` toggle, `Ctrl+P` palette, `Ctrl+O` switcher, fuzzy match | Doc |
| Typora | Live preview with syntax hidden, `[TOC]`, outline sidebar | Focus mode, typewriter mode | | Doc |
| iA Writer | Focus on sentence or paragraph | Authorship colours for AI text, style check | | Doc |
| HackMD | Edit, view, both | Book and slide modes, versions | | Doc |
| MarkText | WYSIWYG preview | Source code, typewriter and focus modes | | README |
| VS Code Markdown | Outline view, preview sync, double-click to source | Path and header completions, link validation, rename header | `Ctrl+Shift+O` go to header, `Ctrl+T` workspace headers | Doc |
| GitHub | Rendered prose diff, alerts, task lists, footnotes | Suggested changes, batched review | | Doc |
| Claude Desktop Code tab | File pane, diff viewer | Line comments submitted as a batch to Claude | `Cmd+Enter` submit all | Doc |

Surveyed and found to add no pattern beyond the rows above, or unreachable: Bear (FAQ lists a
table of contents and backlinks only), Apple Pages (guide index only), Slite and Nuclino (marketing
pages), Anytype (README: local-first blocks), Outline and Logseq (JavaScript-only docs), StackEdit
and Dillinger (README only; StackEdit last pushed 2023-07-04), Overleaf (two 404s), Dropbox Paper
(404), Quip and Zoho Writer (not fetched in this run's budget).

### Table B: transfer to a 100 by 40 cell pane

| Pattern | Exemplar app | Transfers | Reduction or reason | MVP or later |
|---|---|---|---|---|
| Outline of headings that jumps to the heading | Google Docs, Notion, VS Code | Direct | `$.ui.scroll` to a keyed heading element | MVP |
| Previous or next heading keys | Google Docs, Org mode | Reduced | `{`/`}` need a `Client`; pane hotkeys allow lowercase letters only, so a pane-only build uses letters or Up and Down over a heading list | MVP |
| Breadcrumb and stats header (path, heading path, read time) | Confluence, Notion | Direct | One `Text` row | MVP |
| Find in page with next match | Every app; less | Reduced | `f` and Enter in a pane; `/` and `n`/`N` only in a `Client` | MVP |
| Read and edit toggle with one key | Obsidian, Confluence | Direct | `e` as a hotkey; mode named in the header | MVP |
| Live Preview (syntax shown only at the cursor) | Obsidian, render-markdown.nvim | Reduced | Show the focused block's source in a `Code` element beside or under its rendering | Later |
| Split source and rendered view | HackMD, markview.nvim | Reduced | No room for two columns at 100 cells; toggle between them per block | Later |
| Collapsible headings and folds | Notion, Word Outline, Org mode, vim-markdown | Direct | Per-heading toggle; fold-all and unfold-all keys | MVP |
| TAB and S-TAB visibility cycling | Org mode | Reduced | Tab is reserved in a pane; use Enter or `z` on a heading, global cycle on a letter | MVP (reduced) |
| Drill-in to one section | Craft, Org sparse trees | Direct | Render only the chosen section with its heading path | MVP |
| Focus dimming of other blocks | Typora, iA Writer | Direct | `dimColor` on unfocused blocks | Later |
| Typewriter centring | Typora, iA Writer | Reduced | `$.ui.scroll` with `block: 'center'`; risk of jumping per iA Writer | Later |
| Capped reading width | Google Docs pageless, file-preview | Direct | Wrap to a measure inside `bodyColumns` | MVP |
| GitHub and Obsidian callouts | GitHub, Obsidian | Direct | Bordered `Box` with a coloured label | MVP |
| Tables | All | Reduced | Fit columns, wrap cells, fall back to one card per row | MVP |
| Code blocks with highlighting | All | Direct | `Code` element | MVP |
| Images and diagrams | All | Reduced or no | No pictures in tmux; alt text, half-block thumbnail, or Mermaid as box text | Later |
| Math | Notion, Typora | Reduced | Show TeX source | Later |
| Links followed in place with Back | Frogmouth, mdview, md-tui | Direct | `onLinkPress` on `Markdown`; a history stack | MVP |
| Hover preview of a link target | Obsidian, md-tui | Reduced | Needs fullscreen hover; keyboard form is a select-link mode with a preview line | Later |
| Backlinks | Obsidian | Direct | A list of files that link here, computed by a repo scan | Later |
| Quick switcher and fuzzy file open | Obsidian, GitBook | Reduced | Prompt `/command` plus `prompt.autocomplete` rows | MVP |
| Command palette | Obsidian, Google Docs, Word | Reduced | The prompt's `/` menu is the palette | MVP (reuse) |
| Key hint row and `?` help | mdview, glow, Confluence | Direct (row); reduced (`?` needs a `Client`) | One dim row of keys | MVP |
| Block selection mode with a highlighted current block | Notion | Direct | Up and Down over block controls | MVP |
| Grow selection outward | Word F8 | Reduced | Block, then section, then document | Later |
| Move block up or down by keyboard | Notion, Word Outline | Reduced | Rewrite the file; lowercase hotkeys only | Later |
| Drag handle to move blocks | Notion | Reduced | `Client` pointer capture, fullscreen only, never in tmux without mouse mode | Later |
| Slash insert menu | Notion, Confluence, Loop, Craft | Reduced | `/` is not a pane hotkey; a `Select` of block types | Later |
| Rich in-place block editing | Notion, Google Docs, Word | No | No multi-line field; a custom `Client` editor is a large build | Later, if ever |
| Single-line edit of a heading, list item or cell | Notion | Direct | `Input` element | MVP |
| Toggle a checklist item | GitHub, Notion | Direct | Pressable checkbox writes the file | MVP |
| Point at a block and ask Claude to edit it | mdview, GitBook, Confluence Rovo | Direct | `$.prompt.submit` with file, lines and the request | MVP |
| Keep, discard or refine an AI result | Word Copilot | Direct | Buttons after Claude's edit lands | MVP |
| Batch comments, then send to Claude | Claude Desktop diff, GitHub review | Direct | Pending comments listed in the pane; one submit | Later |
| Margin markers for changed blocks (Simple Markup) | Word | Direct | One coloured column per block | MVP |
| Full diff of Claude's edits | GitBook, GitHub, built-in `/diff` | Direct | `Code` with `format: 'diff'`, per turn | MVP |
| Jump between changed blocks | GitBook diff navigator, lazygit | Direct | Next or previous change keys | MVP |
| Accept or revert one hunk | lazygit, Word | Reduced | Revert means writing the old text back; no tracked-change store | Later |
| Authorship colour for Claude's text | iA Writer | Reduced | Session-scoped only, from turn records | Later |
| Side-by-side AI variations | ABScribe | Reduced | Cycle variations of one block in place | Later |
| Inline comments and threads | Notion, Confluence, Google Docs | Reduced | No comment store in Markdown; markers plus a list; needs a storage decision | Later |
| Version history browser | Notion, Google Docs | Reduced | git log of the file plus per-turn diffs | Later |
| Synced blocks and transclusion | Notion, Confluence, Loop | No (for plain Markdown) | No syntax; needs a convention | Later |
| `@` mentions and smart chips | Google Docs, Notion | Reduced | `@file#heading` completion in the prompt | Later |
| Presence cursors and avatars | Confluence, Loop, ClickUp | No | Single user in a local terminal; Claude's activity is the only other presence | No |
| Infinite canvas, frames, zoom | Miro, Mural | No | A cell grid cannot pan or zoom a spatial layout usefully | No |
| Slides and cards with cover images | Gamma, Craft | No | Pictures and free layout | No |
| Formulas, buttons and databases in the doc | Coda, Notion | No | Not Markdown; out of doc-editor's scope | No |
| Link validation and header rename | VS Code | Direct | Parse local links; warn in the header | Later |
| Jump from a `Read`/`Write`/`Edit` row to the rendered page | mdview, file-preview | Direct | `ui.render` on `ToolResult` adds a link | MVP |
| Live reload when the file changes | mdview, file-preview | Direct | Re-read after Claude's write and on a 1.5 s poll | MVP |
| Comment to task | ClickUp | Direct | File a block as a Beads issue | Later |

### Table C: ranked top 15 patterns for the MVP

Ranked by value to a developer reading a design doc beside Claude, divided by build cost inside
the mod surface. The ranking is the author's judgement on the cited evidence [INFERENCE].

| Rank | Pattern | Exemplar | Why it ranks here | Citation |
|---|---|---|---|---|
| 1 | Open the rendered file from a path in the transcript or a tool row | `claude-mdview` | The entry point; every other pattern assumes the file is open | [^5] |
| 2 | Outline that jumps to a heading | Google Docs, Notion, VS Code | Long design docs are read by section; native `$.ui.scroll` to a key | [^2][^8] |
| 3 | Point at a block and ask Claude to change it | `claude-mdview`, GitBook Agent | It is the editor, given no multi-line field | [^5][^72] |
| 4 | Diff of Claude's edit with next and previous change | GitBook, built-in `/diff` | Review is the developer's job after every edit | [^66][^71] |
| 5 | Live reload with a stable viewport | `claude-mdview`, iA Writer warning | The file changes under the reader every turn | [^5][^33] |
| 6 | Collapsible headings with fold-all and unfold-all | Notion, Word Outline, vim-markdown | 40 rows hold little; folding is how a reader sees the shape | [^9][^35][^47] |
| 7 | Find in page with next match | md-tui, transcript mode | Universal; cheap | [^15][^24] |
| 8 | Links followed in place, with Back | Frogmouth, `claude-mdview` | Design docs link to research and ask records | [^5][^25] |
| 9 | Header row: path, heading path, mode, read time | Confluence, `claude-code-file-preview` | Orientation in one row | [^16][^18] |
| 10 | Margin markers on changed blocks | Word Simple Markup, bat gutter | Shows what moved without the noise of strikethrough | [^65][^68][^81] |
| 11 | Keep, discard or refine after an edit | Word Copilot | Closes the edit loop in the pane | [^75] |
| 12 | Callouts and tables drawn for a narrow pane | GitHub alerts, `claude-code-file-preview` | The two blocks that break most often at 100 columns | [^18][^59] |
| 13 | Read and edit toggle shown in the header | Obsidian, Confluence | Avoids mode slips once single-line edits exist | [^27][^28][^84] |
| 14 | Toggle checklist items in place | GitHub task lists, Notion | Design docs carry acceptance-criteria checklists | [^17][^59] |
| 15 | Key hint row | `claude-mdview`, NN/g | Discoverability without a help screen | [^5][^43] |

## Gaps, blindspots and emergent findings

The editor half of the ask has no native surface. Finding 1 shows a mod has a single-line field and
no rich text editor. This is the biggest gap between the founding ask ("view and edit") and what
the doc apps teach. It is emergent, not in the brief's questions, and it changes the MVP: editing is
Claude-mediated, plus single-line fields and checkbox toggles. Whether a `Client`-based multi-line
editor is feasible (cursor drawing, key handling at one frame a second per call, Tab delivery) is
unmeasured and is the first spike candidate [NO SOURCE].

The types list `tab` among `Client` key names, and the
interface page says a mod cannot bind Tab in a pane. Whether a focused `Client` receives Tab,
`shift+g` and `/` is unmeasured [NO SOURCE]. The answer decides whether the `less` key map is
possible.

`$.ui.selection()` is documented for the transcript. Whether a mouse selection
inside a pane can be read, which selecting text to ask Claude about it needs, is unmeasured [NO SOURCE].
`claude-mdview` avoids the question by acting on whole blocks.

Coverage of Coda, ClickUp and Miro is thin. Their Zendesk help centres answered 403 to both `curl`
and WebFetch, so their rows rest on product pages. Their signature patterns are mostly
non-transferable, so the impact is low [INFERENCE].

Practitioner reviews 2024 to 2026 are thin. Reddit, Twitter and YouTube were not reachable from this
host, and the one Hacker News query returned launch posts, not reviews. The feel findings rest on
vendor docs, NN/g, one CHI 2024 paper, Ink & Switch and Textual's engineering blog. No usability
study of terminal document viewers was found [NO SOURCE].

The brief's app list leans toward collaborative SaaS editors. The patterns that ranked
highest came from developer tools outside that list (GitBook, GitHub, VS Code, lazygit) and from
three Claude Code mods. I added those deliberately; Table C would look different if ranked on the
named apps alone.

Upwelling's study argues tracked changes are hard to read, which cuts against
copying Word or Google Docs review views literally. Coda's rename to Superhuman Docs is a reminder
that the "innovative" list in the seed summaries moves fast; the seed summaries' Coda, Gamma and
Craft claims are not vendor-sourced and were not relied on.

Every collaborative app stores comments outside the text. A Markdown file in
git has no comment store, so inline comments need a storage decision (a sidecar file, HTML
comments, or Beads issues) before they can be built [INFERENCE].

The `Text` `size` prop and `Svg` exist on Desktop, so the Desktop Code tab could
show heading sizes and diagrams the terminal cannot. Desktop drawing was not measured by this leg
or the seed docs [NO SOURCE].

### Alignment against the founding ask

| Ask element (A001 unless noted) | Disposition in this leg |
|---|---|
| "pull inspiration and ideas and frontend components and design elements etc from popular doc apps like confluence, notion, google docs, word" | Covered: Findings 2 to 9, Table A rows for all four |
| "and any others that are popular and widely adopted / acclaimed or innovative and cutting edge and interactive" | Covered and broadened: Obsidian, Typora, iA Writer, HackMD, Craft, GitBook, Loop, VS Code, GitHub, Claude Desktop, terminal tools |
| The two Google AI summaries (A001, A002) naming Coda, Gamma, Craft, GitBook, ClickUp, Miro, Mural, Loop, Smart Canvas | Used as seeds only; each app was checked against its own pages; canvas, slide and formula patterns rejected for the TUI with reasons (Finding 13) |
| "rendering markdown and other docs and doc-like file types and also making them interactive" | Narrowed: this leg covers UI and UX patterns; rendering mechanics are the sibling research leg's |
| "render markdown / html / pdf etc in the claude mod doc viewer" and the epic title's "view and edit" | Covered, with a constraint surfaced: editing is Claude-mediated plus single-line edits (Finding 1, Gaps) |
| "start with an MVP and then enhancements" | Covered: Table B's MVP column and Table C |
| "mockups" for the design doc | Not produced here; the coordinator owns the design doc. Table B gives each MVP pattern's element mapping for mockups |
| A003, A004 (repo layout, publishing) | Out of scope for this leg |

## Recommendations to the coordinator

1. Scope the MVP as a reader with Claude-mediated editing, and say so in the design doc. Rests on
   Finding 1 (single-line `Input`, no rich text element) and Finding 9 (`claude-mdview`, GitBook
   and Confluence all route block edits through an agent).
2. Render one keyed `Markdown` element per block, never one element per file. Rests on Finding 1
   (10,000 characters per element, 100,000 per tree, scroll targets by key).
3. Run a spike before fixing the key map: does a focused `Client` receive Tab, capitals and `/`?
   If yes, adopt the `less` map Claude Code's transcript mode uses; if no, use lowercase letters as
   `claude-mdview` does. Rests on Findings 1 and 10.
4. Make the outline and drill-in the primary navigation, with fold-all and unfold-all. Rests on
   Findings 2 and 5 and Table C ranks 2 and 6.
5. Default the change view to margin markers per changed block, grouped by Claude turn, with the
   full diff one key away. Rests on Finding 9 (Word Simple Markup, Upwelling, GitBook diff
   navigator) and the built-in `/diff` mod's per-turn picker.
6. Borrow, with attribution, from the two MIT Markdown mods: `claude-mdview` for point-to-edit and
   path links, `claude-code-file-preview` for the docs-page header, callouts and too-wide tables.
   Both are exploratory by Route A (6 and 0 stars, each created and last pushed on one day,
   2026-10-03 and 2026-10-05), so copy patterns and small pieces of code and do not install the
   plugins. Rests on Findings 8, 9 and 12.
7. Treat inline comments, transclusion and backlinks as later work that each needs a storage or
   syntax decision first. Rests on Finding 7 and the Gaps entry on comments.
8. Drop presence, canvas, slide and formula patterns from the design doc's scope with a one-line
   reason each. Rests on Finding 13 and Table B.
9. Add filing a block as a Beads issue as a later pattern linking doc-editor to beads-ui. Rests
   on Finding 12 (ClickUp comment to task) and the founding ask's beads-ui epic.

## Sources

[^1]: Anthropic. (2026). [Draw in the interface with a mod](https://code.claude.com/docs/en/plugins/mods/interface.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Pane placement, element table, keyboard focus and hotkey rules, `dimColor`.)
[^2]: Anthropic. (2026). [claude-code: mods/types/claude-code.d.ts](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts). GitHub. Read in full via `ghp api` raw (517,451 bytes; header "Written by Claude Code 2.1.277") 2026-10-15. (`ClientKeyEvent`, `InputProps`, `MarkdownProps`, `UiScrollTarget`, `UiScrollBlock`, `ClientElements` bounds.)
[^3]: ai-harness. (2026). [Claude Code mods: capabilities, ecosystem and fit for the fleet](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods.md). `docs/research/claude-code-mods.md`, tracked on ai-harness `origin/main`. Read in full 2026-10-15. (§3.6: requests for multi-line `Input` on Anthropic's design issue.)
[^4]: Anthropic. (2026). [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. ("As of v2.1.290"; limits table, `prompt.autocomplete`, `prompt.mention`.)
[^5]: xuanji86. (2026). [claude-mdview](https://github.com/xuanji86/claude-mdview). GitHub. README and metadata via `ghp api` 2026-10-15 (6 stars, MIT, created 2026-10-03, last pushed 2026-10-03). (Path links, contents, find, parts, point-to-edit, live reload, limits.)
[^6]: Anthropic. (2026). [Claude Code changelog](https://code.claude.com/docs/en/changelog). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15; newest entry 2.1.300 (October 14, 2026). (`$.ui.selection()`; 2.1.299 `Text` props.)
[^7]: Anthropic. (2026). [Interface gallery for mods](https://code.claude.com/docs/en/plugins/mods/gallery.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (`Code` and `Code` as a diff.)
[^8]: Google. (2026). [View document outlines, rulers, & non-printing characters](https://support.google.com/docs/answer/6367684?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^9]: Notion Labs. (2026). [Columns, headings & dividers in Notion](https://www.notion.com/help/columns-headings-and-dividers). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15. (Toggle headings, table of contents block and side TOC.)
[^10]: Atlassian. (2026). [Insert the table of contents macro](https://support.atlassian.com/confluence-cloud/docs/insert-the-table-of-contents-macro/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^11]: Obsidian. (2026). [Outline](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Outline.md). obsidian-help repository (source of help.obsidian.md). Verified accessible (HTTP 200, raw) 2026-10-15.
[^12]: Microsoft. (2026). [Markdown and Visual Studio Code](https://code.visualstudio.com/docs/languages/markdown). VS Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Outline, go to header, header completions, link validation, rename, preview sync.)
[^13]: Google. (2026). [Keyboard shortcuts for Google Docs](https://support.google.com/docs/answer/179738?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^14]: Org mode. (2026). [Motion (The Org Manual)](https://orgmode.org/manual/Motion.html). orgmode.org. Verified accessible (HTTP 200) 2026-10-15.
[^15]: Anthropic. (2026). [Fullscreen rendering](https://code.claude.com/docs/en/fullscreen.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Flicker, mouse, transcript mode keys.)
[^16]: Atlassian. (2026). [View written content](https://support.atlassian.com/confluence-cloud/docs/view-a-page/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15. (Breadcrumbs, read time.)
[^17]: Notion Labs. (2026). [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15. (Markdown shortcuts, block selection, slash and `@` commands.)
[^18]: abonckus. (2026). [claude-code-file-preview](https://github.com/abonckus/claude-code-file-preview). GitHub. README and metadata via `ghp api` 2026-10-15 (0 stars, MIT, created 2026-10-05, last pushed 2026-10-05). (Docs-page layout, tables, callouts, Mermaid, search, keys.)
[^19]: Craft Docs. (2026). [Blocks and Pages](https://craft-support.mintlify.app/en/write-and-edit/blocks-and-pages.md). Craft Help Center (indexed from support.craft.do/llms.txt). Verified accessible (HTTP 200) 2026-10-15.
[^20]: Org mode. (2026). [Sparse Trees (The Org Manual)](https://orgmode.org/manual/Sparse-Trees.html). orgmode.org. Verified accessible (HTTP 200) 2026-10-15.
[^21]: Obsidian. (2026). [Internal links](https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Internal%20links.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^22]: Obsidian. (2026). [Page preview](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Page%20preview.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^23]: Obsidian. (2026). [Backlinks](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Backlinks.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^24]: henriklovhaug. (2026). [md-tui](https://github.com/henriklovhaug/md-tui). GitHub. README and metadata via `ghp api` 2026-10-15 (554 stars, AGPL-3.0, created 2023-10-05, last pushed 2026-10-02).
[^25]: Textualize. (2024). [Frogmouth](https://github.com/Textualize/frogmouth). GitHub. README and metadata via `ghp api` 2026-10-15 (3,308 stars, MIT, created 2023-04-03, last pushed 2024-08-01).
[^26]: Textualize. (2026). [MarkdownViewer](https://textual.textualize.io/widgets/markdown_viewer/). Textual Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^27]: Obsidian. (2026). [Views and editing mode](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Views%20and%20editing%20mode.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^28]: Atlassian. (2026). [Create and collaborate in real time with live docs](https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^29]: HackMD. (2026). [HackMD features](https://hackmd.io/features). hackmd.io. Verified accessible (HTTP 200) 2026-10-15.
[^30]: MeanderingProgrammer. (2026). [render-markdown.nvim](https://github.com/MeanderingProgrammer/render-markdown.nvim). GitHub. README and metadata via `ghp api` 2026-10-15 (5,163 stars, MIT, created 2024-03-18, last pushed 2026-10-10).
[^31]: OXY2DEV. (2026). [markview.nvim](https://github.com/OXY2DEV/markview.nvim). GitHub. README and metadata via `ghp api` 2026-10-15 (3,662 stars, Apache-2.0, created 2024-06-25, last pushed 2026-10-08).
[^32]: Typora. (2026). [Focus Mode and Typewriter Mode](https://support.typora.io/Focus-and-Typewriter-Mode/). Typora Support (updated September 6, 2026). Verified accessible (HTTP 200) 2026-10-15.
[^33]: Information Architects. (2026). [Focus Mode](https://ia.net/writer/support/editor/focus-mode). iA Writer Support. Verified accessible (HTTP 200) 2026-10-15.
[^34]: Google. (2026). [Change a document's page setup: pages or pageless](https://support.google.com/docs/answer/11528737?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^35]: Microsoft. (2026). [Keyboard shortcuts in Word](https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2). Microsoft Support. Verified accessible (HTTP 200) 2026-10-15. (Read Mode, Outline view, F8, `Alt+Q`.)
[^36]: Obsidian. (2026). [Command palette](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Command%20palette.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^37]: Obsidian. (2026). [Quick switcher](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Quick%20switcher.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^38]: GitBook. (2026). [Search & Quick find](https://gitbook.com/docs/create-content/searching-your-content/quick-find.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^39]: Helix. (2026). [Keymap](https://docs.helix-editor.com/keymap.html). Helix Documentation. Verified accessible (HTTP 200) 2026-10-15; repository metadata via `ghp api` (46,592 stars, MPL-2.0, last pushed 2026-09-29).
[^40]: Atlassian. (2026). [Keyboard shortcuts and autocomplete](https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^41]: Charmbracelet. (2026). [glow](https://github.com/charmbracelet/glow). GitHub. README and metadata via `ghp api` 2026-10-15 (27,688 stars, MIT, created 2019-11-04, last pushed 2026-10-05).
[^42]: micro-editor. (2026). [micro](https://github.com/micro-editor/micro). GitHub. README and metadata via `ghp api` 2026-10-15 (29,705 stars, MIT, last pushed 2026-10-14).
[^43]: Nielsen Norman Group. (2024, October 18). [UI accelerators](https://www.nngroup.com/articles/ui-accelerators/). nngroup.com. Verified accessible (HTTP 200) 2026-10-15.
[^44]: Atlassian. (2026). [Insert the expand macro](https://support.atlassian.com/confluence-cloud/docs/insert-the-expand-macro/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^45]: GitBook. (2026). [Expandable](https://gitbook.com/docs/create-content/blocks/expandable.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^46]: Obsidian. (2026). [Folding](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Folding.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^47]: preservim. (2025). [vim-markdown](https://github.com/preservim/vim-markdown). GitHub. README and metadata via `ghp api` 2026-10-15 (4,816 stars, no licence field, last pushed 2025-10-23).
[^48]: Org mode. (2026). [Global and local cycling (The Org Manual)](https://orgmode.org/manual/Global-and-local-cycling.html). orgmode.org. Verified accessible (HTTP 200) 2026-10-15.
[^49]: Microsoft. (2026). [Send a Loop component in Microsoft Teams chats](https://support.microsoft.com/en-us/office/first-things-to-know-about-loop-components-ee2a584b-5785-4dd6-8a2d-956131a29c81). Microsoft Support. Verified accessible (HTTP 200) 2026-10-15; the "first things to know about Loop components" URL resolved to this article.
[^50]: Craft Docs. (2026). [Slash Menu](https://craft-support.mintlify.app/en/introduction/slash-menu.md). Craft Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^51]: Google. (2026). [Use Markdown in Google Docs, Slides, & Drawings](https://support.google.com/docs/answer/12014036?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^52]: Notion Labs. (2026). [Writing & editing basics](https://www.notion.com/help/writing-and-editing-basics). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^53]: Google. (2026). [Insert smart chips in Google Docs](https://support.google.com/docs/answer/10710316?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^54]: Google. (2026). [Insert building blocks in Google Docs](https://support.google.com/docs/answer/15740443?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^55]: Notion Labs. (2026). [Synced blocks](https://www.notion.com/help/synced-blocks). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^56]: Atlassian. (2026). [Insert the excerpt include macro](https://support.atlassian.com/confluence-cloud/docs/insert-the-excerpt-include-macro/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^57]: Obsidian. (2026). [Embed files](https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Embed%20files.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15.
[^58]: Atlassian. (2026). [View content in a side panel](https://support.atlassian.com/confluence-cloud/docs/view-content-in-a-side-panel/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^59]: GitHub. (2026). [Basic writing and formatting syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15. (Alerts, task lists.)
[^60]: Obsidian. (2026). [Callouts](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Callouts.md). obsidian-help repository. Verified accessible (HTTP 200, raw) 2026-10-15. (Callout syntax.)
[^61]: Notion Labs. (2026). [Comments, mentions & reactions](https://www.notion.com/help/comments-mentions-and-reminders). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^62]: Atlassian. (2026). [Comment on pages and blog posts](https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^63]: Google. (2026). [Use comments, action items, & emoji reactions](https://support.google.com/docs/answer/65129?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^64]: Google. (2026). [Suggest edits in Google Docs](https://support.google.com/docs/answer/6033474?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^65]: Microsoft. (2026). [Track changes in Word](https://support.microsoft.com/en-us/office/track-changes-in-word-197ba630-0f5f-4a8e-9a77-3712475e806a). Microsoft Support. Verified accessible (HTTP 200) 2026-10-15.
[^66]: GitBook. (2026). [Change requests](https://gitbook.com/docs/collaborate/change-requests.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^67]: GitHub. (2026). [Working with non-code files](https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15. (Rendering differences in prose documents.)
[^68]: McKelvey, K. R., Jenson, S., Wagner, E., Cook, B., and Kleppmann, M. (2023, March). [Upwelling: Combining real-time collaboration with version control for writers](https://www.inkandswitch.com/upwelling/). inkandswitch.com. Verified accessible (HTTP 200) 2026-10-15. (Background, pre-2024; interview evidence on tracked changes.)
[^69]: Notion Labs. (2026). [Delete & restore content](https://www.notion.com/help/duplicate-delete-and-restore-content). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15. (Version history.)
[^70]: Google. (2026). [Find what's changed in a file](https://support.google.com/docs/answer/190843?hl=en). Google Docs Editors Help. Verified accessible (HTTP 200) 2026-10-15.
[^71]: Anthropic. (2026). [claude-code: mods/diff/README.md](https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md). GitHub. Read via `ghp api` raw 2026-10-15. (The built-in `/diff` pane; source is read-only inspiration per the fleet survey's licence note.)
[^72]: GitBook. (2026). [Writing with GitBook Agent](https://gitbook.com/docs/gitbook-agent/write-and-edit-with-ai.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^73]: Atlassian. (2026). [Collaborate on Confluence content with AI agents](https://support.atlassian.com/confluence-cloud/docs/collaborate-on-confluence-content-with-ai-agents/). Confluence Cloud Support. Verified accessible (HTTP 200) 2026-10-15.
[^74]: Notion Labs. (2026). [Notion AI FAQs](https://www.notion.com/help/notion-ai-faqs). Notion Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^75]: Microsoft. (2026). [Welcome to Copilot in Word](https://support.microsoft.com/en-us/office/welcome-to-copilot-in-word-2135e85f-a467-463b-b2f0-c51a46d625d1). Microsoft Support. Verified accessible (HTTP 200) 2026-10-15.
[^76]: Anthropic. (2026). [Claude Code on desktop](https://code.claude.com/docs/en/desktop.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Diff view comments, file pane.)
[^77]: GitHub. (2026). [Commenting on a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request). GitHub Docs. Verified accessible (HTTP 200) 2026-10-15.
[^78]: Reza, M., and nine co-authors. (2024). [ABScribe: Rapid exploration and organization of multiple writing variations in human-AI co-writing tasks using large language models](https://arxiv.org/abs/2310.00117). CHI 2024; arXiv 2310.00117 v4 (27 March 2024). Verified accessible (HTTP 200) 2026-10-15.
[^79]: Information Architects. (2026). [iA Writer](https://ia.net/writer). ia.net. Verified accessible (HTTP 200) 2026-10-15.
[^80]: jesseduffield. (2026). [lazygit](https://github.com/jesseduffield/lazygit). GitHub. README and metadata via `ghp api` 2026-10-15 (83,181 stars, MIT, last pushed 2026-10-14).
[^81]: sharkdp. (2026). [bat](https://github.com/sharkdp/bat). GitHub. README and metadata via `ghp api` 2026-10-15 (60,774 stars, Apache-2.0, last pushed 2026-10-14).
[^82]: Zellij. (2026). [Keybinding modes](https://zellij.dev/documentation/keybindings-modes.html). Zellij Documentation. Verified accessible (HTTP 200) 2026-10-15; repository metadata via `ghp api` (35,732 stars, MIT).
[^83]: GitHub. (2026). Repository metadata read via `ghp api repos/<owner>/<repo>` 2026-10-15 for charmbracelet/glow, swsnr/mdcat (archived), Textualize/frogmouth, sharkdp/bat, jesseduffield/lazygit, micro-editor/micro, MeanderingProgrammer/render-markdown.nvim, OXY2DEV/markview.nvim, preservim/vim-markdown, henriklovhaug/md-tui, helix-editor/helix, zellij-org/zellij and benweet/stackedit. [mdcat](https://github.com/swsnr/mdcat) (2,410 stars, MPL-2.0, archived, last pushed 2026-06-19).
[^84]: Nielsen Norman Group. (2019, April 14). [Modes in user interfaces](https://www.nngroup.com/articles/modes/). nngroup.com. Verified accessible (HTTP 200) 2026-10-15. (Background, pre-2024.)
[^85]: Notion Labs. (2024). [How we sped up Notion in the browser with WASM SQLite](https://www.notion.com/blog/how-we-sped-up-notion-in-the-browser-with-wasm-sqlite). Notion Blog. Verified accessible (HTTP 200) 2026-10-15.
[^86]: Nuclino. (2026). [Nuclino](https://www.nuclino.com/). nuclino.com. Verified accessible (HTTP 200) 2026-10-15.
[^87]: McGugan, W. (2024, December 12). [Algorithms for high performance terminal apps](https://textual.textualize.io/blog/2024/12/12/algorithms-for-high-performance-terminal-apps/). Textual Blog. Verified accessible (HTTP 200) 2026-10-15.
[^88]: McGugan, W. (2025, February 16). [Smoother scrolling in the terminal: a feature decades in the making](https://textual.textualize.io/blog/2025/02/16/smoother-scrolling-in-the-terminal-mdash-a-feature-decades-in-the-making/). Textual Blog. Verified accessible (HTTP 200) 2026-10-15.
[^89]: ClickUp. (2026). [Docs](https://clickup.com/features/docs). clickup.com. Verified accessible (HTTP 200) 2026-10-15. (Product page; the help centre answered 403.)
[^90]: Miro. (2026). [Miro](https://miro.com/). miro.com. Verified accessible (HTTP 200) 2026-10-15. (Product page; the help centre answered 403.)
[^91]: Mural. (2026). [Features](https://www.mural.co/features). mural.co. Verified accessible (HTTP 200) 2026-10-15.
[^92]: Gamma. (2026). [What are slides in Gamma and how do they work?](https://help.gamma.app/en/articles/11016396-what-are-slides-in-gamma-and-how-do-they-work). Gamma Help Center. Verified accessible (HTTP 200) 2026-10-15.
[^93]: Coda. (2026). [What is Coda?](https://coda.io/product). coda.io. Verified accessible (HTTP 200) 2026-10-15. (Help centre help.coda.io answered 403 to curl and WebFetch.)
[^94]: GitBook. (2026). [Document an API](https://gitbook.com/docs/create-content/openapi.md). GitBook Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^95]: Craft Docs. (2026). [Indent Depth Limits](https://craft-support.mintlify.app/en/write-and-edit/blocks-and-pages/indent-limits.md). Craft Help Center. Verified accessible (HTTP 200) 2026-10-15.

## Provenance ledger

Each row quotes text that a script found in the saved copy of the fetched page before commit (whitespace normalised). Failed fetches are listed last.

| Claim | Source URL | Verbatim quote | Verdict | Live? |
|---|---|---|---|---|
| Mods never read the keyboard directly in a pane [^1] | <https://code.claude.com/docs/en/plugins/mods/interface.md> | "Your mod never reads the keyboard itself." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Button hotkeys are one digit or one lowercase letter [^1] | <https://code.claude.com/docs/en/plugins/mods/interface.md> | "give it a `hotkey` of one digit or one lowercase letter" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Tab and arrows cannot be rebound [^1] | <https://code.claude.com/docs/en/plugins/mods/interface.md> | "A mod can't bind Tab or the arrow keys to anything else" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Narrow terminals put the pane above the prompt, a third of the height [^1] | <https://code.claude.com/docs/en/plugins/mods/interface.md> | "The default is a third of the space." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Escape never reaches a Client [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "Escape never arrives: it returns the focus." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Input submits on Enter [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "Runs on Enter with the text, in the plugin's own environment" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| A Markdown element holds at most 10,000 characters [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "At most 10000 characters, tab and newline its only control characters" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Scroll targets are drawn things, not row numbers [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "never a row number, always a thing" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Client key events name tab and other keys [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "`backspace`, `delete`, `pageup`, `home`, ...) or the character typed." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Markdown links can be answered by the mod [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "With `onLinkPress` the links it draws are the" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| nearest scroll moves the least [^2] | <https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts> | "`nearest` moves the least that shows the row whole, and not at all when" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Multi-line Input is an open request [^3] | <https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods.md> | "Requests in the same thread include atomic `$.store` updates, multi-line `Input`" | SUPPORTED | Yes (tracked on ai-harness origin/main; read 2026-10-15) |
| Only the first 100,000 characters of a tree are drawn [^4] | <https://code.claude.com/docs/en/plugins/mods/reference.md> | "The first 100,000 characters are drawn" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Autocomplete rows replace the word [^4] | <https://code.claude.com/docs/en/plugins/mods/reference.md> | "Choosing a row writes its `text` over the word." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| prompt.mention fires before an @-mentioned read [^4] | <https://code.claude.com/docs/en/plugins/mods/reference.md> | "Claude Code is about to read a file that a prompt @-mentions." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Path links in replies and tool rows [^5] | <https://github.com/xuanji86/claude-mdview> | "Links appear in replies, under `Read` / `Write` / `Edit` rows and under your own prompts." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Long files come in parts [^5] | <https://github.com/xuanji86/claude-mdview> | "One markdown element holds at most 10,000 characters and a pane about 100,000, so long files come in parts." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Clicks need fullscreen [^5] | <https://github.com/xuanji86/claude-mdview> | "**Clicks need the fullscreen layout.**" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Point-to-edit sends file, lines and opening text [^5] | <https://github.com/xuanji86/claude-mdview> | "Claude gets the file, the lines and how they begin" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Live redraw on writes [^5] | <https://github.com/xuanji86/claude-mdview> | "A file Claude writes redraws at once; one changed elsewhere within 1.5 s" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Key hint row [^5] | <https://github.com/xuanji86/claude-mdview> | "The pane lists its keys in one dim row under the file's name, each a click away too." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Paths with line or heading land on the spot [^5] | <https://github.com/xuanji86/claude-mdview> | "`path:42` and `path#heading` land on the spot" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| $.ui.selection returns fullscreen selections [^6] | <https://code.claude.com/docs/en/changelog> | "Added `$.ui.selection()` for mods: returns the text you last selected in fullscreen mode" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| 2.1.299 added Text size and weight [^6] | <https://code.claude.com/docs/en/changelog> | "Added `size`, `weight`, `mono` and `tabular` to a mod's `Text`" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Code draws source or a diff [^7] | <https://code.claude.com/docs/en/plugins/mods/gallery.md> | "`Code` draws source text with Claude Code's own syntax colors, or a diff." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Docs outline lists headings [^8] | <https://support.google.com/docs/answer/6367684?hl=en> | "The outline detects and lists headings from your text to help organize your document." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Notion side TOC [^9] | <https://www.notion.com/help/columns-headings-and-dividers> | "At the right side of your page as you scroll through it, as a page-level setting." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Toggle headings [^9] | <https://www.notion.com/help/columns-headings-and-dividers> | "Headings can also be toggles so that you can open and close them." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Confluence TOC macro scans headings [^10] | <https://support.atlassian.com/confluence-cloud/docs/insert-the-table-of-contents-macro/> | "The table of contents macro scans the headings on the current Confluence page or live doc" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Obsidian outline reorders sections by drag [^11] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Outline.md> | "To rearrange sections in the note, click and drag the heading within the outline." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| VS Code go to header [^12] | <https://code.visualstudio.com/docs/languages/markdown> | "to quickly jump to a header in the current file." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| VS Code link validation [^12] | <https://code.visualstudio.com/docs/languages/markdown> | "Link validation checks local links in your Markdown code to make sure they are valid." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Rename header updates links [^12] | <https://code.visualstudio.com/docs/languages/markdown> | "VS Code updates the header and automatically updates all links to that header" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Double-click preview to source [^12] | <https://code.visualstudio.com/docs/languages/markdown> | "double clicking an element in the Markdown preview will automatically open the editor for the file and scroll to the line nearest the clicked element." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Chorded next and previous navigation [^13] | <https://support.google.com/docs/answer/179738?hl=en> | "Move to the next or previous item with Ctrl + Alt + n or Ctrl + Alt + p followed by another key." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Tool finder palette [^13] | <https://support.google.com/docs/answer/179738?hl=en> | "Tool finder (formerly search the menus), press Alt + /" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| org-goto jumps without changing visibility [^14] | <https://orgmode.org/manual/Motion.html> | "Jump to a different place without changing the current outline" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Flicker matters most in slow terminals [^15] | <https://code.claude.com/docs/en/fullscreen.md> | "in terminal emulators where rendering throughput is the bottleneck, such as the VS Code integrated terminal, tmux, and iTerm2" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Transcript mode jumps between prompts with braces [^15] | <https://code.claude.com/docs/en/fullscreen.md> | "\| `{` / `}` \| Jump to the previous or next prompt \|" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Transcript mode has less-style navigation [^15] | <https://code.claude.com/docs/en/fullscreen.md> | "Transcript mode gains `less`-style navigation and search" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Fullscreen eliminates flicker [^15] | <https://code.claude.com/docs/en/fullscreen.md> | "Fullscreen rendering is an alternative rendering path for the Claude Code CLI that eliminates flicker" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Breadcrumbs show location in the content tree [^16] | <https://support.atlassian.com/confluence-cloud/docs/view-a-page/> | "Breadcrumbs : Navigation path that shows the location of the page in the content tree." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Read time at 265 wpm [^16] | <https://support.atlassian.com/confluence-cloud/docs/view-a-page/> | "Read time is based on an average reading speed of 265 words per minute." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Notion leads with a short list for non-shortcutters [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "If you're not a born shortcutter, we get it." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Everything is a block [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Everything in Notion is a block" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Esc selects the current block [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Press esc to select the block you're currently in." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Move a selected block by keyboard [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Hold cmd/ctrl + shift + arrow keys to move a selected block around." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Slash menu [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Pressing / in Notion brings up a full menu of content blocks you can choose to insert." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Breadcrumb block [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "/bread inserts a breadcrumb menu that shows where your current page is in your workspace." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Go up one level [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Press cmd/ctrl + shift + U to go up one level in the page hierarchy." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Search shortcut [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Use cmd/ctrl + P or cmd/ctrl + K to open search or jump to a recently viewed page." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Block actions menu [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Press cmd/ctrl + / to edit or change one or more selected blocks." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Checkbox toggle via cmd/ctrl+enter [^17] | <https://www.notion.com/help/keyboard-shortcuts> | "Check or uncheck a to-do checkbox" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Docs-page header [^18] | <https://github.com/abonckus/claude-code-file-preview> | "A breadcrumb and stats header, headings with rules under them, a capped reading width and spacing between blocks." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Wide tables as cards [^18] | <https://github.com/abonckus/claude-code-file-preview> | "A table too wide for the pane is shown as one card per row." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Fuzzy search jumps [^18] | <https://github.com/abonckus/claude-code-file-preview> | "Enter jumps to the first, and each match is a button that scrolls to it." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Page blocks drill in [^19] | <https://craft-support.mintlify.app/en/write-and-edit/blocks-and-pages.md> | "You can click on a page block to navigate inside it and see all its nested content." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Everything is a block [^19] | <https://craft-support.mintlify.app/en/write-and-edit/blocks-and-pages.md> | "In Craft, everything you create is a block." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Sparse trees fold to the selected information [^20] | <https://orgmode.org/manual/Sparse-Trees.html> | "document is folded as much as possible, but the selected information" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Heading links within a note [^21] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Internal%20links.md> | "To link to a heading within the same note, type `[[#` to get a list of headings within the note to link to." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Hover preview [^22] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Page%20preview.md> | "lets you preview a page when you hover the cursor over an internal link, without needing to navigate to that page." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Backlink definition [^23] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Backlinks.md> | "A backlink for a note is a link from another note to that note." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Hover preview of link targets [^24] | <https://github.com/henriklovhaug/md-tui> | "Preview link targets without following them" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Edit in $EDITOR [^24] | <https://github.com/henriklovhaug/md-tui> | "Edit file in `$EDITOR`" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| File tree [^24] | <https://github.com/henriklovhaug/md-tui> | "File tree for browsing Markdown files" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Browser-like navigation [^25] | <https://github.com/Textualize/frogmouth> | "There is a familiar browser-like navigation stack, history, bookmarks, and table of contents." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| MarkdownViewer browser-like [^26] | <https://textual.textualize.io/widgets/markdown_viewer/> | "This Widget adds browser-like functionality on top of the Markdown widget." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Reading view toggle [^27] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Views%20and%20editing%20mode.md> | "Or press `Ctrl+E` (`Cmd+E` on macOS)." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Live Preview shows syntax at the cursor [^27] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Views%20and%20editing%20mode.md> | "When your cursor enters formatted content, the underlying syntax becomes visible for editing." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| View-only mode [^28] | <https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/> | "prevent yourself from making accidental edits while getting the information you need" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Resume editing with E [^28] | <https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/> | "you can use the keyboard shortcut E or select Resume editing" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Slash insert in live docs [^28] | <https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/> | "Type / or press + when you hover over content to search for and insert elements" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Split view [^29] | <https://hackmd.io/features> | "Both: See both in split view." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Anti-conceal on cursor line [^30] | <https://github.com/MeanderingProgrammer/render-markdown.nvim> | "Anti-conceal: hides virtual text added by this plugin on cursor line" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Callout defaults [^30] | <https://github.com/MeanderingProgrammer/render-markdown.nvim> | "Github & Obsidian defaults" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Hybrid and split modes [^31] | <https://github.com/OXY2DEV/markview.nvim> | "*Splitview*! Allows editing & previewing *side-by-side*." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Focus fades other content [^32] | <https://support.typora.io/Focus-and-Typewriter-Mode/> | "Typora will fade out other contents except current line/block." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Typewriter mode [^32] | <https://support.typora.io/Focus-and-Typewriter-Mode/> | "it scrolls the article to keep current caret fixed when typing." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Focus mode can make the screen jump [^33] | <https://ia.net/writer/support/editor/focus-mode> | "might result in the screen jumping vertically." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Three focus settings [^33] | <https://ia.net/writer/support/editor/focus-mode> | "Then, you will have to choose among 3 different settings: Sentence, Paragraph, and Typewriter." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Pageless text width [^34] | <https://support.google.com/docs/answer/11528737?hl=en> | "you can select a text width of narrow, medium, or wide." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Read Mode [^35] | <https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2> | "Read Mode enables you view the document as a horizontal sequence of pages" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Outline expand [^35] | <https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2> | "Expand the text under a heading." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| F8 expands selection [^35] | <https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2> | "F8 repeatedly to expand the selection to the entire word, sentence, paragraph, section, and document." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Alt+Q search [^35] | <https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2> | "Alt+Q to move to the Tell Me or Search field" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Move paragraphs up in Outline [^35] | <https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2> | "Move the selected paragraphs up." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Recent commands first [^36] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Command%20palette.md> | "recently used commands appear at the top of the Command palette" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Fuzzy file matching [^37] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Quick%20switcher.md> | "File suggestions match letters in order, even if you skip some." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Quick find scopes results [^38] | <https://gitbook.com/docs/create-content/searching-your-content/quick-find.md> | "Results from the section you're currently in appear at the top" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Space mode [^39] | <https://docs.helix-editor.com/keymap.html> | "Accessed by typing Space in normal mode." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Minor modes return to normal [^39] | <https://docs.helix-editor.com/keymap.html> | "typically switch back to normal mode after a command." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Shortcut help on shift+? [^40] | <https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/> | "When viewing a page or live doc, press shift+?" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Glow keeps less keystrokes [^41] | <https://github.com/charmbracelet/glow> | "Most of the keystrokes you know from `less` are the same" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| less keys and ? help [^41] | <https://github.com/charmbracelet/glow> | "you can press `?` to list" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| nano-like key menu [^42] | <https://github.com/micro-editor/micro> | "nano-like menu to help you remember the keybindings." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Accelerators available yet ignorable [^43] | <https://www.nngroup.com/articles/ui-accelerators/> | "accelerators should be readily available, yet easy to ignore." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Expand macro [^44] | <https://support.atlassian.com/confluence-cloud/docs/insert-the-expand-macro/> | "The Expand macro displays an expandable/collapsible section of text on your page." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Expandable block [^45] | <https://gitbook.com/docs/create-content/blocks/expandable.md> | "Add an expandable block to a page to keep your pages shorter, hide longer content, or create FAQs" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Folded sections show an arrow [^46] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Folding.md> | "Folded sections show an arrow regardless of if you hover it or not." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Header folding by default [^47] | <https://github.com/preservim/vim-markdown> | "Folding is enabled for headers by default." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| TAB and S-TAB cycling [^48] | <https://orgmode.org/manual/Global-and-local-cycling.html> | "Org uses just two commands, bound to TAB and" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Live components show latest updates [^49] | <https://support.microsoft.com/en-us/office/first-things-to-know-about-loop-components-ee2a584b-5785-4dd6-8a2d-956131a29c81> | "No matter where people are editing, the component will always show the latest updates." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Slash insert in Loop [^49] | <https://support.microsoft.com/en-us/office/first-things-to-know-about-loop-components-ee2a584b-5785-4dd6-8a2d-956131a29c81> | "to insert things like an @mention, date, or even a component" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Craft slash menu [^50] | <https://craft-support.mintlify.app/en/introduction/slash-menu.md> | "Type `/` while editing a document, then start typing the name of what you want to do." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Paste from Markdown [^51] | <https://support.google.com/docs/answer/12014036?hl=en> | "Right-click and select Paste from Markdown." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Export as Markdown [^51] | <https://support.google.com/docs/answer/12014036?hl=en> | "You can export the document as Markdown for use in another application." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Drag handle [^52] | <https://www.notion.com/help/writing-and-editing-basics> | "Hover over any block and use the ⋮⋮ icon that appears as a handle to drag it around." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| @ starts smart chips [^53] | <https://support.google.com/docs/answer/10710316?hl=en> | "anywhere in your document or click the" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Building blocks via @ [^54] | <https://support.google.com/docs/answer/15740443?hl=en> | "select See all building blocks." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Synced block propagation [^55] | <https://www.notion.com/help/synced-blocks> | "If you make a change in one instance of a synced block, that change will also appear in all other places where that synced block exists." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Excerpt include [^56] | <https://support.atlassian.com/confluence-cloud/docs/insert-the-excerpt-include-macro/> | "The insert excerpt macro is used to display an excerpt of content from one page or live doc on another." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Embeds reuse content [^57] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Embed%20files.md> | "to reuse content across multiple places." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Side panel keeps place [^58] | <https://support.atlassian.com/confluence-cloud/docs/view-content-in-a-side-panel/> | "You can read, comment, or edit the page, then return to your Jira work item without losing your place." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Alerts are blockquote-based callouts [^59] | <https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax> | "Alerts, also sometimes known as callouts or admonitions, are a Markdown extension based on the blockquote syntax" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Task lists [^59] | <https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax> | "To create a task list, preface list items with a hyphen and space followed by [ ]. To mark a task as complete, use [x]." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Callout syntax [^60] | <https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Callouts.md> | "To create a callout, add `[!info]` to the first line of a blockquote" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Comment on selected text [^61] | <https://www.notion.com/help/comments-mentions-and-reminders> | "Select any text and choose Comment from the menu that pops up." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Floating toolbar comment [^62] | <https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/> | "Select Comment from the floating toolbar that appears above the highlighted text" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Minimized comments [^63] | <https://support.google.com/docs/answer/65129?hl=en> | "Minimize comments: Reduces comments to icons in Docs and Sheets" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Suggesting mode [^64] | <https://support.google.com/docs/answer/6033474?hl=en> | "You can suggest changes to a document without changing the original text." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Preview with or without changes [^64] | <https://support.google.com/docs/answer/6033474?hl=en> | "To preview what your document will look like with or without the changes" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Simple Markup [^65] | <https://support.microsoft.com/en-us/office/track-changes-in-word-197ba630-0f5f-4a8e-9a77-3712475e806a> | "Simple Markup displays tracked changes with a red line in the margin." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| No Markup [^65] | <https://support.microsoft.com/en-us/office/track-changes-in-word-197ba630-0f5f-4a8e-9a77-3712475e806a> | "No Markup hides the markup to show the document with changes incorporated." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Change requests as branches [^66] | <https://gitbook.com/docs/collaborate/change-requests.md> | "It's based on the concept of branching, and feels familiar to anyone who uses pull requests in GitHub" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Diff navigator [^66] | <https://gitbook.com/docs/collaborate/change-requests.md> | "the floating diff navigator lets you jump between changed blocks" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Rendered prose diffs [^67] | <https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files> | "Commits and pull requests that include prose documents have the ability to represent those documents with source and rendered views." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Review UIs have readability problems [^68] | <https://www.inkandswitch.com/upwelling/> | "Common user interfaces for reviewing changes suffer from readability and usability problems." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| No grouping of edits [^68] | <https://www.inkandswitch.com/upwelling/> | "do not provide any way of grouping related edits into anything resembling a commit." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Dyslexic editor quote [^68] | <https://www.inkandswitch.com/upwelling/> | "I find reading Track Changes to be nearly impossible." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Deletions as a symbol with hover [^68] | <https://www.inkandswitch.com/upwelling/> | "we avoid rendering deleted text in a strikethrough font" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Version every 10 minutes [^69] | <https://www.notion.com/help/duplicate-delete-and-restore-content> | "A new version of a particular page will be recorded every 10 minutes as you actively edit it." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Earlier versions in the right panel [^70] | <https://support.google.com/docs/answer/190843?hl=en> | "In the right panel, choose an earlier version." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Never lands on a loading state [^71] | <https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md> | "so it never lands on `Loading diff…`" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Turn picker [^71] | <https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md> | "A picker shows one earlier turn's edits" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Ask button arms a file [^71] | <https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md> | "its hunks ride the next prompt as context, once." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Pinned header while hunks scroll [^71] | <https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md> | "The header, the file list and its toggles stay put while the wheel moves the hunks under them" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Fetch before open [^71] | <https://github.com/anthropics/claude-code/blob/main/mods/diff/README.md> | "A docked pane fetches before it opens" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Tag the agent on a block [^72] | <https://gitbook.com/docs/gitbook-agent/write-and-edit-with-ai.md> | "If you want the Agent to review a specific block on your page, you can tag it in a comment and tell it what you need." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Agents use comment and page context [^73] | <https://support.atlassian.com/confluence-cloud/docs/collaborate-on-confluence-content-with-ai-agents/> | "The agent uses the comment and page context to help with first drafts, quick summaries, and specific tasks" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Inline writing help [^74] | <https://www.notion.com/help/notion-ai-faqs> | "Helps you improve your writing inline on a page" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Keep, discard or refine [^75] | <https://support.microsoft.com/en-us/office/welcome-to-copilot-in-word-2135e85f-a467-463b-b2f0-c51a46d625d1> | "You can keep it, discard it, or continue refining it with a follow-up prompt." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Comment on diff lines [^76] | <https://code.claude.com/docs/en/desktop.md> | "To comment on specific lines, click any line in the diff to open a comment box." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Claude applies comments as a new diff [^76] | <https://code.claude.com/docs/en/desktop.md> | "Claude reads your comments and makes the requested changes, which appear as a new diff you can review." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| File pane warns on disk changes [^76] | <https://code.claude.com/docs/en/desktop.md> | "If the file changed on disk since you opened it, the pane warns you and lets you override or discard." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Batch comments before Copilot starts [^77] | <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request> | "batching your comments prevents Copilot from starting to work on individual comments before you have completed your review." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Variations stored adjacently [^78] | <https://arxiv.org/abs/2310.00117> | "Variations are stored adjacently within text fields for rapid in-place comparisons using mouse-over interactions on a popup toolbar." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Workload reduction [^78] | <https://arxiv.org/abs/2310.00117> | "significantly reduces task workload (d = 1.20, p < 0.001)" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Authorship colour [^79] | <https://ia.net/writer> | "Your own words speak in black and white. AI stands out in color." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Hunk staging [^80] | <https://github.com/jesseduffield/lazygit> | "The selection covers a whole hunk to begin with, so `<space>` stages that hunk and moves on to the next one." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Undo with z [^80] | <https://github.com/jesseduffield/lazygit> | "You can undo the last action by pressing `z` and redo with `shift+z`." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Undo limit [^80] | <https://github.com/jesseduffield/lazygit> | "we can't undo changes to the working tree or stash." | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Git gutter [^81] | <https://github.com/sharkdp/bat> | "`bat` communicates with `git` to show modifications with respect to the index" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Scroll mode on focus [^82] | <https://zellij.dev/documentation/keybindings-modes.html> | "Focusing a pane that is scrolled back automatically enters scroll mode" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| mdcat is archived [^83] | <https://github.com/swsnr/mdcat> | "swsnr/mdcat 2410 MPL-2.0 2018-01-07T10:16:08Z 2026-06-19T10:39:10Z true" | SUPPORTED | Yes (read via ghp api, 2026-10-15) |
| Mode slips from poor status [^84] | <https://www.nngroup.com/articles/modes/> | "Mode slips happen because the system doesn’t clearly indicate its status to the user" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Clear visibility of mode [^84] | <https://www.nngroup.com/articles/modes/> | "Clear visibility of the current active mode." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| SQLite cut navigation time 20 percent [^85] | <https://www.notion.com/blog/how-we-sped-up-notion-in-the-browser-with-wasm-sqlite> | "Using SQLite improved page navigation times by 20 percent in all modern browsers." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Built for speed [^86] | <https://www.nuclino.com/> | "Built for speed from the ground up" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Partial updates [^87] | <https://textual.textualize.io/blog/2024/12/12/algorithms-for-high-performance-terminal-apps/> | "if you click a button and it changes color, the compositor can update just the region occupied by the button." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Cell-granular mouse [^88] | <https://textual.textualize.io/blog/2025/02/16/smoother-scrolling-in-the-terminal-mdash-a-feature-decades-in-the-making/> | "the terminal reports the mouse coordinates in cells" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Comment to task [^89] | <https://clickup.com/features/docs> | "convert any comment to a task in one click" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Infinite canvas [^90] | <https://miro.com/> | "Empower teamwork on one, infinite, multiplayer canvas" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Follow the facilitator [^91] | <https://www.mural.co/features> | "Make sure everyone is looking at the same content at the same time" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Reveal next steps [^91] | <https://www.mural.co/features> | "hiding/revealing of next steps" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Slides as building blocks [^92] | <https://help.gamma.app/en/articles/11016396-what-are-slides-in-gamma-and-how-do-they-work> | "Slides in Gamma are the fundamental building blocks of your presentations, documents, or webpages" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Fixed 16:9 canvas [^92] | <https://help.gamma.app/en/articles/11016396-what-are-slides-in-gamma-and-how-do-they-work> | "Presentations now use a fixed 16:9 canvas" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Docs, spreadsheets and apps [^93] | <https://coda.io/product> | "The collaborative all-in-one platform that blends the best of docs, spreadsheets, and applications." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Renamed Superhuman Docs [^93] | <https://coda.io/product> | "Coda is now Superhuman Docs" | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| OpenAPI test blocks [^94] | <https://gitbook.com/docs/create-content/openapi.md> | "let your users test endpoints right on the page with interactive blocks." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Indent limit is intentional [^95] | <https://craft-support.mintlify.app/en/write-and-edit/blocks-and-pages/indent-limits.md> | "The 5-level limit is intentional, not a technical limitation." | SUPPORTED | Yes (HTTP 200, 2026-10-15) |
| Coda help centre (buttons, formulas) | <https://help.coda.io/hc/en-us> | none (no body returned) | UNVERIFIABLE | No: HTTP 403 to curl and to WebFetch, 2026-10-15 |
| ClickUp Docs help article | <https://help.clickup.com/hc/en-us/articles/6327901848471-Intro-to-Docs> | none | UNVERIFIABLE | No: HTTP 403, 2026-10-15 |
| Miro frames help article | <https://help.miro.com/hc/en-us/articles/360018261813-Frames> | none | UNVERIFIABLE | No: HTTP 403, 2026-10-15 |
| Word navigation pane article | <https://support.microsoft.com/en-us/office/use-the-navigation-pane-in-word-394f0a1a-68d9-4fad-a2e2-25d1b0a1a6b3> | none | UNVERIFIABLE | No: HTTP 404 (guessed article id), 2026-10-15 |
| Overleaf visual editor | <https://www.overleaf.com/learn/how-to/Using_the_Visual_Editor> | none | UNVERIFIABLE | No: HTTP 404, 2026-10-15 (also 404 at `/Visual_Editor`) |
| Dropbox Paper migration | <https://help.dropbox.com/create-upload/paper-migration> | none | UNVERIFIABLE | No: HTTP 404, 2026-10-15 |
| Google Docs document tabs | <https://support.google.com/docs/answer/14228944?hl=en> | none | UNVERIFIABLE | No: HTTP 404 (guessed answer id), 2026-10-15 |
| Craft documentation site | <https://documentation.craft.do/> | none | UNVERIFIABLE | No: DNS failure (curl exit 6), 2026-10-15; the help centre at support.craft.do served instead |
| `less` man page | <https://www.greenwoodsoftware.com/less/less.1.html> | none | UNVERIFIABLE | No: HTTP 404, 2026-10-15 |
| Cursor inline edit | <https://docs.cursor.com/en/inline-edit/overview> | none relevant | UNVERIFIABLE | Redirected to an unrelated page, 2026-10-15; not cited |
