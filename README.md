# Skills

A collection of agent skills for planning and shipping software changes, from a rough idea to merged code. The skills compose into a single workflow: describe a problem, turn it into a PRD, break the PRD into independently-grabbable issues, then implement each issue in isolation.

Each skill is a self-contained markdown prompt — portable across any AI coding agent that can load instructions from files (or simply be pasted into a chat).

## Skills

| Skill | Purpose |
|-------|---------|
| [write-a-prd](write-a-prd/SKILL.md) | Interview the user, explore the codebase, and write a Product Requirements Document to `plans/<plan-name>/README.md`. |
| [prd-to-issues](prd-to-issues/SKILL.md) | Break a PRD into tracer-bullet vertical slices, saved as numbered issue files under `plans/<plan-name>/issues/`. |
| [work-on-issue](work-on-issue/SKILL.md) | Implement a single assigned issue end-to-end, staying strictly in scope and enforcing test/typecheck/lint/build gates. |

## Workflow

```
write-a-prd  →  prd-to-issues  →  work-on-issue  (repeat per issue)
```

1. **Plan** — `write-a-prd` interviews you about the problem and produces `plans/<plan-name>/README.md`.
2. **Slice** — `prd-to-issues` breaks the PRD into vertical slices and writes one markdown file per issue into `plans/<plan-name>/issues/`.
3. **Implement** — `work-on-issue <NUMBER>` picks up a single issue, reads the PRD and prior progress notes for context, implements only that slice, and runs the project's quality gates before reporting done.

Each issue is a thin vertical slice that cuts through every layer (schema, API, UI, tests) rather than a horizontal slice of one layer. The numbering (`001-…`, `002-…`) encodes dependency order so agents can pick up any unblocked issue in parallel.

## Folder convention

The skills assume the following layout in your project:

```
plans/
└── <plan-name>/
    ├── README.md        ← the PRD (written by write-a-prd)
    ├── progress.md      ← agent handoff notes (appended by work-on-issue)
    └── issues/
        ├── 001-first-slice.md
        ├── 002-second-slice.md
        └── ...
```

No config file is needed — the plan name is inferred from the prompt, or from the sole folder inside `plans/` if only one exists.

## Usage

Each skill is a single `SKILL.md` file with frontmatter describing when and how to invoke it. How you load it depends on your agent:

- **Agents with a skills/commands directory** (e.g. custom slash commands, `~/.agent/skills`, `.cursor/rules`, `.github/prompts`): drop the folder into the agent's skills location and invoke by name.
- **Agents without a skills system**: paste the contents of the relevant `SKILL.md` into the conversation at the start of the task, or reference the file path and ask the agent to read it.

Clone the repo wherever you want it to live:

```bash
git clone https://github.com/rodrigooslp/skills
```

Then point your agent at the folder (or a subfolder) however it expects.

## License

[MIT](LICENSE)
