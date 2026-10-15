---
title: Research Prompt Registry
category: research-prompts
tags: [research, prompts]
status: active
source: project-template
---

# Research Prompt Registry

Central registry for all research prompts for this project. Tracks prompt text,
model, submission status, and links to result docs. Pending/ready prompts listed
first (highest priority at top), completed below.

**References (from sergei project):**
- Zero-slop anchor design: `~/projects/sergei/docs/research/zero-slop-anchor-design.md`
- Anchor procedure: `~/projects/sergei/docs/procedures/gemini-deep-think-anchor.md`

## Guidelines & The "Zero-Slop" Anchor

To mitigate authoritative hallucinations, **all new research prompts MUST append
the grounding block** at the end of the prompt. Lead with a specific role identity
narrative grounded in the research domain.

**Role identity note:** Lead the grounding block with a specific role identity narrative.
A grounded persona reduces compliance pressure — the model reasons from a position rather
than defaulting to sycophantic completeness. Tailor the persona to whatever the prompt
warrants — the domain, seniority, and specific expertise that makes the model most useful
for that research task.

**Model selection guidance:**
- **`opus researcher`** — **default for all research.** Empirically tested:
  consistently more detailed, discovers additional nuance and options vs deep-think
  on identical prompts. Use unless Claude quota is tight.
- `deep-think` — Gemini 3.1 Pro with extended thinking budget. Not a web-search
  research tool — use for reasoning-heavy tasks over a fixed body of material
  (architecture tradeoffs, synthesis, multi-path analysis). Uses Gemini OAuth
  (no Claude tokens).
- `gemini-3.1-pro-preview` — product/tech comparisons, competitive research,
  moderate complexity
- `gemini-3-flash-preview` — simple factual lookups, single-source verification only
- `ai gemini -m deep-research -s 3` — autonomous web research loop (Plan → Search →
  Read → Refine). Hard gate required — present prompt and wait for approval before running.

**Temporal scope (required for all prompts):**

Every prompt must include an explicit temporal scope statement. The default window
depends on the research domain — adapt to context, no strict rules:

| Domain | Default window | Notes |
|--------|---------------|-------|
| AI/ML, agentic AI, LLMs, ML infra | **2026 primary → 2025 → 2024 foundational** | Fast-moving field; pre-2024 is background context only |
| Distributed systems, databases, cloud | 2024–2026 current; 2020–2023 for foundational patterns | More stable; older patterns remain authoritative |
| Regulatory / compliance / legal | Broad — regulations may predate 2024 | Use full history; flag year of enactment |
| Historical / foundational research | No cutoff — use judgment | Cite publication date; distinguish era from current state |

**Backfill-prevention (hard constraint):** If a period is genuinely thin for a
subtopic, the correct answer is *"[subtopic]: no significant [period] developments
found"* — not substitution with older material. Generic `[NO SOURCE FOUND]` alone
is insufficient; naming the gap prevents backfilling. This constraint belongs both
in the prompt body and inside `<grounding_instructions>`.

**Where temporal scope belongs in the prompt:**

1. As a dedicated `## Temporal Scope` section in the prompt body (before the first
   question section) — visible upfront, scopes the entire research task
2. As the opening clause of `<grounding_instructions>` — re-applied at CoVe
   verification time, catching any drift toward older sources during generation

**Other prompt patterns:**

- **Independent exploration — the prompt is a FLOOR, not a ceiling** — the
  questions, topics, named examples, vendors, packages, and tickets in a prompt are
  illustrative anchors and a floor for the research, never an exhaustive checklist to
  answer only and then stop. Anchor bias (over-fitting to the listed items) is a known
  failure mode; counter it deliberately. Paste the standardized `## Scope note` +
  `## Independent exploration (gaps, blindspots, emergent threads)` blocks from the
  research-prompt TEMPLATE into every prompt body (the canonical wording lives there).
- **Follow-up / sequential runs** — add a `## Background` section at the top of the
  prompt body (before questions, outside `<grounding_instructions>`) summarizing
  what prior runs found: "Assume all Background points are established and do not
  re-derive them." This scopes the model to the delta.

**Research run process:**
1. Run research — pipe output directly to `docs/research/<topic>.md`
2. Ship raw version — commit and push immediately (prevents data loss)
3. Revise/edit — ensure template compliance (frontmatter, structure, appendix)
4. Ship final version — commit and push
5. Update related docs — registry (mark complete), design/plan docs, roadmap
6. Ship doc updates — commit and push
7. Summary in chat — findings, created/updated docs, decisions needed, open questions

```text
<grounding_instructions>
[ROLE IDENTITY — tailor to the research domain and task. Example:
"You are a principal engineer who has deployed distributed tracing systems in
production. You have strong opinions backed by evidence. When you cannot find a
source, you say so explicitly."
Adapt the domain, expertise, and seniority to whatever this prompt warrants.]

Temporal scope: Weight sources by recency — 2026 (primary) → 2025 → 2024.
Pre-2024 sources are background context only unless foundational to the topic.
If post-2024 literature is genuinely sparse for a subtopic, state
"[subtopic]: no significant post-2024 developments found" rather than
backfilling with older sources. Backfilling is a failure mode, not a hedge.
[Adjust or broaden this window if the topic's relevant literature predates 2024
— e.g., foundational theory, legal precedent, historical analysis.]

Before generating your final output, execute a Chain-of-Verification (CoVe)
to ensure factual fidelity over compliance.

Inside your thought process:
1. Isolate the core facts required.
2. Draft a tentative response.
3. Hostile Cross-Examination: flag any claim where you are citing a source because
   the prompt implied you should, rather than because you verified it.
4. Strip away any claim that cannot be empirically verified.

When generating your final output, classify every major claim. Write your rationale
before appending the tag — writing the tag first causes post-hoc rationalization.
Rationale → evidence check → tag.

- [VERIFIABLE FACT]: backed by documentation, peer-reviewed research, or official
  tech blogs (2024–2026). Provide the direct URL or DOI.
- [INDUSTRY HEURISTIC]: widely accepted best practice without a specific citation.
- [SYNTHESIZED INFERENCE]: a logical conclusion drawn from context.
  Provide your reasoning. Do not fabricate a source.
- [NO SOURCE FOUND]: explicitly state when you cannot find verifiable data.

Hard constraint (overrides all formatting preferences): never invent a citation
to satisfy a formatting instruction. Accuracy > completeness.

For primary/showcase diagrams, use the `archify` skill by default
(`docs/research/<slug>.html`); a lightweight inline diagram may still use Mermaid.js syntax
(```mermaid blocks). Format math using LaTeX. No ASCII art diagrams or binary images.
</grounding_instructions>
```

## Table of Contents

- [Pending / Ready](#pending--ready)
- [Completed](#completed)
- [Deprecated / Archived](#deprecated--archived)

## Status Overview

### Pending / Ready

| # | Type | Topic | Task | Model | Status |
|---|------|-------|------|-------|--------|

### Priority and Impact Notes

| # | Prompt | Priority | Model | Tasks Unlocked / Enhanced | Why Now |
|---|--------|----------|-------|--------------------------|---------|

### Completed

| # | Type | Topic | Task | Model | Results Doc |
|---|------|-------|------|-------|-------------|

---

## Pending / Ready

<!-- Add prompts here using this format. Most recent/highest priority prompt goes FIRST.

### R-N: [Topic] — [TASK-ID]

**Status:** Ready to run / Pending approval / Approved — run with opus researcher

**Model:** `opus researcher`

**Task:** [TASK-ID]

**Output:** `docs/research/[topic].md`

**Temporal scope:** 2026 primary → 2025 → 2024 <!-- adjust as needed -->

<!-- Always put a blank line between consecutive **Label:** metadata fields.
     Markdown joins consecutive non-blank lines into one paragraph, so without
     blank lines the fields render smushed onto a single line in PDF preview. -->

<details>
<summary>Prompt (R-N)</summary>

```text
## Temporal Scope

[State the temporal scope. Example for AI/ML topics:
"Prioritize 2026 sources. Use 2025 freely. Use pre-2025 only when foundational
or when no later source exists. If a subtopic has no significant post-2024
developments, state so explicitly — do not backfill. Backfilling is a failure
mode." Adjust the window for the research domain.]

---

[Prompt questions here. grounding_instructions block at the end.]
```

</details>

<details>
<summary>Context & questions</summary>

**Context:** [1-3 sentences explaining why this research is needed and what it unblocks]

**Questions to answer:**

1. **[Question title]**: [question text]
2. **[Question title]**: [question text]
...

</details>

> **Feedback:** <enter feedback here>

---

-->

## Completed

<!-- Completed prompt sections go here after being moved from Pending / Ready -->

## Deprecated / Archived
