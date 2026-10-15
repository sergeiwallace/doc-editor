# Roadmap — retired, archive only

Roadmap markdown is a **historical record**. It was retired fleet-wide on 2026-07-25 by the
SW-841 Phase-3 cutover. **Beads (`bd`) is the task system of record.**

Never add a task here, check one off, or re-tag one. Look the live task up with `bd`:

```sh
bd ready              # what is ready to work
bd list --status=open # everything open
bd show <id>          # one issue in detail
```

## What belongs here

- `archive/` — previously-authored roadmaps, kept read-only for provenance.

That is all. No live roadmap file is scaffolded here. The template shipped
`master-roadmap.md.jinja` until 2026-07-27; because copier's `_skip_if_exists` only skips a
file that *exists*, every `copier update` re-created the stub at the original path in repos
that had correctly archived theirs — resurrecting the retired system, and blocking copier
propagation fleet-wide. The stub was removed rather than re-guarded: no guard fixes an
artifact that should not ship at all.

## What does NOT belong here

- New tasks, priorities, or status of any kind → `bd`
- Detailed implementation steps for a single feature → `plans/`
- Long-term vision and philosophy → `vision/`
- Per-project status and coordination → `projects/`
