---
name: merge-branch
description: Merge an issue branch into the current branch via `--no-ff` (never squash), remove its registered worktree at `./worktrees/<plan>/<id>` if any, and delete the merged branch locally. Use when the user asks to merge an issue branch — for example "merge-branch 6", "merge issue 12 in", or "bring issue 7 from the auth plan into this branch".
---

This skill is invoked when the user wants to merge an issue branch into the current branch and clean up its worktree/branch. Helper scripts under `<SKILL_DIR>/scripts/` handle plan and issue resolution; you handle the git commands and the user confirmation step. `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Hard rules — never violate:

- Never use `--squash` or `--ff-only`. Always `git merge --no-ff`.
- Never push, rebase, reset, amend, skip hooks, or skip signing.
- Never resolve merge conflicts, run `git merge --abort`, or `git add` / `git commit` to recover from a failed merge.
- Never force-delete (`git branch -D`) or `--force` a worktree removal without explicit user approval.
- Never delete the branch before removing its worktree — `git branch -d` refuses a branch that is checked out elsewhere.
- Never take a raw branch name from the prompt — always resolve it from `plans/<plan>/issues/index.json` via the helper script.
- Always ask the user for explicit approval before running the merge.

1. Resolve the plan and issue.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit 2 with a list = multiple plans; ask the user.

   The user's prompt should include the issue id (e.g. "merge branch 6"). If missing, ask. Then run `node <SKILL_DIR>/scripts/resolve-issue.mjs --plan <plan> --id <id>`. Stdout = JSON `{ id, slug, status, worktreePath }`. The script normalises `6` → `"006"` and errors with available ids if no match. If `slug` equals the current branch, stop — can't merge into itself.

2. Pre-flight checks.

   Run `git rev-parse --abbrev-ref HEAD` (store as `<current>`; stop if HEAD is detached), `git rev-parse --verify <slug>` (ensure the branch exists locally), and `git status --porcelain=v1` (stop if not empty).

3. Summarise and ask for approval.

   Run, in parallel: `git log <current>..<slug> --oneline` (incoming commits), `git diff --stat <current>...<slug>` (three-dot file stat), `git log <slug>..<current> --oneline` (commits on current ahead of slug), and `git worktree list` (to detect `<worktreePath>`).

   If `git log <current>..<slug>` is empty, stop — nothing to merge.

   Present a summary: direction (merging `<slug>` into `<current>`), incoming commits, file stat, one line about divergence, and whether a worktree at `<worktreePath>` will be removed after the merge.

   Ask, verbatim, adapting the worktree clause:

   > Proceed with `git merge --no-ff <slug>` into `<current>`, then [remove the worktree at `<worktreePath>` and] delete branch `<slug>` locally? (yes / no)

   Wait for explicit approval. Anything ambiguous → ask again.

4. Merge.

   Run `git merge --no-ff <slug>`. On failure, surface output verbatim and stop. Tell the user the repo is in an in-progress merge state; they can resolve or `git merge --abort`. Do not touch anything else.

5. Verify the merge commit, then clean up.

   Run `git log -1 --pretty=%H%n%P%n%s` (the `%P` line must contain two hashes — a real merge commit) and `git status` (working tree must be clean). If either check fails, surface output and stop.

   Only if Step 3's `git worktree list` showed `<worktreePath>` registered, run `git worktree remove <worktreePath>`. No `--force`. If it fails, surface verbatim and ask the user before retrying with `--force`. Do not run `git branch -d` until the worktree is gone.

   Then run `git branch -d <slug>`. `-d` lowercase only. If it fails, stop and surface the error.

6. Final confirmation.

   Run `git branch --list <slug>` (must be empty) and `git worktree list` (must no longer contain `<worktreePath>`). Report success in 2–3 lines: branch + issue merged, worktree removed (if it was), local branch deleted, remote untouched.
