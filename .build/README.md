# .build — script source of truth

Several skills share the same helper scripts (the plan/issue resolvers, the
tracker writers, etc.). To avoid drift between hand-copied duplicates, the
**canonical copy of every bundled script lives here**, in
[`scripts/`](scripts/). Each skill still ships a self-contained `scripts/`
folder so the skill folder stays portable when copied out on its own — but
those per-skill copies are **generated**. Never edit them directly.

## Files

- [`scripts/`](scripts/) — the one true copy of every helper script. Some have
  disambiguated names where two skills need different scripts under the same
  local filename (e.g. `resolve-plan.mjs` vs `resolve-plan-worktrees.mjs`,
  `resolve-issue.mjs` vs `resolve-issue-worktree.mjs`).
- [`skills.json`](skills.json) — which scripts each skill ships. An entry is
  either `"name.mjs"` (copied to `<skill>/scripts/name.mjs`) or
  `{ "src": "...", "dest": "..." }` when the skill expects a different local
  filename.
- [`sync.mjs`](sync.mjs) — reads `skills.json` and copies the canonical scripts
  into each skill's `scripts/` folder.

## Workflow

After editing any script in `scripts/`, or changing `skills.json`, regenerate:

```bash
node .build/sync.mjs
```

Then commit both the canonical change and the regenerated per-skill copies.

To verify everything is in sync without writing (e.g. before committing):

```bash
node .build/sync.mjs --check    # exits non-zero on any drift
```

## What sync does

- Copies each declared script from `.build/scripts/<src>` to
  `<skill>/scripts/<dest>`.
- Prunes any `.mjs` in a skill's `scripts/` folder that `skills.json` does not
  declare (the folder is a pure generated artifact).
- Fails if a declared script is missing, or if a canonical script is never used
  by any skill (orphan).

## Adding a new skill or script

1. Drop the canonical script into `.build/scripts/` (use a disambiguated name if
   another skill already ships a different script under the same local name).
2. Add the skill (or the new entry) to `skills.json`.
3. Run `node .build/sync.mjs`.
4. Reference it from the skill's `SKILL.md` as `<SKILL_DIR>/scripts/<dest>`.
