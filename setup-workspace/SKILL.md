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
worktree name, and install dependencies with `pnpm`. You **MUST NOT** modify
the user's current branch, push anything, or alter history.

Pick whatever shell/commands are appropriate for the user's platform when
you need to test file existence, create directories, or change working
directory — the git and pnpm commands below stay the same everywhere.

---

## Step 1 — Get the Worktree Name

The user may give you the worktree name in their prompt (e.g. "set up a
workspace called `feature-login`"). If they did **not**, ask:

> What name should I use for the new worktree? (this will also be the branch
> name)

Wait for an answer. Validate the name:

- Lowercase, kebab-case preferred (`feat-foo`, `bugfix-123`).
- No spaces, no slashes leading/trailing, no `..`.
- If the name looks invalid, ask the user to confirm or correct it before
  continuing.

Store the chosen name as `<name>` for the remaining steps.

---

## Step 2 — Verify the Worktree Does Not Already Exist

Run:

```
git worktree list
```

Look for any line whose path ends in `worktrees/<name>`. If a matching
worktree exists:

1. Tell the user **verbatim** which worktree path is already registered.
2. **Stop.** Do not create a new worktree, do not create a branch, do not
   run `pnpm install`.

Also confirm the directory `./worktrees/<name>` does not exist on disk
(use whatever existence-check is native to the user's platform). If the
directory exists but `git worktree list` does not mention it, surface that
to the user and stop — that is a leftover state for the user to resolve.

---

## Step 3 — Decide How to Handle the Branch

Run:

```
git branch --list <name>
```

### Case A — Branch does not exist

Proceed to Step 4 and create the worktree with a **new** branch based on the
current branch.

### Case B — Branch already exists

Check whether it has commits the current branch is missing:

```
git log HEAD..<name> --oneline
```

- If the output is **empty**, the existing branch has no commits ahead of
  `HEAD`. Proceed to Step 4 and attach the worktree to the existing branch
  (do not pass `-b`).
- If the output is **non-empty**, surface the commit list to the user and
  **stop**. Ask:

  > Branch `<name>` already exists and has the following commits not on the
  > current branch:
  > ```
  > <git log output>
  > ```
  > Do you still want to attach the worktree to this branch? (yes / no)

  Only proceed if the user replies `yes`.

---

## Step 4 — Create the Worktree

Make sure the `./worktrees` directory exists (create it if missing — use the
appropriate command for the user's platform).

Then create the worktree:

- **Case A (new branch):**
  ```
  git worktree add -b <name> ./worktrees/<name>
  ```
- **Case B (existing branch, confirmed safe or approved):**
  ```
  git worktree add ./worktrees/<name> <name>
  ```

If the command fails, show the full stdout/stderr to the user verbatim and
**stop**. Do not retry with different flags, do not delete partial state,
do not attempt any cleanup. The user decides what to do next.

---

## Step 5 — Install Dependencies

Inside the newly created worktree directory `./worktrees/<name>`, run:

```
pnpm install
```

Use whatever mechanism your platform/shell needs to ensure the install runs
**inside the worktree directory**, not in the original working directory.

If `pnpm install` fails:

1. Show the full stdout/stderr to the user verbatim.
2. State plainly: "Dependencies failed to install — passing this through
   for you to decide how to proceed."
3. **Stop.** Do not delete the worktree, do not delete the branch, do not
   retry with different flags, do not try to fix the install.

---

## Step 6 — Report Success

When everything succeeds, tell the user:

- The worktree path (`./worktrees/<name>`).
- The branch name (`<name>`) and whether it was newly created or attached
  to an existing branch.
- That `pnpm install` completed.

Keep it to 2–3 lines.

---

## Hard Rules (do not violate)

- ❌ Never overwrite an existing worktree.
- ❌ Never attach to a branch with commits ahead of `HEAD` without explicit
  user confirmation.
- ❌ Never run `git checkout`, `git reset`, `git push`, or any history-
  altering command.
- ❌ Never try to fix or work around errors. Any failure → surface output
  verbatim and stop.
- ❌ Never delete partial state on failure.
- ✅ Always verify the worktree does not already exist before creating it.
- ✅ Always surface git/pnpm errors verbatim and stop.
