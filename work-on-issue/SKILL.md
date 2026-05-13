---
name: work-on-issue
description: >
  Use this skill whenever you are asked to implement, work on, or complete a
  documented issue file — for example "work on issue 004", "implement issue 012",
  "you're agent on issue 007", or any prompt that assigns a numbered issue to
  the agent. The skill scopes the agent strictly to the assigned issue, loads
  the right context files, enforces quality gates, and produces a structured
  completion report. Always use this skill when an issue number is mentioned
  alongside a request to do implementation work.
---

# Issue Agent Skill

You are a focused implementation agent. Your scope is **strictly limited** to
the work described in your assigned issue file — nothing more, nothing less.

Helper scripts under `<SKILL_DIR>/scripts/` handle the deterministic bits
(plan resolution, issue lookup, marking done). `<SKILL_DIR>` is the directory
containing this `SKILL.md`. Construct full paths from there.

## Folder Convention

```
plans/
└── <plan-name>/
    ├── README.md       ← spec / requirements for this plan
    ├── progress.md     ← agent handoff notes (optional)
    └── issues/
        ├── index.json  ← issue tracker
        ├── 001-some-feature.md
        ├── 002-another-task.md
        └── ...
```

## Step 1 — Resolve plan and issue

```
node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]
```

Stdout = plan name. Exit 2 with a list = multiple plans; ask the user and
re-run with `--plan`.

```
node <SKILL_DIR>/scripts/resolve-issue.mjs --plan <plan> [--id <id>]
```

Pass `--id` when the prompt named a specific issue (e.g. "issue 4" → `--id 4`;
the script handles padding). Omit it to let the script pick the first
non-done entry in ascending `id` order. Exit 2 = all done; stop and tell the
user.

Stdout = JSON `{ id, slug, status, file, fileExists, deps, unfinishedDeps }`.

- If `fileExists` is `false`, **stop** and surface the path — the index says
  the issue exists but the markdown file is missing.
- If `unfinishedDeps` is non-empty, **stop and ask the user** whether they'd
  rather work on one of the unfinished deps first. List them so the user can
  pick directly. Only proceed if the user confirms.

## Step 2 — Detect package manager

Check the project root for a lock file:

| Lock file | Package manager |
|-----------|----------------|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `package-lock.json` | `npm` |
| `bun.lockb` | `bun` |

If none is found, **ask the user** which to use.

## Step 3 — Pre-flight context read

Read these files in order:

1. `plans/<plan>/README.md` — product requirements and constraints.
2. `<file>` from Step 1's JSON — your exact scope.
3. `plans/<plan>/progress.md` if it exists — notes from prior agents.

Internally summarise: what you must do, what you must not touch, prior
gotchas. Do not begin implementation until that summary is clear.

## Step 4 — Strict scope rules

✅ Complete **all** work described in your assigned issue file
✅ Read other issue files **for context only** if needed
❌ Do **not** implement, modify, or begin work described in other issue files
❌ Do **not** work ahead — even if a next step seems obvious
❌ Do **not** edit, rename, or close any issue file

Leave out-of-scope observations as inline `// Issue NNN: <observation>`
comments and move on.

## Step 5 — Implementation

Do the work. Follow the issue file exactly. Refer back to `README.md` for
intent if ambiguous.

## Step 6 — Quality gates

Run whichever scripts exist in `package.json`, in this order, using the
package manager from Step 2:

```
<pm> run test
<pm> run typecheck
<pm> run lint
<pm> run build
```

All present scripts must pass with zero errors. On failure: fix the root
cause (in scope), re-run from the failing step. If a fix requires
out-of-scope changes, document the blocker and stop — do not hack around it.

## Step 7 — Mark issue as done (MANDATORY)

🛑 This step is the one agents most often forget. Downstream skills depend on
the tracker being accurate. **Do not skip and do not defer to after the
completion report.**

```
node <SKILL_DIR>/scripts/mark-done.mjs --plan <plan> --id <id>
```

The script:

- Sets the entry's `status` to `"done"` in `plans/<plan>/issues/index.json`.
- Preserves the file's original formatting (single-line-per-entry).
- Validates by re-parsing the file after writing.
- Is idempotent — running on an already-done entry is a no-op.

If the script exits non-zero, **stop and surface the error** before producing
the completion report. The issue is not complete until this script succeeds.

## Step 8 — Completion report

```
## Issue <NUMBER> — Completion Report

**Status:** ✅ Complete / ⚠️ Partial (explain) / ❌ Blocked (explain)

**Changes made:**
- <file or component>: <what changed and why>

**Quality gates:**
- <command> — PASS / FAIL

**index.json updated:** ✅ Yes (status set to "done") / ❌ No (explain)

**Out-of-scope observations:**
- <anything noted for other issues, or "None">

**Did not touch:**
- <key files/areas explicitly left unchanged>
```

`index.json updated` must be ✅ Yes. If it isn't, the issue is not complete —
go back to Step 7.

## Step 9 — Update progress log (optional but encouraged)

**Append** a short entry to the **very end** of `plans/<plan>/progress.md`
— never between existing entries, never at the top. The log is
chronological; inserting in the middle breaks the timeline for the next
agent. If `progress.md` does not exist, skip this step.

```markdown
### Issue <NUMBER> — <Issue Title>
- <Gotcha, non-obvious decision, or useful context>
- <Another if needed — keep to 2–4 bullets max>
```

Do **not** summarise what you did. Do **not** repeat the issue file. Write
only what would help the next agent.
