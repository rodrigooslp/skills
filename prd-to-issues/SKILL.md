---
name: prd-to-issues
description: Break a PRD into independently-grabbable issues using tracer-bullet vertical slices, saved as markdown files in the plan's `issues/` folder along with an `index.json` tracker. Use when the user wants to convert a PRD to issues, create implementation tickets, or break down a PRD into work items.
---

This skill is invoked when the user wants to break a PRD into implementation issues. The PRD lives at `plans/<plan-name>/README.md`. You produce numbered issue files under `plans/<plan-name>/issues/` plus an `index.json` tracker.

1. Locate the PRD. The PRD lives at `plans/<plan-name>/README.md`. If the user hasn't specified the plan name and there is more than one folder inside `plans/`, ask them which one to use. If there is only one, use it.

2. Explore the codebase (optional). If you have not already explored the codebase, do so to understand the current state of the code.

3. Draft vertical slices. Break the PRD into **tracer-bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

   Slices may be `HITL` (require human interaction, such as an architectural decision or a design review) or `AFK` (can be implemented and merged without human interaction). Prefer AFK over HITL where possible.

   <vertical-slice-rules>
   - Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
   - A completed slice is demoable or verifiable on its own
   - Prefer many thin slices over few thick ones
   </vertical-slice-rules>

   For each slice, assign an **effort** level from 1-5 using the rubric in [REFERENCE.md](REFERENCE.md). The level reflects how much reasoning and design judgement the issue requires, which downstream tooling uses to route the issue to an appropriately capable model.

4. Quiz the user. Present the proposed breakdown as a numbered list. For each slice, show:

   - **Title**: short descriptive name
   - **Type**: HITL / AFK
   - **Effort**: 1-5 (see [REFERENCE.md](REFERENCE.md))
   - **Blocked by**: which other slices (if any) must complete first
   - **User stories covered**: which user stories from the PRD this addresses

   Ask the user: does the granularity feel right (too coarse / too fine)? Are the dependency relationships correct? Should any slices be merged or split further? Are the correct slices marked as HITL vs AFK? Do the effort levels look right?

   Iterate until the user approves the breakdown.

5. Create the issue files. Once approved, create the `plans/<plan-name>/issues/` folder if it doesn't exist. Also create an empty `plans/<plan-name>/progress.md` if it doesn't already exist.

   Number issues with zero-padded three-digit prefixes starting from `001`. Derive a short kebab-case slug from the title. File naming: `plans/<plan-name>/issues/<NUMBER>-<slug>.md`. Create files in dependency order (blockers first) so you can reference real file numbers in the "Blocked by" field.

   Do NOT edit `plans/<plan-name>/README.md`.

   <issue-template>
   # <NUMBER> — <Title>

   ## Type

   HITL / AFK

   ## Effort

   A single integer from 1 to 5.

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

6. Generate `index.json`. After creating all issue files, generate `plans/<plan-name>/issues/index.json`. This file is the machine-readable index consumed by the pipeline.

   <index-json-schema>
   The file is a JSON array (2-space indented, trailing newline) of objects in numeric order. Each object has exactly these fields:

   | Field    | Type       | Description                                                    |
   |----------|------------|----------------------------------------------------------------|
   | `id`     | `string`   | Zero-padded three-digit issue number (e.g. `"001"`)            |
   | `effort` | `number`   | Effort level from 1-5 (see [REFERENCE.md](REFERENCE.md)) |
   | `slug`   | `string`   | Kebab-case slug matching the issue filename                    |
   | `deps`   | `string[]` | Array of `id` values this issue is blocked by (empty if none)  |
   | `status` | `string`   | Always `"pending"` for newly generated issues                  |

   Example:

   ```json
   [
     { "id": "001", "effort": 1, "slug": "project-scaffolding", "deps": [], "status": "pending" },
     { "id": "002", "effort": 3, "slug": "data-model", "deps": ["001"], "status": "pending" },
     { "id": "003", "effort": 4, "slug": "api-endpoints", "deps": ["001"], "status": "pending" },
     { "id": "004", "effort": 5, "slug": "ui-shell", "deps": ["002", "003"], "status": "pending" }
   ]
   ```
   </index-json-schema>

7. Generate `layers.json`. After writing `index.json`, run the bundled script to compute topological levels and write `plans/<plan-name>/issues/layers.json`:

   ```
   node prd-to-issues/scripts/build-layers.mjs --index plans/<plan-name>/issues/index.json
   ```

   The script reads the index, groups issues into dependency layers (level 0 = no blockers, level N = all blockers are in levels < N), and writes `layers.json` next to `index.json`. The output looks like:

   ```json
   [
     { "level": 0, "issues": ["001", "007"] },
     { "level": 1, "issues": ["002", "004"] }
   ]
   ```

   If the script reports a cycle error, surface it to the user and ask them to fix the dependency relationships before proceeding.

8. Confirm completion. Once all files are written, confirm the full list of created files to the user and let them know they can invoke the `work-on-issue` skill to start working on any unblocked issue.
