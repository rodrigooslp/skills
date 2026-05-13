---
name: clean-workspace
description: >
  Use this skill when the user asks to clean up workspaces, remove finished
  worktrees, tear down dev environments for completed issues, or "clean up
  the worktrees for the auth plan". Takes an optional plan name (otherwise
  inferred from the single subfolder under `worktrees/`), then removes every
  `./worktrees/<plan>/<id>` worktree whose corresponding issue is marked
  "done" in `plans/<plan>/issues/index.json`, along with each worktree's
  companion branch.
---

# Clean Workspace Skill

You clean up worktrees for issues that are already marked "done". Helper
scripts under `<SKILL_DIR>/scripts/` build the candidate list. You run the
git commands per candidate and report at the end.

`<SKILL_DIR>` is the directory containing this `SKILL.md`. Construct full
paths from there.

## Hard rules

- ❌ Never `--force` (`git worktree remove --force`, `git branch -D`)
  without explicit user approval.
- ❌ Never touch a worktree whose issue is not "done" in `index.json`.
- ❌ Never edit `plans/<plan>/issues/index.json`.
- ❌ Never delete the worktree directory with a filesystem command — go
  through `git worktree remove`.
- ❌ Never abort the whole loop on a single candidate's failure — skip
  that one, record why, continue with the rest.
- ✅ Use forward slashes in paths.

## Steps

### 1. Resolve plan and list candidates

```
node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]
```

Stdout = plan name. Exit 2 = nothing to clean up (no `worktrees/` or empty
subfolders); tell the user and stop. Exit 1 with a list = multiple plans;
ask the user and re-run with `--plan`.

```
node <SKILL_DIR>/scripts/list-cleanup-candidates.mjs --plan <plan>
```

Stdout = JSON array of `{ id, slug, worktreePath }`. If the array is
empty, tell the user there's nothing to clean up and stop.

Otherwise echo the candidates back to the user as a short bullet list so
they can see what you're about to touch. You don't need their approval —
the safety net is the per-candidate `git log HEAD..<slug>` check below
and the `-d` (lowercase) delete.

### 2. For each candidate (in order)

Track outcomes (`cleaned` / `skipped` with reason). If any single step
errors, record the reason and continue with the next candidate.

```
git worktree list
```

If no line ends with `worktrees/<plan>/<id>`, skip this candidate
(directory exists but isn't registered; leave for the user).

```
git log HEAD..<slug> --oneline
```

If non-empty, skip this candidate. Record the commit list as the
"skipped — unmerged commits" reason.

```
git worktree remove worktrees/<plan>/<id>
git branch -d <slug>
```

`-d` lowercase only. If either errors, record the reason and skip.

### 3. Final report

After the loop, run:

```
git worktree list
git branch --list
```

Confirm each cleaned candidate no longer appears. Print a report grouped
by outcome — `Cleaned up`, `Skipped (unmerged commits)`, `Skipped
(error)`, `Verification failed`. Include the verbatim error/log output
for each skipped item.
