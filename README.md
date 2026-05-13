# Skills

A collection of agent skills for planning and shipping software changes, from a rough idea to merged code. The skills compose into a single workflow: describe a problem, turn it into a PRD, break the PRD into independently-grabbable issues, then implement each issue in an isolated worktree, commit, merge, and clean up.

Each skill is a self-contained markdown prompt — portable across any AI coding agent that can load instructions from files (or simply be pasted into a chat).

## Skills

### Planning

| Skill | Purpose |
|-------|---------|
| [write-a-prd](write-a-prd/SKILL.md) | Interview the user, explore the codebase, and write a Product Requirements Document to `plans/<plan-name>/README.md`. |
| [review-prd](review-prd/SKILL.md) | Review a PRD by spawning two subagents (product/design gaps and implementability), consolidating their feedback into actionable edits. |
| [prd-to-issues](prd-to-issues/SKILL.md) | Break a PRD into tracer-bullet vertical slices, saved as numbered issue files under `plans/<plan-name>/issues/`. |
| [review-issues](review-issues/SKILL.md) | Review an issue set with two subagents (implementor review and PRD-coverage review), consolidating feedback into actionable edits. |

### Workspace

| Skill | Purpose |
|-------|---------|
| [setup-workspace](setup-workspace/SKILL.md) | Create a git worktree for the next pending issue at `./worktrees/<plan>/<id>` on a branch named after the issue's slug, run `pnpm install`, and copy root `.env*` files in. |
| [clean-workspace](clean-workspace/SKILL.md) | Remove finished worktrees and their companion branches for issues already marked `"done"` in the plan's `index.json`. |

### Implementation

| Skill | Purpose |
|-------|---------|
| [work-on-issue](work-on-issue/SKILL.md) | Implement a single assigned issue end-to-end, staying strictly in scope and enforcing test/typecheck/lint/build gates. |
| [use-conventional-commits](use-conventional-commits/SKILL.md) | Inspect uncommitted work, draft a Conventional Commits 1.0.0–compliant message, confirm with the user, then stage and commit. |
| [merge-branch](merge-branch/SKILL.md) | Merge an issue branch into the current branch via `--no-ff`, remove its worktree, and delete the merged branch locally. |

## Workflow

```
write-a-prd  →  [review-prd]  →  prd-to-issues  →  [review-issues]
                                                          ↓
        ┌─────────────────────────────────────────────────┘
        ↓
setup-workspace  →  work-on-issue  →  use-conventional-commits  →  merge-branch  →  clean-workspace
        ↑                                                                                  ↓
        └──────────────────────────────  repeat per issue  ────────────────────────────────┘
```

1. **Plan** — `write-a-prd` interviews you about the problem and produces `plans/<plan-name>/README.md`. Optionally run `review-prd` to stress-test it before slicing.
2. **Slice** — `prd-to-issues` breaks the PRD into vertical slices and writes one markdown file per issue into `plans/<plan-name>/issues/`, plus an `index.json` tracker. Optionally run `review-issues` to validate coverage and sizing.
3. **Set up** — `setup-workspace` picks the next unblocked issue, creates a worktree at `./worktrees/<plan>/<id>` on a fresh branch, and installs dependencies.
4. **Implement** — `work-on-issue` reads the PRD and prior progress notes for context, implements only the assigned slice, runs the project's quality gates, and marks the issue done in `index.json`.
5. **Commit** — `use-conventional-commits` drafts a spec-compliant commit message, confirms it, then stages and commits.
6. **Merge** — `merge-branch` merges the issue branch back into the parent with `--no-ff`, removes the worktree, and deletes the local branch.
7. **Clean up** — `clean-workspace` sweeps any leftover done-but-not-merged worktrees.

Each issue is a thin vertical slice that cuts through every layer (schema, API, UI, tests) rather than a horizontal slice of one layer. The numbering (`001-…`, `002-…`) encodes dependency order so agents can pick up any unblocked issue in parallel.

## Folder convention

The skills assume the following layout in your project:

```
plans/
└── <plan-name>/
    ├── README.md           ← the PRD (written by write-a-prd)
    ├── progress.md         ← agent handoff notes (appended by work-on-issue)
    └── issues/
        ├── index.json      ← machine-readable tracker (id, slug, deps, status)
        ├── 001-first-slice.md
        ├── 002-second-slice.md
        └── ...

worktrees/
└── <plan-name>/
    ├── 001/                ← created by setup-workspace, removed by merge-branch / clean-workspace
    ├── 002/
    └── ...
```

No config file is needed — the plan name is inferred from the prompt, or from the sole folder inside `plans/` if only one exists.

## Usage

Each skill is a single `SKILL.md` file with frontmatter describing when and how to invoke it. How you load it depends on your agent:

- **Agents with a skills/commands directory** (e.g. custom slash commands, `~/.agent/skills`, `.cursor/rules`, `.github/prompts`): drop the folder into the agent's skills location and invoke by name.
- **Agents without a skills system**: paste the contents of the relevant `SKILL.md` into the conversation at the start of the task, or reference the file path and ask the agent to read it.

Some skills bundle helper scripts under `scripts/` (plan/issue resolution, JSON parsing, env-file copying) and reference them via `<SKILL_DIR>/scripts/…`. Keep each skill's folder intact when copying.

A few skills include extended docs alongside `SKILL.md`:

- [use-conventional-commits/REFERENCE.md](use-conventional-commits/REFERENCE.md) — the full Conventional Commits 1.0.0 grammar.
- [use-conventional-commits/EXAMPLES.md](use-conventional-commits/EXAMPLES.md) — worked commit messages.

Install the skills with one command:

```bash
npx skills add https://github.com/rodrigooslp/skills
```

This drops the skills into your agent's skills directory so they're ready to invoke by name.

## License

[MIT](LICENSE)
