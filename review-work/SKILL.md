---
name: review-work
description: Validate that the work done on a numbered issue meets every acceptance criterion in its issue file, then autonomously close any gaps. Spawns a read-only validator subagent that checks the diff against the spec, the working tree, and the `index.json` status; the main agent then implements missing criteria, commits leftover work, marks the issue done, and reports a brief list of what was changed. Use when the user asks to review work on a numbered issue, validate that an issue is done, check an implementation against its spec, or names an issue to verify — e.g. "review work on issue 007". Often invoked right after [`work-on-issue`](../work-on-issue/SKILL.md) completes.
---

Verifies that work produced by [`work-on-issue`](../work-on-issue/SKILL.md) (for issues authored by [`prd-to-issues`](../prd-to-issues/SKILL.md)) fulfills its written acceptance criteria, **then autonomously closes any gaps the subagent identifies**. No confirmation before acting.

`<SKILL_DIR>` is the directory containing this `SKILL.md`. Resolver and tracker scripts are reused from the sibling `work-on-issue` skill at `<SKILL_DIR>/../work-on-issue/scripts/`.

1. Resolve plan and issue.

   Run `node <SKILL_DIR>/../work-on-issue/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name; exit 2 with a list = ask the user which and re-run with `--plan`.

   Then run `node <SKILL_DIR>/../work-on-issue/scripts/resolve-issue.mjs --plan <plan> --id <id>`. **Always pass `--id`** — review needs a specific target, and the script's default ("first non-done entry") is the opposite of what we want. If the user didn't name an issue, ask which one to review. Stdout JSON: `{ id, slug, status, file, fileExists, ... }`. Stop if `fileExists` is false.

2. Identify the changes to review.

   Pick a base ref in this order: (a) one the user supplied; (b) `git merge-base HEAD origin/<default-branch>` (fall back to `main`/`master` if no remote) when HEAD is not the default branch; (c) if HEAD *is* the default branch, ask the user for a commit range.

   Capture: `git diff <base>...HEAD` (committed), `git diff` and `git diff --cached` (uncommitted), `git log --oneline <base>...HEAD`, `git status --porcelain=v1`. If both committed and uncommitted diffs are empty, stop — nothing to review.

3. Read the issue file and the matching entry from `plans/<plan>/issues/index.json`. The issue's **Acceptance criteria** section is the authoritative checklist; **What to build**, **Blocked by**, and **User stories addressed** define scope.

4. Spawn the validator subagent using the prompt template in [REFERENCE.md](REFERENCE.md), filling in the placeholders with the artifacts from Steps 1–3. The subagent is read-only — it produces only the structured report (sections A–E); the main agent acts on it in Step 5.

5. Act on the findings — autonomously, no user confirmation. Apply in order so each step leaves a clean tree for the next:

   1. **Close acceptance-criteria gaps.** For each criterion the subagent marked **Partially Met** or **Not Met**, implement the concrete change it described. Follow `work-on-issue` Step 4 scope rules (in-scope only; out-of-scope observations stay as `// Issue NNN:` comments).
   2. **Fix actionable quality smells** the subagent listed under section E (dead code, debug prints, missing tests for criteria, self-referential `// Issue NNN:` markers).
   3. **Run quality gates** if any code changed: `<pm> run test`, `<pm> run typecheck`, `<pm> run lint`, `<pm> run build` (only those present in `package.json`). Detect the package manager from the lock file (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `package-lock.json`→npm, `bun.lockb`→bun; ask if none). Fix failures in scope and re-run from the failing gate.
   4. **Commit anything uncommitted.** If `git status --porcelain=v1` is non-empty (leftover work flagged in section B, or changes you just made), invoke `commit-changes` to stage and commit. Working tree must be empty before the next step.
   5. **Mark the issue done** if section C said "Not marked done" *and* all criteria are now Met *and* the working tree is clean. Run `node <SKILL_DIR>/../work-on-issue/scripts/mark-done.mjs --plan <plan> --id <id>`. Surface non-zero exit and stop.

   Track each action you take — you'll list them in Step 6. **Scope violations (section D) are reported only**, never acted on.

6. Report — brief list, nothing else.

   <action-report>
   ## Issue &lt;NUMBER&gt; — Review Actions

   - &lt;one-line description of each action taken, in order&gt;

   **Scope violations left in place:** &lt;file:line — reason&gt; (omit this line if none)

   **Status:** ✅ Complete / ⚠️ Blocked — &lt;reason&gt;
   </action-report>

   One bullet per action. Do not summarize the spec, the diff, or the subagent's reasoning. The report ends with the status line — no follow-up suggestions.
