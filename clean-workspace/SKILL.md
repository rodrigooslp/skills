---
name: clean-workspace
description: >
  Use this skill whenever the user asks you to clean up a workspace, remove a
  worktree, tear down a dev environment, or "delete the worktree for X". The
  skill removes a git worktree under `./worktrees/<name>` along with its
  matching branch, but only after verifying the branch has no commits the
  current branch is missing. If unmerged commits exist, it stops and surfaces
  them to the user — never force-deletes, never discards work. Any error
  surfaces verbatim to the user and stops execution — the skill never tries
  to fix problems on its own.
---

# Clean Workspace Skill

You are a workspace teardown assistant. Your job is to safely remove a git
worktree under `./worktrees/<name>` and its companion branch.

You **MUST NOT**:

- ❌ Discard unmerged work.
- ❌ Force-delete branches (`git branch -D`) without explicit user approval.
- ❌ Pass `--force` to `git worktree remove` without explicit user approval.
- ❌ Delete the worktree directory directly with filesystem commands — always
  go through `git worktree remove` so git's metadata stays consistent.
- ❌ Push anything to a remote.
- ❌ Rewrite history (no rebase, no `--amend`, no reset).
- ❌ Try to fix or work around errors. Any failure → surface output verbatim
  and stop.

Every git command in this skill is portable and works the same on every
platform. Run them exactly as written — do not substitute platform-specific
shell features (no `rm`, no `Remove-Item`, no `Test-Path`, no `[ -d ]`).
Use `git worktree list` and `git branch --list` as the source of truth
for whether things exist, not a filesystem check.

---

## Step 1 — Get the Worktree Name

The user may give you the worktree name in their prompt (e.g. "clean up the
`feature-login` workspace"). If they did **not**, ask:

> Which worktree should I clean up?

Wait for an answer. Store the chosen name as `<name>` for the remaining
steps.

---

## Step 2 — Verify the Worktree Exists

Run:

```
git worktree list
```

Look for a line whose path ends in `worktrees/<name>` (compare the
trailing path segment, not a substring match).

- If a matching line is found, continue to Step 3.
- If no matching line is found, **stop**. Tell the user verbatim:

  > Git has no worktree registered at `./worktrees/<name>`. I'm stopping
  > here — confirm the name or list your worktrees with
  > `git worktree list`.

Do **not** attempt any platform-specific on-disk existence check. If a
stray directory exists without a matching worktree registration, that is a
leftover state for the user to resolve manually.

---

## Step 3 — Check for Unmerged Commits

Run:

```
git log HEAD..<name> --oneline
```

This lists commits that are on branch `<name>` but **not** reachable
from the current `HEAD`.

### Empty output

The branch has nothing the current branch is missing. It is safe to
delete with `git branch -d`. Proceed to Step 4.

### Non-empty output

Surface the commit list to the user **verbatim** and **stop**:

> Branch `<name>` has commits that aren't on the current branch:
> ```
> <git log output>
> ```
> I won't delete it. Merge/rebase first, or tell me explicitly to discard
> these commits.

Do **not** proceed with deletion even if the user pushes back casually —
require an explicit instruction like "yes, discard them" before doing
anything destructive. If (and only if) the user explicitly approves
discarding:

- Still run `git worktree remove <name>` first (Step 4) without `--force`.
- Then use `git branch -D <name>` (capital D) in Step 5 instead of `-d`.

---

## Step 4 — Remove the Worktree

Run:

```
git worktree remove <name>
```

Git accepts either the worktree name or the path here — the name is
simpler.

### If it succeeds

Continue to Step 5.

### If it fails

Show the full stdout and stderr to the user verbatim and **stop**. Do
**not** pass `--force` automatically. Ask the user:

> `git worktree remove` failed:
> ```
> <error output>
> ```
> Want me to retry with `--force`? This will discard any uncommitted
> changes inside the worktree. (yes / no)

Only retry with `--force` after explicit `yes` from the user. Anything
ambiguous → ask again.

Do **not**:

- Delete the worktree directory with a filesystem command.
- Run `git worktree prune` on the user's behalf.
- Try alternate commands to "force" the removal.

---

## Step 5 — Delete the Branch

Run:

```
git branch -d <name>
```

`-d` (lowercase) only deletes branches whose tip is fully merged into the
current `HEAD`. This is the safety net. We already confirmed in Step 3
that the branch has no commits ahead of `HEAD`, so this should succeed.

### If it succeeds

Continue to Step 6.

### If it fails

Surface the error verbatim and **stop**. Do **not** escalate to
`git branch -D` (capital D) on your own.

Ask the user:

> `git branch -d <name>` failed:
> ```
> <error output>
> ```
> I won't force-delete on my own. If you want me to retry with
> `git branch -D` (which discards unmerged work), say so explicitly.

Only retry with `-D` after explicit approval.

---

## Step 6 — Verify Cleanup

Run both commands (you can run them in parallel):

```
git worktree list
```

```
git branch --list <name>
```

Check both outputs:

1. `git worktree list` no longer contains a line whose path ends in
   `worktrees/<name>` — git has dropped the worktree registration.
2. `git branch --list <name>` outputs nothing — the branch is gone.

### If both checks pass

Tell the user, in 2–3 lines, that the workspace was removed successfully.
Name the worktree and confirm the branch is gone. Stop there. Do not
suggest next steps unless asked.

### If either check fails

Surface **exactly** what's left over to the user, verbatim:

- Which check failed (worktree still listed / branch still exists).
- The raw output of that check.

Then **stop**. Do not attempt to fix it on your own — do not re-run
`git worktree remove`, do not run `git branch -d` again, do not delete
the directory with a filesystem command, do not escalate to `--force` or
`-D`. The user decides how to finish the cleanup.

---

## Quick Reference — The Exact Commands

For a less capable model, here is the full happy-path command sequence
with no decorations. Run them in this order, stopping immediately on any
non-zero exit or unexpected output:

```
git worktree list
git log HEAD..<name> --oneline
git worktree remove <name>
git branch -d <name>
git worktree list
git branch --list <name>
```

Pay attention to flags:

- `git branch -d` (lowercase) is the **safe** delete — refuses unmerged
  branches.
- `git branch -D` (capital) is the **force** delete — only use after
  explicit user approval.
- `git worktree remove <name>` without `--force` refuses to remove a
  dirty worktree. Only add `--force` after explicit user approval.

Use forward slashes in any paths you mention (`./worktrees/<name>`). They
work on every platform that git supports.

---

## Hard Rules (do not violate)

- ❌ Never force-delete a branch (`git branch -D`) without explicit user
  approval after seeing the unmerged commits.
- ❌ Never pass `--force` to `git worktree remove` without explicit user
  approval.
- ❌ Never delete the worktree directory with a filesystem command —
  always go through `git worktree remove` so git's metadata stays
  consistent.
- ❌ Never push, never rewrite history, never run `git reset`.
- ❌ Never run `git worktree prune` on the user's behalf.
- ❌ Never use platform-specific shell features (`rm`, `Remove-Item`,
  `Test-Path`, `[ -d ]`). Use `git worktree list` and `git branch --list`
  to check state.
- ❌ Never try to fix or work around errors. Any failure → surface output
  verbatim and stop.
- ✅ Always verify the worktree is registered with `git worktree list`
  before deleting.
- ✅ Always check `git log HEAD..<name>` for unmerged commits before
  deletion.
- ✅ Always verify cleanup at the end with both `git worktree list` and
  `git branch --list`, and surface any leftover state.
