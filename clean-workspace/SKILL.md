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
worktree under `./worktrees/<name>` and its companion branch. You **MUST NOT**
discard unmerged work, force-delete branches, or push anything.

Pick whatever shell/commands are appropriate for the user's platform when
you need to test file existence — the git commands below stay the same
everywhere.

---

## Step 1 — Get the Worktree Name

The user may give you the worktree name in their prompt (e.g. "clean up the
`feature-login` workspace"). If they did **not**, ask:

> Which worktree should I clean up?

Wait for an answer. Store the chosen name as `<name>` for the remaining
steps.

---

## Step 2 — Verify the Worktree Exists

Run, in parallel:

```
git worktree list
```

And check whether the directory `./worktrees/<name>` exists on disk (use
the platform-appropriate existence check).

You need **both** signals:

- `git worktree list` must include a line whose path ends in
  `worktrees/<name>`.
- The directory `./worktrees/<name>` must exist on disk.

If either signal is missing:

- Tell the user what you found (e.g. "no worktree registered for `<name>`",
  or "directory exists but git doesn't track it", or vice versa).
- **Stop.** Do not run `git worktree remove`, do not delete files, do not
  delete branches. The user resolves the mismatch.

---

## Step 3 — Check for Unmerged Commits

Run:

```
git log HEAD..<name> --oneline
```

- If the output is **empty**, the branch has no commits the current branch
  is missing. It is safe to delete. Proceed to Step 4.
- If the output is **non-empty**, surface the commit list to the user
  **verbatim** and **stop**:

  > Branch `<name>` has commits that aren't on the current branch:
  > ```
  > <git log output>
  > ```
  > I won't delete it. Merge/rebase first, or tell me explicitly to discard
  > these commits.

  Do **not** proceed with deletion even if the user pushes back casually —
  require an explicit instruction like "yes, discard them" before doing
  anything destructive. If discarding is approved, use `git branch -D`
  (capital D) in Step 5, but still run `git worktree remove` first
  (without `--force` unless removal fails because of dirty state — then
  ask again).

---

## Step 4 — Remove the Worktree

Run:

```
git worktree remove <name>
```

(Git accepts either the worktree name or the path; the name is simpler.)

If the command fails (e.g. the worktree has uncommitted changes or
submodules), show the stdout/stderr verbatim and **stop**. Do not pass
`--force` automatically — ask the user first:

> `git worktree remove` failed:
> ```
> <error output>
> ```
> Want me to retry with `--force`? This will discard any uncommitted
> changes in the worktree. (yes / no)

Only retry with `--force` after explicit `yes`.

---

## Step 5 — Delete the Branch

Run:

```
git branch -d <name>
```

`-d` (lowercase) only deletes branches whose tip is merged into the current
HEAD — this is the safety net. We already confirmed in Step 3 that the
branch is fully reachable from `HEAD`, so this should succeed.

If it fails, surface the error verbatim and **stop**. Do **not** escalate
to `-D` without explicit user approval (see the unmerged-commits flow in
Step 3).

---

## Step 6 — Verify Cleanup

Run all three checks in parallel — **all three must pass**:

1. Check whether `./worktrees/<name>` exists on disk (use the platform-
   appropriate existence check).
2. ```
   git worktree list
   ```
3. ```
   git branch --list <name>
   ```

You're confirming:

1. The directory under `./worktrees/<name>` is gone from disk.
2. `git worktree list` no longer mentions `<name>` — git has dropped its
   worktree registration.
3. `git branch --list <name>` outputs nothing — **the branch is also
   gone**. This check is required; do not skip it.

### If all three are clean

Tell the user the workspace was removed successfully — name the worktree
and confirm the branch is gone. Keep it to 2–3 lines.

### If any check fails

Surface **exactly** what's left over to the user, verbatim:

- Which check failed (directory still present / worktree still listed /
  branch still exists).
- The raw output of that check.

Then **stop**. Do not attempt to fix it on your own — do not re-run
`git worktree remove`, do not run `git branch -d` again, do not delete
the directory manually, do not escalate to `--force` or `-D`. The user
decides how to finish the cleanup.

---

## Hard Rules (do not violate)

- ❌ Never force-delete a branch (`git branch -D`) without explicit user
  approval after seeing the unmerged commits.
- ❌ Never pass `--force` to `git worktree remove` without explicit user
  approval.
- ❌ Never delete the worktree directory directly — always go through
  `git worktree remove` so git's metadata stays consistent.
- ❌ Never push, never rewrite history, never run `git reset`.
- ❌ Never try to fix or work around errors. Any failure → surface output
  verbatim and stop.
- ✅ Always verify both `git worktree list` and on-disk presence before
  deleting.
- ✅ Always check `git log HEAD..<name>` for unmerged commits before
  deletion.
- ✅ Always verify cleanup at the end and surface any leftover state.
