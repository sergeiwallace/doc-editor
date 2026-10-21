---
title: "Phase 0 spike: what Claude Code 2.1.306 draws, delivers and loads for doc-editor"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods, spike]
status: complete
source: "claude-opus-5-5-2026-10-21"
task: DED-t-0-1-spike-five-qexn
parent_task: DED-epic-doc-editor-view-edit-b3p
---

# Phase 0 spike: what Claude Code 2.1.306 draws, delivers and loads for doc-editor

Claude Code version for every test below: `claude --version` printed `2.1.306 (Claude Code)` at 2026-10-21T11:00Z. Every screen test ran on a Linux development host, inside tmux 3.7c, in a 120 by 50 window.

Every unknown T-0.1 names has an answer. None is unanswerable.

- A task list draws its `[ ]` and `[x]` as literal text. The list itself renders.
- `~~strikethrough~~` draws struck through, with the tildes removed. A single `~` and the `<del>` and `<s>` tags draw as literal text.
- A 110,000-character tree is drawn, not refused. The engine draws the first 100,000 characters, shows a `… N more characters, not drawn` row and posts a notice.
- A `Link` emits an OSC 8 hyperlink for every non-blank `href`, whatever the scheme: `mailto:`, `vscode:`, relative, fragment and `javascript:` included. A blank `href` draws plain text and posts a notice.
- An HTML comment, a CriticMarkup comment and a `%%` comment are each shown as text. None is hidden and none breaks the block.
- A focused `Client` received Tab, a capital letter and `/` at `onKey`, after one click.
- `$.ui.selection()` returned `{"text":"SELECTME alpha bravo"}` for a selection made inside the pane in fullscreen, with no `requestId`.
- All four vendored libraries loaded and parsed a sample under `claude plugin test`.
- A symlink that points outside the plugin directory is refused at load. A symlink that points to a file inside the plugin directory resolves.

## Method

The gallery is a throwaway mod committed at `docs/research/evidence/ded-doc-editor/phase-0-gallery/`. Its `/gallery <case>` command opens one pane, id `gallery`, that draws one case. The cases are `tasks`, `strike`, `big`, `big1`, `link`, `comments`, `keys` and `sel`. The sample texts live in `hooks/cases.ts`. The key probe is the `Client` module `hooks/keys.ts`, which writes each `onKey` and `onPointer` event into its own drawn text. A second mod, `phase-0-gallery/symlink-probe/`, is the symlink case.

Each live run was started in its own tmux session from an empty scratch directory. No prompt was ever sent to the model; only the mods' own slash commands ran. The screen was read with `tmux capture-pane -p` and, for styling and hyperlinks, `tmux capture-pane -p -e`. In the `-e` captures below, `‹sgr:9›` stands for the SGR escape `ESC[9m`, `‹sgr:1›` for bold and `‹sgr:0›` for a reset. `‹link:URL›text‹/link›` stands for an OSC 8 hyperlink opened on URL and closed after the text. The reset the pane writes at the start of every row is left out. Mouse input was sent as raw SGR mouse bytes with `tmux send-keys -l`: a press `ESC[<0;col;rowM`, motion `ESC[<32;col;rowM` and a release `ESC[<0;col;rowm`, in 1-based cells.

Quotes from the pane are the pane's own column only. The transcript column beside it is quoted only where the engine wrote a notice there. Absolute paths inside a quote are shortened to `<plugin dir>`; nothing else in a quote is changed.

### Launch flags

The command that loaded the gallery, used for every screen test:

```text
claude --setting-sources project --plugin-dir <gallery> --plugin-dir <gallery>/symlink-probe --plugin-dir <scratch>/inlink
```

Which flags still load a `--plugin-dir` mod, on 2.1.306:

| Flags | Mod loaded | Screen evidence |
|-------|-----------|-----------------|
| `--setting-sources project` | yes | `/gallery tasks` opened the pane |
| `--safe-mode` | no | `⚠ Safe mode: all customizations are disabled (CLAUDE.md, skills, plugins, hooks, MCP, agents, and more)`, then `● Unknown command: /gallery` |
| `--bare` | no | `● Unknown command: /gallery` |

Under `--setting-sources project` the session drew fullscreen without any setting asking for it: the pane header read `fullscreen=true placement=dock`, and `command.run` reported `isFullscreen=true`. The types file says tmux defaults to the main screen, so this is a measured difference from the documentation. Setting `CLAUDE_CODE_NO_FLICKER=0` gave the main screen: `fullscreen=false placement=inline`.

### What a load writes

A `--plugin-dir` load wrote `.claude-plugin/types/` (holding `.gitignore`, `tsconfig.json`, `claude-code/index.d.ts`, `claude-code-mcp/index.d.ts` and `claude-code-tools/index.d.ts`) and a `tsconfig.json` at the plugin root, whose whole text is `{ "extends": "./.claude-plugin/types/tsconfig.json" }`. The types directory ignores itself through its own `.gitignore`. The root `tsconfig.json` is left untracked for both gallery mods. `claude plugin validate` wrote nothing. The types file for 2.1.306 is 661,417 bytes.

## Markdown: task list

Case `tasks`. Sample:

```text
Task list:

- [ ] open task
- [x] done task
  - [ ] nested open task

1. [ ] ordered open task

Controls: **bold control** and `code control`.

- plain item control
* star item control
```

Screen (`capture-pane -p -e`):

```text
GALLERY case=tasks fullscreen=true placement=dock
body=53
Task list:

- [ ] open task
- [x] done task
  - [ ] nested open task

1. [ ] ordered open task

Controls: ‹sgr:1›bold control‹sgr:0› and code control.

- plain item control
- star item control
```

The element renders Markdown: `**bold**` is bold, the backticks are gone and `* star item` is redrawn as `- star item`. The task markers `[ ]` and `[x]` are drawn as literal characters with no checkbox glyph. The core's glyph rewrite is therefore needed for task lists, as D-2's fallback names.

## Markdown: strikethrough

Case `strike`. Sample:

```text
Strike: before ~~two tildes~~ after.

Single: before ~one tilde~ after.

Inline <del>del tag</del> and <s>s tag</s>.
```

Screen (`capture-pane -p -e`):

```text
GALLERY case=strike fullscreen=true placement=dock
body=53
Strike: before ‹sgr:9›two tildes‹sgr:0› after.

Single: before ~one tilde~ after.

Inline <del>del tag</del> and <s>s tag</s>.
```

`~~two tildes~~` is drawn with the terminal's strikethrough attribute and without its tildes. A single tilde pair is literal text. The `<del>` and `<s>` tags are literal text.

## Markdown: a tree of 110,000 characters

Case `big`: the header `Text` and 11 `Markdown` elements of 10,000 characters each. Every element holds 100 paragraphs of 98 characters, each starting `E<element> L<line>`. The tree is 110,055 characters.

Case `big1`: the header and one `Markdown` element of 110,000 characters (1,100 such paragraphs).

Neither tree was refused. Both drew. The engine posted this notice in the transcript for each:

```text
● hooks: ui.render (Pane): 110055 characters of text are
  drawn up to the first 100000
```

The top of `big`:

```text
GALLERY case=big fullscreen=true placement=dock
body=53
E01 L001 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

E01 L002 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The bottom of `big`, after a click in the pane and End:

```text
E10 L099 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

E10 L100 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
… 55 more characters, not drawn
```

The bottom of `big1`, after a click in the pane and End:

```text
E01 L999 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

E01 L1000 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
… 10056 more characters, not drawn
```

In `big` the 11th element drew nothing at all, and the "more characters" row counts only the 55 characters cut from the 10th. In `big1` the one element drew to the 100,000th character of the tree. So on 2.1.306 one `Markdown` element above 10,000 characters is drawn, and the 10,000-per-element refusal the research reported did not occur. The 2.1.306 types say the same of `MarkdownProps.text`: "Of any length (one drawing draws 100000 characters in all)". The renderer's budget of 9,000 per element and 60,000 per tree (D-2) stays inside both limits.

## Link: non-https hrefs

Case `link`: nine `Link` elements, each `Link({ href, label })` after a `Text` naming it, then one `Markdown` element holding six Markdown links.

Screen (`capture-pane -p`):

```text
L1 https: L1 https label
L2 http: L2 http label
L3 file: L3 file label
L4 mailto: L4 mailto label
L5 vscode: L5 vscode label
L6 relative: L6 relative label
L7 fragment: L7 fragment label
L8 javascript: L8 javascript label
L9 blank: L9 blank label
M1 https M2 file

M3 mailto (m3@example.com) M4 relative

M5 fragment M6 vscode (vscode://file/tmp/m6.md)
```

Screen (`capture-pane -p -e`), the same rows with hyperlinks shown:

```text
L1 https: ‹link:https://example.com/l1›L1 https label‹/link›
L2 http: ‹link:http://example.com/l2›L2 http label‹/link›
L3 file: ‹link:file:///tmp/l3.md›L3 file label‹/link›
L4 mailto: ‹link:mailto:l4@example.com›L4 mailto label‹/link›
L5 vscode: ‹link:vscode://file/tmp/l5.md›L5 vscode label‹/link›
L6 relative: ‹link:./l6.md›L6 relative label‹/link›
L7 fragment: ‹link:#l7-heading›L7 fragment label‹/link›
L8 javascript: ‹link:javascript:void(0)›L8 javascript label‹/link›
L9 blank: L9 blank label
M1 ‹link:https://example.com/m1›https‹/link› M2 ‹link:file:///tmp/m2.md›file‹/link›

M3 mailto (m3@example.com) M4 ‹link:./m4.md›relative‹/link›

M5 ‹link:#m5-heading›fragment‹/link› M6 vscode (vscode://file/tmp/m6.md)
```

The blank `href` posted this notice in the transcript:

```text
● hooks: ui.render (Pane): Link 9 is drawn as plain text,
  no link made of it: its href is blank, not a string that
  names where it goes
```

A terminal `Link` writes its `href` into the OSC 8 sequence as given, for every scheme tried, including a relative path, a bare fragment and `javascript:`. Only a blank `href` is drawn plain. No `Link` refused the tree. Inside a `Markdown` element the rule differs: `https:`, `file:`, a relative path and a fragment became hyperlinks, while `mailto:` and `vscode:` were drawn as the label followed by the target in parentheses, with no hyperlink. The mod must therefore validate or rewrite every document link before it gives one to `Link`, because the terminal, not the engine, decides what a click on `javascript:` or a relative path does.

## Markdown: comment syntaxes

Case `comments`: six `Markdown` elements, each after a dim `Text` label. Screen (`capture-pane -p`):

```text
[C1 inline HTML comment]
C1 before <!-- html comment C1 --> after.
[C2 block HTML comment]
<!-- block html comment C2 -->

C2 paragraph after the block comment.
[C3 CriticMarkup comment]
C3 before {>>critic comment C3<<} after. {==highlight
C3==}{>>note C3<<} end.
[C4 inline %% comment]
C4 before %% obsidian comment C4 %% after.
[C5 block %% comment]
%%
block obsidian comment C5
%%

C5 paragraph after the block comment.
[C6 HTML comment inside a list item]
- C6 item one <!-- html comment C6 -->
- C6 item two
```

| Syntax | Hidden | Shown as text | Breaks the block |
|--------|--------|---------------|------------------|
| HTML comment, inline (C1), as a block (C2), inside a list item (C6) | no | yes | no |
| CriticMarkup comment and highlight (C3) | no | yes | no |
| `%%` comment, inline (C4) and as a block (C5) | no | yes | no |

Every comment is drawn with its delimiters as literal text, and the paragraph or list item after it draws normally. The `Markdown` element hid none of them, so the core must strip or restyle comments itself before drawing, which bears on D-17's in-text fallback.

## Client: Tab, a capital letter and a slash

Case `keys`: one `Client({ key: "keys", module: "./keys.ts", height: 18 })`. Before any input:

```text
┌───────────────────────────────────────────────────┐
│KEYPROBE click here, then press Tab, a capital, /  │
│pointer: (none)                                    │
│keys (0):                                          │
└───────────────────────────────────────────────────┘
```

Input sent: a click at column 80, row 6 (inside the region), then `Tab`, `A`, `/`, `a`, `Up` and `BTab` (Shift-Tab) through `tmux send-keys`. Screen after:

```text
┌───────────────────────────────────────────────────┐
│KEYPROBE click here, then press Tab, a capital, /  │
│pointer: down@12,2:left up@12,2:left               │
│keys (6):                                          │
│  {"key":"tab"}                                    │
│  {"key":"A","shift":true}                         │
│  {"key":"/"}                                      │
│  {"key":"a"}                                      │
│  {"key":"up"}                                     │
│  {"key":"tab","shift":true}                       │
└───────────────────────────────────────────────────┘
```

All three reached `onKey`: Tab as `{"key":"tab"}`, the capital as `{"key":"A","shift":true}` and the slash as `{"key":"/"}`. Shift-Tab and the Up arrow reached it too. The click reached `onPointer` as a `down` and an `up` at region cell 12,2 and gave the `Client` the keyboard. This is the measurement D-5 waits on: a `less` key map inside a focused `Client` can receive `/`, `N`, `G` and Tab in fullscreen after one click.

## $.ui.selection() for a selection inside the pane

Case `sel`. The pane draws the line `SELECTME alpha bravo charlie delta echo foxtrot. …`. `/gallery sel` calls `$.ui.selection()` and draws the JSON of what it returned.

1. With nothing selected, fullscreen: `selection: undefined`, and the command printed `gallery sel: isFullscreen=true selection=undefined`.
2. A drag inside the pane from column 68 to column 87 on row 4 (the first 20 characters of that line). Claude Code reported `copied 20 chars to tmux buffer · paste with prefix + ]`. Then `/gallery sel` drew:

   ```text
   selection: {"text":"SELECTME alpha bravo"}
   ```

   and printed `gallery sel: isFullscreen=true selection={"text":"SELECTME alpha bravo"}`.
3. Control: a drag over the words `doc-editor-gallery` in a transcript row, then `/gallery sel`:

   ```text
   selection: {"text":"doc-editor-gallery","requestId":"
   6bd4739a-a081-4178-8feb-ab970c7cbe23"}
   ```

4. Main screen (`CLAUDE_CODE_NO_FLICKER=0`): the same drag sequence over the inline pane, then `/gallery sel`, printed `gallery sel: isFullscreen=false selection=undefined`.

In fullscreen, `$.ui.selection()` returns a selection made inside a mod's own pane as `{ text }`, with no `requestId`, which matches the type's note that `requestId` is absent for a selection that "lies outside the transcript (the prompt, a pane)". A selection in a transcript row carries that row's `requestId`. On the main screen the call returned `undefined`. So "ask Claude about this selection" works for a pane selection in fullscreen, and the mod has to map the text back to a block itself, since no position comes with it.

## Vendored libraries under claude plugin test

The bundles are built by `node scripts/bundle-vendor.mjs` after `npm ci --prefix tools/vendor-bundle`, with esbuild 0.28.2, `platform: "neutral"`, no extra export conditions (so the `default` condition, never `browser`), `process.env.NODE_ENV` defined to `"production"` and no minification. Pinned versions: micromark 4.0.3, mdast-util-from-markdown 2.1.0, micromark-extension-gfm 3.0.0, mdast-util-gfm 3.1.0, @codemirror/state 6.7.6, prosemirror-model 1.25.12 and yjs 13.6.33. Each bundle opens with the licence notice of every package it contains.

| Bundle | Bytes | Packages inside |
|--------|-------|-----------------|
| `plugins/doc-editor/core/vendor/mdast.js` | 297,031 | 50 |
| `plugins/doc-editor/vendor-candidates/codemirror-state.js` | 120,070 | 2 |
| `plugins/doc-editor/vendor-candidates/prosemirror-model.js` | 110,188 | 2 |
| `plugins/doc-editor/vendor-candidates/yjs.js` | 276,149 | 2 |

Each is one chunk under the repository's 500 KB file limit. A rebuild, after a fresh `npm ci`, left `git status --porcelain` with no change to any bundle.

The test is `plugins/doc-editor/core/vendor.test.ts`. It imports the four bundles by relative path and checks one sample each: GFM Markdown to an mdast tree whose top-level nodes are `heading@1`, `list@3`, `paragraph@6` and `table@8`, with the task items' `checked` values `[true, false]` and a `delete` node for the strikethrough; an `EditorState` with a two-line doc and one change applied; a ProseMirror schema node with text content `hi`; and a `Y.Doc` text built from two inserts.

`claude plugin test` needs a plugin root with a `hooks/hooks.json`, which this branch's `plugins/doc-editor` does not have yet (a sibling task adds it). Run on `plugins/doc-editor/core` it answered:

```text
claude plugin test: <plugin dir>/core: no hooks module to load; there is no hooks/hooks.json naming one in "modules"
```

So the test ran in a scratch plugin root holding byte-identical copies of the committed `core/` and `vendor-candidates/`, with the gallery's manifest and hooks module. Claude Code 2.1.306, 2026-10-21T11:00Z:

```text
core/vendor.test.ts:
(pass) vendored libraries > should parse GFM Markdown to an mdast tree with positions when micromark and mdast-util-from-markdown load [14.38ms]
(pass) vendored libraries > should build an EditorState with a doc and apply a change when @codemirror/state loads [2.18ms]
(pass) vendored libraries > should build a schema node when prosemirror-model loads [1.70ms]
(pass) vendored libraries > should insert text into a Y.Doc when yjs loads [2.42ms]

 4 pass
 0 fail
Ran 4 tests across 1 file. [0.54s]
```

| Library | Loaded | Parsed its sample |
|---------|--------|-------------------|
| micromark with mdast-util-from-markdown and the GFM extensions | yes | yes |
| @codemirror/state | yes | yes |
| prosemirror-model | yes | yes |
| yjs | yes | yes |

No library failed to load, so there is no refusal to record and D-3's fallback is not triggered. The micromark bundle also loaded in a live hooks module: the symlink case below imported it and parsed a sample in a running session.

Two negative controls, both in the scratch root. A `yjs.js` whose first statement throws failed the file before any test ran:

```text
core/vendor.test.ts:
(fail) the file did not load
  deliberately broken yjs bundle
```

With `yjs.js` removed:

```text
core/vendor.test.ts:
(fail) the file did not load
  core/vendor.test.ts: cannot import "../vendor-candidates/yjs.js" (from core/vendor.test.ts): no such file under <plugin dir>
```

So a bundle that does not load fails the whole file, with the bundle's file name or its own error in the message. A dynamic `import()`, tried as a way to isolate each library in its own test, is refused by the test environment as it is in a hooks module:

```text
core/dyn.test.ts: <plugin dir>/core/dyn.test.ts, compiled line 3 `const mod = await import("../vendor-candidates/codemirror-state.js");`: a dynamic import(); a hooks module imports its own files with an import declaration, as in import { name } from "./file.js"; $ is always spelled $.noun.event(...) at the call site, on is always on("<event>", hook), and next.to always next.to(e, "<tier>")
```

### Forbidden tokens in the core bundle

Counts of whole-word matches in `core/vendor/mdast.js`, split by what each occurrence is:

| Token | Matches | Free references to the global | Locally declared names and their uses | Property names | Comments and strings |
|-------|---------|-------------------------------|---------------------------------------|----------------|----------------------|
| `document` | 9 | 0 | 2 | 5 | 2 |
| `window` | 0 | 0 | 0 | 0 | 0 |
| `process` | 0 | 0 | 0 | 0 | 0 |
| `setTimeout` | 0 | 0 | 0 | 0 | 0 |
| `$` (standalone) | 8 | 0 | 0 | 0 | 8 |

The nine `document` matches are on bundle lines 3744 (a path comment), 3745 (`var document = {`, micromark's own content-type construct), 3935 (`this.parser.constructs.document`), 7042 (`document: () => document2`), 7448 (`document: create(document)`, a key and a use of the local), 7601 (`parse(options).document()`), 8358 (the string `"Cannot close document, a token ("`) and 8713 (`document: {`). The eight standalone `$` matches are inside a string (`dollar: "$"`) or a regular expression literal. None of them is the DOM's `document` or the mod's `$`. A core lint that matches words rather than resolved identifiers will flag the `document` lines, and the engine's own load check passed the bundle in both the test environment and a live hooks module.

## Symlink inside a plugin loaded with --plugin-dir

D-9 asks whether a symlink inside a plugin directory resolves for an in-place `--plugin-dir` load. Two cases, both loaded with the launch command above.

Outside the plugin. `phase-0-gallery/symlink-probe/hooks/mdast-link.js` is a committed symlink to `../../../../../../../plugins/doc-editor/core/vendor/mdast.js`, a file outside that plugin's directory, and the hooks module imports `./mdast-link.js`. At session start the engine printed:

```text
● doc-editor-symlink-probe: hooks module did not load: cannot import "./mdast-link.js" (from hooks/register.ts):
  no such file under <plugin dir>
```

`claude plugin validate` on that directory failed with the same refusal:

```text
  ❯ modules../register.ts: symlink-probe: cannot import "./mdast-link.js" (from hooks/register.ts): no such file under <plugin dir>
```

Inside the plugin. A scratch copy of the probe with its own name, `doc-editor-symlink-inside`, held a real copy of the bundle at `lib/mdast.js` and the symlink `hooks/mdast-link.js` pointing to `../lib/mdast.js`. `claude plugin validate` passed it, and its command printed in the running session:

```text
❯ /symprobein
  ⎿  doc-editor-symlink-insi…: SYMPROBE-INSIDE loaded through
     symlink: heading@1, paragraph@3
```

A symlink resolves when its target is inside the plugin directory and is refused when its target is outside it. D-9's option (c), a symlink from the plugin into the marketplace, does not load in place on 2.1.306. Two plugins with the same `name` in one session conflict: while the inside probe was also named `doc-editor-symlink-probe`, its command answered `● Unknown command: /symprobe`, so the inside probe was renamed.

## Gaps

- The `claude plugin test` pass ran in a scratch plugin root, not on `plugins/doc-editor` in this branch, because the branch has no `hooks/hooks.json` yet. It should be re-run on `plugins/doc-editor` once the scaffold lands there. Closed on 2026-10-21 by the build coordinator: after both Phase 0 branches merged (integration tip `cc67590`), `npm test` ran `claude plugin test plugins/doc-editor` on 2.1.306 and printed the four `vendored libraries` tests as `(pass)`, then `Ran 6 tests across 2 files.`
- Mouse input was sent as raw bytes through tmux, not by a physical mouse. The engine treated it as real input: it reported the copy to the tmux buffer and the `Client` reported the press and release.
- Only one terminal was measured: tmux. A terminal outside tmux may draw strikethrough, OSC 8 and the selection highlight differently.
