---
name: review-issues
description: Review an issue set by spawning two subagents (one for implementor review, one for PRD-coverage review), consolidating their feedback into actionable items. Use when the user wants to review issues, validate the issue breakdown, check issues against the parent PRD, or mentions "review issues".
---

This skill is invoked when the user wants to review an issue set against its parent PRD. You spawn two specialized subagents for complementary perspectives, then consolidate their feedback into actionable edits.

1. Locate the plan. The plan lives at `plans/<plan-name>/`. If the user specified the plan name, use it. Otherwise list all folders inside `plans/`: if there is exactly one, use it automatically; if there are multiple, ask the user which plan to review.

2. Read all materials: `plans/<plan-name>/README.md` (the PRD), `plans/<plan-name>/issues/index.json`, every `plans/<plan-name>/issues/*.md` file, and the effort rubric at [../prd-to-issues/REFERENCE.md](../prd-to-issues/REFERENCE.md) (sibling skill, single source of truth — do not duplicate).

3. Spawn the Implementor Review subagent with the following instructions:

   <implementor-review-prompt>
   You are the engineer who will implement these issues one-by-one on isolated branches. Review the issue set critically:

   1. Are inter-issue dependencies correct and complete? Flag any missing or circular deps.
   2. Is any single issue too large for one focused implementation session (~2–4 hours of AI agent work)? Suggest how to split it.
   3. For each issue, is the assigned `effort` level accurate against the rubric below? Flag any issue where the level looks off — say what level you'd assign and which checklist items pushed you there.
   4. Is anything ambiguous or missing that would block you from starting implementation? What questions would you need answered?

   Be specific: cite issue numbers (e.g. "Issue 007") and explain exactly what is wrong.

   Effort rubric:

   {contents of ../prd-to-issues/REFERENCE.md}

   Issues:

   {contents of all issue .md files, separated by ---}

   index.json:

   {contents of index.json}
   </implementor-review-prompt>

4. Spawn the PRD-Coverage Review subagent with the following instructions:

   <coverage-review-prompt>
   You are an outside reviewer checking whether this issue set faithfully implements its parent PRD. Review for completeness and correctness:

   1. Does the issue set fully cover every user story and implementation decision in the PRD?
   2. Is anything missing from the issues that the PRD requires?
   3. Is anything in the issues that contradicts or goes beyond the PRD?
   4. Are any concerns duplicated across issues or split at awkward boundaries?
   5. Would a developer completing these issues in dependency order produce exactly what the PRD describes?

   Be specific: cite issue numbers and PRD sections.

   PRD:

   {contents of README.md}

   Issues:

   {contents of all issue .md files, separated by ---}
   </coverage-review-prompt>

5. Consolidate findings. Take both subagent responses and:

   - Group findings by theme (e.g. "Dependencies", "Scope / Sizing", "Coverage Gaps", "Ambiguities", "Splitting / Merging").
   - Remove duplicates where both subagents raised the same concern.
   - Note the source perspective in brackets after each item, e.g. `[implementor]`, `[coverage]`, or `[both]`.
   - Present as a single numbered list to the user.

6. Ask which items to act on. Present the consolidated list and ask the user which items (by number) to apply. The user may select all, some, or none.

7. Apply confirmed changes. For each confirmed item, update the affected issue `.md` files (edit content, acceptance criteria, dependencies, etc.) and `plans/<plan-name>/issues/index.json` (update deps, add/remove entries as needed). Do NOT edit `plans/<plan-name>/README.md`. Confirm all changes made to the user.
