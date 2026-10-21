---
title: "Rendering and editing Markdown, HTML, PDF and other doc formats inside a Claude Code mod"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods]
status: complete
source: "claude-opus-5-5-2026-10-15"
task: DED-research-leg-tnah
parent_task: DED-research-doc-editor-uhke
---

# Rendering and editing Markdown, HTML, PDF and other doc formats inside a Claude Code mod

A Claude Code mod can view and edit documents today, inside tmux and over a remote link, as long as
it draws text. The built-in `Markdown` element renders a reply-style Markdown block of up to 10,000
characters. A `Client` element can host a real caret-and-selection editor. Anthropic's own `/diff`
mod shows how to window a long document by answering `ui.scroll` itself. Pictures (`Image`) do not
draw in tmux, and the hooks module cannot run a DOM, `eval` or WebAssembly. So HTML and PDF become
text through a vendored pure-JavaScript parser or an external binary run with `$.process.run`.

This file is the evidence for the coordinator. It extends three seed docs in ai-harness and does not
repeat what they settled:

- `docs/research/claude-code-mods-web-browser-in-the-tui.md` (the browser and doc-mod survey,
  2026-10-14), cited below as "the browser survey".
- `docs/research/claude-code-mods.md` (the mods capability survey), cited as "the mods survey".
- `docs/designs/aih-xhc5u-claude-code-mods.md` (the fleet mods design), cited as "the fleet design".

## Method

Read dates: 2026-10-15 00:06Z to 00:41Z (UTC, measured with `date -u`). Host:
a Linux development host, Claude Code 2.1.296 per the brief (not re-measured). Nothing was installed, built,
tested or launched. No mod and no browser ran.

What was fetched and read this run:

- Anthropic documentation, 14 pages fetched as Markdown with `curl` (all HTTP 200): the mods
  overview, interface, reference, api, events, gallery, test, troubleshoot and create pages, plus
  fullscreen, desktop, env-vars, plugins-reference and the changelog (1,096,437 bytes, newest entry
  2.1.300 of 2026-10-14).
- The public types file `mods/types/claude-code.d.ts` (517,451 bytes, header "Written by Claude
  Code 2.1.277."), fetched raw and grepped locally for every element, method and bound named below.
- Anthropic's built-in `/diff` mod: `mods/diff/README.md` and `mods/diff/hooks/register.ts` (26,135
  bytes), read for its scroll handling.
- Anthropic's mods design issue #91870: all 256 comments, fetched through the GitHub API and
  searched for editor, Input, selection, scroll and size reports.
- Third-party mods: source tarballs of 11 repositories read (claude-mdview, hamzafer's md-preview,
  claude-code-file-preview, claude-markdown-mod, ide-mod, claude-lens, html-preview,
  claude-code-glance, mermaid-inline, claude-code-figures-plugin, davekiss/md). READMEs of 5 more
  read (claude-gfm-render, claude-code-converter, claude-markdown-pane, claude-docs-viewer, and the
  directory listings for mermaid-inline and figures). Metadata for every one through `ghp api`.
- Catalogues: the mods.aidojo.si catalogue file (3,836 mods, scanned against 2.1.296) grepped for
  doc formats; the claude-mods.com directory (211 mods) read through WebFetch; the GitHub topic
  `claude-mods` (112 repositories) and three repository searches (markdown, pdf, editor).
- Format libraries and tools: 35 repositories' metadata, 20 npm registry entries (version, unpacked
  size, dependencies, licence), 22 READMEs or manual pages, and 5 documentation pages through
  WebFetch (CodeMirror, ProseMirror, Yjs, Lexical, the claude-mods.com listings). One fetch failed:
  Automerge's library-initialisation page returned HTTP 404 on two URLs; the Automerge README was
  read instead.

Counts: 14 Anthropic pages, 1 types file, 1 built-in mod, 256 issue comments, 16 third-party mods,
3 catalogues, 35 library repositories. The host's web-search MCP tool was not in this run's tool set, and native
WebSearch does not work on this host, so no general web search ran (see Gaps).

Evidence words follow the browser survey's convention. Each claim also carries a tier tag:
the VERIFIABLE tier with a footnote for a fetched source, the INFERENCE tier with its reasoning in the
text, and the NO SOURCE tier where nothing was found.

## Findings

### 1. The hooks module is a sandboxed JavaScript runtime with no DOM, no eval and no WebAssembly

The types file declares the full global set of a hooks module. It reads: "The globals of a hooks
module's environment: these and no others (no DOM, no Node). No code generation either: `eval` and
`new Function` over a string throw, and there is no `WebAssembly` (deliberately; a module that needs
compiled code runs it in a process of its own through `$.process.run`)." The listed globals include
`TextEncoder`, `TextDecoder`, `URL`, `atob`, `btoa`, `structuredClone`, `crypto` and
`performance`. [VERIFIABLE][^1]

The api page says the same in prose: "The hooks module itself has no Node.js APIs, no timer globals
such as `setTimeout`, and no network or file access of its own. Standard JavaScript and web APIs
such as `URL`, `TextEncoder`, `AbortController`, and `crypto.subtle` are available."
[VERIFIABLE][^2]

No `DecompressionStream` appears in the declared globals, so a hooks module that opens a DOCX, ODT
or EPUB (all ZIP containers) needs a pure-JavaScript inflate such as fflate. That follows from the
"these and no others" sentence above. [INFERENCE]

Relative imports between files of the plugin are allowed. The create page's rules: "Import only
from files inside the plugin directory, by relative path. The one bare import allowed is
`claude-code`, for types and a few helpers." A dynamic import fails with "a dynamic import(); a
hooks module imports its own files with an import declaration". [VERIFIABLE][^3]

The same page says "Passing `$` to a method, a function defined inside the hook, or a function you
import from another of your files fails validation." [VERIFIABLE][^3] The changelog's 2.1.299
entry loosens that: "Fixed mods loaded from source files being refused when a hook hands `$` to a
function declaration imported from another file of the mod". [VERIFIABLE][^4] This host runs
2.1.296, so the older rule applies here, and a vendored library must never receive `$`.
[INFERENCE]

A module file over 1 MB is not read. The vendor docs state no such limit. A practitioner on
Anthropic's design issue reports it: "A module file over 1 MB is not read." [VERIFIABLE][^5] Two
mod authors work around it in their READMEs. figures: "A hooks module imports no file over 1 MiB
and cannot import modules at run time, so the build splits the bundle into chunks".
[VERIFIABLE][^6] claude-gfm-render: "a hooks module may not import a file over 1 MiB and has no
`eval`, while the ELK layout engine the SVG needs weighs 1.6 MB". [VERIFIABLE][^7] The reference's
limits table lists "Scopes, such as functions, blocks, and loops, nested inside one another in one
file of a hooks module" at 2,000, which also bounds a bundled parser. [VERIFIABLE][^9]

Third-party code therefore runs in-process only after a dev-time bundling step whose output is
committed. figures does exactly that: "Claude Code loads `hooks/` as TypeScript source, so only
third-party code is built." Its committed `hooks/vendor/mathjax.js` is 610,892 bytes, and MathJax
runs inside the hooks module through its `liteAdaptor`, with no DOM. [VERIFIABLE][^6]
claude-gfm-render vendors "`hooks/vendor/mermaid-ascii.js`, the ASCII renderer alone (84 KB),
imported by the mod." [VERIFIABLE][^7] mermaid-inline chose the other route: "They run as a
separate `node` process because Claude Code runs the hooks module itself with no Node.js APIs or
WebAssembly and lets it import only its own files, so the npm packages that lay out and draw the
diagrams cannot load there." [VERIFIABLE][^8]

This refines the fleet design's D-3 ("TypeScript loaded directly by Claude Code", no build step).
D-3 holds for the mod's own code. A vendored parser needs a bundle step that runs once on a
developer's machine, and its output is committed. [INFERENCE]

Anthropic's built-in `/diff` mod is itself split across many files under `hooks/` and imports them
by relative path (`import Ask from './ask'`, `import Views from './views'`). [VERIFIABLE][^10]
Test files can import siblings too: "A test file can import your mod's own files and sibling `.ts`
helpers". [VERIFIABLE][^67]

### 2. The drawing elements a viewer uses, and their bounds

#### 2.1 `Markdown`

The interface page: "`Markdown` takes its content in a `text` prop, not in `children`, and needs a
`key` when you pass `onLinkPress`." [VERIFIABLE][^11] The reference lists its props as `text`,
`key`, `dimColor`, `onLinkPress`, `pressableLinks`. [VERIFIABLE][^9]

The types file gives the contract. `Markdown` is "a block of markdown every surface draws as it
draws an assistant reply's text: its own renderer, links, tables, fences." Its `text` is "At most
10000 characters, tab and newline its only control characters; a link whose scheme is not
`https:`, `http:` or `file:` draws as text, never clickable. Not drawn around the approval dialog."
With `onLinkPress`, "A press is a plain single click where the surface reports clicks (the
fullscreen terminal)". `pressableLinks` takes "At most 256 entries of at most 2048 characters".
[VERIFIABLE][^1]

What it renders, from the gallery: "A heading draws in bold without its `#` marks. Inline code
draws in color without its backticks. A quote draws in italics with a bar on its left."
[VERIFIABLE][^12] The changelog adds three items for the shared reply renderer. 2.1.149: "Markdown
output now renders GFM task list checkboxes (`- [ ] todo` / `- [x] done`) instead of plain
bullets". 2.1.186: "Fixed `~~strikethrough~~` showing literal tildes in assistant messages instead
of rendering as strikethrough". 2.1.208: "tables over 200 rows show the first 200 with a "… N more
rows" notice". [VERIFIABLE][^4]

Three third-party sources disagree with that on GFM extras or report gaps. claude-gfm-render, built
"on Claude Code 2.1.286 and 2.1.287", says of alerts, checklists and Mermaid: "The terminal shows
them as raw text." Its table marks strikethrough and task lists as drawn by the mod in the terminal,
and lists "Footnotes, emoji shortcodes, `#123` / `@user` autolinks, `$math$`, raw HTML" as left to
the native renderer. [VERIFIABLE][^7] claude-mdview: "Math, mermaid and heading sizes show as
written." [VERIFIABLE][^13] claude-lens draws an image link in a reply "labelled the way Claude Code
draws the link: `revenue by month (chart.png)`", which means the element draws no picture for
`![alt](path)`. [VERIFIABLE][^14]

The task-list and strikethrough conflict is unresolved. The changelog says both render since
mid-2026, and claude-gfm-render says the terminal drew task lists raw on 2.1.286. One `/gallery`
sample on a live session settles it. Footnotes, math, Mermaid, GitHub alerts and images are not
drawn by the element in any source read. [INFERENCE]

#### 2.2 `Code`, `Text`, `Box`, `Link`

`Code` takes "`source`, `language`, `path`, `startLine`, `format`, `wrap`". [VERIFIABLE][^9] Its
`source` is "At most 10000 characters; tab and newline are the only control characters it may
hold." The highlighting colours are "the engine's, never the plugin's". [VERIFIABLE][^1] With
`format: 'diff'` it draws unified diff hunks. [VERIFIABLE][^12]

`Text` carries "the color and style props of Ink's Text a tree may set", a `hover` override and
seven `wrap` modes. [VERIFIABLE][^1] Two later releases add typography this host lacks. 2.1.299:
"Added `size`, `weight`, `mono` and `tabular` to a mod's `Text` and named spacing steps (`xs` to
`xl`) to its `Box`; `bold` is deprecated in favor of `weight`". 2.1.300: "Added a `dir` prop on a
mod's `Text` for right-to-left text". [VERIFIABLE][^4]

`Box` has flex layout, `position: 'absolute'`, `overflow`, `display` and `hover`, and no scroll
prop of its own. Scrolling belongs to the site (§4). Hover can reveal content with no hook run: "To
reveal on hover, draw the Box `display: "none"` with `hover: { display: "flex" }`". [VERIFIABLE][^1]
claude-mdview uses that to show its `✎` edit mark over a hovered block. [VERIFIABLE][^13]

`Link` is "an OSC 8 span on the terminal (else its text then the URL in dim)". [VERIFIABLE][^1]
The two vendor sources disagree on the terminal. The interface page lists the `https:` and
`http://localhost` rules for Desktop and then says "In the terminal, these requirements don't
apply." [VERIFIABLE][^11] The types file says of a bad `href`: "anything else refuses the tree the
Link is in." [VERIFIABLE][^1] The reference adds "A longer `href` keeps the whole tree from
drawing" for an `href` over 2,048 characters. [VERIFIABLE][^9] A doc viewer that turns document
links into `Link` elements has to validate them first, whichever source is right. [INFERENCE]

#### 2.3 The tree budget and what happens past it

The reference's limits table: "Text in one tree | The first 100,000 characters are drawn".
[VERIFIABLE][^9] The types file gives three bounds for every tree: "20,000 nodes, 32 deep, 100,000
characters serialized". [VERIFIABLE][^1] The interface page: "If a tree uses an element the app
doesn't have, a prop an element doesn't take, or a child where none goes, Claude Code draws its own
version of the site." [VERIFIABLE][^11]

claude-mdview's author reports a harder failure than "the first 100,000 are drawn": "A text over
10,000 characters (or a tree over 100,000) gets the whole tree refused and the engine draws its
own." [VERIFIABLE][^15] Every Markdown mod read budgets below the caps. claude-mdview sets
`TEXT_MAX = 9_000` and `PAGE_MAX = 60_000`, and its README says "One markdown element holds at most
10,000 characters and a pane about 100,000, so long files come in parts." [VERIFIABLE][^13]
claude-code-file-preview caps "Each block of plain text in the pane ... at 10,000 characters and a
markdown file at 60,000". [VERIFIABLE][^16] davekiss/md slices each block with
`b.text.slice(0, 9900)`. [VERIFIABLE][^21]

The safe reading for a design is the stricter one: an over-budget string blanks the whole site.
[INFERENCE]

#### 2.4 Pictures, and what tmux leaves

`Image` and `Raster` draw in the terminal only. `Image` fails in tmux and screen, and
`CLAUDE_CODE_FORCE_TERMINAL_IMAGES` does not help there (the browser survey §2.1 and §2.2 settled
this from the gallery page and the types file). The gallery page still reads: "a session running
inside tmux or screen, in any terminal, kitty and Ghostty included." [VERIFIABLE][^12]

One fact the seed docs lacked: inside tmux, Claude Code clamps colour. The env-vars page:
"`CLAUDE_CODE_TMUX_TRUECOLOR` | Set to any non-empty value, such as `1`, to allow 24-bit truecolor
output inside tmux." It continues: "By default, Claude Code clamps to 256 colors when `$TMUX` is
set". [VERIFIABLE][^20] claude-lens says its block pictures "look much better with it" and adds:
"Half-block and quadrant thumbnails share a palette of 1024 color pairs per frame, so many at once
lose some color." [VERIFIABLE][^14] That bears on the open `Raster` palette question in the browser
survey (Open Question 3), and the number comes from a mod author, with no vendor figure. [INFERENCE]

`Svg` draws in the Desktop app only, up to 131,072 characters, and "In the terminal, a pane that
returns only an `Svg` opens empty." [VERIFIABLE][^12]

### 3. Typed input: `Input`, `Select`, `Button` and the keyboard

`Input` is single-line. The types file calls it "every surface's one-line text field" and says
"while it has focus every printable key reaches it alone and Esc returns them". Its props are
`key`, `label`, `placeholder`, `value`, `submitLabel`, `autoFocus`, `onInput` and `onSubmit`. No
length bound is declared beyond the tree text budget. [VERIFIABLE][^1] The gallery: "An `Input` is
a one-line text field that runs `onSubmit` when the user presses Enter". [VERIFIABLE][^12]

A request for a multi-line field is open on Anthropic's design issue: "`Input` is single-line. On
desktop, a multi-line paste arrives with its line breaks turned into spaces. A multi-line field
would let an answer like a log stay in the pane, instead of going through the prompt box."
[VERIFIABLE][^17] The changelog through 2.1.300 adds no multi-line `Input`. [VERIFIABLE][^4]

`Select` takes `key`, `label`, `options`, `value`, `onSelect` and `autoFocus`. [VERIFIABLE][^9]
`Button` takes a `hotkey` of "one digit or one lowercase letter", and "`action` names one of
Claude Code's own keybinding actions". [VERIFIABLE][^9][^11]

The keyboard belongs to Claude Code. The interface page: "Your mod never reads the keyboard
itself." "A mod can't bind Tab or the arrow keys to anything else, so a game steers with `w`, `a`,
`s`, and `d`." "Claude Code grants `focus: true` only while the prompt is empty and nothing else has
keyboard focus." [VERIFIABLE][^11] In iTerm2, "In terminals that don't pass `ctrl+x` chords (iTerm2
here), the only ways to hand a pane the keys are a click or `ui.open({ focus })`." [VERIFIABLE][^15]
claude-code-file-preview hit the hotkey rule: "A pane button's hotkey must be one letter or digit,
so search cannot be `/`." [VERIFIABLE][^16]

### 4. Panes, placement and scrolling

A pane is placed by Claude Code. "Opened by your mod acting by itself ... the pane appears only in
a terminal at least 144 columns wide. After the user has opened that pane once themselves, 110
columns is enough." [VERIFIABLE][^11] A mod fits its tree to `e.props.bodyColumns`, and "where
`e.props.placement` is `'dock'`, `e.props.scroll.bodyRows` is the number of rows the pane has for
your tree". "A tree taller than the pane scrolls as a whole." [VERIFIABLE][^9] A dragged dock keeps
its width: "`ui.open({ columns })` is ignored once the person has dragged the dock". [VERIFIABLE][^15]

A mod can own the scrolling. The `ui.scroll` event fires before the window moves, and "`offset` is
the hook's to rewrite; nothing moved yet." Its input carries `by` (the signed move), `bodyRows`,
`contentRows` and, for a wheel tick, `pointer` (the cell under the pointer). A hook can keep the
window still: the result's `deny` lists "A hook kept the window (no `next`)". The pointer field
exists so that "A hook pinning a list over rows it scrolls itself tells a tick over the list (`row`
among its list's rows) from one over the body." [VERIFIABLE][^1] `$.ui.scroll` brings an element
into view by key, "never a row number, always a thing drawn somewhere." [VERIFIABLE][^1]

Anthropic's `/diff` mod uses this to window a long diff: "(the plugin answers the pane's
`ui.scroll` itself)". Its hook "Docked, moves the hunks under the pinned header and list (three rows
a wheel tick, a page a page key), or the list when the wheel is over it, and keeps the engine's
window still." [VERIFIABLE][^10] The source does that by updating its own model and returning `{}`
without calling `next`. [VERIFIABLE][^10]

An early report on the design issue said "`ui.scroll` is declared in 2.1.271, but the engine refuses
a hook on it at load". [VERIFIABLE][^68] That is superseded: the built-in mod ships a `ui.scroll`
hook today. [VERIFIABLE][^10]
claude-code-file-preview takes the lighter path. It calls `next(e)` and redraws its sticky footer,
and notes that "a scroll this mod starts may not reach its own ui.scroll hook". [VERIFIABLE][^16]

A doc viewer can draw only the rows in view and keep its own offset, which keeps any document of
any length inside the 100,000-character tree budget. That is the `/diff` pattern applied to text.
[INFERENCE]

### 5. Fullscreen, mouse and selection

Mouse input exists only in fullscreen rendering. The fullscreen page: it "eliminates flicker, keeps
memory usage flat in long conversations, and adds mouse support." In it, "Selected text copies to
your clipboard automatically on mouse release." [VERIFIABLE][^18] Mod authors say a click reaches a
mod only there. claude-mdview: "Clicks need the fullscreen layout. On the main screen, use `/md`."
[VERIFIABLE][^13] claude-code-file-preview: "A plain click only reaches the mod in Claude Code's
fullscreen terminal layout." [VERIFIABLE][^16] Fullscreen works inside tmux, and wheel scrolling
there needs tmux's `set -g mouse on` (the browser survey §2.1).

`$.ui.selection()` arrived in 2.1.288: "returns the text you last selected in fullscreen mode and,
when the selection lies within one transcript row, that row". [VERIFIABLE][^4] The reference lists
`selection` in the `$.ui` row. [VERIFIABLE][^9] Before it shipped, a mod author asked for "A
`ui.selection` event, at least for selections inside the mod's own pane", and wrote "The native
`/diff` sidebar reads the terminal selection inside its own pane ... A mod has no such access."
[VERIFIABLE][^19] No source says whether `$.ui.selection()` returns a selection made inside a mod's
pane, or fires an event when it changes. [NO SOURCE]

### 6. `Client` is a working editor surface

The `Client` contract (the browser survey §2.2 and the mods survey §1.6 carry its pointer capture,
render-loop rule and fault handling). Facts that matter for an editor, from the types file:

- The surface function "Runs on the drawing thread, a second per call at most". [VERIFIABLE][^1]
- Its element table is the terminal's "less `Client` (none nests), `Raster` and `Image`", so an
  editor draws with `Box`, `Text`, `Button` and the rest. [VERIFIABLE][^1]
- Keys arrive through `onKey`, "reached while a click has given it the focus; Escape returns that."
  A key event names "`up`, `down`, `left`, `right`, `return`, `tab`, `backspace`, `delete`,
  `pageup`, `home`, ..." or the character typed, with `ctrl`, `shift` and `meta` flags.
  [VERIFIABLE][^1]
- `post` sends data to the hooks module, "one per frame at most", and "At most 20,000 values, 32
  deep, 100,000 characters, or the post is not sent." Props are "Bounded as a tree's text is; not a
  channel for closures." [VERIFIABLE][^1]

davekiss/md proves the pattern in a shipped mod. Its README: "Claude drafts into a pane beside the
chat. You read, select, comment and edit there, and so does Claude." "In the text, type to edit.
Click to place the caret and drag to select." Undo is `ctrl+u`, because "ctrl+z suspends Claude
Code". [VERIFIABLE][^21] The source splits the work. `hooks/editor.tsx` is a `ClientModule` whose
comment says "It draws the caret and the selection the hooks module holds, and reports the cell each
click and drag lands on and each key." The hooks module keeps the document as an array of lines,
caps its undo stack with `if (undoStack.length > 200) undoStack.shift()`, writes every edit with
`await $.fs.write(doc.path, lines.join('\n') + '\n')`, and re-reads the file when its `mtimeMs`
changes. It mounts the editor as `<Client key="editor" module="./editor.tsx" ...>` with only the
rows in view as props. [VERIFIABLE][^21] It also registers tools so Claude can draft, suggest, edit,
comment and reply through the same pane, and anchors notes to quoted text. [VERIFIABLE][^21] The
repository has 0 stars, MIT, created 2026-10-03, last push 2026-10-13. [VERIFIABLE][^21]

Because the `Client` gets keys only after a click, a keyboard-only session (no fullscreen, or tmux
without mouse mode) cannot type into it. Such a session needs a fallback, such as `Input` for one
line or the point-and-ask path of §9. [INFERENCE]

### 7. Files, processes and the network

From the reference and the types file:

- `$.fs.read` "Rejects when missing, or over 4 MiB", reads text or bytes (`as`: `"text"` or
  `"bytes"`, bytes returned as `{ base64 }`). [VERIFIABLE][^1]
- `$.fs.write`: "`write` isn't atomic: it replaces the file's content in place, so another process
  can read a partly written file." [VERIFIABLE][^9]
- `$.process.run` "Runs a command on the host by its argument vector (no shell)", with a timeout of
  "30 seconds by default, 10 minutes at most". [VERIFIABLE][^1][^9] It is "One shot: the whole
  output is read, so a background process left writing holds the call until the timeout." and "Git
  runs with repo hooks off." Its `stdout` is "as text, cut at the output limit"; `stdin` is "Text
  written to the child's standard input, then closed." [VERIFIABLE][^1] The output limit has no
  number in either source. The browser survey records a reported 4 MiB from a terminal-browser
  issue. [NO SOURCE]
- `$.http.fetch` bodies cap at 4 MiB and one call gets 30 seconds. `$.store` holds "4 MiB of JSON
  in total" and "A `get` followed by a `set` isn't atomic." [VERIFIABLE][^9][^11]

Two design consequences follow. A converter that outputs binary (a PNG page from `pdftoppm`) has to
write a file, because `stdout` comes back as text. Writes the mod makes to the user's document have
no atomic primitive inside the mod, so a write-then-rename needs a helper process (the fleet
design's D-10 already uses one). [INFERENCE]

Plugins get a data directory for installed dependencies. The plugins reference lists
`${CLAUDE_PLUGIN_DATA}` for "Installed dependencies such as `node_modules`, generated code, and
caches". [VERIFIABLE][^22] mermaid-inline states that "Claude Code downloads the npm packages
pinned in `package-lock.json` (`beautiful-mermaid`, `@resvg/resvg-js` and their dependencies) when
it installs the plugin." [VERIFIABLE][^8] No Anthropic page read this run states that install step,
so whether a mod can rely on npm dependencies for its helper processes is unverified. [NO SOURCE]

### 8. Claude Code's own rows: `Read`, `Write` and replies

A mod can redraw the transcript rows for a tool call. The `ToolUse` and `ToolResult` sites carry
the tool's name, input and output. For `ToolResult`, "A rewrite of `output` is checked against the
tool's output schema (one that does not fit draws nothing; one the renderer cannot read hits the
row's error boundary). The stored result is untouched." [VERIFIABLE][^1] Reads usually sit inside a
`ToolGroup`: "A run of tool calls the transcript folds into one count line (`Read 3 files, ran 2
shell commands`): reads, searches, listings." [VERIFIABLE][^1]

The picture mods hook all three sites. claude-lens shows a read PDF page "Under the "Read 1 file"
row". [VERIFIABLE][^14] claude-mdview adds an open link under `Read`, `Write` and `Edit` rows through
`ToolUse`. [VERIFIABLE][^13] So a doc viewer can replace or annotate the row for a `Read` of a `.md`
or `.pdf`. That changes only what the person sees. Changing what Claude reads is a `tool.call` job,
as claude-code-converter does: "When Claude is about to read a `.pdf`, `.docx`, `.xlsx`, `.xls` or
`.pptx`, the mod converts it and hands over the Markdown in its place." [VERIFIABLE][^23]

Redrawing replies has costs that four mods document. claude-markdown-mod: "The reply streams as
plain text drawn by Claude Code and is restyled when the message completes. A mod can't change the
streamed text: `classic.MessageDisplay` is bypassed for user mods by `cc-plugin-sec-default`."
[VERIFIABLE][^24] claude-code-file-preview: "Replies that mention an existing file are redrawn by the
mod and lose their leading bullet." [VERIFIABLE][^16] claude-gfm-render leaves "A single reply block
over 10,000 characters" to the native renderer. [VERIFIABLE][^7] claude-lens warns that a mod that
redraws a row without passing it on "keeps every mod listed after it from drawing on that row."
[VERIFIABLE][^14]

### 9. Commands, prompts, questions and tools

- Commands: `$.command.register` adds a `/command`. "To let the command run while Claude is
  working, add `immediate: true` to the registration." Names are "Letters, digits, `_`, and `-`, up
  to 64 characters". [VERIFIABLE][^2][^9]
- Prompt submission: "To send it as the user's own words, without that sentence, add `asUser:
  true`. The call waits until the session is idle and then starts a new turn. It resolves when that
  turn starts, so don't `await` it in a handler that runs while Claude is working." [VERIFIABLE][^2]
- Prompt fill: `$.prompt.fill` "Puts `input.text` in the prompt box as the draft, by `mode`:
  `replace` (the default) over it, `append` after it, `insert` at the cursor." [VERIFIABLE][^1]
- Questions: `$.ui.ask` takes "2-4 option labels" and "Rejects when dismissed, and in a `-p` run (no
  one to ask)." [VERIFIABLE][^1] "Keep the wait inside a mods API call such as `$.ui.ask`, because
  that time doesn't count against the hook's time limit." [VERIFIABLE][^25]
- Notifications: 2.1.295 "Added `$.ui.notify` for mods: raises a native notification through your
  own notification setting and says which channel sent it". [VERIFIABLE][^4]
- Autocomplete: `prompt.autocomplete` returns `{ suggestions }`, and "Claude Code doesn't wait for
  the hook: its own autocomplete rows show first." [VERIFIABLE][^9]
- Tools for Claude: a registered tool appears to Claude "under a longer name made of `mcp__`, your
  plugin's name, two underscores, and the name you registered." [VERIFIABLE][^2] claude-mdview
  registers `show`, so Claude can open a file in the pane, and davekiss/md registers nine tools.
  [VERIFIABLE][^13][^21]

claude-mdview's point-to-edit flow is the reference for "ask Claude to change this block". On Enter
in a block's edit bar it sends `Edit lines ${b.line}-${b.end} of \`${path}\`` plus the section, the
block's first words and the instruction, through `$.prompt.submit({ text, asUser: true })`, then
tracks the turn under the block and redraws when the file changes (polled every 1.5 s).
[VERIFIABLE][^13]

### 10. Performance and budgets

- Redraws: "Throttled to 10 a second, or 30 in the terminal for the visible pane, the expanded band,
  and the hint line under the prompt. Calls that come sooner are coalesced." [VERIFIABLE][^9]
  `$.ui.blit` takes "up to 120 a second ... some sixty shown". [VERIFIABLE][^1]
- Hook time: a hook's own execution gets "10 seconds, or 50 milliseconds for a `prompt.edit` hook".
  [VERIFIABLE][^9]
- Known rendering bugs fixed in 2.1.290: "Fixed plugin hooks stalling each redraw when a mod draws a
  long multi-line text holding non-Latin characters" and "Fixed a mod's inline pane being redrawn
  without end when its tree changed height at every drawing". [VERIFIABLE][^4]
- Caps the existing Markdown mods chose: claude-mdview pages at 60,000 characters, file-preview at
  60,000, and claude-markdown-pane: "Files longer than 90,000 characters are cut, with a note."
  [VERIFIABLE][^13][^16][^26]

Cost of a 1,000-line Markdown file. Let $N$ be the line count and $\bar{c}$ the mean line length in
characters. The text drawn as one tree is about $N\bar{c}$, and the element count is
$\lceil N\bar{c} / 10{,}000 \rceil$. For $N = 1{,}000$ and $\bar{c} = 60$ that is 60,000 characters
in 6 `Markdown` elements, which fits the 100,000 budget with 40% left. At $\bar{c} = 100$ it is
100,000 and fails. A windowed slice sized to the pane, say $b$ = 50 body rows of 110 cells, carries
at most $50 \times 110 = 5{,}500$ characters per redraw, independent of $N$. [INFERENCE] No source
measures how long a 60,000-character tree takes to draw or serialise. [NO SOURCE]

### 11. Existing mods for documents and browsers

The browser survey §4.3 listed eight doc-view mods in seven rows. This run read their source and
found seven more doc mods. Two of them (mermaid-inline, figures) are in the mods survey §3.5, and one
(davekiss/md) is an editor. Each is summarised here and tabled in (b).

- claude-mdview (xuanji86): reader pane drawn with the engine's `Markdown`, split at 9,000
  characters per element and 60,000 per page; links followed in place; contents (`t`), find (`f`),
  parts (`p` `n`), back (`b`); pictures as `Image` in kitty, Ghostty and iTerm2 3.7+, "colored half
  blocks anywhere else" through `sips`; hover-to-edit through `$.prompt.submit`. It "makes no network
  requests, stores nothing across sessions, and calls no model of its own." [VERIFIABLE][^13]
- hamzafer md-preview: renders through "GitHub's own renderer through `gh api /markdown`", a small
  built-in renderer, or a text view; headless Chrome draws the page as an `Image` in parts of 250
  rows (`PART_ROWS = 250 // an Image is at most 255 rows`). "It does not work through tmux." With
  the GitHub renderer, "the file's text goes to GitHub's API under your own `gh` login".
  [VERIFIABLE][^27]
- claude-code-file-preview (abonckus): its own block renderer over `Box`, `Text`, `Code` and
  `Markdown`; tables fitted to the pane or drawn as cards; GitHub callouts as boxes; Mermaid
  "Drawn as box-drawing text by" mermaid-ascii through `$.process.run`; fuzzy search; JSON and YAML
  as highlighted code. [VERIFIABLE][^16]
- claude-markdown-mod (deepskyblue86): restyles completed replies with its own colours.
  [VERIFIABLE][^24]
- ide-mod (jkf87): PDF and HWP through a `node` helper. Its `bin/pdf-view.mjs` loads a vendored
  pdf.js with `isEvalSupported: false`, stubs `DOMMatrix`, `ImageData` and `Path2D`, and lays glyph
  positions into a character grid; page pictures come from poppler's `pdftoppm`. The hooks module
  calls `$.process.run(['node', \`${dir}/bin/${script}\`, ...args], { timeoutMs: 60_000 })`.
  [VERIFIABLE][^28]
- claude-lens (minhdevtree): images, SVG and PDF first pages under the row that names them; kitty
  pictures, else sextant, quadrant or half-block cells; on Linux "PDF: `pdftoppm` (poppler-utils)
  or `mutool` (mupdf-tools)". [VERIFIABLE][^14]
- html-preview (JAICHANGPARK): calls `$.browser.open` when terminal-browser is installed, else a
  headless-Chrome screenshot (the browser survey §1.2); draws in a `Pane`. [VERIFIABLE][^29]
- claude-code-glance (Rocha101): HTML and images under `ToolResult`, `ToolGroup` and
  `CommandOutput` rows (the browser survey §1.2). [VERIFIABLE][^30]
- mermaid-inline (dazebug): Mermaid in replies as pictures in Ghostty, cmux and kitty "outside
  tmux", Unicode box drawing elsewhere, rendered by a `node` helper. [VERIFIABLE][^8]
- figures (natsukium): Mermaid, Graphviz, D2, SVG and math as kitty pictures; MathJax in-process,
  the other renderers as local binaries. [VERIFIABLE][^6]
- claude-gfm-render (briangtn): GitHub alerts, task lists, strikethrough and Mermaid in replies;
  Mermaid as Unicode art in-process in the terminal, SVG through `node` on Desktop. 19 stars, the
  most of any doc mod read. [VERIFIABLE][^7]
- davekiss/md: the editor of §6. [VERIFIABLE][^21]
- claude-code-converter (zrdqns): converts Office files and PDFs to Markdown with markitdown before
  Claude reads them. [VERIFIABLE][^23]
- claude-markdown-pane (JorgeRomero123) and claude-docs-viewer (prithivrajmu): Markdown panes;
  the second lists "every Markdown file (`.md`, `.mdx`, `.markdown`) in the current repo, plus
  `.html` and `.txt` files." [VERIFIABLE][^26][^32]
- terminal-browser (zenbu-labs): the only live browser, kitty or Ghostty outside tmux (the browser
  survey §1.1). 3,871 stars on 2026-10-15. [VERIFIABLE][^31]

Catalogue coverage. The GitHub topic `claude-mods` holds 112 repositories; three searches found 34
(markdown), 21 (pdf) and 23 (editor) results, of which the doc mods above are the relevant ones.
[VERIFIABLE][^33] The mods.aidojo.si catalogue, "scanned against Claude Code 2.1.296", adds `csv-table`,
`data-peek` (CSV, TSV, JSON), `latex-math` (kitty pictures), `latex` (Desktop), `html-shelf` and
`redpen`. [VERIFIABLE][^34] claude-mods.com lists 21 entries on these topics, including
`claude-mermaid`, `whitekr-mermaid`, `diagram-pane` and `claude-review`. [VERIFIABLE][^35]

No mod was found that views EPUB, DOCX, ODT, RTF, AsciiDoc, reStructuredText, Org or Jupyter
notebooks in a pane. The search covered the 3,836-entry catalogue file (descriptions cut at about
110 characters), the 211-entry directory and the topic list. [VERIFIABLE][^33][^34][^35]

### 12. Rendering routes by format

#### 12.1 Markdown

The built-in `Markdown` element needs no parser for display (§2.1). A parser is still needed to
split a document into blocks for windowing, pointing and editing, which is what claude-mdview and
file-preview hand-roll with regular expressions. [VERIFIABLE][^13][^16]

Candidate parsers, all pure JavaScript with no DOM:

- micromark: "The smallest CommonMark compliant markdown parser." It claims "100%" GFM through an
  extension, plus math and frontmatter extensions, "safe" by default, and "smallest CM parser at
  ±14kb". MIT, 2,233 stars, last push 2026-09-26. [VERIFIABLE][^36][^39]
- markdown-it: "Safe by default.", CommonMark plus "syntax extensions & sugar", community plugins.
  MIT, 21,979 stars, last push 2026-09-12. [VERIFIABLE][^37][^39] Its npm package unpacks to
  1,968,876 bytes, most of it distribution builds, so a single bundled file has to be checked
  against the 1 MB cap. [VERIFIABLE][^38]
- marked: no runtime dependencies on npm (version 18.1.1, 518,121 bytes unpacked); GitHub reports
  its licence as "Other". 37,238 stars. [VERIFIABLE][^38][^39]
- remark: the unified ecosystem's parser to an mdast tree. MIT, 9,019 stars. [VERIFIABLE][^39]

Mermaid, math and pictures need more than the element. The in-process routes proven by a mod are
beautiful-mermaid's ASCII renderer (84 KB, claude-gfm-render) and MathJax to SVG (figures). The
SVG route has no terminal output in tmux, because SVG needs `Svg` (Desktop) or a rasteriser plus
`Image`. [VERIFIABLE][^6][^7] beautiful-mermaid: MIT, 11,194 stars; mermaid-ascii (Go binary):
MIT, 1,602 stars. [VERIFIABLE][^39]

#### 12.2 HTML

- Parsers: parse5 is an "HTML parsing/serialization toolset for Node.js", WHATWG-compliant (MIT,
  3,938 stars). htmlparser2 is "The fast & forgiving HTML/XML parser" and "provides a callback
  interface that allows consumption of documents with minimal allocations" (MIT, 4,792 stars).
  [VERIFIABLE][^39][^40][^41]
- Reader extraction: Mozilla Readability needs a DOM. "To parse a document, you must create a new
  `Readability` object from a DOM document object", and "Since Node.js does not come with its own
  DOM implementation, we rely on external libraries like" jsdom. [VERIFIABLE][^42] linkedom, a
  lighter DOM built on htmlparser2, unpacks to 909,684 bytes. [VERIFIABLE][^38] Whether Readability
  runs over linkedom inside the hooks runtime is untested. [NO SOURCE]
- HTML to Markdown: turndown's npm package depends on `@mixmark-io/domino`, a DOM implementation.
  [VERIFIABLE][^38][^43] node-html-markdown is "a _fast_ HTML to markdown converter, compatible with
  both node and the browser", depends only on `node-html-parser`, and unpacks to 112,630 bytes.
  [VERIFIABLE][^38][^44] claude-mdview's regex conversion of "The HTML a markdown file commonly
  holds" is the minimal in-process route. [VERIFIABLE][^13]
- Text browsers: `lynx -dump` "dumps the formatted output of the default document or one specified
  on the command line to standard out." [VERIFIABLE][^61] w3m, Chawan and Browsh are in the browser
  survey §3. None of lynx, w3m, Chawan or Browsh is on this host's `PATH` (the browser survey §5).
- A live page: terminal-browser's `$.browser.open`, kitty or Ghostty outside tmux only (the browser
  survey §1.1).

#### 12.3 PDF

- pdf.js in the hooks runtime is blocked by size. ide-mod's vendored copy has `pdf.mjs` at 976,824
  bytes and `pdf.worker.mjs` at 2,139,222 bytes (measured in the source tarball), so the worker
  alone exceeds the 1 MB cap. ide-mod runs it in `node` instead. [VERIFIABLE][^28] pdf.js is "a
  Portable Document Format (PDF) viewer that is built with HTML5", Apache-2.0, 54,003 stars, release
  v6.4.299 on 2026-10-03. [VERIFIABLE][^39][^45]
- poppler: `pdftotext -layout` will "Maintain (as best as possible) the original physical layout of
  the text", and `-bbox-layout` will "Generate an XHTML file containing bounding box information for
  each block, line, and word in the file." `pdftoppm -png` "Generates a PNG file instead a PPM
  file." [VERIFIABLE][^46][^47] Both are on this host at `/usr/bin` (measured with `command -v`).
- MuPDF: `mutool draw` accepts "pdf , xps , cbz , md , and epub" and outputs images, SVG and "plain
  text , html , and structured text (as xml or json )". AGPL-3.0. [VERIFIABLE][^39][^48] It is not
  on this host's `PATH` (measured).
- pdfium was not researched this run. [NO SOURCE]

#### 12.4 Office, e-book and markup formats

- pandoc reads `docx`, `odt`, `rtf`, `epub`, `ipynb`, `latex`, `rst`, `org`, `asciidoc`, `typst`,
  `csv`, `pptx`, `xlsx` and more, and writes `ansi` "for terminal viewing" as well as `gfm`.
  GPL-2.0, 46,588 stars, release 3.12.1 on 2026-10-08. [VERIFIABLE][^39][^49] It is not on this
  host's `PATH` (measured).
- DOCX: mammoth "is designed to convert .docx documents" to HTML, and "Markdown support is
  deprecated." BSD-2-Clause, 6,325 stars; its npm package depends on `jszip` and `@xmldom/xmldom`
  and unpacks to 1,671,388 bytes. [VERIFIABLE][^38][^39][^50] The `docx` npm package generates
  files ("Easily generate and modify .docx files"), so it is no reader. [VERIFIABLE][^39]
  markitdown (Microsoft, MIT, 190,255 stars) converts Office and PDF to Markdown in Python, the
  route claude-code-converter uses. [VERIFIABLE][^23][^39]
- EPUB: epub.js "is a JavaScript library for rendering ePub documents in the browser", rendering
  into a page element, so it needs a DOM. [VERIFIABLE][^51] Its own README notes "An unzipped EPUB3
  is a collection of HTML5 files, CSS, images and other media", so a mod can unzip with fflate (MIT,
  no dependencies) and convert each XHTML chapter as HTML. [VERIFIABLE][^38][^51] `mutool draw` and
  pandoc also read EPUB. [VERIFIABLE][^48][^49]
- Jupyter notebooks: "The official Jupyter Notebook format is defined with this JSON schema". Cells
  carry `cell_type` and `source`, and markdown cells use GitHub-flavoured Markdown "implemented in
  marked". [VERIFIABLE][^52] A notebook therefore maps to Markdown blocks plus `Code` blocks in a
  few dozen lines of TypeScript, with outputs as text or as base64 pictures for the image path.
  [INFERENCE]
- CSV and TSV: PapaParse (MIT, 13,589 stars) has no npm dependencies and unpacks to 270,635 bytes.
  [VERIFIABLE][^38][^39] The reply renderer cuts tables at 200 rows (§2.1), so a large CSV needs the
  windowed path. [INFERENCE]
- AsciiDoc: asciidoctor.js "runs on Node.js ≥ 24 and in the browser"; its npm package unpacks to
  3,406,988 bytes. [VERIFIABLE][^38][^53] It is a candidate for a `node` helper, not for the hooks
  runtime, unless a chunked bundle stays under 1 MB per file. [INFERENCE]
- reStructuredText and LaTeX: no pure-JavaScript reader was evaluated; pandoc reads both.
  [VERIFIABLE][^49] Org: uniorg parses Org in JavaScript but is GPL-3.0, which an MIT repository
  cannot vendor. [VERIFIABLE][^39]
- SVG: `Svg` on Desktop; in the terminal, a rasteriser (`rsvg-convert`, resvg, ImageMagick) to PNG
  and then `Image` or `Raster` cells, as claude-lens does. [VERIFIABLE][^14]

Every route that runs an external binary depends on what the host has. On this host only
`pdftotext`, `pdftoppm`, `node` and `python3` were found on `PATH` (measured with `command -v` over
pandoc, pdftotext, pdftoppm, mutool, w3m, lynx, glow, mdcat, bat, node, python3 and asciidoctor).

#### 12.5 Desktop already previews HTML and PDF

The Desktop Code tab needs no mod for this: "The Browser pane can also open static HTML files,
PDFs, images, and videos from your project." [VERIFIABLE][^54]

### 13. Terminal prior art outside mods

- glow: "Render markdown on the CLI, with _pizzazz_!", with a TUI where "Markdown files can be read
  with Glow's high-performance pager." MIT, 27,688 stars, last push 2026-10-05. [VERIFIABLE][^39][^55]
- mdcat: "This repository is no longer maintained." (archived on GitHub; a fork is named). MPL-2.0.
  [VERIFIABLE][^39][^56]
- Frogmouth: "a Markdown viewer / browser for your terminal, built with" Textual, with "a familiar
  browser-like navigation stack, history, bookmarks, and table of contents"; "You can navigate with
  the mouse or the keyboard." MIT, 3,308 stars, last push 2024-08-01. [VERIFIABLE][^39][^57]
- Rich: "Rich can render Markdown to the console." MIT, 57,536 stars. [VERIFIABLE][^39][^58]
- bat: "A cat(1) clone with syntax highlighting and Git integration." It highlights Markdown source
  and does not render it. Apache-2.0, 60,774 stars. [VERIFIABLE][^39][^59]
- termpdf.py: "A graphical pdf and epub viewer, written in python, that works inside" kitty; it
  needs PyMuPDF. MIT, last push 2023-10-28. [VERIFIABLE][^39][^60]
- lynx and w3m: text dumps (§12.2; the browser survey §3).

Frogmouth is the closest model for a navigable doc reader (stack, history, bookmarks, contents),
and its last push is over a year old. [INFERENCE]

### 14. DOM-free editor cores

- CodeMirror 6 state: the guide describes `@codemirror/state` as the package that "defines data
  structures that represent the editor state and changes to that state", where "Document changes
  are themselves values", and notes state commands can be tested "without creating a view". It does
  not say in so many words that the package runs without a DOM. [VERIFIABLE][^62] Its npm package
  depends only on `@marijn/find-cluster-break` and unpacks to 440,367 bytes. [VERIFIABLE][^38] The
  GitHub repository is archived: "This repository has moved to
  https://code.haverbeke.berlin/codemirror/state". [VERIFIABLE][^62]
- ProseMirror model and transform: the guide ties only `prosemirror-view` to the browser (it "shows
  a given editor state as an editable element in the browser"), and `prosemirror-transform`
  "contains functionality for modifying documents in a way that can be recorded and replayed". The
  model also carries DOM parsing helpers. [VERIFIABLE][^63] `prosemirror-model` depends only on
  `orderedmap`. [VERIFIABLE][^38] Its GitHub repository has also moved to code.haverbeke.berlin, so
  its GitHub star count (339) understates adoption. [VERIFIABLE][^39][^63]
- Lexical: `@lexical/headless` "allows you to interact with Lexical in a headless environment",
  "one that does not rely on DOM, e.g. for Node.js environment." [VERIFIABLE][^66] Its npm package
  depends on `happy-dom`, a DOM emulation, and the core unpacks to 3,225,842 bytes.
  [VERIFIABLE][^38] Both facts conflict with a runtime that has no DOM and a 1 MB file cap. [INFERENCE]
- Yjs: Y.Text is "A shared type that represents Text & RichText", and "The Text-Delta is equivalent
  to Quills' Delta format." [VERIFIABLE][^64] Its npm package depends only on `lib0`.
  [VERIFIABLE][^38]
- Automerge: "the core Rust library which is compiled to WebAssembly and exposed in JavaScript", so
  it cannot load in a hooks module that has no `WebAssembly`. [VERIFIABLE][^1][^65] Its npm package
  unpacks to 47,529,812 bytes. [VERIFIABLE][^38]

davekiss/md shows that a line array and a 200-step undo stack suffice for a working Markdown editor
in a mod, with no editor core at all (§6). An editor core is worth adding only for structured rich
text or for merging Claude's file edits with unsaved local edits, where a CRDT such as Yjs applies.
[INFERENCE]

## Tables

### (a) Mods API contract for a viewer and editor

Host is 2.1.296. "2.1.299+" marks a row this host lacks. Every cell comes from §1 to §10 and carries
those sections' tags.

| API surface | Contract, as the source states it | Bound | Source | What it means for doc-editor |
|---|---|---|---|---|
| Hooks-runtime globals | "no DOM, no Node", no `eval`, no `new Function`, no `WebAssembly` | Fixed set incl. `TextDecoder`, `URL`, `crypto` | [^1][^2] | Parsers must be pure JS; no pdf.js worker, Automerge or happy-dom in-process |
| Imports | Relative files inside the plugin; one bare import, `claude-code`; no dynamic `import()` | Module file over 1 MB not read (reported) | [^3][^5] | Vendor third-party code as committed chunks under 1 MB each |
| Passing `$` | Not to a function imported from another file (create page); allowed for function declarations from 2.1.299 | n/a | [^3][^4] | Keep vendored code `$`-free on this host |
| `Markdown` | "its own renderer, links, tables, fences"; `text`, `key`, `dimColor`, `onLinkPress`, `pressableLinks` | `text` at most 10,000 characters; 256 pressable links | [^1][^9] | Split documents into blocks under 10,000; links answerable by click in fullscreen |
| `Code` | Engine highlighter; `language` or `path`; `startLine`; `format: 'diff'` | `source` at most 10,000 characters | [^1][^9] | Fenced code, raw view, diffs |
| `Text` | Ink text styles, `hover`, seven `wrap` modes; `size`, `weight`, `mono`, `tabular`, `dir` (2.1.299+) | 10,000 per string (reported) | [^1][^4][^15] | Own renderer for headings and spans; typography props need 2.1.299+ |
| `Box` | Flex, `position: 'absolute'`, `overflow`, `display`, `hover` reveal | Tree: 20,000 nodes, 32 deep | [^1] | Hover-to-reveal edit controls with no hook run |
| `Link` | OSC 8 in the terminal; `https:` or `http://localhost` on Desktop | `href` at most 2,048; a bad `href` refuses the tree (types) | [^1][^9][^11] | Validate every document link before drawing it |
| `Input` | "every surface's one-line text field"; `onInput`, `onSubmit` | No declared length | [^1][^17] | One-line edits, find bar, commands; no multi-line |
| `Select`, `Button` | `options` with unique values; `hotkey` one digit or lowercase letter; `action` binds a keybinding action | Option `value` at most 10,000 | [^9][^11] | Mode pickers, toolbars, key hints |
| `Client` | Surface module on the drawing thread; `onPointer`, `onKey`, `setState`, `every`, `post` | "a second per call at most"; post and props 100,000 characters | [^1] | Caret, selection and drag editor; keys only after a click |
| `Raster`, `Image`, `Svg` | `Raster` and `Image` terminal only; `Image` fails in tmux; `Svg` Desktop only | `Raster` 512 by 256 cells; `Image` 255 by 255 cells, 2 MiB; `Svg` 131,072 characters | [^9][^12] | Pictures in tmux only as `Raster` blocks, 256 colours unless truecolor is set |
| Pane placement | Unasked panes from 144 columns, 110 after a first user open | `bodyColumns`, `scroll.bodyRows`, `viewport` | [^9][^11] | Open on a user action so the pane always places |
| Site scroll | `ui.scroll` before the move; hook rewrites `offset` or keeps the window | `by`, `bodyRows`, `contentRows`, `pointer` | [^1][^10] | Windowed rendering of any length (the `/diff` pattern) |
| `$.ui.scroll` | Reveals an element by `key`; "never a row number" | n/a | [^1] | Jump to heading, search hit or edit |
| Fullscreen and mouse | Mouse only in fullscreen; clicks reach a mod only there | tmux needs mouse mode for the wheel | [^13][^16][^18] | Keep a keyboard path for main-screen sessions |
| `$.ui.selection()` | Text last selected in fullscreen, and its row when in one transcript row | Pane selections unspecified | [^4][^9] | "Ask about this" from a transcript selection |
| `$.ui.ask` | Engine question dialog | 2 to 4 options; rejects when dismissed and in `-p` | [^1][^25] | "Are you sure?" before overwriting a file |
| `$.ui.notify`, `toast`, `status` | Native notification (2.1.295); toast; pinned status line | Toast 4 s by default | [^4][^9] | Report external changes and failed writes |
| `$.fs.read`, `$.fs.write` | Text or bytes; write "isn't atomic" | 4 MiB per file | [^1][^9] | 4 MiB document ceiling in-process; atomic save needs a helper |
| `$.process.run` | argv, no shell; one shot; text stdout "cut at the output limit" | 30 s default, 10 min max; output limit unstated | [^1][^9] | pandoc, poppler, mutool, `node` helpers; binary output through files |
| `$.http.fetch` | `http` or `https`; five redirects | 4 MiB bodies, 30 s | [^9] | Fetch a remote doc or a Browsh text page |
| `$.store` | Shared key-value store; get then set not atomic | 4 MiB of JSON | [^9][^11] | Recent files, per-file view state, one key each |
| `$.command.register` | `/command`; `immediate: true` runs during a turn | Names up to 64 characters | [^2][^9] | `/doc <path>`, `/doc find` |
| `prompt.autocomplete` | `{ suggestions }` rows; engine does not wait | n/a | [^9] | Complete document paths after `/doc` |
| `ToolUse`, `ToolResult`, `ToolGroup` | Redraw a tool row; stored result untouched; reads fold into a group | Output rewrite checked against the tool's schema | [^1] | Open link or preview under a `Read` of a `.md` or `.pdf` |
| `AssistantMessage` | Redraw a reply after it completes | Streamed text cannot be restyled | [^24] | Make doc paths in replies clickable |
| `$.prompt.submit` | Starts a turn when idle; `asUser: true` drops the mod's sender line | Resolves when the turn starts | [^2] | Point at a block and ask Claude to edit it |
| `$.prompt.fill` | Draft by `replace`, `append` or `insert` | n/a | [^1] | Quote a selected block into the prompt |
| `$.tool.register` | A tool Claude calls, named `mcp__<plugin>__<name>` | n/a | [^2] | Let Claude open, scroll and annotate the viewer |
| Tree text | "The first 100,000 characters are drawn" (reference); whole tree refused (reported) | 100,000 characters per tree | [^9][^15] | Budget every redraw well under 100,000 |
| Redraws | Throttled to 10 a second, 30 for the visible pane | Coalesced | [^9] | No per-keystroke full-document redraw |
| Hook time | A hook's own code | 10 s; 50 ms for `prompt.edit` | [^9] | Heavy conversion in a process or a timer, not in `ui.render` |

### (b) Existing mods for documents and browsers

Read 2026-10-15. Stars are GitHub counts on that date.

| Mod | Formats | How it parses | How it draws | How it scrolls | Links and images | Edits | Without pictures | Licence | Stars | Last push |
|---|---|---|---|---|---|---|---|---|---|---|
| [claude-mdview](https://github.com/xuanji86/claude-mdview) [^13] | Markdown; text as code; common HTML | Regex sections, blocks and HTML-to-Markdown in `doc.ts` | Engine `Markdown` at 9,000 per element, pages of 60,000; `Raster` or `Image` | Engine window; `$.ui.scroll` to a heading; parts `p` `n` | File links followed in place; pictures via `sips` | Point at a block, Claude edits through `$.prompt.submit` | Half blocks | MIT | 6 | 2026-10-03 |
| [md-preview](https://github.com/hamzafer/claude-code-mods/tree/main/mods/md-preview) [^27] | Markdown | `gh api /markdown`, built-in renderer, or text | Headless Chrome PNG as `Image` parts of 250 rows; styled `Text` view | Engine window | Browser opens the page with working links | No | Text view; "does not work through tmux" | MIT | 242 (collection) | 2026-10-14 |
| [claude-code-file-preview](https://github.com/abonckus/claude-code-file-preview) [^16] | Markdown, JSON, YAML | Own block splitter | `Box`, `Text`, `Code`, `Markdown`; tables fitted or as cards; callouts | Engine window, footer redrawn on `ui.scroll` | `file:` links in replies; no pictures | No | Text only | MIT | 0 | 2026-10-05 |
| [claude-markdown-mod](https://github.com/deepskyblue86/claude-markdown-mod) [^24] | Claude's replies | Own inline parser | Styled `Text`; fences and tables by the engine | Transcript | Link text plus address | No | Text only | MIT | 6 | 2026-10-04 |
| [ide-mod](https://github.com/jkf87/ide-mod) [^28] | PDF, HWP, HWPX | pdf.js in a `node` helper | Character grid from glyph positions; `pdftoppm` picture; SVG on Desktop | Own `ui.scroll` hook | n/a | No | Text grid | MIT | 7 | 2026-10-13 |
| [claude-lens](https://github.com/minhdevtree/claude-lens) [^14] | Images, SVG, PDF first pages | `pdftoppm`, `mutool`, PDFKit, ImageMagick | Under `ToolGroup`, `ToolUse`, `ToolResult`, messages; `Image` or blocks | Transcript; gallery pane | Pictures only | No | Sextant, quadrant or half blocks | MIT | 0 | 2026-10-12 |
| [html-preview](https://github.com/JAICHANGPARK/html-preview) [^29] | HTML | terminal-browser or headless Chrome | `Pane`; `$.browser.open` or a screenshot | Own `ui.scroll` hook re-renders | Live links only through terminal-browser | No | Terminal split | MIT | 0 | 2026-10-02 |
| [claude-code-glance](https://github.com/Rocha101/claude-code-glance) [^30] | HTML, images | Headless Chromium, ImageMagick | Under `ToolResult`, `ToolGroup`, `CommandOutput` | Transcript | Pictures | No | Colour block art | MIT | 1 | 2026-10-02 |
| [mermaid-inline](https://github.com/dazebug/mermaid-inline) [^8] | Mermaid in replies | beautiful-mermaid in a `node` helper | `Image` via resvg PNG | Transcript | n/a | No | Unicode box drawing | MIT | 0 | 2026-10-09 |
| [figures](https://github.com/natsukium/claude-code-figures-plugin) [^6] | Mermaid, Graphviz, D2, SVG, math | MathJax in-process; `mmdr`, `dot`, `d2`, `resvg` binaries | `Image` (kitty, Ghostty) | Transcript; pane | n/a | No | Code block stays | Apache-2.0 | 7 | 2026-10-14 |
| [claude-gfm-render](https://github.com/briangtn/claude-gfm-render) [^7] | Alerts, task lists, strikethrough, Mermaid | Own splitter; vendored mermaid-ascii | Boxes and Unicode art; SVG via `node` on Desktop | Transcript | n/a | No | Unicode art | MIT | 19 | 2026-10-05 |
| [davekiss/md](https://github.com/davekiss/md) [^21] | Markdown | Own line model | `Client` editor rows; `Markdown` reader view; `Image` or `Raster` | Own `ui.scroll` hook and view top | Image lines as pictures (macOS `sips`) | Yes: caret, selection, undo, comments, Claude tools | Half blocks | MIT | 0 | 2026-10-13 |
| [claude-code-converter](https://github.com/zrdqns/claude-code-converter) [^23] | PDF, Word, Excel, PowerPoint | markitdown (Python) | Nothing; replaces what Claude reads | n/a | n/a | No | n/a | MIT | 0 | 2026-10-08 |
| [claude-markdown-pane](https://github.com/JorgeRomero123/claude-markdown-pane) [^26] | Markdown | Not read | Pane; tables as lists when wide | Not read | Not read | No | Not read | MIT | 0 | 2026-10-07 |
| [claude-docs-viewer](https://github.com/prithivrajmu/claude-docs-viewer) [^32] | Markdown, HTML, text | Not read | Pane file list and reader | Not read | Not read | No | Not read | None detected | 0 | 2026-10-14 |
| [terminal-browser](https://github.com/zenbu-labs/terminal-browser) [^31] | Web pages | Electron Chromium | `Image` from shared memory plus `Client` input | Wheel to page | Live | Page forms | Blank in tmux | MIT | 3,871 | 2026-10-07 |

Every mod in this table is exploratory under Route A of the source-vetting procedure (0 to 19 stars,
days old), except terminal-browser's host project. [INFERENCE]

### (c) Rendering routes by format

"In-process" means pure JavaScript that a hooks module can import under §1's rules. Sizes are npm
unpacked sizes [^38], which include extra builds, so they overstate a bundled file.

| Format | In-process route (no Node APIs) | External binary through `$.process.run` | Licence of the route | Adoption signal | Size risk against 4 MiB, 10,000 and 100,000 caps | Fallback without pictures |
|---|---|---|---|---|---|---|
| Markdown | Engine `Markdown`; micromark or markdown-it for block structure | pandoc `-t ansi` or `gfm` | MIT; pandoc GPL-2.0 | markdown-it 21,979 stars; micromark 2,233 | Split under 10,000 per element; window the tree | Native |
| GFM extras (alerts, footnotes, task lists) | Own rewrite to boxes and glyphs, as claude-gfm-render does | pandoc | MIT | claude-gfm-render 19 | Same | Text glyphs |
| Math | MathJax to SVG in-process (figures) | `resvg` to PNG | Apache-2.0 | figures 7 | SVG has no terminal output in tmux | TeX source as code |
| Mermaid | beautiful-mermaid ASCII renderer, 84 KB | `mmdc`, `mmdr`, mermaid-ascii | MIT | beautiful-mermaid 11,194 | ELK layout 1.6 MB exceeds 1 MB | Unicode box art |
| HTML | node-html-markdown, or parse5 or htmlparser2 plus own conversion; Readability needs a DOM | lynx `-dump`, w3m, Chawan; terminal-browser for live pages | MIT; Apache-2.0 | parse5 3,938; htmlparser2 4,792; Readability 11,501 | linkedom 909,684 bytes near the cap | Markdown text |
| PDF | pdf.js blocked: worker 2,139,222 bytes | `pdftotext -layout` or `-bbox-layout`; `pdftoppm -png`; `mutool draw` to text, HTML or JSON; pdf.js in `node` | poppler not checked; AGPL-3.0 (MuPDF); Apache-2.0 (pdf.js) | pdf.js 54,003; poppler on this host | Text of a long PDF can pass 4 MiB of stdout; page through it | Text grid (ide-mod) |
| DOCX | mammoth to HTML (jszip, xmldom) | pandoc; markitdown | BSD-2-Clause; GPL-2.0; MIT | mammoth 6,325; markitdown 190,255 | mammoth package 1.67 MB unpacked | Markdown text |
| RTF, ODT | None evaluated | pandoc | GPL-2.0 | pandoc 46,588 | n/a | Markdown text |
| EPUB | fflate unzip, then the HTML route per chapter; epub.js needs a DOM | pandoc; `mutool draw` | MIT | epub.js 6,963 (browser only) | One chapter at a time | Markdown text |
| Jupyter `.ipynb` | JSON cells to Markdown and `Code` blocks | pandoc | BSD-3-Clause schema | nbformat (official schema) | Output cells with base64 pictures can pass 4 MiB | Text outputs |
| CSV, TSV | PapaParse | pandoc | MIT | PapaParse 13,589 | Reply tables cut at 200 rows; window rows | Aligned `Text` grid |
| AsciiDoc | asciidoctor.js too large for one file | pandoc; asciidoctor.js in `node` | MIT | asciidoctor.js 805 | Package 3.4 MB unpacked | Markdown text |
| reStructuredText, Org, LaTeX | None evaluated; uniorg (Org) is GPL-3.0 | pandoc | GPL | pandoc 46,588 | n/a | Markdown text |
| SVG | Source only | `rsvg-convert`, resvg, ImageMagick to PNG | Various | claude-lens 0 | 131,072-character `Svg` on Desktop only | Blocks or alt text |
| Images | No decoder in-process; BMP pixels via `sips` (mdview) | ImageMagick, `sips` | Various | claude-lens, mdview | `Image` 2 MiB inline | Half, quadrant or sextant blocks |

### (d) Editing options

| Option | What it gives | Limits | Evidence | Fit for the MVP |
|---|---|---|---|---|
| `Input` element | One-line field with `onInput` and `onSubmit` | Single line; Desktop pastes lose line breaks | [^1][^17] | Find, rename, one-line instructions |
| Point and ask Claude | Hover a block, type an instruction, `$.prompt.submit({ asUser: true })` with file and line range | Costs a turn; Claude does the write | [^2][^13] | First editing path; works with keyboard focus too |
| `Client` editor | Caret, selection, drag, typed keys, undo, file writes | Fullscreen and a click for focus; props and posts under 100,000 characters | [^1][^21] | Second phase; proven by davekiss/md |
| Claude tools in the pane | `suggest`, `edit`, `comment` tools Claude calls, shown inline for accept or reject | Needs careful write guarding | [^2][^21] | Pairs with either path above |
| Write-back | `$.fs.write` replaces the file in place | Not atomic; 4 MiB | [^9] | Use a write-then-rename helper, check `mtimeMs` first |
| Conflict with an outside editor | Re-read when `mtimeMs` changes (davekiss/md; mdview polls every 1.5 s) | Lost-update window between check and write | [^13][^21] | Detect, then ask with `$.ui.ask` |
| Undo | In-memory stack (davekiss/md keeps 200) | Lost on reload unless kept in `$.state` | [^11][^21] | Enough for the MVP |
| CodeMirror 6 state | Immutable state and change sets | DOM-free status implied, not stated; repo moved off GitHub | [^38][^62] | Only if structured editing is needed |
| ProseMirror model and transform | Schema-checked rich documents; replayable steps | Model carries DOM helpers; repo moved | [^38][^63] | Overkill for Markdown source editing |
| Lexical headless | Headless editor API | Package depends on happy-dom; 3.2 MB core | [^38][^66] | Poor fit |
| Yjs `Y.Text` | CRDT text with Quill deltas | 2.3 MB unpacked; bundle under 1 MB per file needed | [^38][^64] | Later, for merging Claude's edits with unsaved ones |
| Automerge | CRDT documents | Rust compiled to WebAssembly; no WebAssembly in the runtime | [^1][^65] | Ruled out in-process |

## Gaps, blindspots and emergent findings

### Unresolved conflicts that one live session settles

- Task lists and strikethrough in `Markdown`. The changelog says both render (2.1.149, 2.1.186),
  and claude-gfm-render reports raw brackets in the terminal on 2.1.286. [VERIFIABLE][^4][^7]
- Over-budget trees. The reference says the first 100,000 characters are drawn, and a mod author
  reports the whole tree refused. [VERIFIABLE][^9][^15]
- `Link` in the terminal. The interface page says the URL rules do not apply there, and the types
  file says a bad `href` refuses the tree. [VERIFIABLE][^1][^11]

Each is a one-screen check with a gallery-style pane on this host. None was run, because the brief
forbade starting Claude Code. [INFERENCE]

### Version drift

The types file says "Written by Claude Code 2.1.277.", the reference is "as of v2.1.290", the
changelog reaches 2.1.300, and this host runs 2.1.296. The reference itself says "When the two
disagree, trust the copy Claude Code writes for your version." [VERIFIABLE][^1][^4][^9] Several
items cited here are newer than this host: `Text` typography and `dir`, and `$` passed to an
imported function. A design built against 2.1.296 has to read the types the host writes into
`.claude-plugin/types/` and treat 2.1.299+ props as later enhancements. [INFERENCE]

### Limits nobody documents

- The 1 MB module file limit is reported by three independent mod authors and absent from the
  reference, the troubleshoot page and the types file. [VERIFIABLE][^5][^6][^7]
- The `$.process.run` output limit is named ("cut at the output limit") with no number.
  [VERIFIABLE][^1]
- Whether `$.ui.selection()` sees a selection made inside a mod's own pane. [NO SOURCE]
- How long a 60,000-character tree takes to serialise and draw. [NO SOURCE]

### Coverage blindspots

- No general web or social search ran. The host's web-search MCP tool was absent from this run's tools and native
  WebSearch does not work on this host. A doc mod announced only on X, Reddit or Hacker News, with
  no GitHub topic or catalogue entry, is missing here. [NO SOURCE]
- The catalogue grep matched descriptions cut at about 110 characters, so a doc mod with an
  unrelated name and a long description can be missed. [INFERENCE]
- Not researched: pdfium, Typst, Browsh's text mode beyond the browser survey, and any in-process
  reader for RTF, ODT, reStructuredText or LaTeX. [NO SOURCE]
- Drawing through a third-party model provider is still unmeasured (the mods survey, Gaps), and so is every drawing claim
  here. [INFERENCE]

### Contrarian evidence

- On the Desktop app the rendering half of the ask is already met with no mod: the Code tab's
  Browser pane opens HTML and PDF files. [VERIFIABLE][^54] A doc-editor mod adds editing, Claude
  integration and the terminal there, not rendering.
- In the fleet's tmux sessions, "render HTML and PDF" reduces to text plus block pictures. `Image`
  fails in tmux, and colour is clamped to 256 unless `CLAUDE_CODE_TMUX_TRUECOLOR` is set.
  [VERIFIABLE][^12][^20] Real pictures need kitty or Ghostty outside tmux, which in practice means
  Sergei's local Mac (the browser survey, Recommendation 1). [INFERENCE]
- The prior art is young. The most-starred doc mod read has 19 stars, and every one was created
  in October 2026. [VERIFIABLE][^7][^33]

### Emergent findings not in the seed docs

- Anthropic's own `/diff` mod is the reference for windowed rendering: it answers `ui.scroll`
  itself and keeps the engine's window still. [VERIFIABLE][^10]
- davekiss/md is a working in-pane Markdown editor on `Client`, with caret, selection, undo,
  anchored comments and Claude tools. The browser survey did not list it. [VERIFIABLE][^21]
- Vendoring third-party JavaScript needs a dev-time bundle split under 1 MB per file, which refines
  the fleet design's D-3. [VERIFIABLE][^6][^7]
- claude-code-converter changes what Claude reads, not what the person sees. A doc-editor that
  converts a PDF or DOCX for display can hand the same Markdown to Claude through `tool.call`.
  [VERIFIABLE][^23]
- ProseMirror and CodeMirror moved off GitHub, so their GitHub star counts are frozen and
  understate adoption. [VERIFIABLE][^62][^63]
- Mods that redraw the same rows collide. A mod that redraws a row without passing it on blocks
  every mod after it, and claude-lens works around it with a fallback band. [VERIFIABLE][^14] A
  doc-editor that redraws replies would collide with claude-markdown-mod or claude-gfm-render if the
  user runs either. [INFERENCE]

### Security and privacy notes

- Converting untrusted documents runs external binaries on untrusted input, outside any sandbox:
  a mod's processes run as the user (the mods survey §1.3). Readability's README asks for a
  sanitiser "with untrusted input". [VERIFIABLE][^42]
- A renderer that calls a web service sends the document. md-preview's GitHub renderer sends "the
  file's text ... to GitHub's API". [VERIFIABLE][^27]
- Licences. pandoc is GPL-2.0, MuPDF AGPL-3.0 and uniorg GPL-3.0. [VERIFIABLE][^39] Calling a
  separate binary and vendoring code into an MIT repository are different cases, and a licence
  review is needed before bundling any of them. [INFERENCE] GitHub detects no licence for
  node-html-markdown (npm says MIT) and reports "Other" for marked and epub.js. [VERIFIABLE][^38][^39]

### Founding ask alignment

| Part of the ask (entry A001) | Status in this evidence | Where |
|---|---|---|
| "rendering markdown and other docs and doc-like file types" | Covered for Markdown, HTML, PDF, DOCX, RTF, ODT, EPUB, notebooks, CSV, AsciiDoc, rST, Org, LaTeX, SVG, images | §2, §12, table (c) |
| "making them interactive" | Covered: links, scroll, find, hover, point-to-edit, `Client` editing | §3 to §9, table (d) |
| "render markdown / html / pdf etc in the claude mod doc viewer" | Narrowed: in tmux, HTML and PDF draw as text and block pictures, not as pages | §2.4, Contrarian evidence |
| "plugins for showing an entire functional web browser in claude mods tui" | Covered by the browser survey; reuse path through `$.browser.open` noted | §11, §12.2 |
| "existing open source popular claude code mod plugins and repos" | Covered for doc and browser mods; none is popular yet (19 stars at most) | §11, table (b) |
| Doc-app UX from Confluence, Notion, Google Docs, Word (A001, A002) | Not in this leg; another leg owns it | n/a |
| Repo, MVP phasing, design doc (A001, A004) | Not in this leg; the coordinator owns it | n/a |
| Live verification | Deferred: nothing was run (brief) | Gaps, first subsection |

## Recommendations to the coordinator

1. Draw Markdown with the engine's `Markdown` element in blocks of at most 9,000 characters, and
   draw only the rows in view by answering `ui.scroll` the way Anthropic's `/diff` mod does. This
   removes the 100,000-character ceiling for any document length. (Findings 2.1, 2.3, 4, 10.)
2. Split documents into blocks with a vendored, `$`-free parser (micromark or a hand-rolled
   splitter like claude-mdview's), bundled once on a developer machine into files under 1 MB and
   committed. Record this as a refinement of D-3 in the design doc. (Findings 1, 12.1.)
3. Open the pane from a command or a click so it places at any width. Treat fullscreen as the
   mouse mode and keep a full keyboard path through hotkeys, the arrow-key scroll and an `Input`
   find bar. (Findings 3, 4, 5.)
4. Make editing two-phase. Phase 1 is point-and-ask through `$.prompt.submit({ asUser: true })`
   plus registered tools Claude calls to open, highlight and suggest. Phase 2 is a `Client` editor
   modelled on davekiss/md, offered only in fullscreen. Use no editor core in the MVP; revisit Yjs
   only if Claude's file edits must merge with unsaved local edits. (Findings 6, 9, 14; table d.)
5. Save through a write-then-rename helper, compare `mtimeMs` before every write, and ask with
   `$.ui.ask` when the file changed on disk. `$.fs.write` alone can leave a half-written file.
   (Finding 7; table d.)
6. Render HTML as Markdown text: in-process for HTML inside Markdown (claude-mdview's subset or
   node-html-markdown), and through `lynx -dump` or w3m for full pages when present. Hand live pages
   to `$.browser.open` when terminal-browser is installed, as html-preview does. (Finding 12.2.)
7. Render PDF as text with `pdftotext -layout`, one page range at a time, which is installed on this
   host. Offer `pdftoppm -png` pictures only where `Image` draws, and `Raster` blocks elsewhere with
   a hint to set `CLAUDE_CODE_TMUX_TRUECOLOR`. Do not vendor pdf.js: its worker is twice the module
   cap. (Findings 2.4, 12.3.)
8. Treat pandoc as an optional, feature-detected converter for DOCX, ODT, RTF, rST, Org, LaTeX and
   AsciiDoc. Do notebooks, CSV (PapaParse) and EPUB (fflate plus the HTML route) in-process.
   (Finding 12.4.)
9. Integrate with the transcript by adding an "open in doc-editor" link under `Read`, `Write` and
   `Edit` rows through `ToolUse` and `ToolGroup`. Do not redraw whole replies by default, to avoid
   colliding with other reply mods. (Finding 8; Emergent findings.)
10. Pin the design to 2.1.296 features and read the types the host writes. List 2.1.299+ props
    (`Text` typography, `dir`) as enhancements. (Gaps, Version drift.)
11. Before freezing the design, run one spike on this host that draws the three conflict cases:
    a task list and strikethrough in `Markdown`, a tree over 100,000 characters, and a terminal
    `Link` with a non-`https` `href`. (Gaps, first subsection.)
12. Keep GPL and AGPL code out of the repository. Call pandoc and mutool as separate binaries only,
    after a licence review. (Gaps, Security and privacy notes.)

## Sources

[^1]: Anthropic. (2026). [claude-code: mods/types/claude-code.d.ts](https://raw.githubusercontent.com/anthropics/claude-code/main/mods/types/claude-code.d.ts). GitHub. Verified accessible (HTTP 200) 2026-10-15; 517,451 bytes; header "Written by Claude Code 2.1.277." (Hooks-runtime globals, element props and bounds, `Client` contract, scroll, fs, process, prompt and row-site types.)
[^2]: Anthropic. (2026). [Use the mods API](https://code.claude.com/docs/en/plugins/mods/api.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (No Node APIs in the module, commands, tools, `$.prompt.submit`, files and processes.)
[^3]: Anthropic. (2026). [Create a mod](https://code.claude.com/docs/en/plugins/mods/create.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Static-analysis rules: relative imports, the `claude-code` bare import, no dynamic import, `$` passing.)
[^4]: Anthropic. (2026). [Claude Code changelog](https://code.claude.com/docs/en/changelog.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15; 1,096,437 bytes; newest entry 2.1.300, October 14, 2026. (Entries 2.1.149 to 2.1.300 quoted by version.)
[^5]: wkasekende. (2026, October 10). [Comment on "Mods - make Claude 10x more extensible" (#91870)](https://github.com/anthropics/claude-code/issues/91870#issuecomment-6100088556). GitHub. Verified accessible (GitHub API 200) 2026-10-15. (The 1 MB module file limit.)
[^6]: natsukium. (2026). [claude-code-figures-plugin](https://github.com/natsukium/claude-code-figures-plugin). GitHub. README, `vendor/mathjax.ts`, `hooks/renderers/` and `hooks/vendor/` read from the source tarball 2026-10-15; metadata via `ghp api` (7 stars, Apache-2.0, created 2026-10-02, pushed 2026-10-14). Directory listing: [claude-mods.com/claude-code-figures/](https://claude-mods.com/claude-code-figures/), WebFetch 2026-10-15.
[^7]: briangtn. (2026). [claude-gfm-render](https://github.com/briangtn/claude-gfm-render). GitHub. README read via `ghp api` 2026-10-15 (19 stars, MIT, created 2026-10-02, pushed 2026-10-05).
[^8]: dazebug. (2026). [mermaid-inline](https://github.com/dazebug/mermaid-inline). GitHub. README and `hooks/` read from the source tarball 2026-10-15; metadata via `ghp api` (0 stars, MIT, created 2026-10-03, pushed 2026-10-09). Directory listing: [claude-mods.com/mermaid-inline/](https://claude-mods.com/mermaid-inline/), WebFetch 2026-10-15.
[^9]: Anthropic. (2026). [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15; "as of v2.1.290". (Files, events, methods, render sites, elements, limits table.)
[^10]: Anthropic. (2026). [claude-code: mods/diff](https://github.com/anthropics/claude-code/tree/main/mods/diff). GitHub. `README.md` and `hooks/register.ts` (26,135 bytes) fetched raw 2026-10-15 (HTTP 200). (Multi-file hooks module; the pane's own `ui.scroll` handling.)
[^11]: Anthropic. (2026). [Draw in the interface with a mod](https://code.claude.com/docs/en/plugins/mods/interface.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Elements table, Link rules, keyboard and focus, pane placement, redraw coalescing, `$.store` races.)
[^12]: Anthropic. (2026). [Interface gallery for mods](https://code.claude.com/docs/en/plugins/mods/gallery.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (What `Markdown`, `Code`, `Link`, `Input`, `Svg` and `Image` draw.)
[^13]: xuanji86. (2026). [claude-mdview](https://github.com/xuanji86/claude-mdview). GitHub. README, `hooks/doc.ts` and `hooks/register.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (6 stars, 1 fork, MIT, created and pushed 2026-10-03).
[^14]: minhdevtree. (2026). [claude-lens](https://github.com/minhdevtree/claude-lens). GitHub. README, `bin/pdfpage.js` and `hooks/register.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (0 stars, MIT, created 2026-10-11, pushed 2026-10-12).
[^15]: xuanji86. (2026, October 3). [Comment on #91870](https://github.com/anthropics/claude-code/issues/91870#issuecomment-5965358060). GitHub. Verified accessible (GitHub API 200) 2026-10-15. (Long text blanks the site; iTerm2 chords; dock width.)
[^16]: abonckus. (2026). [claude-code-file-preview](https://github.com/abonckus/claude-code-file-preview). GitHub. README and `hooks/register.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (0 stars, MIT, created and pushed 2026-10-05).
[^17]: tzafrir. (2026, October 5). [Comment on #91870](https://github.com/anthropics/claude-code/issues/91870#issuecomment-6000029136). GitHub. Verified accessible (GitHub API 200) 2026-10-15. (`Input` is single-line.)
[^18]: Anthropic. (2026). [Fullscreen rendering](https://code.claude.com/docs/en/fullscreen.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Mouse support and selection.)
[^19]: richardkmichael. (2026, September 26). [Comment on #91870](https://github.com/anthropics/claude-code/issues/91870#issuecomment-5842961190). GitHub. Verified accessible (GitHub API 200) 2026-10-15. (A mod could not observe a selection in its pane.)
[^20]: Anthropic. (2026). [Environment variables](https://code.claude.com/docs/en/env-vars.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (`CLAUDE_CODE_TMUX_TRUECOLOR`, the 256-colour clamp under tmux.)
[^21]: davekiss. (2026). [md](https://github.com/davekiss/md). GitHub. README, `hooks/editor.tsx`, `hooks/register.tsx` and `hooks/blocks.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (0 stars, MIT, created 2026-10-03, pushed 2026-10-13).
[^22]: Anthropic. (2026). [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (`${CLAUDE_PLUGIN_DATA}` for installed dependencies.)
[^23]: zrdqns. (2026). [claude-code-converter](https://github.com/zrdqns/claude-code-converter). GitHub. README read via `ghp api` 2026-10-15 (0 stars, MIT, created and pushed 2026-10-08).
[^24]: deepskyblue86. (2026). [claude-markdown-mod](https://github.com/deepskyblue86/claude-markdown-mod). GitHub. README read from the source tarball 2026-10-15; metadata via `ghp api` (6 stars, MIT, created 2026-10-03, pushed 2026-10-04).
[^25]: Anthropic. (2026). [React to events with a mod](https://code.claude.com/docs/en/plugins/mods/events.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Holding a call with `$.ui.ask`.)
[^26]: JorgeRomero123. (2026). [claude-markdown-pane](https://github.com/JorgeRomero123/claude-markdown-pane). GitHub. README read via `ghp api` 2026-10-15 (0 stars, MIT, created and pushed 2026-10-07, from the search API).
[^27]: hamzafer. (2026). [claude-code-mods: md-preview](https://github.com/hamzafer/claude-code-mods/tree/main/mods/md-preview). GitHub. `docs/mods.md` and `mods/md-preview/hooks/` read from the source tarball 2026-10-15; repository metadata via `ghp api` (242 stars, 22 forks, MIT, pushed 2026-10-14).
[^28]: jkf87. (2026). [ide-mod](https://github.com/jkf87/ide-mod). GitHub. `bin/pdf-view.mjs`, `hooks/register.tsx` and `vendor/pdfjs/` read from the source tarball 2026-10-15; metadata via `ghp api` (7 stars, MIT, created 2026-10-06, pushed 2026-10-13).
[^29]: JAICHANGPARK. (2026). [html-preview](https://github.com/JAICHANGPARK/html-preview). GitHub. `hooks/register.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (0 stars, MIT, created and pushed 2026-10-02).
[^30]: Rocha101. (2026). [claude-code-glance](https://github.com/Rocha101/claude-code-glance). GitHub. `hooks/register.tsx` read from the source tarball 2026-10-15; metadata via `ghp api` (1 star, MIT, created and pushed 2026-10-02).
[^31]: zenbu-labs. (2026). [terminal-browser](https://github.com/zenbu-labs/terminal-browser). GitHub. Metadata via `ghp api` 2026-10-15 (3,871 stars, 190 forks, MIT, created 2026-07-06, pushed 2026-10-07).
[^32]: prithivrajmu. (2026). [claude-docs-viewer](https://github.com/prithivrajmu/claude-docs-viewer). GitHub. README read via `ghp api` 2026-10-15 (0 stars, no licence detected, created and pushed 2026-10-14, from the search API).
[^33]: GitHub. (2026). [Search API: topic:claude-mods](https://api.github.com/search/repositories?q=topic:claude-mods&per_page=100&sort=updated), plus searches for "claude mod markdown", "claude mod pdf" and "claude mod editor" in name and description. Read via `ghp api` 2026-10-15 (`total_count` 112, 34, 21 and 23).
[^34]: karanb192. (2026). [awesome-claude-code-mods: catalogue.md](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/catalogue.md). GitHub. Verified accessible (HTTP 200) 2026-10-15; "As of 2026-10-13, scanned against Claude Code 2.1.296: **3836 mods**". Site: [mods.aidojo.si](https://mods.aidojo.si/) (not re-fetched this run).
[^35]: Claude Mods. (2026). [Claude Mods directory](https://claude-mods.com/). Verified accessible (WebFetch) 2026-10-15; 211 mods, updated October 14, 2026.
[^36]: micromark. (2026). [micromark](https://github.com/micromark/micromark). GitHub. README read via `ghp api` 2026-10-15.
[^37]: markdown-it. (2026). [markdown-it](https://github.com/markdown-it/markdown-it). GitHub. README read via `ghp api` 2026-10-15.
[^38]: npm, Inc. (2026). npm registry metadata read 2026-10-15 (HTTP 200) for the latest versions of [turndown](https://registry.npmjs.org/turndown/latest), [markdown-it](https://registry.npmjs.org/markdown-it/latest), [micromark](https://registry.npmjs.org/micromark/latest), [marked](https://registry.npmjs.org/marked/latest), [parse5](https://registry.npmjs.org/parse5/latest), [htmlparser2](https://registry.npmjs.org/htmlparser2/latest), [node-html-markdown](https://registry.npmjs.org/node-html-markdown/latest), [mammoth](https://registry.npmjs.org/mammoth/latest), [@asciidoctor/core](https://registry.npmjs.org/@asciidoctor/core/latest), [papaparse](https://registry.npmjs.org/papaparse/latest), [fflate](https://registry.npmjs.org/fflate/latest), [pdfjs-dist](https://registry.npmjs.org/pdfjs-dist/latest), [yjs](https://registry.npmjs.org/yjs/latest), [@codemirror/state](https://registry.npmjs.org/@codemirror/state/latest), [prosemirror-model](https://registry.npmjs.org/prosemirror-model/latest), [lexical](https://registry.npmjs.org/lexical/latest), [@lexical/headless](https://registry.npmjs.org/@lexical/headless/latest), [@automerge/automerge](https://registry.npmjs.org/@automerge/automerge/latest), [@mozilla/readability](https://registry.npmjs.org/@mozilla/readability/latest) and [linkedom](https://registry.npmjs.org/linkedom/latest). (Version, `dist.unpackedSize`, dependencies, licence.)
[^39]: GitHub. (2026). Repository metadata and READMEs read via `ghp api` 2026-10-15 (stars, licence, last push, archived flag) for [markedjs/marked](https://github.com/markedjs/marked), [remarkjs/remark](https://github.com/remarkjs/remark), [micromark/micromark](https://github.com/micromark/micromark), [markdown-it/markdown-it](https://github.com/markdown-it/markdown-it), [inikulin/parse5](https://github.com/inikulin/parse5), [fb55/htmlparser2](https://github.com/fb55/htmlparser2), [mozilla/pdf.js](https://github.com/mozilla/pdf.js), [ArtifexSoftware/mupdf](https://github.com/ArtifexSoftware/mupdf), [jgm/pandoc](https://github.com/jgm/pandoc), [mwilliamson/mammoth.js](https://github.com/mwilliamson/mammoth.js), [dolanmiu/docx](https://github.com/dolanmiu/docx), [microsoft/markitdown](https://github.com/microsoft/markitdown), [mholt/PapaParse](https://github.com/mholt/PapaParse), [101arrowz/fflate](https://github.com/101arrowz/fflate), [lukilabs/beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid), [AlexanderGrooff/mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii), [rasendubi/uniorg](https://github.com/rasendubi/uniorg), [jupyter/nbformat](https://github.com/jupyter/nbformat), [charmbracelet/glow](https://github.com/charmbracelet/glow), [swsnr/mdcat](https://github.com/swsnr/mdcat), [Textualize/frogmouth](https://github.com/Textualize/frogmouth), [Textualize/rich](https://github.com/Textualize/rich), [sharkdp/bat](https://github.com/sharkdp/bat), [dsanson/termpdf.py](https://github.com/dsanson/termpdf.py), [ProseMirror/prosemirror-model](https://github.com/ProseMirror/prosemirror-model), [codemirror/state](https://github.com/codemirror/state), [facebook/lexical](https://github.com/facebook/lexical), [automerge/automerge](https://github.com/automerge/automerge) and [yjs/yjs](https://github.com/yjs/yjs). Release readings: pdf.js v6.4.299 (2026-10-03), pandoc 3.12.1 (2026-10-08).
[^40]: inikulin. (2026). [parse5](https://github.com/inikulin/parse5). GitHub. README read via `ghp api` 2026-10-15.
[^41]: fb55. (2026). [htmlparser2](https://github.com/fb55/htmlparser2). GitHub. README read via `ghp api` 2026-10-15.
[^42]: Mozilla. (2026). [Readability.js](https://github.com/mozilla/readability). GitHub. README read via `ghp api` 2026-10-15 (11,501 stars, Apache-2.0, pushed 2026-08-04).
[^43]: mixmark-io. (2026). [turndown](https://github.com/mixmark-io/turndown). GitHub. README read via `ghp api` 2026-10-15 (11,473 stars, MIT, pushed 2026-09-03).
[^44]: crosstype. (2025). [node-html-markdown](https://github.com/crosstype/node-html-markdown). GitHub. README read via `ghp api` 2026-10-15 (267 stars, no licence detected by GitHub, MIT on npm, pushed 2025-11-14).
[^45]: Mozilla. (2026). [PDF.js](https://github.com/mozilla/pdf.js). GitHub. README read via `ghp api` 2026-10-15.
[^46]: Debian. (2026). [pdftotext(1)](https://manpages.debian.org/bookworm/poppler-utils/pdftotext.1.en.html). Debian Manpages. Verified accessible (HTTP 200) 2026-10-15. (Foundational tool page; poppler-utils.)
[^47]: Debian. (2026). [pdftoppm(1)](https://manpages.debian.org/bookworm/poppler-utils/pdftoppm.1.en.html). Debian Manpages. Verified accessible (HTTP 200) 2026-10-15.
[^48]: Artifex. (2026). [mutool draw](https://mupdf.readthedocs.io/en/latest/tools/mutool-draw.html). MuPDF 1.28.5 documentation. Verified accessible (HTTP 200) 2026-10-15.
[^49]: MacFarlane, J. (2026). [Pandoc User's Guide](https://pandoc.org/MANUAL.html). pandoc.org. Verified accessible (HTTP 200) 2026-10-15. (Input and output format lists.)
[^50]: Williamson, M. (2026). [mammoth.js](https://github.com/mwilliamson/mammoth.js). GitHub. README read via `ghp api` 2026-10-15.
[^51]: FuturePress. (2026). [epub.js](https://github.com/futurepress/epub.js). GitHub. README read via `ghp api` 2026-10-15 (6,963 stars, licence reported "Other", pushed 2026-03-24).
[^52]: Jupyter. (2026). [The Notebook file format](https://nbformat.readthedocs.io/en/latest/format_description.html). nbformat documentation. Verified accessible (HTTP 200) 2026-10-15.
[^53]: Asciidoctor. (2026). [asciidoctor.js](https://github.com/asciidoctor/asciidoctor.js). GitHub. README read via `ghp api` 2026-10-15 (805 stars, MIT, pushed 2026-10-05).
[^54]: Anthropic. (2026). [Claude Code on desktop](https://code.claude.com/docs/en/desktop.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (The Browser pane opens HTML and PDF files.)
[^55]: Charm. (2026). [glow](https://github.com/charmbracelet/glow). GitHub. README read via `ghp api` 2026-10-15.
[^56]: swsnr. (2026). [mdcat](https://github.com/swsnr/mdcat). GitHub. README read via `ghp api` 2026-10-15 (2,410 stars, archived, pushed 2026-06-19).
[^57]: Textualize. (2024). [frogmouth](https://github.com/Textualize/frogmouth). GitHub. README read via `ghp api` 2026-10-15.
[^58]: Textualize. (2026). [Rich: Markdown](https://rich.readthedocs.io/en/stable/markdown.html). Rich 14.1.0 documentation. Verified accessible (HTTP 200) 2026-10-15.
[^59]: sharkdp. (2026). [bat](https://github.com/sharkdp/bat). GitHub. README read via `ghp api` 2026-10-15.
[^60]: Sanson, D. (2023). [termpdf.py](https://github.com/dsanson/termpdf.py). GitHub. README read via `ghp api` 2026-10-15 (609 stars, MIT, pushed 2023-10-28; background only).
[^61]: Dickey, T. E. (2026). [Lynx Users Guide](https://lynx.invisible-island.net/lynx_help/Lynx_users_guide.html). invisible-island.net. Verified accessible (HTTP 200, gzip) 2026-10-15. (Foundational tool page.)
[^62]: Haverbeke, M. (2026). [CodeMirror System Guide](https://codemirror.net/docs/guide/). codemirror.net. Verified accessible (WebFetch) 2026-10-15; and [codemirror/state README](https://github.com/codemirror/state) via `ghp api` 2026-10-15 (archived; moved notice).
[^63]: Haverbeke, M. (2026). [ProseMirror Guide](https://prosemirror.net/docs/guide/). prosemirror.net. Verified accessible (WebFetch) 2026-10-15; and [prosemirror-model README](https://github.com/ProseMirror/prosemirror-model) via `ghp api` 2026-10-15 (archived; moved notice).
[^64]: Yjs. (2026). [Y.Text](https://docs.yjs.dev/api/shared-types/y.text). Yjs Docs. Verified accessible (WebFetch) 2026-10-15.
[^65]: Automerge. (2026). [automerge](https://github.com/automerge/automerge). GitHub. README read via `ghp api` 2026-10-15. The page [automerge.org/docs/library_initialization/](https://automerge.org/docs/library_initialization/) returned HTTP 404 (also at `/docs/reference/library_initialization/`), 2026-10-15.
[^66]: Meta. (2026). [@lexical/headless](https://lexical.dev/docs/packages/lexical-headless). Lexical documentation. Verified accessible (WebFetch) 2026-10-15.
[^67]: Anthropic. (2026). [Test a mod](https://code.claude.com/docs/en/plugins/mods/test.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15.
[^68]: mpolatcan. (2026, September 15). [Comment on #91870](https://github.com/anthropics/claude-code/issues/91870#issuecomment-5685168776). GitHub. Verified accessible (GitHub API 200) 2026-10-15. (`ui.scroll` refused at load on 2.1.271; superseded.)

## Provenance ledger

URLs are the footnote URLs. "Live" is the fetch result this run (2026-10-15 UTC).
"API value" marks a GitHub or npm API field, quoted as field and value. Quotes drop Markdown
emphasis marks and link targets from the source text.

| # | Claim | Source | Verbatim quote | Verdict | Live? |
|---|---|---|---|---|---|
| 1-2 | Hooks runtime has no eval, no WebAssembly; it has no DOM or Node | [^1] | "No code generation either: `eval` and `new Function` over a string throw, and there is no `WebAssembly`"; "these and no others (no DOM, no Node)" | SUPPORTED | Yes, HTTP 200 |
| 3 | Web APIs available in the module | [^2] | "Standard JavaScript and web APIs such as `URL`, `TextEncoder`, `AbortController`, and `crypto.subtle` are available." | SUPPORTED | Yes, HTTP 200 |
| 4 | `TextDecoder` is a declared global | [^1] | "var TextDecoder: { prototype: TextDecoder; new (label?: string): TextDecoder }" | SUPPORTED | Yes, HTTP 200 |
| 5 | Only bare import is `claude-code` | [^3] | "The one bare import allowed is `claude-code`, for types and a few helpers." | SUPPORTED | Yes, HTTP 200 |
| 6 | No dynamic import | [^3] | "a dynamic import(); a hooks module imports its own files with an import declaration" | SUPPORTED | Yes, HTTP 200 |
| 7 | `$` to an imported function fails validation | [^3] | "a function you import from another of your files fails validation" | SUPPORTED | Yes, HTTP 200 |
| 8 | 2.1.299 allows `$` to imported declarations | [^4] | "Fixed mods loaded from source files being refused when a hook hands `$` to a function declaration imported from another file of the mod" | SUPPORTED | Yes, HTTP 200 |
| 9 | Module file over 1 MB not read | [^5] | "A module file over 1 MB is not read." | PLAUSIBLE (practitioner report, corroborated by rows 10 and 11) | Yes, GitHub API 200 |
| 10 | figures splits its bundle under 1 MiB | [^6] | "A hooks module imports no file over 1 MiB and cannot import modules at run time, so the build splits the bundle into chunks" | SUPPORTED | Yes, tarball 200 |
| 11 | ELK is 1.6 MB, over the cap | [^7] | "a hooks module may not import a file over 1 MiB and has no `eval`, while the ELK layout engine the SVG needs weighs 1.6 MB" | SUPPORTED | Yes, GitHub API 200 |
| 12 | Nested-scope limit per file | [^9] | "nested inside one another in one file of a hooks module" | SUPPORTED | Yes, HTTP 200 |
| 13 | Only third-party code is built (figures) | [^6] | "Claude Code loads `hooks/` as TypeScript source, so only third-party code is built." | SUPPORTED | Yes, tarball 200 |
| 14 | MathJax runs through `liteAdaptor` | [^6] | "import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'" | SUPPORTED | Yes, tarball 200 |
| 15 | Vendored Mermaid ASCII renderer is 84 KB | [^7] | "the ASCII renderer alone (84 KB), imported by the mod." | SUPPORTED | Yes, GitHub API 200 |
| 16 | mermaid-inline uses a `node` process | [^8] | "They run as a separate `node` process because Claude Code runs the hooks module itself with no Node.js APIs or WebAssembly" | SUPPORTED | Yes, tarball 200 |
| 17 | Built-in `/diff` imports sibling files | [^10] | "import Views from './views'" | SUPPORTED | Yes, HTTP 200 |
| 18 | Tests import sibling helpers | [^67] | "A test file can import your mod's own files and sibling `.ts` helpers" | SUPPORTED | Yes, HTTP 200 |
| 19 | `Markdown` takes `text`, needs `key` for links | [^11] | "`Markdown` takes its content in a `text` prop, not in `children`, and needs a `key` when you pass `onLinkPress`." | SUPPORTED | Yes, HTTP 200 |
| 20 | `Markdown` props | [^9] | "`text`, `key`, `dimColor`, `onLinkPress`, `pressableLinks`" | SUPPORTED | Yes, HTTP 200 |
| 21 | `Markdown` renders links, tables, fences | [^1] | "its own renderer, links, tables, fences." | SUPPORTED | Yes, HTTP 200 |
| 22-23 | `Markdown` text cap; only `https:`, `http:`, `file:` links clickable | [^1] | "At most 10000 characters, tab and newline its only control characters"; "a link whose scheme is not `https:`, `http:` or `file:` draws as text, never clickable." | SUPPORTED | Yes, HTTP 200 |
| 24-25 | Link presses need fullscreen; `pressableLinks` bound | [^1] | "A press is a plain single click where the surface reports clicks (the fullscreen terminal)"; "At most 256 entries of at most 2048 characters" | SUPPORTED | Yes, HTTP 200 |
| 26 | Headings, code, quotes as drawn | [^12] | "A heading draws in bold without its `#` marks." | SUPPORTED | Yes, HTTP 200 |
| 27-28 | Task lists render (2.1.149); strikethrough fixed (2.1.186) | [^4] | "Markdown output now renders GFM task list checkboxes"; "Fixed `~~strikethrough~~` showing literal tildes in assistant messages" | SUPPORTED (conflicts with row 30) | Yes, HTTP 200 |
| 29 | Tables cut at 200 rows (2.1.208) | [^4] | "tables over 200 rows show the first 200" | SUPPORTED | Yes, HTTP 200 |
| 30 | GFM extras raw in the terminal | [^7] | "The terminal shows them as raw text." | CONTRADICTED for task lists and strikethrough by rows 27 and 28; PLAUSIBLE for alerts and Mermaid | Yes, GitHub API 200 |
| 31 | Footnotes, math, raw HTML left native | [^7] | "Footnotes, emoji shortcodes, `#123` / `@user` autolinks, `$math$`, raw HTML" | SUPPORTED | Yes, GitHub API 200 |
| 32 | Math and Mermaid show as written | [^13] | "Math, mermaid and heading sizes show as written." | SUPPORTED | Yes, tarball 200 |
| 33 | Image links drawn as labels | [^14] | "labelled the way Claude Code draws the link: `revenue by month (chart.png)`" | SUPPORTED | Yes, tarball 200 |
| 34 | `Code` props | [^9] | "`source`, `language`, `path`, `startLine`, `format`, `wrap`" | SUPPORTED | Yes, HTTP 200 |
| 35 | `Code` text cap | [^1] | "At most 10000 characters; tab and newline are the only control characters it may hold." | SUPPORTED | Yes, HTTP 200 |
| 36 | `Code` colours are the engine's | [^1] | "the colour on screen is the engine's, never the plugin's." | SUPPORTED | Yes, HTTP 200 |
| 37 | `Code` draws diffs | [^12] | "With `format: 'diff'`, `source` is one or more unified diff hunks" | SUPPORTED | Yes, HTTP 200 |
| 38 | `Text` is Ink's style props | [^1] | "the color and style props of Ink's Text a tree may set." | SUPPORTED | Yes, HTTP 200 |
| 39 | `Text` typography (2.1.299) | [^4] | "Added `size`, `weight`, `mono` and `tabular` to a mod's `Text`" | SUPPORTED | Yes, HTTP 200 |
| 40 | `Text` `dir` (2.1.300) | [^4] | "Added a `dir` prop on a mod's `Text` for right-to-left text" | SUPPORTED | Yes, HTTP 200 |
| 41 | Hover reveal without a hook | [^1] | "To reveal on hover, draw the Box `display: \"none\"` with `hover: { display: \"flex\" }`" | SUPPORTED | Yes, HTTP 200 |
| 42 | mdview reveals its edit mark on hover | [^13] | "display=\"none\" hover={{ display: 'flex' }}" | SUPPORTED | Yes, tarball 200 |
| 43 | `Link` is OSC 8 | [^1] | "an OSC 8 span on the terminal (else its text then the URL in dim)" | SUPPORTED | Yes, HTTP 200 |
| 44 | `Link` rules do not apply in the terminal | [^11] | "In the terminal, these requirements don't apply." | CONTRADICTED by row 45 | Yes, HTTP 200 |
| 45 | A bad `href` refuses the tree | [^1] | "anything else refuses the tree the Link is in." | SUPPORTED (conflicts with row 44) | Yes, HTTP 200 |
| 46 | Long `href` blocks the tree | [^9] | "A longer `href` keeps the whole tree from drawing." | SUPPORTED | Yes, HTTP 200 |
| 47 | First 100,000 characters drawn | [^9] | "The first 100,000 characters are drawn" | SUPPORTED (conflicts with row 49) | Yes, HTTP 200 |
| 48 | Tree bounds | [^1] | "20,000 nodes, 32 deep, 100,000 characters serialized" | SUPPORTED | Yes, HTTP 200 |
| 49 | Over-budget tree refused whole | [^15] | "A text over 10,000 characters (or a tree over 100,000) gets the whole tree refused and the engine draws its own." | PLAUSIBLE (practitioner report; conflicts with row 47) | Yes, GitHub API 200 |
| 50 | Invalid tree falls back to the engine | [^11] | "Claude Code draws its own version of the site." | SUPPORTED | Yes, HTTP 200 |
| 51 | mdview element cap | [^13] | "const TEXT_MAX = 9_000 // a Markdown or Code element takes at most 10,000 characters" | SUPPORTED | Yes, tarball 200 |
| 52 | mdview splits long files | [^13] | "One markdown element holds at most 10,000 characters and a pane about 100,000, so long files come in parts." | SUPPORTED | Yes, tarball 200 |
| 53 | file-preview caps | [^16] | "Each block of plain text in the pane is capped at 10,000 characters and a markdown file at 60,000" | SUPPORTED | Yes, tarball 200 |
| 54 | davekiss/md slices blocks | [^21] | "b.text.slice(0, 9900)" | SUPPORTED | Yes, tarball 200 |
| 55 | `Image` fails in tmux | [^12] | "a session running inside tmux or screen, in any terminal, kitty and Ghostty included." | SUPPORTED | Yes, HTTP 200 |
| 56-57 | Truecolor in tmux is opt-in; 256-colour clamp under tmux | [^20] | "to allow 24-bit truecolor output inside tmux."; "By default, Claude Code clamps to 256 colors when `$TMUX` is set" | SUPPORTED | Yes, HTTP 200 |
| 58 | Block-picture palette | [^14] | "Half-block and quadrant thumbnails share a palette of 1024 color pairs per frame" | PLAUSIBLE (mod author) | Yes, tarball 200 |
| 59 | `Svg` alone opens empty in the terminal | [^12] | "In the terminal, a pane that returns only an `Svg` opens empty." | SUPPORTED | Yes, HTTP 200 |
| 60-61 | `Input` is one line; `Input` takes all printable keys | [^1] | "every surface's one-line text field"; "while it has focus every printable key reaches it alone and Esc returns them" | SUPPORTED | Yes, HTTP 200 |
| 62 | `Input` submits on Enter | [^12] | "An `Input` is a one-line text field that runs `onSubmit` when the user presses Enter" | SUPPORTED | Yes, HTTP 200 |
| 63 | Multi-line `Input` requested | [^17] | "A multi-line field would let an answer like a log stay in the pane, instead of going through the prompt box." | SUPPORTED | Yes, GitHub API 200 |
| 64 | Desktop paste loses line breaks | [^17] | "On desktop, a multi-line paste arrives with its line breaks turned into spaces." | PLAUSIBLE (report) | Yes, GitHub API 200 |
| 65 | `Select` props | [^9] | "`key`, `label`, `options`, `value`, `onSelect`, `autoFocus`" | SUPPORTED | Yes, HTTP 200 |
| 66 | `Button` hotkey | [^11] | "give it a `hotkey` of one digit or one lowercase letter" | SUPPORTED | Yes, HTTP 200 |
| 67 | `Button` action | [^9] | "`action` names one of Claude Code's own" | SUPPORTED | Yes, HTTP 200 |
| 68 | The mod never reads keys | [^11] | "Your mod never reads the keyboard itself." | SUPPORTED | Yes, HTTP 200 |
| 69 | Tab and arrows reserved | [^11] | "A mod can't bind Tab or the arrow keys to anything else" | SUPPORTED | Yes, HTTP 200 |
| 70 | Focus only over an empty prompt | [^11] | "Claude Code grants `focus: true` only while the prompt is empty and nothing else has keyboard focus." | SUPPORTED | Yes, HTTP 200 |
| 71 | iTerm2 drops ctrl+x chords | [^15] | "the only ways to hand a pane the keys are a click or `ui.open({ focus })`." | PLAUSIBLE (report) | Yes, GitHub API 200 |
| 72 | Hotkeys are letters or digits | [^16] | "A pane button's hotkey must be one letter or digit, so search cannot be `/`." | SUPPORTED | Yes, tarball 200 |
| 73 | Unasked pane width rule | [^11] | "After the user has opened that pane once themselves, 110 columns is enough." | SUPPORTED | Yes, HTTP 200 |
| 74 | Docked pane height | [^9] | "`e.props.scroll.bodyRows` is the number of rows the pane has for your tree" | SUPPORTED | Yes, HTTP 200 |
| 75 | Tall trees scroll whole | [^9] | "A tree taller than the pane scrolls as a whole." | SUPPORTED | Yes, HTTP 200 |
| 76 | Dragged dock ignores `columns` | [^15] | "`ui.open({ columns })` is ignored once the person has dragged the dock" | PLAUSIBLE (report) | Yes, GitHub API 200 |
| 77-78 | `ui.scroll` offset is rewritable; a hook can keep the window | [^1] | "`offset` is the hook's to rewrite; nothing moved yet."; "A hook kept the window (no `next`)" | SUPPORTED | Yes, HTTP 200 |
| 79 | Hooks can scroll their own lists | [^1] | "A hook pinning a list over rows it scrolls itself" | SUPPORTED | Yes, HTTP 200 |
| 80 | `$.ui.scroll` targets elements | [^1] | "never a row number, always a thing drawn somewhere." | SUPPORTED | Yes, HTTP 200 |
| 81-82 | `/diff` answers `ui.scroll`; `/diff` keeps the engine window still | [^10] | "(the plugin answers the pane's `ui.scroll` itself)"; "and keeps the engine's window still." | SUPPORTED | Yes, HTTP 200 |
| 83 | `/diff` hook registration | [^10] | "on('ui.scroll', { requestId: Names.PANE_ID }" | SUPPORTED | Yes, HTTP 200 |
| 84 | Early `ui.scroll` refusal (superseded) | [^68] | "`ui.scroll` is declared in 2.1.271, but the engine refuses a hook on it at load" | SUPPORTED as a 2.1.271 report; superseded by row 83 | Yes, GitHub API 200 |
| 85 | Self-started scrolls bypass the hook | [^16] | "a scroll this mod starts may not reach its own ui.scroll hook" | PLAUSIBLE (code comment) | Yes, tarball 200 |
| 86 | Fullscreen adds the mouse | [^18] | "keeps memory usage flat in long conversations, and adds mouse support." | SUPPORTED | Yes, HTTP 200 |
| 87 | Selection copies on release | [^18] | "Selected text copies to your clipboard automatically on mouse release." | SUPPORTED | Yes, HTTP 200 |
| 88 | Clicks need fullscreen (mdview) | [^13] | "On the main screen, use `/md`." | SUPPORTED | Yes, tarball 200 |
| 89 | Clicks need fullscreen (file-preview) | [^16] | "A plain click only reaches the mod in Claude Code's fullscreen terminal layout." | SUPPORTED | Yes, tarball 200 |
| 90 | `$.ui.selection()` (2.1.288) | [^4] | "returns the text you last selected in fullscreen mode" | SUPPORTED | Yes, HTTP 200 |
| 91 | `selection` in the reference | [^9] | "`ask`, `copy`, `selection`, `blit`" | SUPPORTED | Yes, HTTP 200 |
| 92 | Pane selection was requested | [^19] | "A `ui.selection` event, at least for selections inside the mod's own pane." | SUPPORTED | Yes, GitHub API 200 |
| 93 | `Client` time per call | [^1] | "Runs on the drawing thread, a second per call at most" | SUPPORTED | Yes, HTTP 200 |
| 94 | `Client` element table | [^1] | "less `Client` (none nests), `Raster` and `Image`." | SUPPORTED | Yes, HTTP 200 |
| 95 | `Client` keys need a click | [^1] | "reached while a click has given it the focus; Escape returns that." | SUPPORTED | Yes, HTTP 200 |
| 96 | `Client` key names | [^1] | "`backspace`, `delete`, `pageup`, `home`, ...) or the character typed." | SUPPORTED | Yes, HTTP 200 |
| 97 | `Client` post bound | [^1] | "At most 20,000 values, 32 deep, 100,000 characters, or the post is not sent." | SUPPORTED | Yes, HTTP 200 |
| 98 | `Client` props bound | [^1] | "Bounded as a tree's text is; not a channel for closures." | SUPPORTED | Yes, HTTP 200 |
| 99 | davekiss/md types in the pane | [^21] | "In the text, type to edit. Click to place the caret and drag to select." | SUPPORTED | Yes, tarball 200 |
| 100 | Undo key choice | [^21] | "Undo (ctrl+z suspends Claude Code)" | SUPPORTED | Yes, tarball 200 |
| 101 | Editor surface draws caret and selection | [^21] | "It draws the caret and the selection the hooks module" | SUPPORTED | Yes, tarball 200 |
| 102 | Undo stack of 200 | [^21] | "if (undoStack.length > 200) undoStack.shift()" | SUPPORTED | Yes, tarball 200 |
| 103 | Every edit writes the file | [^21] | "await $.fs.write(doc.path, lines.join('\n') + '\n')" | SUPPORTED | Yes, tarball 200 |
| 104 | Editor mounted as a `Client` | [^21] | "<Client key=\"editor\" module=\"./editor.tsx\"" | SUPPORTED | Yes, tarball 200 |
| 105 | Notes anchor to quoted text | [^21] | "Notes are anchored to the text they quote." | SUPPORTED | Yes, tarball 200 |
| 106 | `$.fs.read` 4 MiB | [^1] | "Rejects when missing, or over 4 MiB" | SUPPORTED | Yes, HTTP 200 |
| 107 | `$.fs.write` not atomic | [^9] | "`write` isn't atomic: it replaces the file's content in place" | SUPPORTED | Yes, HTTP 200 |
| 108-110 | `$.process.run` takes argv, no shell; one-shot output | [^1] | "Runs a command on the host by its argument vector (no shell)"; "One shot: the whole output is read" | SUPPORTED | Yes, HTTP 200 |
| 109 | `$.process.run` timeout | [^9] | "30 seconds by default, 10 minutes at most" | SUPPORTED | Yes, HTTP 200 |
| 111 | Git hooks off | [^1] | "Git runs with repo hooks off." | SUPPORTED | Yes, HTTP 200 |
| 112 | Text stdout, cut at a limit | [^1] | "as text, cut at the output limit." | SUPPORTED | Yes, HTTP 200 |
| 113 | Text stdin | [^1] | "Text written to the child's standard input, then closed." | SUPPORTED | Yes, HTTP 200 |
| 114 | `$.store` size | [^9] | "4 MiB of JSON in total" | SUPPORTED | Yes, HTTP 200 |
| 115 | `$.store` races | [^11] | "A `get` followed by a `set` isn't atomic." | SUPPORTED | Yes, HTTP 200 |
| 116 | Plugin data directory | [^22] | "Installed dependencies such as `node_modules`, generated code, and caches" | SUPPORTED | Yes, HTTP 200 |
| 117 | npm packages installed with the plugin | [^8] | "Claude Code downloads the npm packages pinned in `package-lock.json`" | UNVERIFIABLE from Anthropic docs read | Yes, tarball 200 |
| 118 | Tool row rewrite leaves the result | [^1] | "The stored result is untouched." | SUPPORTED | Yes, HTTP 200 |
| 119 | Reads fold into a group | [^1] | "A run of tool calls the transcript folds into one count line" | SUPPORTED | Yes, HTTP 200 |
| 120 | lens draws under the read group | [^14] | "Under the \"Read 1 file\" row" | SUPPORTED | Yes, tarball 200 |
| 121 | converter swaps what Claude reads | [^23] | "the mod converts it and hands over the Markdown in its place." | SUPPORTED | Yes, GitHub API 200 |
| 122 | Streamed replies cannot be restyled | [^24] | "A mod can't change the streamed text" | SUPPORTED | Yes, tarball 200 |
| 123 | Redrawn replies lose the bullet | [^16] | "Replies that mention an existing file are redrawn by the mod and lose their leading bullet." | SUPPORTED | Yes, tarball 200 |
| 124 | Long reply blocks left native | [^7] | "A single reply block over 10,000 characters" | SUPPORTED | Yes, GitHub API 200 |
| 125 | Row redraw collisions | [^14] | "keeps every mod listed after it from drawing on that row." | SUPPORTED | Yes, tarball 200 |
| 126 | `immediate` commands | [^2] | "To let the command run while Claude is working, add `immediate: true` to the registration." | SUPPORTED | Yes, HTTP 200 |
| 127 | Name rule | [^9] | "Letters, digits, `_`, and `-`, up to 64 characters" | SUPPORTED | Yes, HTTP 200 |
| 128-129 | `asUser`; submit waits for idle | [^2] | "To send it as the user's own words, without that sentence, add `asUser: true`."; "The call waits until the session is idle and then starts a new turn." | SUPPORTED | Yes, HTTP 200 |
| 130 | `$.prompt.fill` modes | [^1] | "`replace` (the default) over it, `append` after it, `insert` at the cursor." | SUPPORTED | Yes, HTTP 200 |
| 131-132 | `$.ui.ask` options; `$.ui.ask` rejects | [^1] | "@param options 2-4 option labels"; "Rejects when dismissed, and in a `-p` run (no one to ask)." | SUPPORTED | Yes, HTTP 200 |
| 133 | Wait inside `$.ui.ask` | [^25] | "Keep the wait inside a mods API call such as `$.ui.ask`" | SUPPORTED | Yes, HTTP 200 |
| 134 | `$.ui.notify` (2.1.295) | [^4] | "Added `$.ui.notify` for mods" | SUPPORTED | Yes, HTTP 200 |
| 135 | Autocomplete does not block | [^9] | "Claude Code doesn't wait for the hook: its own autocomplete rows show first." | SUPPORTED | Yes, HTTP 200 |
| 136 | Tool naming | [^2] | "under a longer name made of `mcp__`, your plugin's name, two underscores, and the name you registered." | SUPPORTED | Yes, HTTP 200 |
| 137 | mdview registers `show` | [^13] | "Open a local file in the mdview side pane for the person to read" | SUPPORTED | Yes, tarball 200 |
| 138 | mdview point-to-edit | [^13] | "$.prompt.submit({ text, asUser: true })" | SUPPORTED | Yes, tarball 200 |
| 139 | mdview polls every 1.5 s | [^13] | "$.clock.every(1_500" | SUPPORTED | Yes, tarball 200 |
| 140 | Redraw throttle | [^9] | "Throttled to 10 a second, or 30 in the terminal for the visible pane" | SUPPORTED | Yes, HTTP 200 |
| 141 | Blit rate | [^1] | "up to 120 a second taken, some sixty shown" | SUPPORTED | Yes, HTTP 200 |
| 142 | Hook time limit | [^9] | "10 seconds, or 50 milliseconds for a `prompt.edit` hook" | SUPPORTED | Yes, HTTP 200 |
| 143 | Redraw stall fix (2.1.290) | [^4] | "Fixed plugin hooks stalling each redraw when a mod draws a long multi-line text holding non-Latin characters" | SUPPORTED | Yes, HTTP 200 |
| 144 | Inline pane loop fix (2.1.290) | [^4] | "Fixed a mod's inline pane being redrawn without end" | SUPPORTED | Yes, HTTP 200 |
| 145 | markdown-pane cut | [^26] | "Files longer than 90,000 characters are cut, with a note." | SUPPORTED | Yes, GitHub API 200 |
| 146 | md-preview renderer ladder | [^27] | "GitHub's own renderer through `gh api /markdown`" | SUPPORTED | Yes, tarball 200 |
| 147 | md-preview fails in tmux | [^27] | "It does not work through tmux." | SUPPORTED | Yes, tarball 200 |
| 148 | md-preview image parts | [^27] | "const PART_ROWS = 250 // an Image is at most 255 rows" | SUPPORTED | Yes, tarball 200 |
| 149 | md-preview privacy | [^27] | "the file's text goes to GitHub's API under your own `gh` login" | SUPPORTED | Yes, tarball 200 |
| 150 | file-preview Mermaid route | [^16] | "Drawn as box-drawing text by" | SUPPORTED | Yes, tarball 200 |
| 151 | ide-mod disables pdf.js eval | [^28] | "isEvalSupported: false" | SUPPORTED | Yes, tarball 200 |
| 152 | ide-mod stubs DOM classes | [^28] | "['DOMMatrix', StubMatrix], ['ImageData', class {}], ['Path2D', class {}]" | SUPPORTED | Yes, tarball 200 |
| 153 | ide-mod picks a helper script | [^28] | "const script = isPdf(args[1] ?? '') ? 'pdf-view.mjs' : 'rhwp-view.mjs'" | SUPPORTED | Yes, tarball 200 |
| 154 | pdf.js worker over the cap | [^28] | `pdf.worker.mjs` 2,139,222 bytes; `pdf.mjs` 976,824 bytes (measured with `ls -la`) | SUPPORTED (measured) | Yes, tarball 200 |
| 155 | lens Linux converters | [^14] | "PDF: `pdftoppm` (poppler-utils) or `mutool` (mupdf-tools)" | SUPPORTED | Yes, tarball 200 |
| 156 | html-preview owns its scroll | [^29] | "on('ui.scroll', { component: 'Pane', requestId: PANE }" | SUPPORTED | Yes, tarball 200 |
| 157 | glance draws under tool groups | [^30] | "component: 'ToolGroup'" | SUPPORTED | Yes, tarball 200 |
| 158 | mermaid-inline pictures outside tmux | [^8] | "Ghostty, cmux or kitty, not inside tmux" | SUPPORTED | Yes, tarball 200 |
| 159 | figures ships MathJax | [^6] | "MathJax and its font ship inside the plugin, so math needs no TeX or Node.js install." | SUPPORTED | Yes, WebFetch |
| 160 | terminal-browser stars | [^31] | API value: stargazers_count 3871 | SUPPORTED | Yes, GitHub API 200 |
| 161 | docs-viewer formats | [^32] | "plus `.html` and `.txt` files." | SUPPORTED | Yes, GitHub API 200 |
| 162 | Topic size | [^33] | API value: total_count 112 | SUPPORTED | Yes, GitHub API 200 |
| 163 | Catalogue scan version | [^34] | "scanned against Claude Code 2.1.296" | SUPPORTED | Yes, HTTP 200 |
| 164 | Directory entries | [^35] | "Every mermaid block Claude writes, drawn as color box art in the transcript. Zero tokens." | SUPPORTED | Yes, WebFetch |
| 165 | No EPUB, DOCX or notebook viewer mod | [^33][^34][^35] | Absence over the three enumerated lists (grep of descriptions) | SUPPORTED as a bounded absence | Yes |
| 166 | micromark is smallest | [^36] | "The smallest CommonMark compliant markdown parser." | SUPPORTED | Yes, GitHub API 200 |
| 167 | micromark size | [^36] | "smallest CM parser at ±14kb" | SUPPORTED | Yes, GitHub API 200 |
| 168 | markdown-it safe | [^37] | "Safe by default." | SUPPORTED | Yes, GitHub API 200 |
| 169 | Package sizes and dependencies | [^38] | API values: markdown-it unpackedSize 1968876; turndown dependencies @mixmark-io/domino; @lexical/headless dependencies include happy-dom; @automerge/automerge unpackedSize 47529812 | SUPPORTED | Yes, HTTP 200 |
| 170 | Library stars and licences | [^39] | API values, e.g. pandoc license GPL-2.0, mupdf AGPL-3.0, uniorg GPL-3.0, marked "Other" | SUPPORTED | Yes, GitHub API 200 |
| 171 | parse5 | [^40] | "HTML parsing/serialization toolset for Node.js." | SUPPORTED | Yes, GitHub API 200 |
| 172 | htmlparser2 | [^41] | "provides a callback interface that allows consumption of documents with minimal allocations." | SUPPORTED | Yes, GitHub API 200 |
| 173 | Readability needs a DOM | [^42] | "you must create a new `Readability` object from a DOM document object" | SUPPORTED | Yes, GitHub API 200 |
| 174 | Readability in Node uses jsdom | [^42] | "Since Node.js does not come with its own DOM implementation" | SUPPORTED | Yes, GitHub API 200 |
| 175 | Readability and untrusted input | [^42] | "with untrusted input" | SUPPORTED | Yes, GitHub API 200 |
| 176 | turndown accepts DOM nodes | [^43] | "Turndown also accepts DOM nodes as input" | SUPPORTED | Yes, GitHub API 200 |
| 177 | node-html-markdown runs anywhere | [^44] | "compatible with both node and the browser." | SUPPORTED | Yes, GitHub API 200 |
| 178 | pdf.js is an HTML5 viewer | [^45] | "is a Portable Document Format (PDF) viewer that is built with HTML5." | SUPPORTED | Yes, GitHub API 200 |
| 179-180 | `pdftotext -layout`; `pdftotext -bbox-layout` | [^46] | "Maintain (as best as possible) the original physical layout of the text."; "Generate an XHTML file containing bounding box information for each block, line, and word in the file." | SUPPORTED | Yes, HTTP 200 |
| 181 | `pdftoppm -png` | [^47] | "Generates a PNG file instead a PPM file." | SUPPORTED | Yes, HTTP 200 |
| 182 | `mutool draw` formats | [^48] | "The supported output text formats are" | SUPPORTED | Yes, HTTP 200 |
| 183 | pandoc ANSI writer | [^49] | "for terminal viewing" | SUPPORTED | Yes, HTTP 200 |
| 184 | mammoth Markdown deprecated | [^50] | "Markdown support is deprecated." | SUPPORTED | Yes, GitHub API 200 |
| 185 | epub.js is browser-only | [^51] | "Epub.js is a JavaScript library for rendering ePub documents in the browser" | SUPPORTED | Yes, GitHub API 200 |
| 186 | EPUB is HTML inside | [^51] | "An unzipped EPUB3 is a collection of HTML5 files, CSS, images and other media" | SUPPORTED | Yes, GitHub API 200 |
| 187 | Notebook JSON schema | [^52] | "The official Jupyter Notebook format is defined with this JSON schema" | SUPPORTED | Yes, HTTP 200 |
| 188 | asciidoctor.js targets | [^53] | "It runs on Node.js ≥ 24 and in the browser." | SUPPORTED | Yes, GitHub API 200 |
| 189 | Desktop previews HTML and PDF | [^54] | "The Browser pane can also open static HTML files, PDFs, images, and videos from your project." | SUPPORTED | Yes, HTTP 200 |
| 190-192 | glow pager; frogmouth navigation | [^55][^57] | "Markdown files can be read with Glow's high-performance pager."; "There is a familiar browser-like navigation stack, history, bookmarks, and table of contents." | SUPPORTED | Yes, GitHub API 200 |
| 191 | mdcat unmaintained | [^56] | "This repository is no longer maintained." | SUPPORTED | Yes, GitHub API 200 |
| 193 | Rich renders Markdown | [^58] | "Rich can render Markdown to the console." | SUPPORTED | Yes, HTTP 200 |
| 194 | bat highlights only | [^59] | "clone with syntax highlighting and Git integration." | SUPPORTED | Yes, GitHub API 200 |
| 195 | termpdf.py needs kitty | [^60] | "A graphical pdf and epub viewer, written in python, that works inside" | SUPPORTED | Yes, GitHub API 200 |
| 196 | lynx dump | [^61] | "dumps the formatted output of the default document or one specified on the command line to standard out." | SUPPORTED | Yes, HTTP 200 |
| 197 | CodeMirror changes are values | [^62] | "Document changes are themselves values" | SUPPORTED | Yes, WebFetch |
| 198 | CodeMirror moved | [^62] | "This repository has moved to https://code.haverbeke.berlin/codemirror/state" | SUPPORTED | Yes, GitHub API 200 |
| 199 | ProseMirror view is the browser part | [^63] | "shows a given editor state as an editable element in the browser" | SUPPORTED | Yes, WebFetch |
| 200 | ProseMirror moved | [^63] | "This repository has moved to https://code.haverbeke.berlin/prosemirror/prosemirror-model" | SUPPORTED | Yes, GitHub API 200 |
| 201 | Yjs Y.Text | [^64] | "The Text-Delta is equivalent to Quills' Delta format." | SUPPORTED | Yes, WebFetch |
| 202 | Automerge is WebAssembly | [^65] | "the core Rust library which is compiled to WebAssembly and exposed in JavaScript" | SUPPORTED | Yes, GitHub API 200 |
| 203 | Automerge initialisation page | [^65] | No text: HTTP 404 on two URLs | UNVERIFIABLE (page missing; README used) | No, HTTP 404 |
| 204 | Lexical headless claim | [^66] | "one that does not rely on DOM, e.g. for Node.js environment." | SUPPORTED (conflicts with its npm dependency on happy-dom, row 169) | Yes, WebFetch |
| 205 | Trust the generated types | [^9] | "When the two disagree, trust" | SUPPORTED | Yes, HTTP 200 |
| 206 | Types file version | [^1] | "Written by Claude Code 2.1.277." | SUPPORTED | Yes, HTTP 200 |

## Appendix: Research Prompt

**Registry ID:** none (delegated researcher leaf on a Linux development host; no ai-core DB on this host)
**Model:** `us.anthropic.claude-opus-5-5[1m]` (Claude Code Agent tool, researcher persona, effort high)
**Date:** 2026-10-14

```text
Leg DED-research-leg-tnah (parent DED-research-doc-editor-uhke, epic DED-epic-doc-editor-view-edit-b3p).
Objective: how Markdown, HTML, PDF and other doc formats can be rendered, navigated and edited in a
Claude Code mod; the API's permits and limits; every open-source doc or browser mod (code read); the
terminal rendering route per format. Questions: API contract, existing mods, routes per format,
editing and DOM-free cores, terminal prior art, performance. Tables (a) to (d). Rules: extend the
seed docs; primary sources; cite only URLs fetched this run; tier tags, footnotes, ledger; no
installs, builds, tests or launches; write only this file; commit, push, open a PR, do not merge.
(The brief also carried the founding-ask carrier, the CoVe grounding block, the scope notes, the
destructive-operation floor and the commit trailer block.)
```
