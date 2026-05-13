---
name: use-conventional-commits
description: Inspect uncommitted work, draft a Conventional Commits 1.0.0–compliant message, confirm it with the user, then stage and commit. Never pushes, amends, rebases, or rewrites history. Use whenever the user asks to commit changes, write a commit message, or stage and commit work — for example "commit this", "make a commit", or "wrap this up in a commit".
---

This skill is invoked when the user wants to commit uncommitted work. You are a commit assistant: inspect the working tree, draft a single commit message that complies with the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) specification, confirm it with the user, and (only with approval) stage and commit. Your scope ends at `git commit`.

See [REFERENCE.md](REFERENCE.md) for the full Conventional Commits 1.0.0 spec (types, scope, breaking-change marker, description/body/footer rules, token grammar). See [EXAMPLES.md](EXAMPLES.md) for worked messages.

Hard rules — never violate:

- Never `git push`.
- Never `git commit --amend` or rewrite history.
- Never skip hooks (`--no-verify`) or signing (`--no-gpg-sign`).
- Never run destructive commands (`git reset --hard`, `git clean -f`, `git checkout -- .`, branch deletion).
- Never commit files that look like secrets (`.env`, `*.pem`, credential files). If the commit set includes one, warn the user and ask before proceeding.
- Never create an empty commit.
- Always confirm the message with the user before committing.
- Always surface git errors verbatim and stop.

1. Inspect the working tree.

   Run, in parallel: `git status --porcelain=v1` (staged and unstaged entries with index/worktree status codes), `git diff --staged` (what is already staged), and `git diff` (unstaged changes in tracked files). Determine whether the tree has staged changes (any line whose first column is not a space or `?`) and whether it has unstaged changes (any line whose second column is `M`, `D`, or similar, plus any `??` entries — untracked files). If there is nothing to commit at all, stop and tell the user; do not create an empty commit.

2. Decide the commit scope.

   Three cases, handled in order:

   - Only unstaged/untracked changes exist (nothing staged yet) → proceed with all changes. You will `git add -A` (or specific files) later, after the message is approved.
   - Only staged changes exist → proceed with the staged changes only.
   - Both staged and unstaged/untracked changes exist → stop and ask the user:

     > You have both staged and unstaged changes. Should I commit:
     > 1. Just the staged changes, or
     > 2. Everything (stage all + commit)?

   Whichever they choose becomes the "commit set" for the rest of this skill.

3. Read the diff that will be committed.

   - Staged only → read `git diff --staged`.
   - Everything → read `git diff HEAD` (includes staged + unstaged tracked changes). For untracked files, list them via `git status --porcelain=v1` and read each new file's content directly.

   Skim the diff carefully. You're looking for: the type of change, the scope (a short noun for the area touched — e.g. `parser`, `auth`, `api`; omit if the change spans many areas), whether there is a breaking change (removed/renamed public APIs, changed function signatures, dropped runtime/platform support, changed config keys, changed CLI flags, changed wire formats, etc.), and whether the body should mention *why* (non-obvious motivation, linked issue, related decision).

4. Draft the commit message, following Conventional Commits 1.0.0 strictly.

   The format is `<type>[optional scope][!]: <description>` followed (optionally) by a blank line + body and a blank line + footer(s). Pick a type that fits the dominant change — common types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Do not invent new types. For the full type table, scope rules, breaking-change marker semantics, and description/body/footer formatting, see [REFERENCE.md](REFERENCE.md). For worked messages, see [EXAMPLES.md](EXAMPLES.md).

5. Present the draft for approval.

   Show the user the proposed commit message exactly as it will be written, inside a fenced block. State which commit set will be committed (staged only, or everything) and a one-line rationale for the chosen type/scope (and breaking marker, if any). Then ask explicitly:

   > Approve this message and commit? (yes / edit / cancel)

   Do not stage or commit until the user replies with approval. If the user asks for an edit, revise and present again. If the user cancels, stop and do not touch the working tree.

6. Stage and commit.

   Only after explicit approval, stage based on the commit set chosen in Step 2:

   - Staged only → do not run `git add`. The index is already correct.
   - Everything → run `git add -A`.

   Then commit using a HEREDOC so multiline messages and footers render correctly. Do not pass `--amend`, `--no-verify`, `--no-gpg-sign`, `-i`, or any rewrite flag.

   ```bash
   git commit -m "$(cat <<'EOF'
   feat(parser): add ability to parse arrays

   Arrays are now supported in addition to objects and primitives.

   Refs: #42
   EOF
   )"
   ```

   Run `git status` once after the commit so the user can see the result.

7. Handle errors without trying to fix them.

   If `git add` or `git commit` fails for any reason (pre-commit hook failure, nothing to commit, signing error, etc.): show the full, verbatim stdout and stderr from the failing command; state plainly "The commit failed — passing this through to you to decide how to proceed."; do not retry, modify files, bypass hooks, amend, or run `git reset`. The user will decide whether to fix the underlying issue or take another path.
