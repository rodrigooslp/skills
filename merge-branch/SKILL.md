---
name: merge-branch
description: >
  Use this skill when the user asks to merge an issue branch into their
  current branch — for example "merge-branch 6", "merge issue 12 in", "bring
  issue 7 from the auth plan into this branch". Takes an issue id (and
  optional plan name), resolves the branch slug via `plans/<plan>/issues/
  index.json`, performs a `--no-ff` merge (always a merge commit, never a
  squash), removes the worktree at `./worktrees/<plan>/<id>` if one is
  registered, and then deletes the merged branch locally.
---

# Merge Branch Skill

You merge an issue branch into the current branch and clean up its
worktree/branch. Helper scripts under `<SKILL_DIR>/scripts/` handle plan
and issue resolution. You handle the git commands and the user
confirmation step.

`<SKILL_DIR>` is the directory containing this `SKILL.md`. Construct full
paths from there.

## Hard rules

- ❌ Never use `--squash` or `--ff-only`. Always `git merge --no-ff`.
- ❌ Never push, rebase, reset, amend, skip hooks, or skip signing.
- ❌ Never resolve merge conflicts, run `git merge --abort`, or
  `git add`/`git commit` to recover from a failed merge.
- ❌ Never force-delete (`git branch -D`) or `--force` a worktree removal
  without explicit user approval.
- ❌ Never delete the branch before removing its worktree — `git branch
  -d` refuses a branch that is checked out elsewhere.
- ❌ Never take a raw branch name from the prompt — always resolve it
  from `plans/<plan>/issues/index.json` via the helper script.
- ✅ Always ask the user for explicit approval before running the merge.

## Steps

### 1. Resolve plan and issue

```
node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]
```

Stdout = plan name. Exit 2 with a list = multiple plans; ask the user.

The user's prompt should include the issue id (e.g. "merge branch 6"). If
missing, ask. Then:

```
node <SKILL_DIR>/scripts/resolve-issue.mjs --plan <plan> --id <id>
```

Stdout = JSON `{ id, slug, status, worktreePath }`. The script normalises
`6` → `"006"` and errors with available ids if no match.

If `slug` equals the current branch, stop — can't merge into itself.

### 2. Pre-flight checks

```
git rev-parse --abbrev-ref HEAD      # store as <current>; stop if HEAD detached
git rev-parse --verify <slug>         # ensure the branch exists locally
git status --porcelain=v1             # stop if not empty
```

### 3. Summarise and ask for approval

Run in parallel:

```
git log <current>..<slug> --oneline      # commits coming in
git diff --stat <current>...<slug>        # files changed (three dots)
git log <slug>..<current> --oneline      # commits on current ahead of slug
git worktree list                         # to detect <worktreePath>
```

If `git log <current>..<slug>` is empty, stop — nothing to merge.

Present a summary: direction (merging `<slug>` into `<current>`), incoming
commits, file stat, one line about divergence, and whether a worktree at
`<worktreePath>` will be removed after the merge.

Ask, verbatim, adapting the worktree clause:

> Proceed with `git merge --no-ff <slug>` into `<current>`, then
> [remove the worktree at `<worktreePath>` and] delete branch `<slug>`
> locally? (yes / no)

Wait for explicit approval. Anything ambiguous → ask again.

### 4. Merge

```
git merge --no-ff <slug>
```

On failure, surface output verbatim and stop. Tell the user the repo is
in an in-progress merge state; they can resolve or `git merge --abort`.
Do not touch anything else.

### 5. Verify merge commit, then clean up

```
git log -1 --pretty=%H%n%P%n%s
git status
```

The `%P` line must contain two hashes (real merge commit). Working tree
must be clean. If either check fails, surface output and stop.

Only if Step 3's `git worktree list` showed `<worktreePath>` registered:

```
git worktree remove <worktreePath>
```

No `--force`. If it fails, surface verbatim and ask the user before
retrying with `--force`. Do not run `git branch -d` until the worktree
is gone.

```
git branch -d <slug>
```

`-d` lowercase only. If it fails, stop and surface the error.

### 6. Final confirmation

```
git branch --list <slug>     # must be empty
git worktree list             # must no longer contain <worktreePath>
```

Report success in 2–3 lines: branch + issue merged, worktree removed (if
it was), local branch deleted, remote untouched.
