---
name: setup-workspace
description: >
  Use this skill whenever the user asks you to set up a new workspace, create a
  worktree, spin up an isolated dev environment, or "set up a worktree for X".
  The skill creates a git worktree under `./worktrees/<name>`, ensures a branch
  named after the worktree exists (creating it from the current branch when
  missing), and runs `pnpm install` inside the new worktree. It refuses to
  proceed when a worktree with the requested name already exists, and refuses
  to reuse an existing branch that has commits the current branch is missing.
  Any error surfaces verbatim to the user and stops execution — the skill
  never tries to fix problems on its own.
---

# Setup Workspace Skill

You are a workspace setup assistant. Your job is to create an isolated git
worktree under `./worktrees/<name>`, attach it to a branch that matches the
worktree name, and install dependencies with `pnpm`.

You **MUST NOT**:

- ❌ Modify the user's current branch.
- ❌ Push anything to a remote.
- ❌ Rewrite history (no rebase, no `--amend`, no reset).
- ❌ Run `git checkout` in the main working directory.
- ❌ Skip hooks (`--no-verify`) or signing.
- ❌ Delete or move existing files outside of the worktree you create.
- ❌ Try to fix or work around errors. Any failure → surface output verbatim
  and stop.

Every git and pnpm command in this skill is portable and works the same on
every platform. Run them exactly as written — do not substitute platform-
specific shell features (no `mkdir`, no `cd`, no `test -d`, no PowerShell
`Test-Path`). The git and pnpm commands listed here handle directory
creation and working directory selection on their own.

---

## Step 1 — Get the Worktree Name

The user may give you the worktree name in their prompt (e.g. "set up a
workspace called `feature-login`"). If they did **not**, ask:

> What name should I use for the new worktree? (this will also be the branch
> name)

Wait for an answer. Validate the name:

- Lowercase, kebab-case preferred (`feat-foo`, `bugfix-123`).
- No spaces, no slashes, no `..`, no leading dashes.
- If the name looks invalid, ask the user to confirm or correct it before
  continuing.

Store the chosen name as `<name>` for the remaining steps.

---

## Step 2 — Confirm the Current Branch

Run:

```
git rev-parse --abbrev-ref HEAD
```

Store the result as `<current>`. The new branch (Case A in Step 3) will be
created **from this branch**, so make sure the user is on the branch they
want as the starting point. If the output is `HEAD` (detached HEAD state)
— **stop**. Tell the user they are not on a branch and the skill cannot
proceed.

---

## Step 3 — Verify the Worktree Path Is Free

Run:

```
git worktree list
```

Look for any line whose path ends in `worktrees/<name>` (compare the
trailing path segment, not a substring match). If a matching worktree
exists:

1. Tell the user **verbatim** which worktree path is already registered.
2. **Stop.** Do not create a new worktree, do not create a branch, do not
   run `pnpm install`.

Do **not** attempt any platform-specific on-disk existence check. If the
directory exists but git doesn't know about it, the `git worktree add`
command in Step 5 will fail with a clear error — surface that error and
stop at that point.

---

## Step 4 — Decide How to Handle the Branch

Run:

```
git branch --list <name>
```

### Case A — Branch does not exist (empty output)

Proceed to Step 5 and create the worktree with a **new** branch based on
`<current>`.

### Case B — Branch already exists (non-empty output)

Check whether it has commits the current branch is missing. Run:

```
git log HEAD..<name> --oneline
```

- If the output is **empty**, the existing branch has no commits ahead of
  `HEAD`. Proceed to Step 5 and attach the worktree to the existing
  branch (do **not** pass `-b`).
- If the output is **non-empty**, surface the commit list to the user
  verbatim and **stop until they reply**:

  > Branch `<name>` already exists and has commits not on `<current>`:
  > ```
  > <git log output>
  > ```
  > Do you still want to attach the worktree to this branch? (yes / no)

  Only proceed if the user replies `yes`. Anything ambiguous → ask again.

---

## Step 5 — Create the Worktree

Run **one** of the following — pick based on the case from Step 4:

### Case A (new branch)

```
git worktree add -b <name> ./worktrees/<name>
```

This creates the `./worktrees/<name>` directory (and the `./worktrees`
parent if missing), creates a new branch `<name>` from the current
`HEAD`, and checks it out into the new worktree. You do not need to
create the parent directory yourself.

### Case B (existing branch, confirmed safe or approved)

```
git worktree add ./worktrees/<name> <name>
```

This creates the `./worktrees/<name>` directory and checks out the
existing branch `<name>` into it. Do **not** pass `-b` — `-b` would try
to create a new branch and fail.

### If `git worktree add` fails

Show the full stdout and stderr to the user verbatim and **stop**. Do
**not**:

- Retry with different flags (no `--force`, no `-B`).
- Delete any partial state on disk.
- Run `git worktree prune`.
- Run any cleanup command on the user's behalf.

The user decides what to do next.

---

## Step 6 — Install Dependencies

Run, from the main working directory (do **not** `cd` into the
worktree — the `--dir` flag handles this portably):

```
pnpm --dir ./worktrees/<name> install
```

The `--dir` flag (also spelled `-C`) tells pnpm to operate as if it had
been invoked from inside `./worktrees/<name>`. This avoids any need for
shell-specific directory changes.

### If `pnpm install` fails

1. Show the full stdout and stderr to the user verbatim.
2. State plainly: "Dependencies failed to install — passing this through
   for you to decide how to proceed. The worktree and branch are still in
   place."
3. **Stop.** Do not delete the worktree, do not delete the branch, do not
   retry with different flags (no `--force`, no `--frozen-lockfile`
   change, no `--no-frozen-lockfile`), do not try to fix the install.

---

## Step 7 — Report Success

When everything succeeds, tell the user, in 2–3 lines:

- The worktree path (`./worktrees/<name>`).
- The branch name (`<name>`) and whether it was newly created from
  `<current>` (Case A) or attached to a pre-existing branch (Case B).
- That `pnpm install` completed.

Stop there. Do not suggest next steps unless asked.

---

## Quick Reference — The Exact Commands

For a less capable model, here is the full happy-path command sequence
with no decorations. Run them in this order, stopping immediately on any
non-zero exit.

```
git rev-parse --abbrev-ref HEAD
git worktree list
git branch --list <name>
```

If the branch does not exist (Case A):

```
git worktree add -b <name> ./worktrees/<name>
pnpm --dir ./worktrees/<name> install
```

If the branch exists, has no unmerged commits, and you have proceeded
(Case B):

```
git log HEAD..<name> --oneline
git worktree add ./worktrees/<name> <name>
pnpm --dir ./worktrees/<name> install
```

Notes on the commands:

- `git worktree add` creates `./worktrees/` and `./worktrees/<name>`
  automatically. **Do not** create directories yourself.
- `pnpm --dir ./worktrees/<name> install` runs pnpm as if it were inside
  the worktree. **Do not** `cd` into the worktree.
- Use forward slashes in the path (`./worktrees/<name>`). They work on
  every platform that git supports.

---

## Hard Rules (do not violate)

- ❌ Never overwrite an existing worktree.
- ❌ Never pass `--force` or `-B` to `git worktree add`.
- ❌ Never attach to a branch with commits ahead of `HEAD` without
  explicit user confirmation.
- ❌ Never run `git checkout`, `git reset`, `git push`, or any history-
  altering command in the main working directory.
- ❌ Never delete partial state on failure (no `git worktree remove`, no
  `git branch -d`, no directory deletion).
- ❌ Never use platform-specific shell features (`cd`, `mkdir`, `Test-Path`,
  `[ -d ]`). The commands in this skill handle directories themselves.
- ❌ Never try to fix or work around errors. Any failure → surface output
  verbatim and stop.
- ✅ Always verify the worktree does not already exist before creating it.
- ✅ Always check `git log HEAD..<name>` before attaching to an existing
  branch.
- ✅ Always surface git/pnpm errors verbatim and stop.
