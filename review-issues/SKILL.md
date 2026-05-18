---
name: review-issues
description: Review an issue set by spawning two subagents (one for implementer review, one for PRD-coverage review), consolidating their feedback into actionable items. Use when the user wants to review issues, validate the issue breakdown, check issues against the parent PRD, or mentions "review issues".
---

This skill is invoked when the user wants to review an issue set against its parent PRD. You spawn two specialized subagents for complementary perspectives, then consolidate their feedback into actionable edits.

1. Locate the plan. The plan lives at `plans/<plan-name>/`. If the user specified the plan name, use it. Otherwise list all folders inside `plans/`: if there is exactly one, use it automatically; if there are multiple, ask the user which plan to review.

2. Read all materials: `plans/<plan-name>/README.md` (the PRD), `plans/<plan-name>/issues/index.json`, every `plans/<plan-name>/issues/*.md` file, and the effort rubric at [../prd-to-issues/REFERENCE.md](../prd-to-issues/REFERENCE.md) (sibling skill, single source of truth — do not duplicate).

3. Spawn the Implementer Review subagent with the following instructions:

   <implementer-review-prompt>
   You are the engineer who will implement these issues one-by-one on isolated branches. Review the issue set critically:

   1. Are inter-issue dependencies correct and complete? Flag any missing or circular deps.
   2. Is any single issue too large for one focused implementation session (~2–4 hours of AI agent work)? Suggest how to split it.
   3. For each issue, is the assigned `effort` level accurate against the rubric below? Flag any issue where the level looks off — say what level you'd assign and which checklist items pushed you there.
   4. Is anything ambiguous or missing that would block you from starting implementation? What questions would you need answered?

   Be specific: cite issue numbers (e.g. "Issue 007") and explain exactly what is wrong.

   <effort-rubric>
   {contents of ../prd-to-issues/REFERENCE.md}
   </effort-rubric>

   <issues>
   {contents of all issue .md files, separated by ---}
   </issues>

   <index-json>
   {contents of index.json}
   </index-json>
   </implementer-review-prompt>

4. Spawn the PRD-Coverage Review subagent with the following instructions:

   <coverage-review-prompt>
   You are an outside reviewer checking whether this issue set faithfully implements its parent PRD. Review for completeness and correctness:

   1. Does the issue set fully cover every user story and implementation decision in the PRD?
   2. Is anything missing from the issues that the PRD requires?
   3. Is anything in the issues that contradicts or goes beyond the PRD?
   4. Are any concerns duplicated across issues or split at awkward boundaries?
   5. Would a developer completing these issues in dependency order produce exactly what the PRD describes?

   Be specific: cite issue numbers and PRD sections.

   <prd>
   {contents of README.md}
   </prd>

   <issues>
   {contents of all issue .md files, separated by ---}
   </issues>
   </coverage-review-prompt>

5. Consolidate findings. Take both subagent responses and:

   - Group findings by theme (e.g. "Dependencies", "Scope / Sizing", "Coverage Gaps", "Ambiguities", "Splitting / Merging").
   - Remove duplicates where both subagents raised the same concern.
   - Note the source perspective in brackets after each item, e.g. `[implementer]`, `[coverage]`, or `[both]`.

6. Triage findings into two buckets:

   - **Auto-apply** — items with an obvious solution or a single clearly-better resolution (e.g. a missing dependency that is clearly required, an effort level that is plainly miscategorised against the rubric, a typo or naming inconsistency, a small split where the boundary is obvious, a coverage gap whose fix is dictated by the PRD). Resolve these yourself with no user intervention.
   - **Surface to user** — items where there is no clear better option, where multiple reasonable resolutions exist, or where the change is critical/large enough to warrant input (e.g. splitting an issue across two viable boundaries, a coverage gap whose resolution requires a product decision, a contradiction between PRD and issues that could be resolved either way). Present these as a short numbered list and ask which to act on.

7. Apply changes. For each auto-apply item and each user-confirmed item, update the affected issue `.md` files (edit content, acceptance criteria, dependencies, etc.) and `plans/<plan-name>/issues/index.json` (update deps, add/remove entries as needed). Do NOT edit `plans/<plan-name>/README.md`.

8. Report briefly. Give the user a short summary of what you addressed on your own — one bullet per change, just enough that they know what happened. Do not be descriptive or exhaustive.
