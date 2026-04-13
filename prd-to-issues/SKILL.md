---
name: prd-to-issues
description: Break a PRD into independently-grabbable issues using tracer-bullet vertical slices, saved as markdown files in the plan's issues/ folder. Use when user wants to convert a PRD to issues, create implementation tickets, or break down a PRD into work items.
---

# PRD to Issues

Break a PRD into independently-grabbable issue files using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD

The PRD lives at `plans/<plan-name>/README.md`. If the user hasn't specified the plan name and there is more than one folder inside `plans/`, ask them which one to use. If there is only one, use it.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Create the issue files

Once approved, create the `plans/<plan-name>/issues/` folder if it doesn't exist.

Number issues with zero-padded three-digit prefixes starting from `001`. Derive a short kebab-case slug from the title.

File naming: `plans/<plan-name>/issues/<NUMBER>-<slug>.md`

Create files in dependency order (blockers first) so you can reference real file numbers in the "Blocked by" field.

<issue-template>
# <NUMBER> — <Title>

## Type

HITL / AFK

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- `<NUMBER>-<slug>.md` (if any)

Or "None — can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

Do NOT edit `plans/<plan-name>/README.md`.

Once all files are written, confirm the full list of created files to the user and let them know they can invoke the `work-on-issue` skill to start working on any unblocked issue.