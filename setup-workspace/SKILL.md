---
name: setup-workspace
description: >
  Use this skill when the user asks to set up a workspace, create a worktree
  for the next pending issue, spin up an isolated dev environment, or "set up
  the next issue from the auth plan". Takes an optional plan name, resolves
  the plan under `plans/`, picks the first issue whose status is not "done"
  in `plans/<plan>/issues/index.json`, creates a git worktree at
  `./worktrees/<plan>/<id>` on a branch named after the issue's slug, runs
  `pnpm install`, and copies root `.env*` files into the worktree.
---

# Setup Workspace Skill

You set up a worktree for the next pending issue in a plan. Helper scripts
under `<SKILL_DIR>/scripts/` handle the deterministic logic (plan
resolution, JSON parsing). You handle the git and pnpm commands.

`<SKILL_DIR>` is the directory containing this `SKILL.md` (e.g.
`~/.claude/skills/setup-workspace`). Construct full paths from there.

## Hard rules

- ❌ Never `--force` anything. Surface errors verbatim, do not work around.
- ❌ Never edit `plans/<plan>/issues/index.json` from this skill.
- ❌ Never push, rebase, reset, amend.
- ❌ Never run `git checkout` in the main working dir.
- ❌ Never attach to a branch with commits ahead of `HEAD` without explicit
  user confirmation.
- ✅ Use forward slashes in paths. Use the helper scripts for plan/issue
  resolution.

## Steps

### 1. Resolve plan and pick issue

```
node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]
```

Stdout = plan name. Non-zero exit code 2 = multiple plans available; ask
the user which one and re-run with `--plan`. Surface other errors verbatim
and stop.

```
node <SKILL_DIR>/scripts/pick-next-issue.mjs --plan <plan>
```

Stdout = JSON `{ "id": "...", "slug": "...", "status": "..." }`. Exit code
2 = everything is already done; stop and tell the user.

Tell the user, in one line, which issue you picked.

### 2. Check git state

```
git rev-parse --abbrev-ref HEAD
git worktree list
git branch --list <slug>
```

- If `HEAD` is detached → stop.
- If `git worktree list` shows any line whose path ends with
  `worktrees/<plan>/<id>` → stop. The worktree already exists.
- If `git branch --list <slug>` is non-empty, the branch already exists.
  Run `git log HEAD..<slug> --oneline`. If it shows commits, surface them
  and ask the user to confirm attaching the worktree to this branch
  before continuing.

### 3. Create the worktree

If the branch does not exist:

```
git worktree add -b <slug> worktrees/<plan>/<id>
```

If the branch exists and is safe (empty `HEAD..<slug>`, or user approved):

```
git worktree add worktrees/<plan>/<id> <slug>
```

Surface any failure verbatim and stop.

### 4. Install and copy env

```
pnpm --dir worktrees/<plan>/<id> install
node <SKILL_DIR>/scripts/copy-env-files.mjs --dest worktrees/<plan>/<id>
```

If `pnpm install` fails, leave the worktree in place and stop. If
`copy-env-files` reports `0 .env file(s) copied`, that is fine — say so
in the final report.

### 5. Report

In 3–5 lines: the plan + issue picked, the worktree path, the branch (new
from `<current>` vs. attached to existing), pnpm result, .env file count.
