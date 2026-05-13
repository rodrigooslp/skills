---
name: merge-branch
description: >
  Use this skill whenever the user asks you to merge another branch into the
  branch they are currently on — for example "merge feature-x into this",
  "merge in branch foo", "bring branch bar into the current branch". The
  skill asks for the branch name (if not provided), summarises what the
  incoming branch contains relative to the current branch, asks the user to
  confirm, performs a `--no-ff` merge (always creates a merge commit, never
  squashes), and then deletes the merged branch locally. Any git error is
  surfaced verbatim to the user and the skill stops — it never tries to
  resolve conflicts, force operations, or recover from failure on its own.
---

# Merge Branch Skill

You are a merge assistant. Your job is to merge a branch the user names
**into the branch they are currently on**, using a merge commit (no fast
forward, no squash), and then delete the merged branch locally.

You **MUST NOT**:

- ❌ Push anything to a remote.
- ❌ Rewrite history (no rebase, no `--amend`, no reset).
- ❌ Skip hooks (`--no-verify`) or signing.
- ❌ Force-delete branches (`git branch -D`) without explicit user approval.
- ❌ Resolve merge conflicts on your own.
- ❌ Swap the merge direction — you merge the named branch **into** the
  current branch, never the other way round.

Every git command in this skill is portable and works the same on every
platform. Run them exactly as written — do not substitute platform-specific
shell features.

---

## Step 1 — Identify the Current Branch

Run:

```
git rev-parse --abbrev-ref HEAD
```

Store the result as `<current>`. This is the branch the merge will land
**into**. Do not change branches at any point in this skill.

If the output is `HEAD` (detached HEAD state) — **stop**. Tell the user
they are not on a branch and the skill cannot proceed.

---

## Step 2 — Get the Branch to Merge In

The user may already have named the branch in their prompt (e.g. "merge
`feature-login` in"). If they did **not**, ask:

> Which branch should I merge into `<current>`?

Wait for an answer. Store the chosen name as `<incoming>` for the
remaining steps.

If `<incoming>` is the same as `<current>` — **stop**. Tell the user you
cannot merge a branch into itself.

---

## Step 3 — Verify the Incoming Branch Exists

Run:

```
git rev-parse --verify <incoming>
```

- If it succeeds, continue.
- If it fails, surface the error verbatim and **stop**. Do not guess at
  the name, do not try a remote-tracking variant. Ask the user to confirm
  the branch name.

---

## Step 4 — Confirm the Working Tree Is Clean

Run:

```
git status --porcelain=v1
```

If the output is **non-empty**, the working tree or index has changes.
**Stop** and surface the output verbatim:

> Your working tree isn't clean. Merging now would mix these changes into
> the merge commit. Please commit, stash, or discard them first, then ask
> me again.
> ```
> <git status output>
> ```

Do not run `git stash`, do not run `git add`, do not run `git commit` on
the user's behalf. Wait for them to handle it.

---

## Step 5 — Summarise the Incoming Changes

Run these three commands (you can run them in parallel):

```
git log <current>..<incoming> --oneline
```

```
git diff --stat <current>...<incoming>
```

```
git log <incoming>..<current> --oneline
```

Interpret each one:

1. **`git log <current>..<incoming> --oneline`** — commits that are on
   `<incoming>` but **not** on `<current>`. These are the commits that
   will be brought in by the merge.

   - If this output is **empty**, the branch has nothing new to merge.
     **Stop** and tell the user — do not create an empty merge commit:

     > `<incoming>` has no commits that aren't already on `<current>`.
     > Nothing to merge.

2. **`git diff --stat <current>...<incoming>`** — files changed between
   the two branches' common ancestor and `<incoming>`. This is the
   "what's in the merge" file summary. Note: this uses **three dots**
   (`...`), not two.

3. **`git log <incoming>..<current> --oneline`** — commits that are on
   `<current>` but **not** on `<incoming>`. Use this only to tell the
   user whether `<current>` has moved ahead of `<incoming>`:

   - Empty output → `<current>` is an ancestor of `<incoming>`. The merge
     would normally fast-forward, but **we will still pass `--no-ff`** so
     a merge commit is created.
   - Non-empty output → the branches have diverged. A real merge commit
     is required, and conflicts are possible.

Then present a summary to the user that includes:

- The merge direction, stated clearly: "Merging `<incoming>` **into**
  `<current>`."
- The commit list from command 1 (verbatim, in a fenced block).
- The file stat from command 2 (verbatim, in a fenced block).
- One short sentence about divergence based on command 3 (e.g. "Current
  branch has 3 commits not on `<incoming>` — branches have diverged and
  conflicts are possible.").

---

## Step 6 — Get Explicit Approval

Ask the user, verbatim:

> Proceed with `git merge --no-ff <incoming>` into `<current>`, then
> delete `<incoming>` locally? (yes / no)

**Do not** run the merge until the user replies with explicit approval
(e.g. "yes", "go ahead", "do it"). Anything ambiguous → ask again.

If the user says no → **stop**. Do not touch anything.

---

## Step 7 — Perform the Merge

Run exactly:

```
git merge --no-ff <incoming>
```

The flags matter:

- `--no-ff` forces a merge commit even when fast-forward is possible.
- **Do NOT** add `--squash`. Squashing is explicitly forbidden by this
  skill.
- **Do NOT** add `--ff-only`. That would prevent the merge commit we
  want.
- **Do NOT** add `-m "..."` unless the user asked for a custom message;
  let git open its default merge commit message, which it will commit
  automatically in non-interactive mode.

### If the merge succeeds

Continue to Step 8.

### If the merge fails (conflicts, hook failure, anything else)

1. Show the **full, verbatim** stdout and stderr from `git merge`.
2. State plainly:

   > The merge did not complete. I'm stopping here and leaving the repo
   > in its current (in-progress merge) state so you can resolve it.
   > Run `git status` to see what needs attention. If you want to abandon
   > the merge entirely, run `git merge --abort`.

3. **Do not** run `git merge --abort` yourself.
4. **Do not** edit files to resolve conflicts.
5. **Do not** run `git add` or `git commit` to "finish" the merge.
6. **Do not** proceed to Step 8. The branch deletion must not happen on
   a failed merge.

---

## Step 8 — Verify the Merge Landed

Run, in parallel:

```
git log -1 --pretty=%H%n%P%n%s
```

```
git status
```

Check:

- `git log -1` should show a commit whose second line (the `%P` parents
  line) contains **two** commit hashes separated by a space. That is the
  signature of a merge commit. If you see only one parent hash, something
  is wrong — **stop** and surface both outputs to the user.
- `git status` should report a clean working tree (e.g. "nothing to
  commit, working tree clean"). If it says anything else, **stop** and
  surface the output.

If both checks pass, continue.

---

## Step 9 — Delete the Merged Branch Locally

Run:

```
git branch -d <incoming>
```

`-d` (lowercase) only deletes branches whose tip is fully merged into the
current `HEAD`. Since Step 7 just merged `<incoming>` into `<current>`,
this should succeed.

### If it succeeds

Continue to Step 10.

### If it fails

Surface the error verbatim and **stop**. Do **not** escalate to
`git branch -D` (capital D) on your own. Ask the user:

> `git branch -d <incoming>` failed:
> ```
> <error output>
> ```
> I won't force-delete on my own. If you want me to retry with
> `git branch -D` (which discards unmerged work), say so explicitly.

Only retry with `-D` after an explicit "yes, force delete" from the user.

---

## Step 10 — Final Confirmation

Run:

```
git branch --list <incoming>
```

- Empty output → the branch is gone. Tell the user, in 2–3 lines:

  > Merged `<incoming>` into `<current>` with a merge commit and deleted
  > the local branch. The remote branch (if any) is still there — push or
  > delete it yourself when you're ready.

- Non-empty output → the branch still exists. Surface the output
  verbatim and **stop**. Do not retry the delete.

---

## Quick Reference — The Exact Commands

For a less capable model, here is the full happy-path command sequence
with no decorations. Run them in this order, stopping immediately on any
non-zero exit:

```
git rev-parse --abbrev-ref HEAD
git rev-parse --verify <incoming>
git status --porcelain=v1
git log <current>..<incoming> --oneline
git diff --stat <current>...<incoming>
git log <incoming>..<current> --oneline
git merge --no-ff <incoming>
git log -1 --pretty=%H%n%P%n%s
git status
git branch -d <incoming>
git branch --list <incoming>
```

Pay attention to the dots:

- `<current>..<incoming>` and `<incoming>..<current>` use **two dots**
  (commit range).
- `<current>...<incoming>` uses **three dots** (symmetric difference,
  used with `git diff --stat`).

---

## Hard Rules (do not violate)

- ❌ Never merge in the wrong direction. The named branch goes **into**
  the current branch, never the other way round.
- ❌ Never use `--squash`. This skill always creates a merge commit.
- ❌ Never use `--ff-only`. This skill always creates a merge commit.
- ❌ Never push, rebase, reset, amend, or otherwise rewrite history.
- ❌ Never skip hooks (`--no-verify`) or signing.
- ❌ Never force-delete a branch (`git branch -D`) without explicit user
  approval.
- ❌ Never resolve merge conflicts, run `git merge --abort`, or call
  `git add`/`git commit` to recover from a failed merge.
- ❌ Never delete the remote-tracking branch or push the deletion.
- ✅ Always confirm the merge with the user before running it.
- ✅ Always verify a clean working tree before merging.
- ✅ Always verify the merge produced a two-parent commit before
  deleting the branch.
- ✅ Always surface git errors verbatim and stop.
