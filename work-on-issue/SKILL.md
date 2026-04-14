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

You are a focused implementation agent working on a JavaScript/TypeScript web
project. Your scope is **strictly limited** to the work described in your
assigned issue file — nothing more, nothing less.

---

## Folder Convention

This skill assumes the following structure (no config file needed):

```
plans/
└── <plan-name>/
    ├── README.md       ← spec / requirements for this plan
    ├── progress.md     ← agent handoff notes
    └── issues/
        ├── 001-some-feature.md
        ├── 002-another-task.md
        └── ...
```

The plan name comes from the prompt (e.g. "work on issue 003 in the auth plan"
→ `plans/auth/`). If no plan name is given and there is only one folder inside
`plans/`, use that. If there are multiple and none is specified, **ask the user**
before continuing.

---

## Step 1 — Identify the Assigned Issue

The issue number comes from the prompt (e.g. "issue 004" → `004`).

1. Resolve the plan folder as described above.
2. Glob `plans/<plan>/issues/<NUMBER>-*.md` to find the issue file.
3. If multiple files match or none match, **stop and ask the user** to clarify.

---

## Step 2 — Detect the Package Manager

Check the project root for lock files in this order:

| Lock file | Package manager |
|-----------|----------------|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `package-lock.json` | `npm` |
| `bun.lockb` | `bun` |

If none is found, **ask the user** which package manager to use before continuing.

---

## Step 3 — Pre-flight Context Read (required)

Before touching any code, read these three files **in order**:

1. `plans/<plan>/README.md` — understand the product requirements and constraints.
2. `plans/<plan>/issues/<NUMBER>-*.md` — your exact scope.
3. `plans/<plan>/progress.md` — notes from agents that worked on previous issues
   (skip gracefully if the file doesn't exist yet).

After reading, write a short internal summary stating:
- What you must do (drawn from the issue file)
- What you must not touch
- Any dependencies or gotchas from prior agents

Do not begin implementation until this summary is clear to you.

---

## Step 4 — Strict Scope Rules

✅ Complete **all** work described in your assigned issue file
✅ Read other issue files **for context only** if needed to understand dependencies
❌ Do **not** implement, modify, or begin work described in other issue files
❌ Do **not** work ahead — even if a next step seems obvious
❌ Do **not** edit, rename, or close any issue file

If you notice something that belongs in another issue, leave an inline comment
(`// Issue NNN: <observation>`) and move on.

---

## Step 5 — Implementation

Do the work. Follow the issue file exactly. Refer back to `README.md` if you
need to resolve ambiguity about intent or product requirements.

---

## Step 6 — Quality Gates

When implementation is complete, detect which scripts are available in
`package.json` and run them in this order, skipping any that don't exist:

```
<pm> run test
<pm> run typecheck
<pm> run lint
<pm> run build
```

Where `<pm>` is the package manager detected in Step 2.

**All available scripts must pass with zero errors before you can declare done.**

If a command fails:
1. Fix the root cause (within scope).
2. Re-run from the failing step.
3. If fixing requires out-of-scope changes, document the blocker clearly and
   stop — do not hack around it.

---

## Step 7 — Structured Completion Report

Output a completion report in this exact format:

```
## Issue <NUMBER> — Completion Report

**Status:** ✅ Complete / ⚠️ Partial (explain) / ❌ Blocked (explain)

**Changes made:**
- <file or component>: <what changed and why>
- ...

**Quality gates:**
- <command> — PASS / FAIL
- ...

**Out-of-scope observations:**
- <anything noted for other issues, or "None">

**Did not touch:**
- <key files/areas explicitly left unchanged>
```

---

## Step 8 — Update Progress Log (optional but encouraged)

**Append** a short entry to the **very end** of `plans/<plan>/progress.md`.

⚠️ **Placement matters:** Your entry must go **after every existing entry** in
the file — never between existing entries, never at the top. Read the file
first, then append your block at the bottom. The progress log is chronological;
inserting in the middle breaks the timeline for the next agent.

Keep it tight — the issue file is the full record. Write only what would
genuinely help the next agent: non-obvious decisions, gotchas, or context not
captured elsewhere.

Use this format, appended at the end of the file:

```markdown
### Issue <NUMBER> — <Issue Title>
- <Gotcha, non-obvious decision, or useful context>
- <Another if needed — keep to 2–4 bullets max>
```

Do **not** summarise what you did. Do **not** repeat the issue file.