---
title: "What a Claude Code mod doc viewer can share with a web app and an MCP App"
category: research-evidence
tags: [research, evidence, doc-editor, claude-code, mods]
status: complete
source: "claude-opus-5-5-2026-10-15"
task: DED-research-leg-what-kwss
parent_task: DED-research-doc-editor-uhke
---

# What a Claude Code mod doc viewer can share with a web app and an MCP App

A doc-editor mod can share logic, data shapes and design tokens with a web app and an MCP App. It
cannot share UI components with them. The web app and the MCP App can share UI components with each
other, because both run in a DOM. The mod loader forbids npm resolution, Node APIs, the DOM, timers,
`eval` and WebAssembly inside a hooks module, and an installed plugin is copied to a cache that holds
only its own directory. A shared core therefore has to be dependency-free TypeScript that never touches
`$`, and it reaches the mod either by living inside the plugin directory or by a copy step into it.
Heavy work such as PDF parsing belongs in a Node sidecar or the MCP server the mod calls.

## Method

Read 2026-10-14 23:55Z to 2026-10-15 00:25Z on sem-kg-ec2. Native WebSearch is unavailable on this
host and the host's web-search MCP tool was not in this run's tool set, so every source below was fetched
directly with `curl`, `ghp api` or the public npm, bundlejs and GitHub APIs. Context7 was not used:
every library fact needed was available from the project's own README, docs page or published
package.

- Seed docs, read before searching and treated as established: the browser-in-the-TUI survey, the
  mods capability survey, the fleet's mods design and the earlier mods docs evidence file
  [VERIFIABLE][^1][^2][^3][^4]. Their findings are cited, not
  re-derived. This leg extends their §6.2 "one data contract, several renderers" note into a layout.
- Anthropic documentation, fetched as `.md` pages (all HTTP 200): mods overview, create, interface,
  reference, API, events, gallery, test and troubleshoot; plugin loading, host-marketplace,
  marketplace reference, plugins reference, dependencies, publish, install, components and create;
  fullscreen, desktop and the changelog (1,096,437 bytes, newest entry 2.1.300 of 2026-10-14). That
  is 23 pages.
- The public types file `mods/types/claude-code.d.ts` (517,451 bytes, header "Written by Claude Code
  2.1.277"), fetched raw through `ghp api` and grepped locally.
- MCP Apps: the 2026-01-26 specification (1,768 lines), the ext-apps README, package and two example
  sources, the MCP extension support matrix, and three claude.com pages (getting started, design
  guidelines, plugin platform support).
- Repositories read through `ghp api` (README, tree and the source files a finding depends on):
  terminal-browser, claude-code-playground, the `mods/` folder of anthropics/claude-code,
  hamzafer/claude-code-mods, baselane-sh/mods, jkf87/ide-mod, excalidraw/excalidraw-mcp,
  sergeiwallace/beads-ui, sergeiwallace/doc-editor and sergeiwallace/project-template. That is 10
  repositories.
- Document-model libraries: 23 repositories' metadata, 24 npm packages' registry records and weekly
  downloads, 11 bundle sizes from the bundlejs API, and READMEs or docs pages for micromark,
  mdast-util-from-markdown, markdown-it, ProseMirror, CodeMirror, TipTap, Milkdown, BlockNote,
  Lexical, Slate, Yjs and Automerge. A first pass against the bundlephobia API returned HTTP 429 for
  23 of 24 packages, so bundle sizes come from bundlejs instead.
- Nothing was installed, built, tested or run in a Claude Code session. The machine's test slot was
  held by another session.

Each claim carries a tier tag. Repository figures are dated readings from 2026-10-14 or 2026-10-15.

## Findings

### 1. What the mod loader lets a hooks module import

A hooks module may import other files of its plugin by relative path and nothing else except the
`claude-code` module. Anthropic's create page states the rule, the one permitted bare import and the
refusal of dynamic `import()` [VERIFIABLE][^5].

TypeScript loads with no build step. The create page says "You don't need Node.js, a bundler, or a
build step, because Claude Code loads `.js` and `.ts` files directly", and the reference lists the
eight accepted extensions for an ES module that "Exports `register(on, options)`"
[VERIFIABLE][^5][^6].

The runtime environment has no Node and no DOM. The API page says the module "has no Node.js APIs,
no timer globals such as `setTimeout`, and no network or file access of its own" and lists `URL`,
`TextEncoder`, `AbortController` and `crypto.subtle` as available [VERIFIABLE][^7]. The types file
adds "no DOM, no Node" for the module "and every file it imports from the plugin", and says
`eval` and `new Function` throw and "there is no `WebAssembly`" [VERIFIABLE][^8].

The types file's global list is short. It declares `AbortSignal`, `AbortController`, `TextEncoder`,
`TextDecoder`, `URLSearchParams`, `URL`, `atob`, `btoa`, `structuredClone`, `crypto` and
`performance.now`. A surface module (`Client`) gets the same globals plus `console`, and neither has
timers [VERIFIABLE][^8].

JSX does not mean React. JSX in a hooks or surface module "compiles to bare `h(...)` calls", where
`h` and `Fragment` are environment globals that produce plain-data elements, and the drawable
elements come from `$.ui.resolve(e)` rather than from an import [VERIFIABLE][^8]. A React
component library cannot run in a mod [INFERENCE: the JSX factory is fixed to the engine's `h`, and
React itself needs `react-dom` or a reconciler, which the environment does not provide].

Code that calls the mods API cannot be shared through an import. The create page says passing `$`
"to a function you import from another of your files fails validation", and forbids assigning,
destructuring or computed indexing of `$` [VERIFIABLE][^5]. The 2.1.299 changelog entry, dated
2026-10-14, reads "Fixed mods loaded from source files being refused when a hook hands `$` to a
function declaration imported from another file of the mod", which loosens that rule for source-loaded
mods [VERIFIABLE][^9]. The page and the changelog disagree. A shared core that never takes `$`
is valid under both readings [INFERENCE].

Static analysis bounds the source. A hooks-module file may nest at most 2,000 scopes, and a
`Client`'s `module` path must be a string literal of at most 10,000 characters naming a file inside
the plugin [VERIFIABLE][^6][^8].

Tests can import the core. The test page says "A test file can import your mod's own files and
sibling `.ts` helpers, so you can unit test plain functions ... without the kit", and `claude plugin
test` runs them "without a session, a sign-in, or a network", in "an environment like the one a
plugin's hooks run in" [VERIFIABLE][^8][^10]. That makes `claude plugin test` a conformance check that a shared core loads
with no Node and no DOM [INFERENCE].

Generated types have two documented homes. The create page says Claude Code writes them into
`.claude-plugin/types/`, while the 2.1.277 types file header says `.claude/types` is "where
/plugin-types writes this file" [VERIFIABLE][^5][^8]. Anthropic's playground ignores
`.claude-plugin/types/` in each sample's `.gitignore`, which matches the current docs
[VERIFIABLE][^11].

The brief named "the 1 MB module file cap". No such cap appears in the reference limits table, the
create, API, interface or troubleshoot pages, the types file or the changelog. The size limits that
do exist are 2,000 nested scopes, 10,000 characters for a `module` path, 100,000 drawn characters per
tree and 4 MiB per `$.fs` file [NO SOURCE].

TypeScript syntax with runtime meaning is a risk. No Anthropic page says whether `enum`, `namespace`
with code, or parameter properties load. TypeScript 5.8's `--erasableSyntaxOnly` flag exists to reject
exactly those constructs for strip-only loaders [VERIFIABLE][^12]. Whether Claude Code strips or
transpiles is unstated [NO SOURCE]. Restricting the core to erasable syntax keeps it valid either way
[INFERENCE].

### 2. How a plugin reaches files outside its own directory

An installed plugin is a copy. The loading page says every marketplace plugin except local-path and
`--plugin-dir` ones is copied into `cache/<marketplace>/<plugin>/<version>/`, and "Files outside the
plugin directory aren't copied, so when a script inside a copied plugin reads a path above the plugin
root, such as `../shared`, it doesn't find them" [VERIFIABLE][^13].

Component paths may not escape the plugin. A path that resolves outside the plugin root does not
load, and `claude plugin validate` reports `..` as a possible traversal [VERIFIABLE][^14].

Symlinks inside one marketplace are the documented exception. When Claude Code copies a plugin into
its cache, a symlink to elsewhere in the same marketplace "is dereferenced. The target's content is
copied into the cache in its place", while a symlink outside the marketplace is skipped. A plugin
installed from a local path keeps only symlinks that resolve inside the plugin itself
[VERIFIABLE][^15]. With a git-hosted marketplace at the repository root, a symlink from the
plugin to `packages/core/src` would therefore arrive in the cache as a real copy [INFERENCE: from the
dereference rule; whether the hooks-module static analysis accepts an import through a symlink in an
in-place `--plugin-dir` load is unmeasured].

npm dependencies install only for registry packages. When a plugin is copied, Claude Code installs
its `package.json` dependencies "so the plugin's hooks and MCP servers can load them". The install
needs `bun.lock`, `npm-shrinkwrap.json` or `package-lock.json`, skips `yarn.lock` and
`pnpm-lock.yaml`, and gives "no install" to "a git, GitHub, folder, workspace, or linked
dependency" [VERIFIABLE][^13]. A `workspace:*` dependency on a shared core therefore never
resolves in an installed plugin [INFERENCE]. The installed `node_modules` serves settings-hook
scripts and MCP servers, since the hooks module itself still allows only the `claude-code` bare
import [INFERENCE: combining Finding 1's import rule with this install rule].

A monorepo subdirectory can be a plugin source. A `git-subdir` source checks out only that
subdirectory with a partial clone, and an `npm` source fetches a registry package without running its
install scripts [VERIFIABLE][^16]. A relative-path source names a directory inside the
marketplace repository itself [VERIFIABLE][^16].

Plugins can depend on plugins. A plugin may list other plugins under `dependencies` in its
`plugin.json` [VERIFIABLE][^5], and a mod can add a namespace to `$` through `engine.create` for
other mods to call [VERIFIABLE][^6]. terminal-browser uses this to expose `$.browser` [VERIFIABLE][^1].
A doc-editor core could be published as a namespace mod in the same way, though that shares the
mod-side API only, not code the web app can import [INFERENCE].

### 3. How published mods reach shared code today

terminal-browser keeps its plugin outside its pnpm workspace. The workspace lists `browser`, `cli`,
`shared`, `monitor` and the `pixel` packages, and the `claude-code-plugin/` directory is not among
them [VERIFIABLE][^17]. Its bridge types are hand-duplicated in the plugin, under the comment "we
cannot use libraries inside the claude code sandbox, hence this gross code" [VERIFIABLE][^18].
The plugin talks to the browser process over a local HTTP bridge, so the wire protocol is the shared
contract [VERIFIABLE][^1].

Anthropic's playground samples share nothing. Each of the three is one `.mjs` hooks module with no
imports, listed by a nested `claude-code/mods/.claude-plugin/marketplace.json` with relative sources
such as `"./blast-radius"` [VERIFIABLE][^11].

Anthropic's built-in `diff` mod splits one plugin into many files. Its `hooks/register.ts` imports
about twenty local modules by extension-less relative path, such as `import Ask from './ask'`, each a
folder with an `index.ts`, and the folder README describes each built-in as "a complete plugin"
[VERIFIABLE][^19]. A mod can span many files, all inside its own plugin directory.

hamzafer/claude-code-mods (242 stars, MIT) writes its own Markdown parser. Its `md-preview` mod
carries a 497-line `hooks/md.ts`, "A small Markdown reader: blocks, HTML for the page, styled lines
for the text view", with no imports. Its CI runs `claude plugin validate .` on the root marketplace,
then `validate` and `test` on each mod [VERIFIABLE][^20].

baselane-sh/mods solves sharing with a copy build. Its `scripts/build.mjs` says "A plugin may import
only its own files, so each one gets its own copy of the engine and the rules it uses", and "A `$`
call cannot cross an import", so capabilities live in host files inside each plugin. The repository
commits 3,305 generated files under `plugins/` from about 554 under `engines/` [VERIFIABLE][^21].
This is one repository with 1 star, so the pattern is exploratory by Route A; the terminal-browser
duplication and Anthropic's own rule corroborate the constraint behind it [INFERENCE].

ide-mod (7 stars, MIT) runs pdf.js in a Node sidecar. It vendors pdf.js under `vendor/pdfjs/`, ships
`bin/pdf-view.mjs` that imports `node:fs` and `node:child_process`, and calls it from the hooks
module with `$.process.run(['node', ...])`, reading one JSON line from stdout [VERIFIABLE][^22].
That route needs Node on the user's machine [INFERENCE].

### 4. What each surface draws, and where a mod adds nothing

Drawing happens in two places. Only the terminal and the Desktop Code tab show a mod's panes, bands
and replaced rows; the VS Code chat panel, `claude -p`, the Agent SDK and cloud sessions run hooks and
draw nothing [VERIFIABLE][^23].

The element sets differ. `Svg` (up to 131,072 characters) draws only on Desktop, and `Raster` and
`Image` only in the terminal [VERIFIABLE][^6]. The interface page says "The Desktop app has no
`Raster`, so check `e.surface` and draw text there", and a Desktop `Link` is clickable only for
`https:` or `http://localhost` URLs spelled as `new URL(href).href` returns [VERIFIABLE][^24].
In the terminal, "a pane that returns only an `Svg` opens empty" [VERIFIABLE][^25].

The `Markdown` element is the mod's ready-made renderer, with limits a doc viewer must design around.
It "formats text the way Claude's replies are formatted" [VERIFIABLE][^25]. Its `text` takes "At
most 10000 characters", links other than `https:`, `http:` or `file:` draw as text, and `onLinkPress`
hands link presses to the mod [VERIFIABLE][^8]. A whole tree draws its first 100,000 characters
[VERIFIABLE][^6]. A long document therefore has to be cut into blocks of at most 10,000
characters and windowed so the visible set stays under 100,000 [INFERENCE]. The cutting and
windowing code is pure and shareable [INFERENCE].

`Client` is the interactive region. It is "A region drawn by a second file of yours, for animation
and pointer input. That file gets no mods API" [VERIFIABLE][^24]. Its element tree is bounded at
20,000 nodes, 32 deep and 100,000 serialized characters, and its posts at 20,000 values
[VERIFIABLE][^8]. Fullscreen rendering adds mouse support and "works inside tmux, with three
caveats" [VERIFIABLE][^26].

The types file names more surfaces than the docs. Its test kit mounts "on the surface the test names
(terminal, desktop, vscode or", then "mobile", and its element table gives `mobile` and `vscode`
their own sets with `Svg` [VERIFIABLE][^8]. The overview says VS Code draws nothing
[VERIFIABLE][^23]. These are declared surfaces with no documented release [INFERENCE].

The Desktop Code tab already covers HTML, PDF and media. Its Browser pane "can also open static HTML
files, PDFs, images, and videos from your project", and its file pane takes spot edits and "warns you"
if the file changed on disk [VERIFIABLE][^27]. In an SSH session "Claude can't open your app in
the Browser pane" [VERIFIABLE][^27]. On Desktop a doc-editor mod adds value for Markdown
structure (outline, sections, links) and nothing for HTML, PDF or video viewing [INFERENCE: the pane
covers those formats natively, and a mod there has no `Image` or `Raster`].

The types file adds one Desktop detail. An `Svg` with `isInteractive: true` draws "in a script-less
sandboxed frame" so hover and SMIL animation work, and script attributes are scrubbed
[VERIFIABLE][^8].

### 5. MCP Apps: how they render, where, and how a doc viewer would ship as one

An MCP App is HTML in a sandboxed iframe. The specification declares UI resources under the `ui://`
scheme with MIME type `text/html;profile=mcp-app`, requires "Mandatory iframe sandboxing with
auditable communication", and uses "JSON-RPC 2.0 over `postMessage` for iframe-host communication"
[VERIFIABLE][^28]. A web host "MUST wrap the View and communicate with it through an intermediate
Sandbox proxy" on a different origin [VERIFIABLE][^28].

The network is closed by default. With no `ui.csp`, the host must apply `default-src 'none'`,
`script-src 'self' 'unsafe-inline'` and `connect-src 'none'`, and it "MUST NOT allow undeclared
domains" [VERIFIABLE][^28]. Claude restricts `frameDomains` "pending security review"
[VERIFIABLE][^29].

A View talks to its own server through the host. It may send `tools/call`, `resources/read`,
`notifications/message`, `ui/initialize` and `ping` [VERIFIABLE][^28]. A tool with `visibility:
["app"]` is callable by the View and hidden from the model: the host "MUST NOT include tools in the
agent's tool list when their visibility does not include" `"model"` [VERIFIABLE][^28].

The SDK is current and widely installed. `@modelcontextprotocol/ext-apps` is at v2.0.3 (2026-09-25),
2,957 stars, MIT in its `package.json` with an Apache-2.0 relicensing notice in `LICENSE`, and about
5.2 million npm downloads a week [VERIFIABLE][^30][^31]. Its README says "The wire protocol is
unchanged between `ext-apps` 1.x and 2.x" and "There's no _supported_ host implementation in this
repo" beyond `basic-host` [VERIFIABLE][^30]. This passes Route A.

Claude web and Claude Desktop are hosts; Claude Code is not. The extension support matrix ticks MCP
Apps for Claude (web), Claude Desktop, VS Code GitHub Copilot, Microsoft 365 Copilot, Goose,
Postman, MCPJam, ChatGPT, Cursor, Archestra.AI and PostHog Code, and has no Claude Code row
[VERIFIABLE][^32]. Claude Code 2.1.281 "Changed MCP resource lists ... to skip MCP Apps UI
resources; reading one by URI still works" [VERIFIABLE][^9]. The seed survey reached the same
host list on 2026-10-12 [VERIFIABLE][^2].

Claude shows an MCP App after asking. "Claude asks for permission to display the app", and for a
remote server the sandbox origin is the first 32 hex characters of the SHA-256 of the server URL
followed by `.claudemcpcontent.com` [VERIFIABLE][^33]. On mobile, "Claude renders apps in a
native WebView, `WKWebView` on iOS and `WebView` on Android" [VERIFIABLE][^29].

Where an MCP App reaches depends on the server kind. In claude.ai chat, the web, desktop and mobile
apps, a remote `http` or `sse` MCP server in a plugin is listed on its Connectors tab, while a local
MCP server the app starts is ignored; Claude Code loads both [VERIFIABLE][^34]. Claude Desktop
also runs local stdio servers from `claude_desktop_config.json`, which is how Anthropic's examples
connect [VERIFIABLE][^33]. A doc viewer for claude.ai on the web therefore needs a hosted
HTTP server, and one for Claude Desktop can run locally [INFERENCE].

Anthropic's guidelines bound what a doc viewer should look like. They list "Long-form or static
content better suited for external viewing" among patterns to avoid, and they list "Document editing"
among full-screen uses [VERIFIABLE][^29]. A doc-editor MCP App should open in full screen,
with an inline card only as a launcher [INFERENCE].

The official PDF example is a working template for a doc viewer. `@modelcontextprotocol/server-pdf`
pairs a model-and-UI `display_pdf` tool with app-only `read_pdf_bytes` and `save_pdf` tools. It
streams the file in chunks because "On some host platforms, tool calls have size limits", and it
calls `app.updateModelContext` so Claude knows the current page [VERIFIABLE][^35]. It builds
its View with `vite-plugin-singlefile` and its server with Bun, and depends on `pdfjs-dist`
[VERIFIABLE][^35]. No numeric size limit for a Claude tool result or UI resource was found in
the spec, Claude's pages or the SDK README [NO SOURCE].

A web app and an MCP App can share their UI code. The SDK's `convert-web-app` skill makes a web app
"work both as a standalone web app **and** as an MCP App ... from a single codebase", and says the
app's rendering logic is shared and "only the data source changes." The MCP App build "must produce a
single HTML file using `vite-plugin-singlefile`" [VERIFIABLE][^36]. excalidraw/excalidraw-mcp
(5,521 stars) ships the `@excalidraw/excalidraw` React editor as an MCP App with the same Vite
single-file plugin [VERIFIABLE][^37]. Two independent sources support the pattern, so it
passes Route B.

A mod can call the same MCP server an MCP App uses. `$.mcp.call` "Calls `tool` on one of the
engine's connected MCP servers with the engine's own connection and credentials", with no permission
prompt, and the result type carries `structuredContent`, "The server's structured result, when its
tool declares an output schema" [VERIFIABLE][^8]. A plugin can hold a mod and an MCP server
together [VERIFIABLE][^2]. One doc-editor MCP server could therefore serve the MCP App View,
the mod and the web app's API from the same core [INFERENCE]. Whether Claude Code hides app-only
tools from its model is undocumented; the seed survey's read-tool allow-list rule applies to the mod
either way [NO SOURCE].

### 6. Document models and headless cores

Table (b) below carries the measurements. The findings that decide the design follow.

Three parsers fit a mod. micromark (15.9 kB gzipped, MIT, about 64.8 million downloads a week),
mdast-util-from-markdown (16.6 kB, about 63.4 million) and marked (14 kB, about 86.4 million) are
small, ESM, and documented to run in browsers and Deno as well as Node
[VERIFIABLE][^31][^38][^39][^40]. markdown-it (41.3 kB) documents browser use through
CDNs [VERIFIABLE][^40][^41]. None of them can be imported by a mod as an npm package
(Finding 1), so using one means copying its code and its dependency closure into the plugin
[INFERENCE].

A browser build can carry a DOM call into the core. `decode-named-character-reference`, a micromark
dependency, maps the `browser` export condition to `index.dom.js`, which runs `const element =
document.createElement('i')` at import time; `worker`, `deno` and the default condition map to a
DOM-free file [VERIFIABLE][^42]. A copy of micromark for the mod built with the `browser` condition
would fail to load [INFERENCE: the mod environment has no `document`]. The same check applies to
every dependency the core copies.

ProseMirror's data layers are separate from its view. The guide says `prosemirror-model` defines the
document model, `prosemirror-state` holds the state and transactions, and only `prosemirror-view`
"implements a user interface component" that "shows a given editor state as an editable element in
the" browser. Documents are
persistent and have "a built-in JSON serialization format" [VERIFIABLE][^43]. The model,
state and transform packages bundle to 27.1 kB gzipped together [VERIFIABLE][^40]. Whether
`prosemirror-model` loads with no `document` global is unmeasured, since its `DOMParser` and
`DOMSerializer` live in the same package [NO SOURCE].

ProseMirror and CodeMirror left GitHub in April 2026. The `ProseMirror/prosemirror-model` README says
"This repository has moved to https://code.haverbeke.berlin/prosemirror/prosemirror-model", and
`codemirror/dev` says the same for CodeMirror. The GitHub repositories are archived, with last
pushes on 2026-04-01 and 2026-04-15 [VERIFIABLE][^44][^45]. Their GitHub star counts are
frozen, so maintenance must be read from npm, where `prosemirror-model` 1.25.12 has about 25.6
million and `@codemirror/state` 6.7.6 about 15.1 million downloads a week [VERIFIABLE][^31].

CodeMirror 6 state is functional and small. Its guide calls the state representation "strictly functional": the data structures are
immutable, and "operations on them are pure functions, whereas the" view wraps them in an imperative
interface [VERIFIABLE][^46]. `@codemirror/state` bundles
to 16.7 kB gzipped [VERIFIABLE][^40]. It is the strongest candidate for a shared plain-text
editing state, driven by a `Client` in the terminal and by `@codemirror/view` on the web [INFERENCE:
whether it loads in the mod environment is unmeasured].

The rich-text editors are web-first. TipTap's static renderer "doesn't require a browser, DOM or even
an editor instance" [VERIFIABLE][^47]. Milkdown is "built on top of prosemirror and remark"
[VERIFIABLE][^48]. BlockNote's core is MPL-2.0, its XL packages are GPL-3.0, and its
`@blocknote/server-util` depends on `jsdom` and `@blocknote/react` [VERIFIABLE][^49][^50].
Lexical says "an editor that is never given a root element already skips all DOM work"
[VERIFIABLE][^51], but its core calls a bare `setTimeout` in `LexicalUpdates.ts`
[VERIFIABLE][^52], which the mod environment lacks. Slate "is currently in beta"
[VERIFIABLE][^53]. Any of these can be the web and MCP App editor if it round-trips to Markdown
source; none should be the canonical model the mod depends on [INFERENCE].

Of the CRDTs, only Yjs could load in a mod. Yjs is MIT, 22,937 stars and 28.8 kB gzipped
[VERIFIABLE][^40][^54][^55]. Its published `dist/yjs.mjs` (13.6.33) calls `setTimeout` in
two places, both inside the optional `PermanentUserData` class, and its `lib0/environment` import
guards `process` with `typeof` checks [VERIFIABLE][^54]. A GitHub code search of `yjs/yjs` `src` for
`setTimeout` returned 0 while a control term returned 19, so the search index missed that file; the
dist read is the measurement [VERIFIABLE][^55].
Automerge's core is Rust "compiled to WebAssembly and distributed as a separate package"
[VERIFIABLE][^56], and the Loro package ships `loro_wasm_bg.wasm` files of about 3.4 MB
[VERIFIABLE][^57]. A hooks module has no `WebAssembly` (Finding 1), so both are excluded from the mod
side [INFERENCE].

PDF parsing belongs outside the mod. pdf.js (54,003 stars, Apache-2.0) is the library both ide-mod
and the official PDF MCP App use, and both run it in Node, not in a hooks module
[VERIFIABLE][^22][^35][^55]. `pdfjs-dist` unpacks to about 34.9 MB [VERIFIABLE][^31].

### 7. beads-ui: what doc-editor can align with

beads-ui plans the same shape. Its repository description is "Beads task manager UI: a Claude Code
mod for the TUI, an MCP UI app for Claude Desktop and the web, and a local or hostable web app,
sharing one core", and its README plans "A monorepo with one core package for data access, state,
layout and theme, and one package per surface" [VERIFIABLE][^58]. The README already states the
key constraint: "A mod draws to the terminal and has no DOM, so the surfaces share logic and design
tokens rather than UI components" [VERIFIABLE][^58].

beads-ui has no design yet. Its tree on `main` holds only the Copier scaffold, a README and a stub
docket, and its only pull request is the scaffold [VERIFIABLE][^58]. A beads-ui research doc
exists in a local worktree of its coordinator, not on any pushed branch, so it is not cited here
[INFERENCE].

The two repositories share a scaffold. Both `.copier-answers.yml` files point at
`https://github.com/sergeiwallace/project-template` at `v1.18.0-148-g94a638d` with `tech_stack:
typescript` [VERIFIABLE][^58][^59].

### 8. Open-source hygiene in the doc-editor repository

The repository is public, MIT and scaffolded. Its topics include `claude-code-mod`, `markdown`,
`pdf` and `tui`, and its README states it holds no secrets [VERIFIABLE][^59].

GitHub scores its community profile at 57%. The profile API reports a licence, a README and a
pull-request template, and no code of conduct, contributing guide or issue template; beads-ui also
scores 57% and claude-code-playground 75% [VERIFIABLE][^60]. No `SECURITY.md` is in the tree
[VERIFIABLE][^59]. Anthropic's playground ships `CONTRIBUTING.md`, `SECURITY.md` and
`CODE_OF_CONDUCT.md` [VERIFIABLE][^11], and hamzafer's collection ships `SECURITY.md` and
two issue templates [VERIFIABLE][^20].

The Copier source is private. `sergeiwallace/project-template` reports `private`, so an outside
contributor cannot run the `copier update` the README describes [VERIFIABLE][^59][^61].
Its `copier.yml` offers `python`, `typescript`, `rust`, `go`, `rust-typescript` and
`python-typescript` stacks [VERIFIABLE][^61]. The doc-editor tree still carries three Python
scripts from the template (`check_ruff_version_sync.py`, `export_conversations.py`,
`session-broker.py`) in a TypeScript repository [VERIFIABLE][^59].

The `.gitignore` lacks the mod's generated files. It ignores `node_modules/`, `dist/`, `.env` and the
Beads state, but not `.claude-plugin/types/` or a generated `tsconfig.json` [VERIFIABLE][^59].
The fleet design already found that Claude Code writes both into a plugin directory on load
[VERIFIABLE][^3].

## Tables

### (a) Loader constraints

| Constraint | Verbatim source text | Source | Consequence for a shared core |
|---|---|---|---|
| Imports | "Import only from files inside the plugin directory, by relative path. The one bare import allowed is `claude-code`, for types and a few helpers." | Create page [^5] | No npm, no workspace package, no path above the plugin root |
| Import form | "A dynamic `import()` fails" | Create page [^5] | Static `import` declarations only; no lazy-loaded parser plugins |
| Build | "You don't need Node.js, a bundler, or a build step, because Claude Code loads `.js` and `.ts` files directly." | Create page [^5] | The core can be `.ts` source the mod imports as is |
| Runtime | "has no Node.js APIs, no timer globals such as `setTimeout`, and no network or file access of its own" | API page [^7] | No `fs`, `path`, `process`, `Buffer`, `setTimeout` in the core |
| Environment | "no DOM, no Node. The module, and every file it imports from the plugin," | Types file [^8] | No `document`, `window`, `HTMLElement` anywhere in the import closure |
| Code generation | "there is no `WebAssembly` (deliberately; a module that" | Types file [^8] | No WASM parsers or CRDTs (Automerge, Loro); `eval` and `new Function` throw too |
| JSX | "`h` and `Fragment` (what JSX compiles against)" | Types file [^8] | No React; rendering code is surface-specific |
| `$` | "Passing `$` to a method, a function defined inside the hook, or a function you import from another of your files fails validation." | Create page [^5] | The core takes data and returns data; every `$` call stays in the hooks module |
| `$` (later build) | "Fixed mods loaded from source files being refused when a hook hands `$` to a function declaration imported from another file of the mod" | Changelog 2.1.299 [^9] | Conflicts with the row above; do not rely on either |
| Scope depth | "code nested too deep to scan: more than 2000 scopes" | Troubleshoot page, via the reference limits [^6] | Generated or minified parser code must stay shallow |
| Client module | "Read off the source: a variable there is refused at load, as is a path" | Types file [^8] | Surface module paths are literals inside the plugin |
| Types | "it writes TypeScript declaration files into the mod's `.claude-plugin/types/` directory" | Create page [^5] | Gitignore the generated directory |
| Tests | "A test file can import your mod's own files and sibling `.ts` helpers" | Test page [^10] | `claude plugin test` proves the core loads in the mod environment |
| Installed copy | "Files outside the plugin directory aren't copied" | Loading page [^13] | The core must be inside the plugin when it is installed |
| npm install | "A plugin with a git, GitHub, folder, workspace, or linked dependency gets no install." | Loading page [^13] | A `workspace:*` link never reaches an installed plugin |
| Symlinks | "the symlink is dereferenced. The target's content is copied into the cache in its place." | Host-marketplace page [^15] | A symlink to the core inside the same marketplace survives a git install |
| Module size | No 1 MB cap found | None | The brief's cap is unverified |

### (b) Document models and cores

Stars, licence and last push from GitHub on 2026-10-14; npm version and weekly downloads from the
npm registry and downloads API on 2026-10-15; gzipped size from the bundlejs API with
`platform: "browser"` on 2026-10-15 [^31][^40][^55]. "Mod-loadable" means the documented
environment of Finding 1 permits it if the code is copied into the plugin; no row was load-tested.

| Library | Layer | DOM-free core | Node APIs needed | Gzipped size | Licence | Stars, last push | npm version, downloads per week | Mod-loadable | Shareable layer across mod, web and MCP App |
|---|---|---|---|---|---|---|---|---|---|
| micromark | CommonMark tokenizer | Yes, except the `browser` build of one dependency [^42] | No (a separate Node stream entry exists) [^38] | 15.9 kB | MIT | 2,233, 2026-09-26 | 4.0.3, 64.8 M | Expected, untested; needs the default export condition | Parsing to tokens or HTML |
| mdast-util-from-markdown | Markdown to mdast tree | Yes, same caveat | No [^39] | 16.6 kB | MIT | 293, 2026-10-03 | 2.1.0, 63.4 M | Expected, untested; same caveat | The mdast tree with source positions, outline, links |
| unified and remark-parse | Plugin pipeline over mdast | Yes | No | Not measured | MIT | unified 5,043; remark 9,019 | 11.0.5 and 11.0.0, 62.8 M and 57.4 M | Partly; dynamic plugin loading is unavailable, static imports work | Web and MCP App pipelines; the mod can use the mdast layer only |
| markdown-it | Markdown to tokens and HTML | Yes | No [^41] | 41.3 kB | MIT | 21,979, 2026-09-12 | 15.0.2, 28.8 M | Expected, untested | Token stream and HTML for web; tokens for the mod |
| marked | Markdown to HTML | Yes | No | 14 kB | MIT (npm) | 37,238, 2026-10-14 | 18.1.1, 86.4 M | Expected, untested (no dependencies) | HTML for web; its lexer tokens for the mod |
| ProseMirror model, state, transform | Schema, persistent document, transactions | Data layers yes; `DOMParser` and `DOMSerializer` sit in the model package [^43] | No | 27.1 kB for the three | MIT | Archived on GitHub 2026-04-01; moved [^44] | 1.25.12 model, 25.6 M | Unmeasured | Document JSON and steps, if the web editor is ProseMirror-based |
| TipTap | Editor framework over ProseMirror | Static renderer needs no DOM [^47] | No | 103 kB (`@tiptap/core`) | MIT | 38,728, 2026-10-14 | 3.32.0, 22.7 M | No (view-bound core) | Web and MCP App editor; JSON document |
| Milkdown | WYSIWYG Markdown on ProseMirror and remark [^48] | No (editor) | No | Not measured | MIT | 11,991, 2026-10-13 | 7.22.3, 0.64 M | No | Web and MCP App editor with Markdown round trip |
| BlockNote | Block editor on ProseMirror | No; server rendering uses `jsdom` [^50] | Yes for server use | Not measured | MPL-2.0 core, GPL-3.0 XL packages [^49] | 10,295, 2026-10-14 | 0.56.0, 0.81 M | No | Web only; licence needs review |
| Lexical | Editor state and nodes | Headless mode skips DOM work [^51] | No | 70.6 kB | MIT | 23,949, 2026-10-14 | 0.52.0, 6.0 M | No: bare `setTimeout` in core [^52] | Web and MCP App editor only |
| Slate | Editor model, React view | Core model yes | No | 30.2 kB | MIT | 31,746, 2026-10-15 | 0.138.2, 3.0 M | Unmeasured; beta [^53] | Web editor only |
| CodeMirror 6 state | Text, selection, transactions | Yes, "strictly functional" [^46] | No | 16.7 kB | MIT | Archived on GitHub 2026-04-15; moved [^45] | 6.7.6, 15.1 M | Unmeasured; candidate | Plain-text editing state for a terminal `Client` and the web source view |
| Yjs | CRDT | Yes [^54] | No | 28.8 kB | MIT | 22,937, 2026-10-07 | 13.6.33, 10.3 M | Expected, untested; `setTimeout` only in the optional `PermanentUserData` | Later collaboration across web and MCP App |
| Automerge | CRDT | Yes | No | 47.5 MB unpacked (WASM) | MIT | 6,657, 2026-10-14 | 3.5.0, 0.09 M | No: WebAssembly [^56] | Web or server only |
| Loro | CRDT | Yes | No | 20.8 MB unpacked (WASM) [^57] | MIT | 6,219, 2026-10-09 | 1.16.4, 0.35 M | No: WebAssembly | Web or server only |
| pdf.js (`pdfjs-dist`) | PDF parse and render | No (canvas and workers for rendering) | Used under Node by ide-mod and server-pdf [^22][^35] | 34.9 MB unpacked | Apache-2.0 | 54,003, 2026-10-14 | 6.4.299, 33.3 M | No | Server or sidecar; its text and layout output is shareable JSON |

### (c) Share and do-not-share matrix

"Shared" means one TypeScript module imported by every surface named. Evidence for each cell is the
Finding named in the last column.

| Layer | Mod (terminal and Desktop Code tab) | Web app | MCP App View | MCP server | Basis |
|---|---|---|---|---|---|
| Document types (block tree, positions, block ids) | Shared | Shared | Shared | Shared | Findings 1, 6 |
| Markdown parsing to the shared tree | Shared if the parser is copied in with DOM-free builds | Shared | Shared | Shared | Findings 1, 6 |
| Outline, table of contents, search, link index | Shared | Shared | Shared | Shared | Finding 6 |
| Block cutting at 10,000 characters and windowing at 100,000 | Shared | Optional | Shared (chunked loading) | Shared | Findings 4, 5 |
| Edit operations as source-range replacements | Shared | Shared | Shared | Shared | Findings 4, 6 |
| Command and keymap registry (names, arguments, enablement) | Shared | Shared | Shared | Not used | Finding 1 |
| Design tokens (semantic colour names, spacing scale) | Shared, mapped to terminal colours | Shared, mapped to CSS variables | Shared, mapped to host style variables | Not used | Findings 5, 7 |
| Plain-text editing state (CodeMirror state or own) | Shared if it loads | Shared | Shared | Not used | Finding 6 |
| Rich-text editor (TipTap, Milkdown, Lexical) | Not shared | Shared with MCP App | Shared with web | Not used | Findings 1, 6 |
| UI components (React or other DOM) | Not shared: JSX compiles to `h` | Shared with MCP App | Shared with web | Not used | Findings 1, 5 |
| Rendering tree (`Box`, `Text`, `Markdown`, `Client`) | Mod only | Not used | Not used | Not used | Finding 4 |
| File access | `$.fs` (4 MiB per file) | Browser or server API | App-only tools | Node `fs` | Findings 1, 5 |
| PDF and HTML conversion | Calls a sidecar or the MCP server | Server or worker | Server tools | pdf.js, HTML to text | Findings 3, 6 |
| Collaboration CRDT | Yjs only, later | Any | Any | Any | Finding 6 |
| Tests of the shared core | `claude plugin test` | Vitest or similar | Vitest or similar | Vitest or similar | Finding 1 |

### (d) Layout patterns with exemplars

| Pattern | How the mod gets shared code | Exemplar | Signal (2026-10-14) | Fit for doc-editor |
|---|---|---|---|---|
| One plugin per folder, no sharing | Each mod is self-contained | anthropics/claude-code-playground: nested `marketplace.json`, one `.mjs` per mod [^11] | 231 stars, Apache-2.0 | Fine for one mod; no web or MCP App |
| Many files inside one plugin | Relative imports between local modules | anthropics/claude-code `mods/diff` [^19] | Ships inside Claude Code | How the mod itself should be split |
| Plugin outside the workspace, protocol duplicated | Hand-copied types; HTTP bridge to the rest | zenbu-labs/terminal-browser [^17][^18] | 3,871 stars, MIT, pushed 2026-10-07 | Proves the boundary; duplication drifts |
| Copy build into each plugin | A script copies the engine into every plugin and commits the output | baselane-sh/mods `scripts/build.mjs` [^21] | 1 star, MIT | Works; exploratory by Route A; needs a drift check |
| Root marketplace over many mods, CI per mod | `claude plugin validate .`, then `validate` and `test` per mod | hamzafer/claude-code-mods [^20] | 242 stars, MIT, pushed 2026-10-14 | The gate shape to copy |
| Node sidecar from the mod | `$.process.run(['node', ...])` on a vendored library | jkf87/ide-mod [^22] | 7 stars, MIT | PDF and heavy parsing |
| Web app plus MCP App from one codebase | Same UI code, two entry points, single-file View build | ext-apps `convert-web-app`, excalidraw-mcp [^36][^37] | 2,957 and 5,521 stars | The web and MCP App half of doc-editor |
| Monorepo subdirectory as plugin source | `git-subdir` partial clone of one folder | Documented [^16] | Anthropic docs | Lets the plugin live under `plugins/` |
| Symlink from plugin into the marketplace | Dereferenced into the cache on a git install | Documented [^15] | Anthropic docs; no exemplar found | Avoids a copy step; unmeasured for in-place loads and on Windows |

## Gaps, blindspots and emergent findings

- The 1 MB module cap in the brief was not found in any Anthropic page, the types file or the
  changelog. If a cap exists it is undocumented [NO SOURCE].
- Whether the hooks-module static analysis follows an import through a symlink, in an in-place
  `--plugin-dir` or local-marketplace load, is unmeasured. The documented symlink rule covers the copy
  into the cache only [NO SOURCE].
- Whether a `Client` surface module may import runtime code from other plugin files is undocumented.
  terminal-browser's surface module imports only types [NO SOURCE].
- No library in table (b) was loaded in the mod environment. "Expected, untested" rests on documented browser and
  Deno support plus the absence of Node imports. A spike under `claude plugin test` settles it in
  minutes once the test slot is free [INFERENCE].
- The create page and the 2.1.299 changelog disagree on passing `$` to an imported function
  (Finding 1). The page may lag the build, as the seed survey found for other pages
  [VERIFIABLE][^2].
- The generated types directory is `.claude-plugin/types/` in the docs and `.claude/types` in the
  2.1.277 types file header. The public types file is 23 releases older than the newest changelog
  entry [VERIFIABLE][^5][^8][^9].
- The types file declares `mobile` and `vscode` render surfaces with `Svg`, which the docs do not
  release. A future mobile surface would change what the shared core should prepare for (Finding 4)
  [INFERENCE].
- MCP Apps already render on Claude's iOS and Android apps through a WebView (Finding 5). The
  founding ask plans a separate mobile repository for beads; an MCP App reaches a phone with no native
  app, which bears on that later decision [INFERENCE].
- Claude Code does not render MCP Apps and hides their UI resources from lists (Finding 5). Whether it
  also hides app-only tools (`visibility: ["app"]`) from its model is undocumented. If it does not,
  Claude would see tools such as a `save_document` meant only for the View [NO SOURCE].
- Whether the Desktop app's Code tab renders MCP Apps in a Code session is not documented. The
  extension matrix lists "Claude Desktop" without naming the tab [NO SOURCE].
- ProseMirror and CodeMirror moved to `code.haverbeke.berlin` in April 2026. That forge was not
  fetched, so their issue and release activity since then is unread; npm downloads stand in
  [NO SOURCE].
- Bundle sizes were measured with bundlejs's `browser` platform, which picks DOM builds such as
  `index.dom.js`. A mod build with DOM-free conditions can differ slightly [INFERENCE].
- No social sources were searched (no WebSearch, no `web_search` tool in this run). Practitioner
  reports of sharing code between a mod and a web app would be missed [NO SOURCE].
- A beads-ui research doc on the shared core is being written in a local worktree and is not on any
  pushed branch. Its conclusions may differ from this leg's; the coordinators should compare before
  either design fixes package names [INFERENCE].
- Anchor bias check: the brief framed the question as sharing frontend components. The evidence moves
  most sharing below the UI, and moves the main UI sharing to web and MCP App. The brief also
  assumed a vendored copy is the only route; the in-plugin core, the marketplace symlink and the
  MCP-server core are three more (Recommendation 2).
- Founding ask alignment: entry A003 asks whether "the web / mcp ui app / claude code mods tui app
  could share frontend components / code / modules". This leg answers code and modules yes for all
  three, and frontend components yes only between the web app and the MCP App. That narrows the
  ask's "frontend components" for the mod with evidence (Finding 1). A003's desktop-app question is
  answered for the Desktop Code tab only (Finding 4); a native desktop app was out of scope. A004's
  Copier question is answered in Finding 8.

## Recommendations to the coordinator

1. Define the shared core as dependency-free TypeScript with erasable syntax only, no DOM, no Node,
   no timers, no `eval`, no WebAssembly, plain-JSON inputs and outputs, and no `$` parameter anywhere.
   Every `$` call stays in the mod's hooks module. Rests on Finding 1 and table (a).
2. Choose how the mod reaches the core from four routes, in this order of preference for the MVP:
   (a) put the core's source inside the plugin directory and let the web and MCP App packages import
   it by path or a workspace alias, so the mod needs no build step (consistent with the fleet's D-3);
   (b) a copy script from `packages/core` into the plugin with a committed output and a pre-commit
   drift check (the baselane pattern); (c) a symlink from the plugin into the marketplace, only after
   a spike shows the static analysis and an in-place load accept it; (d) heavy work in the MCP server
   or a Node sidecar called with `$.mcp.call` or `$.process.run`. Rests on Findings 1 to 3 and
   table (d). Route (a) is an inference with no exemplar found and needs the same spike as (c).
3. Run one spike before the design fixes the layout: under `claude plugin test`, import a copy of
   micromark plus `mdast-util-from-markdown` built with the default export condition,
   `@codemirror/state`, `prosemirror-model` and `yjs`, and assert each loads and parses. Add a
   symlinked-import case and a `Client` module that imports a sibling file. Rests on the Gaps list
   and table (b).
4. Make the mod render through the native `Markdown` element, cut into blocks of at most 10,000
   characters and windowed under 100,000 per tree, with links answered through `onLinkPress`. Put the
   cutting and windowing in the core so the MCP App's chunked loading reuses it. Rests on Finding 4.
5. Keep the canonical document as Markdown source text with mdast positions, and express edits as
   source-range replacements. Let the web and MCP App choose a rich editor later (TipTap or Milkdown
   round-trip to Markdown) without making the mod depend on it. Exclude Lexical, BlockNote, Automerge
   and Loro from the shared core. Rests on Finding 6.
6. Ship the MCP App as the web app's second entry point built with `vite-plugin-singlefile`, opened in
   full screen, with app-only tools for reading chunks and saving, and `updateModelContext` for what
   the user sees, following `@modelcontextprotocol/server-pdf`. Target Claude Desktop with a local
   stdio server first and add a hosted HTTP server for claude.ai on the web. Rests on Finding 5.
7. Do not build HTML, PDF or video viewing for the Desktop Code tab; its Browser pane does it. Do PDF
   in the terminal through a pdf.js sidecar or the MCP server, as ide-mod and server-pdf do. Rests on
   Findings 3, 4 and 6.
8. Use npm workspaces, not pnpm, for any package that ships inside a plugin with dependencies,
   because Claude Code's dependency install skips `pnpm-lock.yaml` and workspace links. Keep the mod
   plugin itself free of `package.json` runtime dependencies. Rests on Finding 2.
9. Lay the repository out as a root `.claude-plugin/marketplace.json` listing `./plugins/doc-editor`,
   a `packages/` folder for core, web and mcp-app, and a CI gate of `claude plugin validate .` plus
   per-plugin `validate` and `test` (hamzafer's shape). Align package names and the layout with
   beads-ui, which plans the same split; do not inherit its Beads data access. Rests on Findings 3
   and 7 and table (d).
10. Add `CONTRIBUTING.md`, `SECURITY.md` and a code of conduct, ignore `.claude-plugin/types/` and a
    generated `tsconfig.json`, and decide whether the Python scripts from the template stay. Rests on
    Finding 8.
11. Escalate one item. The Copier template is private while doc-editor and beads-ui are public, so
    the README's `copier update` instruction does not work for outside contributors. Making the
    template public, or saying in the README that it is private, is an outward-facing choice for
    Sergei. Rests on Finding 8.

## Sources

[^1]: ai-harness. (2026). [A working web browser inside the Claude Code TUI through mods](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods-web-browser-in-the-tui.md). `docs/research/claude-code-mods-web-browser-in-the-tui.md`. Private repository; read in full locally 2026-10-14. (terminal-browser plugin, `$.browser` namespace, HTTP bridge.)
[^2]: ai-harness. (2026). [Claude Code mods: capabilities, ecosystem and fit for the fleet](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods.md). `docs/research/claude-code-mods.md`. Private repository; read locally 2026-10-14 (§1.2 to §1.7, §3.5, §5, §6). (MCP Apps host list, `$.mcp.call`, docs drift, plugin bundles.)
[^3]: ai-harness. (2026). [Claude Code mods for ai-harness and every project](https://github.com/sergeiwallace/ai-harness/blob/main/docs/designs/aih-xhc5u-claude-code-mods.md). `docs/designs/aih-xhc5u-claude-code-mods.md`. Private repository; read locally 2026-10-14 (layout, D-3, D-10). (Generated types and `tsconfig.json` written on load.)
[^4]: ai-harness. (2026). [Mods docs capabilities evidence](https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/evidence/aih-xhc5u/mods-docs-capabilities.md). `docs/research/evidence/aih-xhc5u/mods-docs-capabilities.md`. Private repository; read locally 2026-10-14 (§2). (Earlier verbatim loader rules.)
[^5]: Anthropic. (2026). [Create a mod](https://code.claude.com/docs/en/plugins/mods/create.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (No build step, import rules, `$` passing rule, generated types.)
[^6]: Anthropic. (2026). [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Files table, elements by surface, limits, `engine.create`.)
[^7]: Anthropic. (2026). [Use the mods API](https://code.claude.com/docs/en/plugins/mods/api.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (No Node APIs or timers; available web APIs.)
[^8]: Anthropic. (2026). [claude-code: mods/types/claude-code.d.ts](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts). GitHub. Fetched raw via `ghp api` 2026-10-15 (HTTP 200, 517,451 bytes, header "Written by Claude Code 2.1.277"). (Environment, globals, JSX factory, `Client` bounds, `MarkdownProps`, surfaces, `$.mcp.call`, `McpToolResult`.)
[^9]: Anthropic. (2026). [Claude Code changelog](https://code.claude.com/docs/en/changelog). Claude Code Documentation. Verified accessible (HTTP 200, `.md`, 1,096,437 bytes) 2026-10-15. (2.1.299 `$` import fix; 2.1.281 MCP Apps UI resources; newest 2.1.300.)
[^10]: Anthropic. (2026). [Test a mod](https://code.claude.com/docs/en/plugins/mods/test.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Tests import the mod's own files; multi-surface mounts.)
[^11]: Anthropic. (2026). [claude-code-playground](https://github.com/anthropics/claude-code-playground). GitHub. Tree, `claude-code/mods/.claude-plugin/marketplace.json`, `README.md` and a sample `.gitignore` read via `ghp api` 2026-10-15 (231 stars, Apache-2.0, created 2026-09-25, pushed 2026-10-14).
[^12]: Rosenwasser, D. (2025, February 28). [Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/). TypeScript Blog. Verified accessible (HTTP 200) 2026-10-15. (`--erasableSyntaxOnly`.)
[^13]: Anthropic. (2026). [Plugin loading reference](https://code.claude.com/docs/en/plugins/loading.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (In-place and copied plugins, escaping paths, npm dependency install rules.)
[^14]: Anthropic. (2026). [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Containment and existence of component paths.)
[^15]: Anthropic. (2026). [Host a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Share files within a marketplace with symlinks.)
[^16]: Anthropic. (2026). [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Plugin source types, `git-subdir`, `npm`.)
[^17]: zenbu-labs. (2026). [terminal-browser](https://github.com/zenbu-labs/terminal-browser). GitHub. Tree and `pnpm-workspace.yaml` read via `ghp api` 2026-10-15 (3,871 stars, MIT, created 2026-07-06, pushed 2026-10-07).
[^18]: zenbu-labs. (2026). [terminal-browser: claude-code-plugin/hooks/bridge-protocol.ts](https://github.com/zenbu-labs/terminal-browser/blob/main/claude-code-plugin/hooks/bridge-protocol.ts). GitHub. Read via `ghp api` 2026-10-15 (HTTP 200).
[^19]: Anthropic. (2026). [claude-code: mods](https://github.com/anthropics/claude-code/tree/main/mods). GitHub. `README.md` and `diff/hooks/register.ts` read via `ghp api` 2026-10-15 (HTTP 200).
[^20]: hamzafer. (2026). [claude-code-mods](https://github.com/hamzafer/claude-code-mods). GitHub. Tree, root `marketplace.json`, `mods/md-preview/hooks/md.ts` and `.github/workflows/ci.yml` read via `ghp api` 2026-10-15 (242 stars, MIT, created 2026-10-02, pushed 2026-10-14).
[^21]: Baselane. (2026). [baselane-sh/mods: scripts/build.mjs](https://github.com/baselane-sh/mods/blob/main/scripts/build.mjs). GitHub. Tree and build script read via `ghp api` 2026-10-15 (1 star, MIT, created 2026-10-04, pushed 2026-10-06).
[^22]: jkf87. (2026). [ide-mod](https://github.com/jkf87/ide-mod). GitHub. Tree, `bin/pdf-view.mjs` and `hooks/register.tsx` read via `ghp api` 2026-10-15 (7 stars, MIT, created 2026-10-06, pushed 2026-10-13).
[^23]: Anthropic. (2026). [Mods overview](https://code.claude.com/docs/en/plugins/mods/overview.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Where hooks run and where drawing appears.)
[^24]: Anthropic. (2026). [Draw in the interface with a mod](https://code.claude.com/docs/en/plugins/mods/interface.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (`Client`, Desktop has no `Raster`, `Link` rules.)
[^25]: Anthropic. (2026). [Interface gallery for mods](https://code.claude.com/docs/en/plugins/mods/gallery.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (`Markdown`, `Svg` in the terminal.)
[^26]: Anthropic. (2026). [Fullscreen rendering](https://code.claude.com/docs/en/fullscreen.md). Claude Code Documentation. Verified accessible (HTTP 200) 2026-10-15. (Mouse support; tmux caveats.)
[^27]: Anthropic. (2026). [Desktop application](https://code.claude.com/docs/en/desktop.md). Claude Code Documentation. Verified accessible (HTTP 200, 146,891 bytes) 2026-10-15. (Browser pane file types, file pane edits, SSH limit.)
[^28]: Model Context Protocol. (2026, January 26). [MCP Apps specification 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx). GitHub. Fetched raw via `ghp api` 2026-10-15 (HTTP 200, 1,768 lines). (UI resources, sandbox proxy, CSP defaults, View messages, tool visibility.)
[^29]: Anthropic. (2026). [MCP Apps design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md). Claude Documentation. Verified accessible (HTTP 200) 2026-10-15. (Patterns to avoid, full-screen uses, mobile WebView, `frameDomains`.)
[^30]: Model Context Protocol. (2026). [ext-apps](https://github.com/modelcontextprotocol/ext-apps). GitHub. README, `package.json` and `LICENSE` read via `ghp api` 2026-10-15 (2,957 stars, created 2025-11-21, pushed 2026-09-25, release v2.0.3 of 2026-09-25).
[^31]: npm, Inc. (2026). [npm registry](https://registry.npmjs.org/micromark/latest) and [downloads API](https://api.npmjs.org/downloads/point/last-week/micromark). Records for the 24 packages in table (b) read 2026-10-15 (HTTP 200; version, licence, `unpackedSize`, last-week downloads).
[^32]: Model Context Protocol. (2026). [Extension support matrix](https://modelcontextprotocol.io/extensions/client-matrix.md). modelcontextprotocol.io. Verified accessible (HTTP 200) 2026-10-15.
[^33]: Anthropic. (2026). [Get started with MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md). Claude Documentation. Verified accessible (HTTP 200) 2026-10-15. (Claude Desktop config, permission to display, `ui.domain`.)
[^34]: Anthropic. (2026). [Plugin feature support across platforms](https://claude.com/docs/plugins/platform-support.md). Claude Documentation. Verified accessible (HTTP 200) 2026-10-15. (Component support in Chat, Cowork and Claude Code.)
[^35]: Model Context Protocol. (2026). [ext-apps: examples/pdf-server](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/pdf-server). GitHub. `README.md` and `package.json` read via `ghp api` 2026-10-15 (HTTP 200; package `@modelcontextprotocol/server-pdf` 2.0.3, MIT).
[^36]: Model Context Protocol. (2026). [ext-apps: convert-web-app skill](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/convert-web-app/SKILL.md). GitHub. Read via `ghp api` 2026-10-15 (HTTP 200, 544 lines).
[^37]: Excalidraw. (2026). [excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp). GitHub. README and `package.json` read via `ghp api` 2026-10-15 (5,521 stars, no licence detected by GitHub, created 2026-02-04, pushed 2026-03-24).
[^38]: micromark. (2026). [micromark](https://github.com/micromark/micromark). GitHub. README read via `ghp api` 2026-10-15 (2,233 stars, MIT, pushed 2026-09-26).
[^39]: syntax-tree. (2026). [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown). GitHub. README read via `ghp api` 2026-10-15 (293 stars, MIT, pushed 2026-10-03).
[^40]: bundlejs. (2026). [bundlejs API](https://deno.bundlejs.com/?q=micromark). Verified accessible (HTTP 200) 2026-10-15 for the 11 queries in table (b) (esbuild, minified, `platform: "browser"`).
[^41]: markdown-it. (2026). [markdown-it](https://github.com/markdown-it/markdown-it). GitHub. README read via `ghp api` 2026-10-15 (21,979 stars, MIT, pushed 2026-09-12).
[^42]: Wormer, T. (2026). [decode-named-character-reference 1.3.0](https://unpkg.com/decode-named-character-reference@1.3.0/index.dom.js). npm via unpkg. Registry `exports` and `index.dom.js` read 2026-10-15 (HTTP 200).
[^43]: Haverbeke, M. (2026). [ProseMirror guide](https://prosemirror.net/docs/guide/). prosemirror.net. Verified accessible (HTTP 200) 2026-10-15.
[^44]: ProseMirror. (2026). [prosemirror-model (archived)](https://github.com/ProseMirror/prosemirror-model). GitHub. README and metadata read via `ghp api` 2026-10-15 (archived, pushed 2026-04-01; `ProseMirror/prosemirror` archived, 8,695 stars).
[^45]: CodeMirror. (2026). [codemirror/dev (archived)](https://github.com/codemirror/dev). GitHub. README and metadata read via `ghp api` 2026-10-15 (archived, 7,809 stars, pushed 2026-04-15).
[^46]: Haverbeke, M. (2026). [CodeMirror system guide](https://codemirror.net/docs/guide/). codemirror.net. Verified accessible (HTTP 200) 2026-10-15.
[^47]: Tiptap. (2026). [Static renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer). Tiptap Docs. Verified accessible (HTTP 200) 2026-10-15.
[^48]: Milkdown. (2026). [milkdown](https://github.com/Milkdown/milkdown). GitHub. README fetched raw 2026-10-15 (HTTP 200; 11,991 stars, MIT, pushed 2026-10-13).
[^49]: TypeCellOS. (2026). [BlockNote](https://github.com/TypeCellOS/BlockNote). GitHub. README read via `ghp api` 2026-10-15 (10,295 stars, pushed 2026-10-14).
[^50]: BlockNote. (2026). [@blocknote/server-util 0.56.0](https://registry.npmjs.org/@blocknote/server-util/latest). npm registry. Verified accessible (HTTP 200) 2026-10-15. (Dependencies list.)
[^51]: Meta. (2026). [@lexical/headless](https://lexical.dev/docs/packages/lexical-headless). Lexical Docs. Verified accessible (HTTP 200) 2026-10-15.
[^52]: Meta. (2026). [lexical: packages/lexical/src/LexicalUpdates.ts](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalUpdates.ts). GitHub. Fetched raw 2026-10-15 (HTTP 200); found via `ghp api` code search for `setTimeout` in `packages/lexical/src` (15 results).
[^53]: Taylor, I. (2026). [slate](https://github.com/ianstormtaylor/slate). GitHub. README fetched raw 2026-10-15 (HTTP 200; 31,746 stars, MIT, pushed 2026-10-15).
[^54]: Jahns, K. (2026). [yjs](https://github.com/yjs/yjs). GitHub. README and `LICENSE` read 2026-10-15 (HTTP 200; 22,937 stars, pushed 2026-10-07); published [dist/yjs.mjs 13.6.33](https://unpkg.com/yjs@13.6.33/dist/yjs.mjs) read 2026-10-15 (HTTP 200, 300,059 bytes).
[^55]: GitHub. (2026). [REST repository metadata](https://api.github.com/repos/remarkjs/remark). Read via `ghp api` 2026-10-14 and 2026-10-15 for the 23 repositories in table (b), including [mozilla/pdf.js](https://github.com/mozilla/pdf.js) (54,003 stars, Apache-2.0) and the `yjs/yjs` code searches (`setTimeout` 0 results, control term `transact` 19).
[^56]: Automerge. (2026). [@automerge/automerge](https://registry.npmjs.org/@automerge/automerge). npm registry README. Verified accessible (HTTP 200) 2026-10-15 (3.5.0, MIT; 6,657 GitHub stars).
[^57]: Loro. (2026). [loro-crdt 1.16.4 file listing](https://unpkg.com/loro-crdt@1.16.4/?meta). unpkg. Verified accessible (HTTP 200) 2026-10-15 (6,219 GitHub stars, MIT).
[^58]: Wallace, S. (2026). [beads-ui](https://github.com/sergeiwallace/beads-ui). GitHub. Metadata, tree, README, `.copier-answers.yml`, branches and pull requests read via `ghp api` 2026-10-15 (public, MIT, created 2026-10-14, pushed 2026-10-15).
[^59]: Wallace, S. (2026). [doc-editor](https://github.com/sergeiwallace/doc-editor). GitHub. Metadata via `ghp api` and the tree at `origin/main` `f480391` read 2026-10-15 (public, MIT, created 2026-10-14).
[^60]: GitHub. (2026). [Community profile API for doc-editor](https://api.github.com/repos/sergeiwallace/doc-editor/community/profile). Read via `ghp api` 2026-10-15 for doc-editor, beads-ui and anthropics/claude-code-playground (HTTP 200).
[^61]: Wallace, S. (2026). [project-template](https://github.com/sergeiwallace/project-template). GitHub. Private repository; metadata and `copier.yml` read with the owner's credential via `ghp api` 2026-10-15. Public readers get HTTP 404.

## Provenance ledger

| Claim | Source URL | Verbatim quote | Verdict | Live? |
|---|---|---|---|---|
| Seed survey: terminal-browser exposes `$.browser` | https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods-web-browser-in-the-tui.md | "The plugin adds a `$.browser` namespace through `engine.create`" | SUPPORTED | Private; read locally |
| Seed survey: Claude Code not an MCP Apps host | https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/claude-code-mods.md | "**Claude Code is not an MCP Apps host.**" | SUPPORTED | Private; read locally |
| Seed design: types and tsconfig written on load | https://github.com/sergeiwallace/ai-harness/blob/main/docs/designs/aih-xhc5u-claude-code-mods.md | "the runtime writes into the plugin directory on load" | SUPPORTED | Private; read locally |
| Seed evidence: earlier loader rules | https://github.com/sergeiwallace/ai-harness/blob/main/docs/research/evidence/aih-xhc5u/mods-docs-capabilities.md | "Types are generated per build, not installed from a package." | SUPPORTED | Private; read locally |
| Relative imports only, one bare import | https://code.claude.com/docs/en/plugins/mods/create.md | "Import only from files inside the plugin directory, by relative path. The one bare import allowed is `claude-code`, for types and a few helpers." | SUPPORTED | Yes (HTTP 200) |
| No build step | https://code.claude.com/docs/en/plugins/mods/create.md | "You don't need Node.js, a bundler, or a build step, because Claude Code loads `.js` and `.ts` files directly." | SUPPORTED | Yes (HTTP 200) |
| `$` cannot be passed to an imported function | https://code.claude.com/docs/en/plugins/mods/create.md | "Passing `$` to a method, a function defined inside the hook, or a function you import from another of your files fails validation." | CONTRADICTED by the 2.1.299 changelog entry | Yes (HTTP 200) |
| Generated types directory | https://code.claude.com/docs/en/plugins/mods/create.md | "it writes TypeScript declaration files into the mod's `.claude-plugin/types/` directory" | SUPPORTED | Yes (HTTP 200) |
| Hooks module entry and extensions | https://code.claude.com/docs/en/plugins/mods/reference.md | "Exports `register(on, options)`." | SUPPORTED | Yes (HTTP 200) |
| `Svg` limit and surface | https://code.claude.com/docs/en/plugins/mods/reference.md | "An SVG document, up to 131,072 characters" | SUPPORTED | Yes (HTTP 200) |
| Tree text limit | https://code.claude.com/docs/en/plugins/mods/reference.md | "The first 100,000 characters are drawn" | SUPPORTED | Yes (HTTP 200) |
| No Node APIs or timers | https://code.claude.com/docs/en/plugins/mods/api.md | "The hooks module itself has no Node.js APIs, no timer globals such as `setTimeout`, and no network or file access of its own." | SUPPORTED | Yes (HTTP 200) |
| No DOM, no Node, every imported file | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "no DOM, no Node. The module, and every file it imports from the plugin," | SUPPORTED | Yes (HTTP 200) |
| No WebAssembly | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "there is no `WebAssembly` (deliberately; a module that" | SUPPORTED | Yes (HTTP 200) |
| JSX compiles to `h` | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "`h` and `Fragment` (what JSX compiles against)" | SUPPORTED | Yes (HTTP 200) |
| Types file names `.claude/types` | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "\".claude/types\" is where /plugin-types writes this file" | SUPPORTED (conflicts with the create page) | Yes (HTTP 200) |
| `Markdown` element text cap | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "At most 10000 characters, tab and newline its only control characters;" | SUPPORTED | Yes (HTTP 200) |
| `Client` tree bounds | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "nodes, 32 deep, 100,000 characters serialized) or the instance unmounts." | SUPPORTED | Yes (HTTP 200) |
| `Client` module path is a literal | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "Read off the source: a variable there is refused at load, as is a path" | SUPPORTED | Yes (HTTP 200) |
| Declared surfaces include mobile and vscode | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "the plugin on the surface the test names (terminal, desktop, vscode or" | SUPPORTED | Yes (HTTP 200) |
| Interactive `Svg` frame | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "`true` draws the SVG in a script-less sandboxed frame so hover, CSS" | SUPPORTED | Yes (HTTP 200) |
| `$.mcp.call` uses the session's connection | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "Calls `tool` on one of the engine's connected MCP servers with the" | SUPPORTED | Yes (HTTP 200) |
| `structuredContent` in results | https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts | "The server's structured result, when its tool declares an output schema." | SUPPORTED | Yes (HTTP 200) |
| 2.1.299 `$` import fix | https://code.claude.com/docs/en/changelog | "Fixed mods loaded from source files being refused when a hook hands `$` to a function declaration imported from another file of the mod" | SUPPORTED | Yes (HTTP 200) |
| 2.1.281 hides MCP Apps UI resources | https://code.claude.com/docs/en/changelog | "to skip MCP Apps UI resources; reading one by URI still works" | SUPPORTED | Yes (HTTP 200) |
| Tests import the mod's files | https://code.claude.com/docs/en/plugins/mods/test.md | "A test file can import your mod's own files and sibling `.ts` helpers" | SUPPORTED | Yes (HTTP 200) |
| Erasable syntax flag | https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/ | "constructs like the following are not supported:" | SUPPORTED | Yes (HTTP 200) |
| Copied plugins lose outside files | https://code.claude.com/docs/en/plugins/loading.md | "Files outside the plugin directory aren't copied" | SUPPORTED | Yes (HTTP 200) |
| Workspace dependencies get no install | https://code.claude.com/docs/en/plugins/loading.md | "A plugin with a git, GitHub, folder, workspace, or linked dependency gets no install." | SUPPORTED | Yes (HTTP 200) |
| pnpm lockfile skipped | https://code.claude.com/docs/en/plugins/loading.md | "replace it with an npm lockfile" | SUPPORTED | Yes (HTTP 200) |
| Component path containment | https://code.claude.com/docs/en/plugins-reference.md | "a path that resolves outside the plugin root doesn't load" | SUPPORTED | Yes (HTTP 200) |
| Symlinks inside a marketplace dereferenced | https://code.claude.com/docs/en/plugins/host-marketplace.md | "the symlink is dereferenced. The target's content is copied into the cache in its place." | SUPPORTED | Yes (HTTP 200) |
| Local-path installs keep only internal symlinks | https://code.claude.com/docs/en/plugins/host-marketplace.md | "Claude Code preserves only symlinks that resolve within the plugin's own directory and skips all others." | SUPPORTED | Yes (HTTP 200) |
| `git-subdir` checks out one folder | https://code.claude.com/docs/en/plugins/marketplace-reference.md | "Claude Code checks out only that subdirectory" | SUPPORTED | Yes (HTTP 200) |
| terminal-browser workspace | https://github.com/zenbu-labs/terminal-browser | "linkWorkspacePackages: true" | SUPPORTED (package list read beside it) | Yes (HTTP 200) |
| terminal-browser duplicates types | https://github.com/zenbu-labs/terminal-browser/blob/main/claude-code-plugin/hooks/bridge-protocol.ts | "// we cannot use libraries inside the claude code sandbox, hence this gross code" | SUPPORTED | Yes (HTTP 200) |
| Playground relative plugin source | https://github.com/anthropics/claude-code-playground | "\"source\": \"./blast-radius\"" | SUPPORTED | Yes (HTTP 200) |
| Built-in `diff` splits into local modules | https://github.com/anthropics/claude-code/tree/main/mods | "import Ask from './ask'" | SUPPORTED | Yes (HTTP 200) |
| md-preview's own parser | https://github.com/hamzafer/claude-code-mods | "// A small Markdown reader: blocks, HTML for the page, styled lines for the text view," | SUPPORTED | Yes (HTTP 200) |
| hamzafer CI validates the marketplace | https://github.com/hamzafer/claude-code-mods | "run: claude plugin validate ." | SUPPORTED | Yes (HTTP 200) |
| baselane copies the engine per plugin | https://github.com/baselane-sh/mods/blob/main/scripts/build.mjs | "files, so each one gets its own copy of the engine and the rules it uses." | SUPPORTED | Yes (HTTP 200) |
| ide-mod vendors pdf.js for a Node sidecar | https://github.com/jkf87/ide-mod | "const vendor = path.join(here, '..', 'vendor', 'pdfjs')" | SUPPORTED | Yes (HTTP 200) |
| Drawing only in terminal and Desktop | https://code.claude.com/docs/en/plugins/mods/overview.md | "Drawing is narrower: only the terminal and the Desktop app show a mod's panes, bands, and replaced rows." | SUPPORTED | Yes (HTTP 200) |
| `Client` definition | https://code.claude.com/docs/en/plugins/mods/interface.md | "A region drawn by a second file of yours, for animation and pointer input. That file gets no mods API." | SUPPORTED | Yes (HTTP 200) |
| Desktop has no `Raster` | https://code.claude.com/docs/en/plugins/mods/interface.md | "The Desktop app has no `Raster`, so check `e.surface` and draw text there." | SUPPORTED | Yes (HTTP 200) |
| `Svg` opens empty in the terminal | https://code.claude.com/docs/en/plugins/mods/gallery.md | "In the terminal, a pane that returns only an `Svg` opens empty." | SUPPORTED | Yes (HTTP 200) |
| `Markdown` element behaviour | https://code.claude.com/docs/en/plugins/mods/gallery.md | "formats text the way Claude's replies are formatted" | SUPPORTED | Yes (HTTP 200) |
| Fullscreen in tmux | https://code.claude.com/docs/en/fullscreen.md | "Fullscreen rendering works inside tmux, with three caveats." | SUPPORTED | Yes (HTTP 200) |
| Desktop Browser pane file types | https://code.claude.com/docs/en/desktop.md | "The Browser pane can also open static HTML files, PDFs, images, and videos from your project." | SUPPORTED | Yes (HTTP 200) |
| Desktop file pane warns on change | https://code.claude.com/docs/en/desktop.md | "If the file changed on disk since you opened it, the pane warns you and lets you override or discard." | SUPPORTED | Yes (HTTP 200) |
| MCP Apps HTML content type | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx | "This specification focuses on HTML content (`text/html;profile=mcp-app`) as the initial content type" | SUPPORTED | Yes (HTTP 200) |
| Mandatory sandbox | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx | "Mandatory iframe sandboxing with auditable communication" | SUPPORTED | Yes (HTTP 200) |
| postMessage transport | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx | "MCP Apps uses JSON-RPC 2.0 over `postMessage` for iframe-host communication." | SUPPORTED | Yes (HTTP 200) |
| Default CSP closes the network | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx | "connect-src 'none';" | SUPPORTED | Yes (HTTP 200) |
| App-only tools hidden from the model | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx | "Host MUST NOT include tools in the agent's tool list when their visibility does not include" | SUPPORTED | Yes (HTTP 200) |
| SDK has no supported host | https://github.com/modelcontextprotocol/ext-apps | "There's no _supported_ host implementation in this repo" | SUPPORTED | Yes (HTTP 200) |
| Host list | https://modelcontextprotocol.io/extensions/client-matrix.md | "Which MCP clients implement which official extensions" | SUPPORTED (Claude Code row absent from the enumerated table) | Yes (HTTP 200) |
| Claude asks before display | https://claude.com/docs/connectors/building/mcp-apps/getting-started.md | "Claude asks for permission to display the app." | SUPPORTED | Yes (HTTP 200) |
| Avoid long-form content | https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md | "Long-form or static content better suited for external viewing" | SUPPORTED | Yes (HTTP 200) |
| Mobile WebView | https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md | "On mobile, Claude renders apps in a native WebView, `WKWebView` on iOS and `WebView` on Android" | SUPPORTED | Yes (HTTP 200) |
| Chat and Claude Code surfaces | https://claude.com/docs/plugins/platform-support.md | "the terminal, the IDE extensions, and the desktop app's Code tab" | SUPPORTED | Yes (HTTP 200) |
| Size-limited tool calls | https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/pdf-server | "On some host platforms, tool calls have size limits, so large PDFs cannot be sent in a single response." | SUPPORTED | Yes (HTTP 200) |
| Model context updates | https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/pdf-server | "The viewer keeps the model informed about what the user is seeing:" | SUPPORTED | Yes (HTTP 200) |
| Hybrid web and MCP App | https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/convert-web-app/SKILL.md | "only the data source changes." | SUPPORTED | Yes (HTTP 200) |
| Single-file View build | https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/convert-web-app/SKILL.md | "The MCP App build must produce a single HTML file using `vite-plugin-singlefile`." | SUPPORTED | Yes (HTTP 200) |
| Excalidraw as an MCP App | https://github.com/excalidraw/excalidraw-mcp | "# Excalidraw MCP App Server" | SUPPORTED | Yes (HTTP 200) |
| micromark runs in browsers | https://github.com/micromark/micromark | "In browsers with [`esm.sh`][esmsh]:" | SUPPORTED | Yes (HTTP 200) |
| mdast-util-from-markdown compatibility | https://github.com/syntax-tree/mdast-util-from-markdown | "Projects maintained by the unified collective are compatible with maintained" | SUPPORTED | Yes (HTTP 200) |
| DOM build of an entity decoder | https://unpkg.com/decode-named-character-reference@1.3.0/index.dom.js | "const element = document.createElement('i')" | SUPPORTED | Yes (HTTP 200) |
| markdown-it in browsers | https://github.com/markdown-it/markdown-it | "For browser you can use unpkg.com, esm.sh or any other CDN, which mirror npm" | SUPPORTED | Yes (HTTP 200) |
| ProseMirror view is the browser layer | https://prosemirror.net/docs/guide/ | "shows a given editor state as an editable element in the" | SUPPORTED | Yes (HTTP 200) |
| ProseMirror moved | https://github.com/ProseMirror/prosemirror-model | "This repository has moved to https://code.haverbeke.berlin/prosemirror/prosemirror-model" | SUPPORTED | Yes (HTTP 200) |
| CodeMirror state is functional | https://codemirror.net/docs/guide/ | "operations on them are pure functions, whereas the" | SUPPORTED | Yes (HTTP 200) |
| CodeMirror moved | https://github.com/codemirror/dev | "This repository has moved to https://code.haverbeke.berlin/codemirror/dev" | SUPPORTED | Yes (HTTP 200) |
| TipTap static renderer needs no DOM | https://tiptap.dev/docs/editor/api/utilities/static-renderer | "The static renderer doesn't require a browser, DOM or even an editor instance to render the content." | SUPPORTED | Yes (HTTP 200) |
| Milkdown foundation | https://github.com/Milkdown/milkdown | "built on top of [prosemirror](https://prosemirror.net/) and [remark](https://github.com/remarkjs/remark)." | SUPPORTED | Yes (HTTP 200) |
| BlockNote licences | https://github.com/TypeCellOS/BlockNote | "The XL packages (source code in the `packages/xl-*` directories and published in NPM as `@blocknote/xl-*`) are licensed under the GPL-3.0." | SUPPORTED | Yes (HTTP 200) |
| BlockNote server util needs jsdom | https://registry.npmjs.org/@blocknote/server-util/latest | "\"jsdom\"" (dependency key) | SUPPORTED | Yes (HTTP 200) |
| Lexical headless skips DOM | https://lexical.dev/docs/packages/lexical-headless | "an editor that is never given a root element already skips all DOM work" | SUPPORTED | Yes (HTTP 200) |
| Lexical core calls setTimeout | https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalUpdates.ts | "setTimeout(() => {" | SUPPORTED | Yes (HTTP 200) |
| Slate is beta | https://github.com/ianstormtaylor/slate | "Slate is currently in beta." | SUPPORTED | Yes (HTTP 200) |
| Yjs network agnostic, MIT | https://github.com/yjs/yjs | "Yjs is **network agnostic** (p2p!)" | SUPPORTED | Yes (HTTP 200) |
| Yjs timers only in PermanentUserData | https://unpkg.com/yjs@13.6.33/dist/yjs.mjs | "class PermanentUserData {" | SUPPORTED (two `setTimeout` calls, both in this class) | Yes (HTTP 200) |
| Automerge is WebAssembly | https://registry.npmjs.org/@automerge/automerge | "rust, compiled to WebAssembly and distributed as a separate package called" | SUPPORTED | Yes (HTTP 200) |
| Loro ships wasm | https://unpkg.com/loro-crdt@1.16.4/?meta | "/browser/loro_wasm_bg.wasm" | SUPPORTED | Yes (HTTP 200) |
| npm figures | https://api.npmjs.org/downloads/point/last-week/micromark | "\"downloads\":64796262" | SUPPORTED (one of 24 records) | Yes (HTTP 200) |
| Bundle sizes | https://deno.bundlejs.com/?q=micromark | "\"compressedSize\":\"15.9 kB\"" | SUPPORTED (one of 11 queries) | Yes (HTTP 200) |
| GitHub figures | https://api.github.com/repos/remarkjs/remark | "\"stargazers_count\": 9019" | SUPPORTED (one of 23 records) | Yes (HTTP 200) |
| beads-ui plans one core, no shared components with the mod | https://github.com/sergeiwallace/beads-ui | "A mod draws to the terminal and has no DOM, so the surfaces share logic and design tokens rather than UI components." | SUPPORTED | Yes (HTTP 200) |
| doc-editor Copier source | https://github.com/sergeiwallace/doc-editor | "_src_path: https://github.com/sergeiwallace/project-template" | SUPPORTED | Yes (HTTP 200) |
| Community profile score | https://api.github.com/repos/sergeiwallace/doc-editor/community/profile | "\"health_percentage\": 57" | SUPPORTED | Yes (HTTP 200) |
| Template is private | https://github.com/sergeiwallace/project-template | "private" (visibility field) | SUPPORTED | 404 to public readers; 200 with the owner's credential |
