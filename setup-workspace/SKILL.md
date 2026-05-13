---
name: setup-workspace
description: Create a git worktree for the next pending issue in a plan, on a branch named after the issue's slug, then run `pnpm install` and copy root `.env*` files into the worktree. Use when the user asks to set up a workspace, spin up an isolated dev environment, or "set up the next issue from the auth plan".
---

This skill is invoked when the user wants to set up a worktree for the next pending issue in a plan. Helper scripts under `<SKILL_DIR>/scripts/` handle plan resolution and JSON parsing; you handle the git and pnpm commands. `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Hard rules — never violate:

- Never `--force` anything. Surface errors verbatim and do not work around them.
- Never edit `plans/<plan>/issues/index.json` from this skill.
- Never push, rebase, reset, or amend.
- Never run `git checkout` in the main working dir.
- Never attach to a branch with commits ahead of `HEAD` without explicit user confirmation.
- Always use forward slashes in paths.

1. Resolve the plan and pick the issue.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit code 2 = multiple plans available; ask the user and re-run with `--plan`. Surface other errors verbatim and stop.

   Then run `node <SKILL_DIR>/scripts/pick-next-issue.mjs --plan <plan>`. Stdout = JSON `{ "id": "...", "slug": "...", "status": "..." }`. Exit code 2 = everything is already done; stop and tell the user. Tell the user, in one line, which issue you picked.

2. Check git state.

   Run `git rev-parse --abbrev-ref HEAD`, `git worktree list`, and `git branch --list <slug>`. If `HEAD` is detached, stop. If `git worktree list` shows any line whose path ends with `worktrees/<plan>/<id>`, stop — the worktree already exists. If `git branch --list <slug>` is non-empty the branch already exists; run `git log HEAD..<slug> --oneline` and, if it shows commits, surface them and ask the user to confirm attaching the worktree to this branch before continuing.

3. Create the worktree.

   If the branch does not exist: `git worktree add -b <slug> worktrees/<plan>/<id>`.

   If the branch exists and is safe (empty `HEAD..<slug>`, or the user approved): `git worktree add worktrees/<plan>/<id> <slug>`.

   Surface any failure verbatim and stop.

4. Install and copy env files.

   Run `pnpm --dir worktrees/<plan>/<id> install`, then `node <SKILL_DIR>/scripts/copy-env-files.mjs --dest worktrees/<plan>/<id>`. If `pnpm install` fails, leave the worktree in place and stop. If `copy-env-files` reports `0 .env file(s) copied`, that is fine — say so in the final report.

5. Report in 3–5 lines: the plan and issue picked, the worktree path, the branch (new from `<current>` vs. attached to existing), the pnpm result, and the `.env` file count.
