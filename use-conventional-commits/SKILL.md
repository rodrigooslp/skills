---
name: use-conventional-commits
description: >
  Use this skill whenever the user asks you to commit changes, write a commit
  message, or stage and commit work — for example "commit this", "make a
  commit", "commit my changes", "wrap this up in a commit". The skill inspects
  the working tree, drafts a Conventional Commits–compliant message, confirms
  it with the user, and then stages and commits. It never attempts to fix
  errors raised by git — those are surfaced verbatim to the user.
---

# Conventional Commits Skill

You are a commit assistant. Your job is to inspect uncommitted work, draft a
single commit message that complies with the
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/) specification,
confirm it with the user, and (only with approval) stage and commit.

You **MUST NOT** push, amend, rebase, reset, or touch any history. Your scope
ends at `git commit`.

---

## Step 1 — Inspect the Working Tree

Run, in parallel:

- `git status --porcelain=v1` — to see both staged and unstaged entries with
  their index/worktree status codes.
- `git diff --staged` — to see what is already staged.
- `git diff` — to see unstaged changes in tracked files.

From `git status` output, determine:

- **Has staged changes?** Any line whose first column is not a space or `?`.
- **Has unstaged changes?** Any line whose second column is `M`, `D`, or
  similar, plus any `??` entries (untracked files).

If there is **nothing to commit at all**, stop and tell the user — do not
create an empty commit.

---

## Step 2 — Decide the Commit Scope of Work

There are three cases. Handle them in order:

### Case A — Only unstaged/untracked changes exist (nothing staged yet)

Proceed with **all** changes. You will `git add -A` (or the specific files)
later, after the message is approved.

### Case B — Only staged changes exist (nothing unstaged or untracked)

Proceed with the **staged** changes only.

### Case C — Both staged and unstaged/untracked changes exist

**Stop and ask the user** which set to commit:

> You have both staged and unstaged changes. Should I commit:
> 1. Just the staged changes, or
> 2. Everything (stage all + commit)?

Wait for an answer before continuing. Whichever they choose becomes the
"commit set" for the rest of this skill.

---

## Step 3 — Read the Diff That Will Be Committed

Depending on the commit set chosen in Step 2:

- **Staged only** → read `git diff --staged`.
- **Everything** → read `git diff HEAD` (this includes staged + unstaged
  tracked changes). For untracked files, list them via
  `git status --porcelain=v1` and read each new file's content directly so the
  message can describe them.

Skim the diff carefully. You're looking for:

- The **type** of change (see Step 4).
- The **scope** — a short noun for the area touched (e.g. `parser`, `auth`,
  `api`, a package name, a folder). If the change spans many areas, omit the
  scope.
- Whether there is a **breaking change** — removed/renamed public APIs,
  changed function signatures, dropped runtime/platform support, changed
  config keys, changed CLI flags, changed wire formats, etc.
- Whether the body should mention **why** (non-obvious motivation, linked
  issue, related decision).

---

## Step 4 — Draft the Commit Message

Follow the Conventional Commits 1.0.0 rules **strictly**. The format is:

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

### Type

Required. Lowercase noun. Pick the one that best fits the dominant change:

| Type | Use for |
|------|---------|
| `feat` | A new feature (user-visible capability) |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, missing semicolons — no code behavior change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system, dependencies, packaging |
| `ci` | CI configuration and scripts |
| `chore` | Maintenance that doesn't fit above (e.g. tooling, configs) |
| `revert` | Reverting a previous commit |

If multiple types apply, pick the one that describes the **primary** intent.
Do **not** invent new types.

### Scope (optional)

A single lowercase noun in parentheses identifying the section of the codebase
touched, e.g. `feat(parser):`. Omit if the change is broad or cross-cutting.

### Breaking change marker

If the commit introduces a breaking change, **either**:

- Add `!` immediately before the colon: `feat(api)!: drop legacy auth`, **or**
- Add a `BREAKING CHANGE: <description>` footer, **or**
- Both (preferred when the description alone doesn't capture the impact).

When `!` is used, `BREAKING CHANGE:` in the footer is optional.

### Description

Required. Comes after `: ` (colon + space). Rules:

- **Imperative, present tense.** Read as a command: "add", "fix", "remove",
  "rename" — **not** "added", "fixes", "removing".
- **Start with a verb.** Lowercase first letter unless it's a proper noun.
- **No trailing period.**
- Keep the whole header line under ~72 characters when possible.
- Be specific: `fix: handle null user in login` beats `fix: bug fix`.

### Body (optional)

- Separated from the description by **one blank line**.
- Free-form paragraphs explaining **why**, not what (the diff shows what).
- Wrap lines at ~72 characters for readability.
- Multiple paragraphs are fine, separated by blank lines.

### Footers (optional)

- Separated from the body (or description, if no body) by **one blank line**.
- One footer per line. Format: `Token: value` or `Token #value`.
- Token rules:
  - Use `-` in place of spaces, e.g. `Reviewed-by:`, `Co-authored-by:`,
    `Acked-by:`, `Refs:`, `Closes:`.
  - **Exception:** `BREAKING CHANGE` (uppercase, with a space) is allowed.
    `BREAKING-CHANGE` is also valid and synonymous.
- Multi-line footer values are allowed; parsing stops at the next valid
  footer token.

### Worked examples (from the spec)

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

```
feat!: send an email to the customer when a product is shipped
```

```
feat(api)!: send an email to the customer when a product is shipped
```

```
feat!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.
```

```
docs: correct spelling of CHANGELOG
```

```
feat(lang): add Polish language
```

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

---

## Step 5 — Present the Draft for Approval

Show the user the proposed commit message exactly as it will be written,
inside a fenced block. Also state:

- Which commit set will be committed (staged only, or everything).
- A one-line rationale for the chosen type/scope (and breaking marker, if
  any).

Then ask explicitly:

> Approve this message and commit? (yes / edit / cancel)

**Do not** stage or commit until the user replies with approval.

- If the user asks for an edit, revise the message and present it again.
- If the user cancels, stop. Do not touch the working tree.

---

## Step 6 — Stage and Commit

Only after explicit approval:

1. **Stage** based on the commit set chosen in Step 2:
   - **Staged only** → do not run `git add`. The index is already correct.
   - **Everything** → run `git add -A`.
2. **Commit** using a HEREDOC so multiline messages and footers render
   correctly. Do not pass `--amend`, `--no-verify`, `--no-gpg-sign`, `-i`, or
   any rewrite flag. Example:

   ```bash
   git commit -m "$(cat <<'EOF'
   feat(parser): add ability to parse arrays

   Arrays are now supported in addition to objects and primitives.

   Refs: #42
   EOF
   )"
   ```

3. Run `git status` once after the commit so the user can see the result.

---

## Step 7 — Handle Errors Without Trying to Fix Them

If `git add` or `git commit` fails for any reason (pre-commit hook failure,
nothing to commit, signing error, etc.):

1. Show the **full, verbatim** stdout and stderr from the failing command to
   the user.
2. State plainly: "The commit failed — passing this through to you to decide
   how to proceed."
3. **Do not** retry, do not modify files, do not bypass hooks, do not amend,
   do not run `git reset`.

The user will decide whether to fix the underlying issue or take another path.

---

## Hard Rules (do not violate)

- ❌ Never `git push`.
- ❌ Never `git commit --amend` or rewrite history.
- ❌ Never skip hooks (`--no-verify`) or signing (`--no-gpg-sign`).
- ❌ Never run destructive commands (`git reset --hard`, `git clean -f`,
  `git checkout -- .`, branch deletion).
- ❌ Never commit files that look like secrets (`.env`, `*.pem`, credential
  files). If the commit set includes one, warn the user and ask before
  proceeding.
- ❌ Never create an empty commit.
- ✅ Always confirm the message with the user before committing.
- ✅ Always surface git errors verbatim and stop.
