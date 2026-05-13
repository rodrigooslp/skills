---
name: clean-workspace
description: Remove finished worktrees and their companion branches for issues already marked "done" in a plan's `issues/index.json`. Use when the user asks to clean up worktrees, tear down dev environments for completed issues, or "clean up the worktrees for the auth plan".
---

This skill is invoked when the user wants to remove worktrees for issues already marked `"done"`. Helper scripts under `<SKILL_DIR>/scripts/` build the candidate list; you run the git commands and report at the end. `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Hard rules — never violate:

- Never `--force` (`git worktree remove --force`, `git branch -D`) without explicit user approval.
- Never touch a worktree whose issue is not `"done"` in `index.json`.
- Never edit `plans/<plan>/issues/index.json`.
- Never delete the worktree directory with a filesystem command — go through `git worktree remove`.
- Never abort the whole loop on a single candidate's failure — skip that one, record why, continue with the rest.
- Always use forward slashes in paths.

1. Resolve the plan and list candidates.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit 2 = nothing to clean up (no `worktrees/` or empty subfolders); tell the user and stop. Exit 1 with a list = multiple plans; ask the user and re-run with `--plan`.

   Then run `node <SKILL_DIR>/scripts/list-cleanup-candidates.mjs --plan <plan>`. Stdout = JSON array of `{ id, slug, worktreePath }`. If the array is empty, tell the user there's nothing to clean up and stop. Otherwise echo the candidates back as a short bullet list so the user can see what you're about to touch. You don't need their approval — the per-candidate `git log HEAD..<slug>` check below and the `-d` (lowercase) delete are the safety net.

2. For each candidate, in order, do the following. Track outcomes (`cleaned` / `skipped` with reason). If any single step errors, record the reason and continue with the next candidate.

   Run `git worktree list`. If no line ends with `worktrees/<plan>/<id>`, skip this candidate (directory exists but isn't registered; leave for the user).

   Run `git log HEAD..<slug> --oneline`. If non-empty, skip and record the commit list as the "skipped — unmerged commits" reason.

   Otherwise run `git worktree remove worktrees/<plan>/<id>` then `git branch -d <slug>`. `-d` lowercase only. If either errors, record the reason and skip.

3. Final report.

   After the loop, run `git worktree list` and `git branch --list` and confirm each cleaned candidate no longer appears. Print a report grouped by outcome — `Cleaned up`, `Skipped (unmerged commits)`, `Skipped (error)`, `Verification failed` — including the verbatim error/log output for each skipped item.
