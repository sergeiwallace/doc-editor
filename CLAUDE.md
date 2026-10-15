# Instructions

> Global ai-core platform config: `~/projects/CLAUDE.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core | TypeScript / Node.js |
| AI orchestration | Claude Code CLI + Gemini CLI |

## Terminology

- **Session config** — `CLAUDE.md`, `MEMORY.md`, memory files, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/`, `docs/procedures/`
- **Orchestration config** — `.claude/agents/*.md`, `.githooks/`, aido orchestration files
- **`AI_HOST`** — env var identifying the host machine (`hetzner`, `mac`, etc.). Set in `~/.zshenv` (sourced by all zsh sessions including non-interactive). Use to branch on host-specific behavior. **Machine self-awareness rule:** always check `AI_HOST` before running SSH or any remote command. `AI_HOST=hetzner` means you are already on the dev server — do not SSH to the server from within a remote session.

## Test Commands

### TypeScript

- Test names: `it("should {action} when {condition}")`
- Run: `npx vitest run`

## Branch Naming

- Dev branch: `main`
- Worktree branches (default workflow): `wt-<tag>-<N>` — managed by `ai c`
- Suggested patterns for human-created branches: `feature/{description}`, `fix/{description}`, `docs/{description}` — **not enforced** (the ecosystem's default workflow is worktrees, not feature branches)
- Atomic commits

## Automated Checks (workflow step 13)

**Hard gate** — `npx tsc --noEmit && npx vitest run`
## Cross-Session Handoffs

- **Cross-session handoffs**: When you receive a message starting with "You are {session-name}", it's a handoff from another cc session. Read the full message, check CLAUDE.md and MEMORY.md for project context, follow the steps exactly, commit and push when done, and write the signal file if specified.
