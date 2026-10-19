---
description: "Creating, editing or using a reusable /goal template under docs/prompts/goal/templates/, or an amendment rider under docs/prompts/goal/riders/: read the canonical ai-harness README and TEMPLATE first, create templates through /draft-goal and riders from the rider STUB, keep the pinned exit contract and the 4000-character budget, and know what to do when a template loops. Path-scoped; loads only in those directories."
paths:
  - "docs/prompts/goal/templates/**"
  - "**/docs/prompts/goal/templates/**"
  - "docs/prompts/goal/riders/**"
  - "**/docs/prompts/goal/riders/**"
---

<!--
Maintainer note (2026-10-13, widened 2026-10-18 for riders). The owner asked for a README and a
path rule here so that every edit under docs/prompts/goal/templates/ follows its TEMPLATE.md and the
/draft-goal guidance, and later that the rule and README always point at the ai-harness canonical
README, STUB and TEMPLATE unless a repo keeps a use-case-specific one. This rule points; the
READMEs, TEMPLATEs and procedures are canonical. It carries no private id because consumer repos
receive it byte for byte. The riders/ globs are added on their own so the rule still does not load
on drafts/ or the goal README, which the path-scope pin test requires.
-->

# Reusable `/goal` templates and their riders

Read the canonical ai-harness README and TEMPLATE in full before you create, edit or start anything
here: `docs/prompts/goal/templates/README.md` and `docs/prompts/goal/templates/TEMPLATE.md` for
templates, `docs/prompts/goal/riders/README.md` and `docs/prompts/goal/riders/TEMPLATE.md` for
riders, read from `~/projects/ai-harness/`. Use a
repo-local STUB or TEMPLATE only when that repo keeps one for its own use case. Each template rule
below is pinned by a test, and a template that fails one does not start.

## Creating or editing a template

- Copy `docs/prompts/goal/templates/STUB.md` for a new template, fill it, and run `/draft-goal`'s
  validator (`uv run --script skills/draft-goal/scripts/draft_goal.py validate <path> --write`).
  Then add the `registry.toml` entry. The name is the file stem minus `-goal`, hyphen-separated.
- Keep the section order: title, `## Launch` (the paste-ready `/goal` fence) first, then
  `## About this template`, `## Raw ask`, `## Coverage`.
- In the fence, line 1 is `/goal`, and `SUCCESS:` and `BLOCKED:` end with `run /exit-goal once and
  stop.`. The last TERMINATION line is the evaluator-loop clause naming `/delegate opus /bug-fix` and
  `docs/procedures/goal-exit-robustness.md`, verbatim from `TEMPLATE.md`. `STOP CONDITION` is last and
  byte-identical to `docs/prompts/goal/STUB.md`'s. Change it in the STUB, `STUB.md.jinja`, every
  template, `config/start-goal.toml` `type_pointer` and the pin test together.
- No line inside the fence starts with a section word plus a space (`GOAL `, `CONTEXT `,
  `SUCCESS `), because the validator opens a new section there.
- Stay under 4000 gating characters with every `{{param}}` rendered at its longest default. Add to
  the fence only by trimming the same fence. No private id, session name, date or count goes in the
  fence.
- Re-stamp after every edit (`--write`), then run `tests/test_goal_template_stores.py`,
  `tests/test_goal_blocked_reachable.py`, `tests/test_goal_exit_robustness.py`,
  `tests/test_work_all_in_progress_goal_default.py` and `skills/draft-goal/tests` serially.
- Never edit `handwritten/` to pass a test. Fix the conformant template and keep both in step.
- Write S-items so they can hold vacuously and be re-satisfied later. An item about past conduct
  that the evaluator judges unmet can never become outside-waiting. An item that waits on a named
  gate must say so, or the evaluator reads it as actionable.

## Writing a rider

- Write a new rider for a custom arming, unless an unchanged existing rider already says exactly
  what it needs. Copy the rider STUB (the repo's own if it keeps one, else
  `~/projects/ai-harness/docs/prompts/goal/riders/STUB.md`) to `<YYMMDD>-<slug>.md` in the private
  repo whose tasks it amends.
- Fill the invocation metadata, a numbered `## Amendment` and a verbatim `## Why`. Land it on the
  default branch through the repo's PR route.
- Reuse an unchanged rider by its path. Never edit a merged rider; a change is a new rider with
  `supersedes` set.
- A rider narrows scope, adds requirements or adds exit terms. It never grants authority the goal
  or the context files withhold.
- Check it with `start_goal.py rider check <path> --template <name>`, land it, then arm it with
  `/start-goal --template <name> --amendment <projects-relative path>`.

## Using one

- Start with `/start-goal --template <name>` (profile default: no selector). It refuses a stale
  digest and an already-active goal. Once a rider is armed, read its notice in full on every check;
  its Amendment binds SUCCESS and TERMINATION.
- When the evaluator rejects a said `GOAL COMPLETE` or `GOAL BLOCKED` three times, the template is
  the defect. Follow `docs/procedures/goal-exit-robustness.md`: `/goal clear` (the goal waker injects
  it for an idle session), then always `/delegate opus /bug-fix` with the transcript and the
  evaluator's reasons, and fix the template and its siblings red-first.
- Re-arm a session with an updated template only if it still has unblocked in-progress work. A
  session whose exit conditions are met or whose work is all blocked gets no new `/goal`.
