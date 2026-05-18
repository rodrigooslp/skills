---
name: merge-branch
description: Merge an issue branch into the current branch via `--no-ff` (never squash), remove its registered worktree at `./worktrees/<plan>/<id>` if any, and delete the merged branch locally. Use when the user asks to merge an issue branch — for example "merge-branch 6", "merge issue 12 in", or "bring issue 7 from the auth plan into this branch".
---

This skill is invoked when the user wants to merge an issue branch into the current branch and clean up its worktree/branch. Helper scripts under `<SKILL_DIR>/scripts/` handle plan and issue resolution; you handle the git commands and the user confirmation step. `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Hard rules — never violate:

- Never use `--squash` or `--ff-only`. Always `git merge --no-ff`.
- Never push, rebase, reset, amend, skip hooks, or skip signing.
- Never run `git merge --abort` without explicit user approval — conflicts are resolved in place when possible (see Step 4).
- Never force-delete (`git branch -D`) or `--force` a worktree removal without explicit user approval.
- Never delete the branch before removing its worktree — `git branch -d` refuses a branch that is checked out elsewhere.
- Never take a raw branch name from the prompt — always resolve it from `plans/<plan>/issues/index.json` via the helper script.
- When resolving conflicts autonomously, never guess at semantic intent — if you cannot tell which side is correct from surrounding context, stop and surface the specific conflict to the user.

1. Resolve the plan and issue.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit 2 with a list = multiple plans; ask the user.

   The user's prompt should include the issue id (e.g. "merge branch 6"). If missing, ask. Then run `node <SKILL_DIR>/scripts/resolve-issue.mjs --plan <plan> --id <id>`. Stdout = JSON `{ id, slug, status, worktreePath }`. The script normalises `6` → `"006"` and errors with available ids if no match. If `slug` equals the current branch, stop — can't merge into itself.

2. Pre-flight checks.

   Run `git rev-parse --abbrev-ref HEAD` (store as `<current>`; stop if HEAD is detached), `git rev-parse --verify <slug>` (ensure the branch exists locally), and `git status --porcelain=v1` (stop if not empty).

3. Summarise and proceed.

   Run, in parallel: `git log <current>..<slug> --oneline` (incoming commits), `git diff --stat <current>...<slug>` (three-dot file stat), `git log <slug>..<current> --oneline` (commits on current ahead of slug), and `git worktree list` (to detect `<worktreePath>`).

   If `git log <current>..<slug>` is empty, stop — nothing to merge.

   Present a short summary as information (no confirmation needed): direction (merging `<slug>` into `<current>`), incoming commits, file stat, one line about divergence, and whether a worktree at `<worktreePath>` will be removed after the merge.

   Then announce the action, verbatim, adapting the worktree clause:

   > Proceeding with `git merge --no-ff <slug>` into `<current>`, then [remove the worktree at `<worktreePath>` and] delete branch `<slug>` locally.

4. Merge.

   Run `git merge --no-ff <slug>`. If it completes cleanly, go to Step 5.

   If it fails with conflicts, attempt to resolve them yourself rather than stopping. Track every file you touch and every decision you make — you will report this at the end.

   - Run `git status --porcelain=v1` to list conflicted paths (lines starting with `UU`, `AA`, `DU`, `UD`, `AU`, `UA`, `DD`).
   - For each conflicted file, read it and inspect the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Use `git log --oneline -5 <slug> -- <path>` and `git log --oneline -5 <current> -- <path>` if you need recent history for that file to understand intent.
   - Resolve a conflict **only** when the right outcome is unambiguous from context. Safe cases include:
     - Both sides added non-overlapping entries (imports, exports, list/array/object entries, switch cases, enum members, JSON keys, route registrations) — keep both.
     - One side is a strict superset/rename of the other and the diff is mechanical (e.g. one side renamed an identifier that the other side also touched in an unrelated way).
     - Lockfiles, generated files, or other regenerable artifacts where the project has a canonical regeneration command — regenerate rather than hand-edit. If you are not certain the file is regenerable in this repo, treat it as ambiguous.
     - Pure formatting / whitespace / import-order conflicts where semantics are identical on both sides.
     - Conflict markers around a section that one side deleted and the other side left untouched — keep the deletion if the deletion was intentional in `<slug>` (check the commit message).
   - Surface to the user (do not guess) when:
     - Both sides changed the same logic, control flow, condition, or value in semantically different ways.
     - The conflict touches business rules, security-sensitive code, migrations, schemas, or anything where guessing wrong has real cost.
     - You don't understand what the file does or what either side was trying to achieve.
     - Resolving requires inventing code that didn't exist on either side.
     - Anything else you are genuinely unsure about.
   - After editing a file, verify no conflict markers remain in it (read it back or grep for `<<<<<<<`).
   - `git add` each file you fully resolved. Do **not** `git add` files you are surfacing to the user.
   - When all auto-resolvable files are staged, run `git status --porcelain=v1` again. If anything still shows a conflict state (`UU` etc.), stop without committing and surface those files to the user with: the path, a short description of each remaining conflict, and what you'd want their input on. Do not run `git merge --abort` — leave the in-progress merge for them to finish or abort.
   - If everything resolved, run `git commit --no-edit` to complete the merge with the default merge message. If the commit fails (hook failure, signing, etc.), surface the output verbatim and stop.

5. Verify the merge commit, then clean up.

   Run `git log -1 --pretty=%H%n%P%n%s` (the `%P` line must contain two hashes — a real merge commit) and `git status` (working tree must be clean). If either check fails, surface output and stop.

   Only if Step 3's `git worktree list` showed `<worktreePath>` registered, run `git worktree remove <worktreePath>`. No `--force`. If it fails, surface verbatim and ask the user before retrying with `--force`. Do not run `git branch -d` until the worktree is gone.

   Then run `git branch -d <slug>`. `-d` lowercase only. If it fails, stop and surface the error.

6. Final confirmation.

   Run `git show-ref --verify --quiet refs/heads/<slug>` — it must exit non-zero (the branch is gone). Do **not** use `git branch --list <slug> && ... || ...` to check this: `git branch --list` always exits 0 whether or not the branch matches, so the `&&`/`||` chain will misreport. Then run `git worktree list` and confirm it no longer contains `<worktreePath>`. Report success in 2–3 lines: branch + issue merged, worktree removed (if it was), local branch deleted, remote untouched. Use the ✅ emoji (not the ✓ character) as the success marker in the report.

   If you auto-resolved conflicts in Step 4, append a short **Conflicts resolved** section to the report listing each file you touched and the one-line rationale (e.g. `package.json — kept both new dependency entries`, `pnpm-lock.yaml — regenerated via pnpm install`). Keep it scannable so the user can spot-check anything that looks wrong.
