# Jira Procedures & Issue Templates

> Reference doc for Jira workflow in the doc-editor project (``).

## Issue Types & Templates

### Epic

```markdown
## Objective
[1-2 sentences: what this epic delivers and why it matters]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Stories
- -NNN: title
- -NNN: title
```text

### Story

```markdown
## Context
[Why this story exists. Link to parent epic.]

## Requirements
- Requirement 1
- Requirement 2

## Acceptance Criteria
- [ ] Given X, when Y, then Z
- [ ] Given A, when B, then C

## Closing Notes
[Appended by engineer when done: what was built, any deviations from spec]
```text

### Bug

```markdown
## Observed
[What happens — include error messages, logs, screenshots]

## Expected
[What should happen]

## Repro Steps
1. Step 1
2. Step 2

## Acceptance Criteria
- [ ] Bug no longer reproduces
- [ ] Regression test added
```text

## Workflow Transitions

```text
Open → In Progress → In Review → Done
```text

| Transition | Who | When |
|-----------|-----|------|
| Open → In Progress | engineer or planner | Work starts on the issue |
| In Progress → In Review | engineer | PR opened or UAT presented |
| In Review → Done | engineer | PR merged |

## Link Types

Only two link types — keep it simple:

| Link Type | Use |
|-----------|-----|
| **Blocks** | Task B cannot start until Task A completes |
| **Relates to** | Tasks share context but don't block each other |

## Agent-Jira Integration

### Who touches Jira

| Agent | Access | Responsibilities |
|-------|--------|-----------------|
| **Lead** | Read | Fetches issue context once at start, passes to agents in spawn prompts |
| **planner** | Full CRUD | Creates/updates issues, writes stories, links dependencies, transitions |
| **engineer** | Full CRUD | Reads spec from description, appends closing notes, transitions status |
| All others | None | Receive Jira context via spawn prompt — no direct Jira access |

### Rules

1. **Description = the spec.** Requirements, ACs, constraints go in the issue description.
2. **Comments = transient info.** Test results, CI output, blocker updates, PR links go in comments.
3. **Fetch once, pass via prompt.** Lead reads Jira at the start, then passes context to agents.
4. **ACs map to tests.** Given/When/Then acceptance criteria translate directly to test names.
5. **Closing notes in description.** When engineer completes work, append a `## Closing Notes` section.
6. **Transition on action, not on intent.** Move to "In Progress" when you start coding, not when you start reading.
