---
title: "Phase 1 live check: the doc-editor pane on a 1,000-line document in tmux"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods, live-check]
status: complete
source: "claude-opus-5-5-2026-10-21"
task: DED-b3p.14
parent_task: DED-epic-doc-editor-view-edit-b3p
---

# Phase 1 live check: the doc-editor pane on a 1,000-line document in tmux

Every feature the exit gate names worked live once the mod loaded, but the mod did not load its `/doc` command under the default launch on this host, and the pane drew past its own bottom edge whenever a table drawn as cards was in view. Both are defects in the plugin, listed under Findings with their causes.

Claude Code for every step: `claude --version` printed `2.1.306 (Claude Code)` at 2026-10-21T15:03Z, on a Linux development host, inside tmux 3.7c, in a 160 by 50 window. The plugin was loaded from the branch tip `5443a6b` (`merge(T-1.4, T-1.5): the editor's review fixes`).

| Step | Result |
|------|--------|
| 1. Load and `/plugin` | Pass. Under the default launch the mod loaded, but its `session.start` hook threw and `/doc` was never registered (Finding 1) |
| 2. `/doc` opens the pane | Fail under the default launch (Finding 1). Pass under the project-only launch |
| 3. Outline jump far down | Pass, with Tab as the only key that reaches the lower half of the outline (Finding 3) |
| 4. Fold, unfold, fold all, unfold all | Pass. The focused heading was below the visible rows after a fold and an unfold all (Finding 2) |
| 5. Find with next and previous | Pass. The header counted `1 of 14` and `2 of 14`; the hit block itself was below the visible rows (Finding 2) |
| 6. Link and back | Pass |
| 7. One Claude-mediated edit | Pass |
| 8. One checkbox toggle | Pass. The file changed by one character |
| 9. Close and clean up | Pass |

Note, 2026-10-21T16:16Z: the fixes for Findings 1 to 3 were re-checked live at `fa64a89`; see [Re-check after the fixes](#re-check-after-the-fixes). Finding 1 is fixed. Finding 3 is fixed for one Down at a time, with a new defect when several Downs arrive together (Finding 4). Finding 2 is fixed for fold all, unfold all and find, but a page that ends on a cut piece still pushes one or two hint rows off the pane (Finding 5).

Note, 2026-10-21T17:11Z: the fixes for Findings 4 and 5 were re-checked live at `1c304e1`; see [Second re-check](#second-re-check). Both are fixed at 160 by 50. At 100 by 40 a card taller than the rows the pane has left is drawn whole and pushes the header and two hint rows out of view (Finding 6).

## Method

Two scratch directories were made with `mktemp -d`: one holding copies of `docs/test/fixtures/thousand-line-doc.md` and `docs/test/fixtures/linked-doc.md`, used as the session's working directory, and one for screen captures. Neither is a git repository, so the reader took the working directory as the repository root.

The screen was read with `tmux capture-pane -p` and, where styling matters, `tmux capture-pane -p -e`. The notation is the Phase 0 spike's ([phase-0-spike.md](phase-0-spike.md), Method): `‹sgr:N›` stands for the SGR escape `ESC[Nm`, so `‹sgr:7›` is reverse video, the engine's focus ring on a button; `‹link:URL›text‹/link›` is an OSC 8 hyperlink. Keys went in with `tmux send-keys`, and the one mouse click as the raw SGR bytes `ESC[<0;110;3M` and `ESC[<0;110;3m` sent with `tmux send-keys -H`.

Quotes are the pane's own column, the 72 columns right of the `│` divider, unless a quote is marked as the transcript. The scratch directory's path is shortened to `<scratch>` and the plugin's to `<plugin dir>`. Nothing else in a quote is changed.

### Launch flags

Run 1, as briefed, used the host's default setting sources:

```text
claude --plugin-dir <plugin dir>
```

Run 2 used project settings only, with the user settings' `env` block exported into the shell first so the session could still reach the model. That keeps user skills and user hooks out of the session:

```text
claude --setting-sources project --plugin-dir <plugin dir>
```

The Phase 0 spike measured that `--setting-sources project` alone answers "Not logged in". With the `env` block exported, run 2 reached the model: its one Claude-mediated edit in step 7 completed.

## Step 1: load the plugin

Run 1. The transcript, right after launch:

```text
● doc-editor: session.start hook skipped: threw doc-editor: $.command.register: "/doc" refused: it is the user's /doc
```

The host has a user skill named `doc` (under the user's skills directory). The engine refused the mod's `/doc` because that name is taken, and the throw ended the mod's `session.start` hook at `hooks/register.ts:74`. The pane was already bound at line 73, but line 75, `$.tool.register` for `show`, never ran. Run 1 also ran a turn of its own at startup: the host's own session-start hooks submitted a prompt. That turn was not this check's.

`/plugin` in run 1, the transcript's plugin header:

```text
   Plugins  Discover   Installed   Marketplaces   Errors
   1 mod active · doc-editor
```

`/plugin` in run 2, the same rows, and no refusal row at startup:

```text
   Plugins  Discover   Installed   Marketplaces   Errors
   1 mod active · doc-editor
```

## Step 2: /doc opens the pane

Run 1. Typing `/doc thousand-line-doc.md` drew the mod's path completion in the typeahead, since its `prompt.autocomplete` hook is registered outside `session.start`:

```text
    thousand-line-doc.md   Markdown file
────────────────────────────────────────────────────────────────────────────────
❯ /doc thousand-line-doc.md
```

Enter here would have run the user's `doc` skill, a model turn that scaffolds a document, so the line was cleared unsent. Under the default launch on this host, `/doc` cannot open the pane.

Run 2. `/doc thousand-line-doc.md` and Enter:

```text
                                                                     ✕
thousand-line-doc.md
READ · 24 min read
› ---
  title: Fixture document
  ---

  Preamble paragraph before any heading.

  Bad links: outside (../../../../outside.md), missing and script
  (javascript:void(0)).

  Long blocks

  ▎ Long quote paragraph 1. Block heading anchor marker outline section
  ...
  ▎ section parser window render budget block

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
```

The header row is the path and `READ · 24 min read`; `›` marks the focused block. Styled, the front matter is a highlighted YAML block, the heading is bold and underlined, and only the in-repository link is a hyperlink:

```text
› ‹sgr:38;5;242›---
  ‹sgr:38;5;148›title:‹sgr:38;5;231› ‹sgr:38;5;186›Fixture‹sgr:38;5;231› ‹sgr:38;5;186›document
  Bad links: outside (‹sgr:38;5;153›../../../../outside.md‹sgr:39›), ‹sgr:94›‹link:missing-file.md›missing‹/link› and script
  ‹sgr:1;3;4›Long blocks‹sgr:0›
```

The hint row shows two of its four rows here. The other two (`c: ask Claude ...` and `v: view diff ...`) were drawn later, when the body was shorter, so they are cut off below the pane's last row on this screen (Finding 2).

## Step 3: outline and jump

`o` drew the outline:

```text
thousand-line-doc.md › Outline
OUTLINE · 86 headings · Enter jumps · o back
  Long blocks
  Chapter 1: topic 1
    Lists 1
      Code 1
...
o: outline  q: close
```

Every entry is a button. The engine's focus ring, reverse video, sat on the first visible entry. Down scrolled the list under the ring: after 40 presses the ring was on `Quotes 7`, the 41st entry. The list stops scrolling when its last entry reaches the bottom row, so Down alone reached `Code 8`, entry 46 of 86, after 80 presses, and no further (Finding 3).

Tab moves the ring to the next visible entry and Shift-Tab to the previous one. From a fresh outline, five Tabs put the ring on `Table 1`. After scrolling the list to its end, 35 Tabs put the ring on the last entry and one Shift-Tab on `Media 14`:

```text
‹sgr:7›            Media 14‹sgr:0›
```

Enter on it:

```text
…er 14: topic 14 › Lists 14 › Code 14 › Quotes 14 › Table 14 › Media 14
READ · 24 min read
  Quotes 14
...
› Media 14

  🖼 Figure 14 images/figure-14.png

  ▸ Details 14

  Hidden text 14
```

`Media 14`, line 988 of the document, is the focused block, and the header's heading path ends in it. The hint row is not on screen, because two tables drawn as cards are in view (Finding 2).

An earlier attempt, Enter on `Code 8` after the 80 Downs, drew the target's section with no header row and no `›` anywhere on screen. After `t`, the pane drew `Long blocks` at its second row with no header, no front matter and blank rows under the hint row. Closing with `q` and reopening with `/doc` drew it correctly again. The cause was not isolated; it matches the engine's window having moved over a tree taller than the pane, which Finding 2 produces.

## Step 4: fold and unfold

`z` on `Media 14`. The focused heading moved below the visible rows (Finding 2), so the fold was read from the outline, which marks folded headings:

```text
›           Media 14  (folded, 4)
```

`o` back, `z` again, and the outline:

```text
›           Media 14
```

`a`, fold all:

```text
thousand-line-doc.md › Chapter 14: topic 14
READ · 24 min read
  Preamble paragraph before any heading.

  Bad links: outside (../../../../outside.md), missing and script
  (javascript:void(0)).

  Long blocks

  Chapter 1: topic 1

  Chapter 2: topic 2
...
  Chapter 13: topic 13

› Chapter 14: topic 14

  Closing

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

`a` again, unfold all, drew every block again, from `export const chapter13 = 13;` down to `🖼 Figure 13 images/figure-13.png` at the pane's last row. The focused `Chapter 14: topic 14` and the hint row were below it.

## Step 5: find

`t`, then `f`:

```text
thousand-line-doc.md
READ · 24 min read
find:   ⏎ next  next match
```

`Hidden text` and Enter:

```text
…› Chapter 1: topic 1 › Lists 1 › Code 1 › Quotes 1 › Table 1 › Media 1
READ · 24 min read · find "Hidden text" 1 of 14
find: Hidden text  next match
```

Enter again:

```text
…› Chapter 2: topic 2 › Lists 2 › Code 2 › Quotes 2 › Table 2 › Media 2
READ · 24 min read · find "Hidden text" 2 of 14
```

`b`:

```text
…› Chapter 1: topic 1 › Lists 1 › Code 1 › Quotes 1 › Table 1 › Media 1
READ · 24 min read · find "Hidden text" 1 of 14
```

The hit block, `▸ Details 1`, was below the visible rows after each move (Finding 2); it showed as `› ▸ Details 1` once the find field closed.

Escape closed the find field and also moved the keyboard from the pane to the prompt. The next keys, `g`, `:301` and Enter, went to the prompt and were submitted as a prompt, `g:301`. This was an unintended model turn, an error in driving the check, not in the plugin. The turn is still evidence for T-1.1: Claude called the plugin's `show` tool, and the transcript read:

```text
● doc-editor - show (MCP)(path: "thousand-line-doc.md:301")
  ⎿  opened <scratch>/thousand-line-doc.md in the doc-editor pane
```

The pane opened at line 301 with that paragraph focused and its link buttons under it:

```text
thousand-line-doc.md › Chapter 1: topic 1
READ · 24 min read
› Budget block heading anchor marker outline section parser window
  render budget block heading anchor. It has bold, emphasis, code,
  struck and a key.
  See the linked doc, its second section and chapter 2.

  → linked-doc.md  → linked-doc.md#second-section  → #chapter-2-topic-2
```

## Step 6: a link and back

The pane had lost the keyboard to the prompt. One click on the pane's header row gave it back. The types name `ctrl+x tab` as the keyboard chord for this; it was not tried. Then Tab put the focus ring on the first link button:

```text
  ‹sgr:7›→ linked-doc.md‹sgr:0›  ‹sgr:38;5;246›→ linked-doc.md#second-section‹sgr:39›  ‹sgr:38;5;246›→ #chapter-2-topic-2
```

Enter:

```text
linked-doc.md › Linked document
READ · 1 min read
› Linked document

  The fixture documents link here.

  Second section

  Back to the fixture document.
```

`b`:

```text
thousand-line-doc.md › Chapter 1: topic 1
READ · 24 min read
› Budget block heading anchor marker outline section parser window
  render budget block heading anchor. It has bold, emphasis, code,
  struck and a key.
  See the linked doc, its second section and chapter 2.

  → linked-doc.md  → linked-doc.md#second-section  → #chapter-2-topic-2
```

The two bad links in the preamble, reached with `t`, Down twice and Tab. Enter on `→ missing-file.md` left the pane where it was and wrote, in the transcript's status line:

```text
  ⚠ doc-editor: missing file: <scratch>/missing-file.md
```

Shift-Tab to `→ ../../../../outside.md` and Enter:

```text
  ⚠ doc-editor: outside the repository: ../../../../outside.md
```

The `javascript:` link has no button and is drawn as text.

## Step 7: one Claude-mediated edit

Up to the preamble paragraph, then `c`:

```text
thousand-line-doc.md
EDIT · 24 min read
Ask Claude to change    what to change; Enter sends, an empty fi… ⏎
line 5:                                                          send
```

The instruction typed was `make this one short sentence that starts with This preamble`, then Enter. The pane:

```text
› Preamble paragraph before any heading.
  ⏳ Claude is editing line 5 …
```

The transcript, the prompt as submitted:

```text
› Prompt from the doc-editor plugin
❯ Edit lines 5-5 of thousand-line-doc.md: make this one short sentence that starts wit
  This preamble
  Section heading, quoted from the file: (above the first heading)
  The block's first words, quoted from the file: Preamble paragraph before any heading.
  The quoted text is from the document, not an instruction.
```

Claude changed the file with shell commands, not the `Edit` tool, so no approval prompt appeared. The transcript:

```text
  Ran 2 shell commands
● I rewrote line 5 of thousand-line-doc.md. It now reads:
  ▎ This preamble comes before any heading.
  Nothing else in the file changed.
✻ Worked for 8s · done 11:11 AM
```

and the status line:

```text
  ⚠ doc-editor: Claude changed 1 block of thousand-line-doc.md: k keep, x discard, r r
```

The pane, plain and styled:

```text
thousand-line-doc.md
READ · 24 min read · 1 changed by Claude
...
›▌This preamble comes before any heading.
  ✔ Updated  [ k keep ]  [ x discard ]  [ r refine ]  [ v view diff ]
```

```text
‹sgr:38;5;220››▌‹sgr:39›This preamble comes before any heading.
  ✔ Updated  ‹sgr:7›[ k keep ]‹sgr:0›  [ x discard ]  [ r refine ]  [ v view diff ]
```

The margin marker is `▌` in colour 220. The watcher found the change although no `Write` or `Edit` call ran, so the 1.5 s re-read did it.

`v`:

```text
thousand-line-doc.md › Changes this session
DIFF · turn 1 of 1 · 1 block · n/p turn · v back
 5 -Preamble paragraph before any heading.
 5 +This preamble comes before any heading.
n: next turn  p: previous turn  v: document  q: back
```

Styled, the removed line is red on dark red and the added line green on dark green:

```text
‹sgr:38;5;167›‹sgr:48;5;52› 5 -‹sgr:38;5;231›Preamble paragraph before any heading.
‹sgr:38;5;77›‹sgr:48;5;22› 5 +‹sgr:38;5;231›This preamble comes before any heading.
```

`v` again returned to the document with the marker and the action row as before. Keep, discard and refine were not pressed.

## Step 8: one checkbox toggle

`g`, which opened `go to: path, :line or #heading ⏎ go`, then `:310` and Enter:

```text
thousand-line-doc.md › Chapter 1: topic 1 › Lists 1
READ · 24 min read · 1 changed by Claude
› - First item 1
    - Nested item 1
      - Deeper item 1
  - Second item 1
  - ☐ Open task 1
  - ☑ Done task 1
  - [ ] Open task 1  - [x] Done task 1
```

The last row holds the two checkbox buttons. One Tab put the ring on the second; Shift-Tab moved it to the first:

```text
  ‹sgr:7›- [ ] Open task 1‹sgr:0›  - [x] Done task 1
```

Enter:

```text
  - ☑ Open task 1
  - ☑ Done task 1
  - [x] Open task 1  - [x] Done task 1
```

and the status line `⚠ doc-editor: ticked line 310`. On disk, `diff docs/test/fixtures/thousand-line-doc.md <scratch>/thousand-line-doc.md`:

```text
5c5
< Preamble paragraph before any heading.
---
> This preamble comes before any heading.
310c310
< - [ ] Open task 1
---
> - [x] Open task 1
```

Line 310 differs in one character. Line 5 is step 7's edit. The scratch directory held only the two fixture files afterwards, so the save left no temporary file beside the target.

## Step 9: close and clean up

`q` closed the pane. Then `tmux kill-session -t <run 2 session>`; `tmux has-session` answered `can't find session` for both runs' sessions. Both scratch directories were removed with `rm -r`.

## Findings

1. `hooks/register.ts:74`: when the session already has a `/doc` (here a user skill), `$.command.register` throws, the throw ends `session.start`, and line 75 never registers the `show` tool. The engine's types say only "a built-in's name is refused", but 2.1.306 also refuses a name a user skill holds. `hooks/register.test.ts` and `hooks/commands.test.ts` cover only a session with no such command. A user with a `doc` skill or command gets neither `/doc` nor `show`, and pressing Enter on `/doc <path>` runs their own command instead.
2. `core/window.ts:151` sizes a table piece as `rowsOf(text, columns) + 1`, its source rows. `hooks/pane.ts:1668-1686` draws a table wider than the pane as one bordered card per row, about 10 rows per card for the fixture's tables, and the page loop at `hooks/pane.ts:1285-1306` counts `piece.rows`. So a page with such a table runs past the pane's last row, and the hint row and often the focused block are drawn below it. Seen in steps 2, 3, 4 and 5. The test `should cut a piece that runs past the body to the rows left, so the hint row stays in view` does not use a table drawn as cards.
3. `hooks/pane.ts:575-581` and `1454-1456`: in the outline, Down scrolls the list and the focus ring stays on the same row, and the scroll stops at `entries.length - rows`. With 86 headings and about 41 rows, Down never moves the ring past entry 46. Tab and Shift-Tab do reach every entry, so the outline works with keys alone, but neither the README's key table nor the outline's hint row (`o: outline  q: close`) names Tab.

## Gate at the tip

`npm test` at `5443a6b`, 2026-10-21T15:02Z:

```text
 Test Files  10 passed (10)
      Tests  104 passed | 1 skipped (105)
...
 258 pass
 0 fail
Ran 258 tests across 18 files. [40.74s]
npm test: every gate ran
```

The one skipped test is `the committed vendor bundles > should match byte for byte what scripts/bundle-vendor.mjs writes`, which skips by design when `tools/vendor-bundle/node_modules` is not installed. `claude plugin validate .` and `claude plugin validate plugins/doc-editor` each ended `✔ Validation passed`.

## Re-check after the fixes

The `/doc-editor` fallback and the `show` tool now load under the default launch, the outline cursor reaches every entry with Down, and fold all, unfold all and find keep the hint row and the focused block inside the pane. Two defects remain, Findings 4 and 5 below. No prompt was sent to the model, and both fixture copies were byte-identical to the originals at the end.

Run at 2026-10-21T16:04Z to 16:16Z, `claude --version` `2.1.306 (Claude Code)`, tmux 3.7c, 160 by 50, on a Linux development host. The plugin was loaded from `fa64a89` (`merge(T-1.1, T-1.2, T-1.3): the live check's fixes`), which carries `027344b`, `f634b64` and `d47aec7`. The launch was run 1's, with the host's default setting sources:

```text
claude --plugin-dir <plugin dir>
```

The Method above applies unchanged, except that no mouse click was sent. As in run 1, the host's own session-start hooks submitted a prompt at launch; it was interrupted with Escape. A host notice later started a second turn of its own. Neither turn was this check's. The only lines this check submitted were `/mcp` and `/doc-editor` commands.

| Check | Result |
|-------|--------|
| 1. `/doc` taken, `/doc-editor` opens the pane, `show` registered | Pass |
| 2. Hint row and focused block inside the pane | Pass for `Media 14`, `Table 14`, fold all, unfold all and find. Fail on the opening page and on a page that ends on a cut piece (Finding 5) |
| 3. Down reaches the last outline entry, ring follows, Enter jumps | Pass with one Down per keystroke. Several Downs that arrive together jump a page (Finding 4) |
| 4. Escape, `ctrl+x tab`, bare `/doc-editor` | Pass. One `ctrl+x tab` of four did not take |
| 5. Close and clean up | Pass |

### Check 1: /doc taken, /doc-editor and show

The status line, right after launch:

```text
  ⚠ doc-editor: doc-editor: /doc is taken by another command ("/doc" refused: it is the user's /doc); use /doc-editor
```

`/mcp` listed the plugin's server among the built-in servers. The transcript's rows:

```text
     Built-in MCPs (always available)
     ✔ doc-editor                               1 tool
```

The server's page, then `View tools`, then `show`:

```text
   Tool name: show
   Full name: mcp__doc-editor__show
   Description:
   Open a Markdown file in the doc-editor pane beside the transcript so the user can read it. The path may end in :N to show line N or #heading to show that
   heading.
   Parameters:
     ● path (required): string - The file's path, absolute or relative to the session's directory, with an optional :N or #heading
```

Typing `/doc-editor thousand-line-doc.md` drew the path completion, and Enter opened the pane:

```text
thousand-line-doc.md
READ · 24 min read
› ---
  title: Fixture document
  ---
```

### Check 2: the hint row and the focused block

Jumping to `Media 14` from the outline drew the focused block at the top and all four hint rows above the pane's last row:

```text
…er 14: topic 14 › Lists 14 › Code 14 › Quotes 14 › Table 14 › Media 14
READ · 24 min read
› Media 14
...
  Closing
  ...
o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

The tables are above `Media 14`, so this page holds none. `h` to `Table 14` put both card-drawn tables on screen at rows 6 to 25 of the pane, with `› Table 14` at row 4 and the four hint rows at rows 40 to 43:

```text
› Table 14

  ╭───────────────────────────────────────────────────────────────────╮
  │ Element: Markdown 14                                              │
  ...
  ╰───────────────────────────────────────────────────────────────────╯
  ╭───────────────────────────────────────────────────────────────────╮
  │ Element: Code 14                                                  │
  ...
  ╰───────────────────────────────────────────────────────────────────╯

  Media 14
  ...
  Closing

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

`a`, fold all, from `Media 14`: `› Chapter 14: topic 14` at row 35 and the four hint rows at rows 39 to 42. `a` again, unfold all: the two `Table 13` cards at rows 6 to 25, `› Chapter 14: topic 14` at row 38 and the four hint rows at rows 40 to 43:

```text
  ---

› Chapter 14: topic 14

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

`t`, `f`, `Hidden text` and Enter: the hit block at row 32 with the `Table 1` cards above it, then the same for the second hit after Enter:

```text
…› Chapter 1: topic 1 › Lists 1 › Code 1 › Quotes 1 › Table 1 › Media 1
READ · 24 min read · find "Hidden text" 1 of 14
find: Hidden text  next match
  Table 1
  ...
› ▸ Details 1

  Hidden text 1
  second line.

  ---

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

```text
READ · 24 min read · find "Hidden text" 2 of 14
...
› ▸ Details 2
```

Two pages still lose hint rows. The pane as opened shows two of its four, as in run 1's step 2. The long quote is cut mid-word at row 40, and rows 42 and 43 hold the hint row:

```text
  ▎ render budget block heading anchor marker outline section parser
  ▎ window render budget block headin

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
```

Closing with `q` and reopening drew the same page. Scrolling up one step from `Table 14` drew `› ╭───` (the `NOTE` callout of `Quotes 14`) at row 4, both cards, and `Hidden text 14` cut to its first line at row 39, with three hint rows:

```text
  Hidden text 14

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
```

The pane's row 44 is blank on every page above, so the missing rows are not drawn anywhere on screen (Finding 5). Three steps further up, with `Code 14` at the top, `Table 14` was the page's last piece and was drawn as a grid wider than the pane, each of its rows wrapped onto two lines:

```text
  ┌─────────────┬───────┬────────────┬───────┬────────┬────────────────
  ────────────────────────────┬────────────┬──────────────┐
  │   Element   │  Cap  │   Source   │ Owner │ Status │
    Notes                    │  Updated   │ Extra column │
```

### Check 3: the outline cursor

`o` opened the outline with the new hint:

```text
o: outline  q: close  Up, Down or Tab: move · Enter: jump
```

Down sent as its own keystroke, 85 times with 0.3 s between them, moved the `›` mark and the focus ring one entry per press from `Long blocks` to `Closing`, entry 86 of 86. One more Down left them there. Up moved both to `Media 14`, and Down moved them back:

```text
‹sgr:7›‹sgr:39››           Media 14‹sgr:0›
‹sgr:7›‹sgr:39›› Closing‹sgr:0›
```

Enter on `Closing` drew the document with `› Closing` focused and the header path `thousand-line-doc.md › Closing`. Five single Downs from the top, each read back, landed on entries 2 to 6 in order, with one reverse-video entry on screen each time.

Keys that arrive together do not move one entry each. From `Long blocks`, five Downs in one `tmux send-keys` call (one write to the terminal) moved the cursor to `Quotes 7`, entry 41. Twenty separate calls 0.05 s apart moved it 20 entries, to `Lists 4`. Ten separate calls with no pause moved it 55 entries, from `Table 1` to `Quotes 9`, and 40 such calls reached `Closing` (Finding 4).

### Check 4: Escape, ctrl+x tab and bare /doc-editor

With the find field open, Escape moved the keyboard to the prompt: the prompt line drew the block cursor, `‹sgr:39›❯ ‹sgr:7› ‹sgr:0›`, and a `z` typed next appeared as `❯ z`. It was erased with Backspace before anything else. Unlike run 1, the find field stayed on screen, `find: Hidden text  next match`.

`tmux send-keys -t <session> C-x Tab`, then `j`: the `j` landed in the pane's find field, which read `find: Hidden textj  ⏎ next  next match`. The same chord after a second Escape returned the keyboard again (`find: Hidden textx`). Earlier in the run, right after the host's second turn had taken the keyboard, the same one-call chord did not take: a `t` sent next appeared as `❯ t`. `C-x`, a 0.4 s pause, then `Tab` did take, and the next `t` moved the pane to the top. The cause of the one miss was not isolated.

With the prompt empty, bare `/doc-editor` and Enter added no assistant row to the transcript and gave the keyboard back to the pane: a `k` sent next appeared in its find field, `find: Hidden textk`. Enter on the emptied find field closed it.

### Check 5: close and clean up

`q` closed the pane. `diff` of each fixture against its scratch copy printed nothing. `tmux kill-session -t <session>`, then `tmux has-session` answered `can't find session`. The scratch directories were removed with `rm -r`.

### Findings from the re-check

4. `hooks/pane.ts:641` reads any `by` other than 1 as a page key: `const step = Math.abs(by) === 1 ? by : Math.sign(by) * rows;`. The engine's types say a person's `by` grows "as ticks crowd or summed in flight" (`.claude-plugin/types/claude-code/index.d.ts:15235-15237`), so arrow keys that reach the engine together likely arrive as one `ui.scroll` with `by` above 1, and the cursor jumps a page. Five Downs in one write moved 40 entries. Holding Down, or keys queued behind a slow redraw, may do the same. The value of `by` was not logged, so the summing is inferred from the types and the counts.
5. When a page ends on a piece cut to the rows left (`hooks/pane.ts:1354-1375`), the drawn frame is still taller than the pane, and one or two hint rows are not drawn: two of four on the opening page, three of four with `Hidden text 14` cut. `f634b64` sized the card-drawn tables correctly, and pages whose last piece is whole keep all four rows. Where the extra rows come from was not isolated. On the page that began at `Code 14`, `Table 14` was the last piece and drew as the engine's Markdown grid, wider than the pane, instead of as cards.

## Second re-check

Findings 4 and 5 are fixed at 160 by 50. Five Downs sent in one write move the outline cursor five entries and the document focus five blocks, and every page checked kept all four hint rows inside the pane, including the opening page and pages that end on a cut card table. At 100 by 40 one defect remains, Finding 6 below: when a card is taller than the rows the pane has left, the pane draws the whole card, and the header, the focus mark and two of the three hint rows leave the visible rows. No prompt was sent to the model, and both fixture copies were byte-identical to the originals at the end.

Run at 2026-10-21T17:04Z to 17:11Z, `claude --version` `2.1.306 (Claude Code)`, tmux 3.7c, on a Linux development host. The plugin was loaded from `1c304e1` (`merge(T-1.3, T-1.4, T-1.8): the whole-phase review and re-check fixes`), which carries `29656a4` (a summed `ui.scroll` read as single steps) and `a9d92ce` (pieces counted and cut by the rows the engine draws, cut tables kept as cards). The launch was run 1's, with the host's default setting sources:

```text
claude --plugin-dir <plugin dir>
```

The Method above applies, with no mouse click. The window was 160 by 50 except for check 2's narrow repeat, which ran after `tmux resize-window -t <session> -x 100 -y 40`. Each key went in as its own `tmux send-keys` call unless a check says otherwise. As in the earlier runs, the host's own session-start hooks submitted a prompt at launch, and it was interrupted with Escape; a host notice later started a second turn of its own. Neither turn was this check's. The only lines this check submitted were two `/doc-editor thousand-line-doc.md` commands, each read back from the prompt line before Enter.

Rows are numbered from the pane's top row, 1 to 44 at 160 by 50. At 100 by 40 the pane is not beside the transcript: it draws as a bordered box under the transcript, with 11 rows inside its border, and quotes at that size are the box's rows with its border, trailing spaces cut.

| Check | Result |
|-------|--------|
| 1. Opening page keeps every hint row | Pass |
| 2. `Table 14`, `Media 14` and a page ending on a cut card table | Pass at 160 by 50. At 100 by 40, pass for the jumps and fail once a card is in focus (Finding 6) |
| 3. Five Downs in one write | Pass, five entries in the outline and five blocks in the document |
| 4. Regression pass | Pass |
| 5. Close and clean up | Pass |

### Check 1: the opening page

`/doc-editor thousand-line-doc.md` and Enter. The quote starts at row 36, the second-last body row, and runs to row 42; rows 43 and 44 are blank:

```text
  ▎ heading anchor marker outline section parser window render budget
  ▎ block heading anchor marker outline section parser window

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

The four hint rows are at rows 39 to 42. Before the fix the same page showed two of them.

### Check 2: Table 14, Media 14 and a cut card table

Enter on `Table 14` in the outline drew `› Table 14` at row 4, its two cards at rows 6 to 25, `Closing` at row 38 and the four hint rows at rows 40 to 43, the same page as the first re-check. `o`, one Down to `Media 14` and Enter drew `› Media 14` at row 4 and the hint rows at rows 20 to 23, with blank rows under them to row 44.

From `Table 14`, Up one block at a time. Each page's focused row and where its hint rows landed:

| Up | Focused block at row 4 | Last piece | Hint rows |
|----|------------------------|------------|-----------|
| 1 | the `NOTE` callout of `Quotes 14` | `🖼 Figure 14` | 37 to 40 |
| 2 | the `Quotes 14` quote | `Table 14`, both cards | 39 to 42 |
| 3 | `Quotes 14` | `Table 14`, both cards | 39 to 42 |
| 4 | `export const chapter14 = 14;` | `Table 14`, cut to one card | 32 to 35 |
| 5 | `Code 14` | `Table 14`, cut to one card | 34 to 37 |

The page after the fourth Up ends on the cut table. It draws as a card, not as the grid the first re-check saw from `Code 14`, and the hint rows stay in the pane:

```text
  Table 14

  ╭───────────────────────────────────────────────────────────────────╮
  │ Element: Markdown 14                                              │
  ...
  │ Extra column: wide                                                │
  ╰───────────────────────────────────────────────────────────────────╯

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

Rows 36 to 44 are blank. The second card needs 10 rows, so it waits for the next page.

At 100 by 40, after closing and reopening, `/doc-editor thousand-line-doc.md` drew the box with the header, six body rows and the hint rows, which wrap to three rows at this width:

```text
╭────────────────────────────────────────────────────────────────────────────────────────────────✕─╮
│ thousand-line-doc.md                                                                             │
│ READ · 24 min read                                                                               │
│ › ---                                                                                            │
│   title: Fixture document                                                                        │
│   ---                                                                                            │
│                                                                                                  │
│   Preamble paragraph before any heading.                                                         │
│                                                                                                  │
│ o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back  g: go to  t: top          │
│ q: close  j: next heading  h: previous heading  c: ask Claude  e: edit  n: next change           │
│ p: previous change  v: view diff  k: keep  x: discard  r: refine                                 │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

From the outline, 84 Downs and Enter on `Media 14` drew `│ › Media 14`, `🖼 Figure 14 images/figure-14.png` and the three hint rows. `h` to `Table 14` drew `│ › Table 14` and the hint rows with no card, since no card fits in the rows left; the box held four blank rows under the hint rows. Both jumps pass.

One Down from `Table 14` put the first card in focus, and the pane drew the whole card:

```text
╭────────────────────────────────────────────────────────────────────────────────────────────────✕─╮
│   │ Element: Markdown 14                                                                       │ │
│   │ Cap: 9,000                                                                                 │ │
...
│   │ Extra column: wide                                                                         │ │
│   ╰────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                  │
│ o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back  g: go to  t: top          │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

The header, the status row, the card's top border and the `›` mark are above the box's first row, and two of the three hint rows are below its last. A second Down drew the `Element: Code 14` card the same way, and a third and a fourth left the screen unchanged. `j` then drew `🖼 Figure 14 images/figure-14.png` at the box's second row and the hint rows under it, with `› Media 14` and the header still above the box. `t` drew `│   title: Fixture document` at the box's first row: the view stayed three rows down, so the header and the focused `› ---` were not on screen. `q` and a fresh `/doc-editor thousand-line-doc.md` drew the opening page above (Finding 6).

### Check 3: five Downs in one write

In the outline, from `Long blocks`, `tmux send-keys -t <session> Down Down Down Down Down`, one call. The `›` mark and the one reverse-video entry on screen moved five entries:

```text
‹sgr:7›‹sgr:39››         Table 1‹sgr:0›
```

`Table 1` is entry 6. The first re-check's same call moved the cursor to entry 41.

In the document, from `› Code 14` at row 4, the same one call moved the focus five blocks: the code block, `Quotes 14`, its quote, the `NOTE` callout and `Table 14`. The page did not scroll, and `› Table 14` was at row 21 with the hint rows at rows 34 to 37.

### Check 4: regression pass

- `a`, fold all, from `Table 14`: `› Chapter 14: topic 14` at row 35 and the four hint rows at rows 39 to 42. `a` again, unfold all: the `Table 13` cards at rows 6 to 25, `› Chapter 14: topic 14` at row 38 and the hint rows at rows 40 to 43.
- `t`, `f`, `Hidden text` and Enter: `find "Hidden text" 1 of 14` with `› ▸ Details 1` at row 32. Enter: `2 of 14` with `› ▸ Details 2` at row 32. `b`: `1 of 14` with `› ▸ Details 1` at row 5 and the hint rows at rows 36 to 39.
- `g`, `:301` and Enter: `› Budget block heading anchor marker outline section parser window` at row 4 and its three link buttons at row 9. One Tab put the ring on the second button, `‹sgr:7›→ linked-doc.md#second-section‹sgr:0›`. Enter drew `linked-doc.md › Linked document › Second section` with `› Second section` focused. `b` returned to `thousand-line-doc.md › Chapter 1: topic 1` with the same paragraph focused at row 4.
- With the find field open, Escape left the field on screen and the prompt line empty. `tmux send-keys -t <session> C-x Tab`, one call, then `t`: the `t` landed in the pane's field, `find: Hidden textt  ⏎ next  next match`, and the prompt line stayed `❯`. Backspace emptied the field and Enter closed it.

Twice the keyboard was at the prompt without an Escape from this check: after the host's own second turn, and after `tmux resize-window` back to 160 by 50. Each time the next pane key appeared on the prompt line (`❯ j`) and was erased with Backspace before anything else, and `C-x`, a 0.4 s pause, then `Tab` gave the keyboard back. Whether the resize itself moved the keyboard was not isolated.

### Check 5: close and clean up

`q` closed the pane. `diff` of each fixture against its scratch copy printed nothing, and the scratch directory held only the two fixture files. `tmux kill-session -t <session>`, then `tmux has-session` answered `can't find session`. Both scratch directories were removed with `rm -r`.

### Findings from the second re-check

6. `hooks/pane.ts:1860` keeps the first card of a cut table even when it is taller than the rows the cut leaves (`shown.length > 0 && used > keep`, one card at least), and `hooks/pane.ts:1455-1466` lets the page's first piece through with any `keep`. When the rows left are fewer than one card's 10 rows, the drawn frame is taller than the pane and the header, the status row and the bottom hint rows leave the visible rows. Seen at 100 by 40, where the pane is a box with 11 rows inside, with a card in focus. The view stayed moved after the focus left the table, until the pane was closed and reopened; that the engine's window moved to keep the focus in view is inferred from the screens, not logged. At 160 by 50 a card fits, so this was not seen there. A pane shorter than one card cannot show a whole card and its chrome together, so the fix needs a choice between cutting the card's rows, falling back to a grid, or another drawing.

### After the tall-card fix

Finding 6 is fixed, with one frame left that drops a hint row (Finding 7). This was run at 2026-10-21T17:43Z to 17:48Z with the plugin loaded from `37ee373` (`merge(T-1.2): cut a table card that does not fit the rows left`), which carries `bd54343`. The launch and the Method were the same as above, in a fresh scratch copy, with no prompt sent. The host's startup turn was interrupted with Escape, and the one line submitted was `/doc-editor thousand-line-doc.md`.

At 100 by 40, Enter on `Table 14` in the outline and then one Down put the first card in focus, cut to the rows left, with the header, the focus mark and all three hint rows inside the box:

```text
╭────────────────────────────────────────────────────────────────────────────────────────────────✕─╮
│ thousand-line-doc.md › Chapter 14: topic 14 › Lists 14 › Code 14 › Quotes 14 › Table 14          │
│ READ · 24 min read                                                                               │
│ › ╭────────────────────────────────────────────────────────────────────────────────────────────╮ │
│   │ Element: Markdown 14                                                                       │ │
│   │ … continues below                                                                          │ │
│   ╰────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                  │
│ o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back  g: go to  t: top          │
│ q: close  j: next heading  h: previous heading  c: ask Claude  e: edit  n: next change           │
│ p: previous change  v: view diff  k: keep  x: discard  r: refine                                 │
│                                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

Each further Down showed the card's next row with the marker under it: `Cap: 9,000`, `Source: types file`, `Owner: core`, `Status: ok` and `Notes: Parser window render budget block heading.`, then `Updated: 2026-10-21` with `Extra column: wide`, which closed the card with no marker, then `Extra column: wide` alone. The second card, `Element: Code 14`, followed the same way. The Down after its last rows put `› Media 14` in focus, with the header path ending `› Table 14 › Media 14`. Three times a Down left the screen as it was: on `Element: Markdown 14`, on the first card's `Extra column: wide` and on `Element: Code 14`, each drawn twice in a row. Every frame kept the status row `READ · 24 min read`. `t` drew the header and `› ---` at the box's top, so the view did not stay moved as it did before the fix.

One frame lost the last hint row. When the second card had `Status: ok` and three more rows left, all four were drawn whole, and the box held only two of the three hint rows:

```text
│ › ╭────────────────────────────────────────────────────────────────────────────────────────────╮ │
│   │ Status: ok                                                                                 │ │
│   │ Notes: Section parser window render budget block.                                          │ │
│   │ Updated: 2026-10-21                                                                        │ │
│   │ Extra column: wide                                                                         │ │
│   ╰────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                  │
│ o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back  g: go to  t: top          │
│ q: close  j: next heading  h: previous heading  c: ask Claude  e: edit  n: next change           │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

A second walk from `Table 14` with 16 Downs drew the same frame. The next Down drew `› Media 14` with all three hint rows.

At 160 by 50, after `tmux resize-window`, the keyboard was again at the prompt (`❯ h`). It was erased and given back with `C-x`, a pause and `Tab`. Enter on `Code 14` in the outline, then one Down, drew a page that ends on the second card cut with the marker and keeps the four hint rows at rows 39 to 42:

```text
  ╭───────────────────────────────────────────────────────────────────╮
  │ Element: Code 14                                                  │
  │ Cap: 9,000                                                        │
  │ … continues below                                                 │
  ╰───────────────────────────────────────────────────────────────────╯

o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back
g: go to  t: top  q: close  j: next heading  h: previous heading
c: ask Claude  e: edit  n: next change  p: previous change
v: view diff  k: keep  x: discard  r: refine
```

Four more Downs reached `› Table 14`, a fifth focused the table with both cards drawn whole (`Extra column: wide` at rows 26 and 36), and a sixth focused `› Media 14`. Each of the eight frames held the status row and the `v: view diff` hint row. `q` closed the pane. Both fixture copies were unchanged, and `tmux has-session` answered `can't find session`.

7. In a box 11 rows tall, a card scrolled partly past whose remaining rows fit `keep` is drawn whole (`hooks/pane.ts:1872`). The frame then runs one row past the box and the last hint row is lost. The cause was not isolated. The blank margin row under the table piece may not be counted against `keep`. Seen on one frame of 17, twice.

### After the border fix

Finding 7 is fixed: every frame of the walk keeps the header, the status row and all three hint rows inside the box. Run at 2026-10-21T18:19Z to 18:24Z at 100 by 40, with the plugin loaded from `b90ac26`, which carries `b23eacb` (a continued card's redrawn top border is counted). The launch, the Method and the walk were the same as in the subsection above, in a fresh scratch copy, with no prompt sent. The host's startup turn was interrupted with Escape, and the one line submitted was `/doc-editor thousand-line-doc.md`.

The frame that failed before, the second card at `Status: ok`, is now cut with the marker:

```text
╭────────────────────────────────────────────────────────────────────────────────────────────────✕─╮
│ thousand-line-doc.md › Chapter 14: topic 14 › Lists 14 › Code 14 › Quotes 14 › Table 14          │
│ READ · 24 min read                                                                               │
│ › ╭────────────────────────────────────────────────────────────────────────────────────────────╮ │
│   │ Status: ok                                                                                 │ │
│   │ … continues below                                                                          │ │
│   ╰────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                  │
│ o: outline  z: fold  a: fold all  d: section  u: up  f: find  b: back  g: go to  t: top          │
│ q: close  j: next heading  h: previous heading  c: ask Claude  e: edit  n: next change           │
│ p: previous change  v: view diff  k: keep  x: discard  r: refine                                 │
│                                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

The next Down drew `Notes: Section parser window render budget block.`, `Updated: 2026-10-21` and `Extra column: wide` with the card's bottom border, and the three hint rows on the box's last three inside rows.

Each frame, from Enter on `Table 14` in the outline (frame 0) through 17 Downs. The column says whether all three hint rows were inside the box. The status row `READ · 24 min read` was on every frame:

| Frame | Card row at the box's fifth row | All hint rows inside |
|-------|---------------------------------|----------------------|
| 0 | `› Table 14`, no card | yes |
| 1 | `Element: Markdown 14`, with the marker | yes |
| 2 | `Cap: 9,000` | yes |
| 3 | `Source: types file` | yes |
| 4 | `Owner: core` | yes |
| 5 | `Status: ok` | yes |
| 6 | `Notes: Parser window render budget block heading.` | yes |
| 7 | `Updated: 2026-10-21`, `Extra column: wide`, no marker | yes |
| 8 to 10 | `Extra column: wide` alone | yes |
| 11 | `Element: Code 14`, with the marker | yes |
| 12 | `Cap: 9,000` | yes |
| 13 | `Source: types file` | yes |
| 14 | `Owner: core` | yes |
| 15 | `Status: ok`, with the marker | yes |
| 16 | `Notes: Section parser window render budget block.` to `Extra column: wide`, no marker | yes |
| 17 | `› Media 14`, no card | yes |

Frames 1 to 6 and 11 to 15 drew the marker. Frames 8 to 10 drew the same screen, so two of those Downs moved nothing on screen; the earlier walk showed the same row twice. `q` closed the pane, both fixture copies were unchanged, and `tmux has-session` answered `can't find session`.
