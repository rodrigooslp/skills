---
name: review-prd
description: Review a PRD by spawning two subagents (one for product/design gaps, one for implementability), consolidating their feedback into actionable items. Use when the user wants to review a PRD, validate a product requirements document, check a PRD before breaking it into issues, or mentions "review PRD".
---

This skill is invoked when the user wants to review a PRD before breaking it into issues. You spawn two specialized subagents for complementary perspectives, then consolidate their feedback into actionable edits.

1. Locate the plan. The plan lives at `plans/<plan-name>/`. If the user specified the plan name, use it. Otherwise list all folders inside `plans/`: if there is exactly one, use it automatically; if there are multiple, ask the user which plan to review.

2. Read materials. Read `plans/<plan-name>/README.md` (the PRD) and `AGENTS.md` at the repo root (if it exists — used as system prompt context).

3. Spawn the Product/Design Review subagent with the following instructions (include `AGENTS.md` as system context if it exists):

   <product-design-review-prompt>
   You are reviewing a PRD before implementation begins. Your job is to find problems that would cause rework or confusion downstream.

   Flag:
   1. Gaps — user stories or flows that are mentioned but never fully specified
   2. Contradictions — places where two sections of the PRD disagree
   3. Undefined edge cases — what happens when things go wrong or inputs are unexpected?
   4. Missing acceptance criteria — how would an engineer know they're done?
   5. Ambiguous scope boundaries — what's in and what's out?

   Be specific and cite the relevant section. Vague concerns like "needs more detail" without saying what detail is missing are not useful.

   PRD:

   {contents of README.md}
   </product-design-review-prompt>

4. Spawn the Implementor Review subagent with the following instructions (include `AGENTS.md` as system context if it exists):

   <implementor-review-prompt>
   You are the engineer who will implement this PRD. You need to turn this spec into working code. Review it and flag anything that would block you:

   1. Missing naming conventions — what should things be called in code?
   2. Ambiguous interfaces — where two modules meet, what's the contract?
   3. Undefined behaviour — what happens in edge cases the PRD doesn't address?
   4. Unimplementable requirements — anything that's technically infeasible or contradictory?
   5. Missing sequencing — are there implicit dependencies between features that aren't called out?

   Be specific: quote the problematic section and explain what's wrong and what you'd need clarified.

   PRD:

   {contents of README.md}
   </implementor-review-prompt>

5. Consolidate findings. Take both subagent responses and:

   - Group findings by theme (e.g. "Gaps", "Contradictions", "Edge Cases", "Interfaces", "Scope", "Sequencing").
   - Remove duplicates where both subagents raised the same concern.
   - Note the source perspective in brackets after each item, e.g. `[product/design]`, `[implementor]`, or `[both]`.
   - Present as a single numbered list to the user.

6. Ask which items to act on. Present the consolidated list and ask: "Which of these do you want me to act on? (reply with numbers, "all", or "none")"

7. Apply confirmed changes. For each confirmed item, update `plans/<plan-name>/README.md` in place — adding missing details, resolving contradictions, clarifying edge cases, etc. Confirm all changes made to the user.
