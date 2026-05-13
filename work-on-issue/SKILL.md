---
name: work-on-issue
description: Implement a documented issue file end-to-end — read the right context, do only the in-scope work, run quality gates, mark the issue done, and produce a structured completion report. Use whenever the user asks you to implement, work on, or complete a numbered issue — for example "work on issue 004", "implement issue 012", or "you're agent on issue 007".
---

This skill is invoked when the user assigns a numbered issue to you. Your scope is strictly limited to the work described in the assigned issue file — nothing more, nothing less. Helper scripts under `<SKILL_DIR>/scripts/` handle the deterministic bits (plan resolution, issue lookup, marking done). `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Folder convention:

```
plans/
└── <plan-name>/
    ├── README.md       ← spec / requirements for this plan
    ├── progress.md     ← agent handoff notes (optional)
    └── issues/
        ├── index.json  ← issue tracker
        ├── 001-some-feature.md
        ├── 002-another-task.md
        └── ...
```

1. Resolve plan and issue.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit 2 with a list = multiple plans; ask the user and re-run with `--plan`.

   Then run `node <SKILL_DIR>/scripts/resolve-issue.mjs --plan <plan> [--id <id>]`. Pass `--id` when the prompt named a specific issue (e.g. "issue 4" → `--id 4`; the script handles padding). Omit it to let the script pick the first non-done entry in ascending `id` order. Exit 2 = all done; stop and tell the user. Stdout = JSON `{ id, slug, status, file, fileExists, deps, unfinishedDeps }`.

   If `fileExists` is `false`, stop and surface the path — the index says the issue exists but the markdown file is missing. If `unfinishedDeps` is non-empty, stop and ask the user whether they'd rather work on one of the unfinished deps first; list them so the user can pick directly. Only proceed if the user confirms.

2. Detect the package manager.

   Check the project root for a lock file:

   | Lock file | Package manager |
   |-----------|-----------------|
   | `pnpm-lock.yaml` | `pnpm` |
   | `yarn.lock` | `yarn` |
   | `package-lock.json` | `npm` |
   | `bun.lockb` | `bun` |

   If none is found, ask the user which to use.

3. Pre-flight context read.

   Read the assigned issue file (`<file>` from Step 1's JSON) and `plans/<plan>/progress.md` if it exists. The issue file is the authoritative source for what to do. `progress.md` is shared notes from other workers — read it for awareness only.

4. Strict scope rules.

   - Complete **all** work described in your assigned issue file.
   - Read other issue files for context only if needed.
   - Do **not** implement, modify, or begin work described in other issue files.
   - Do **not** work ahead — even if a next step seems obvious.
   - Do **not** edit, rename, or close any issue file.

   Leave out-of-scope observations as inline `// Issue NNN: <observation>` comments and move on.

5. Implement.

   Follow the issue file exactly.

   **Commit at meaningful checkpoints**, not at the end. After finishing a chunk, invoke the `commit-changes` skill before moving on. A chunk is ready when:

   1. **One conventional type.** Types are `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `style`, `build`, `ci`, `chore`, `revert` — see [`commit-changes/REFERENCE.md`](../commit-changes/REFERENCE.md) for the full grammar. When the type you'd write changes, commit now.
   2. **One-sentence describable.** Without "and" or compound verbs.
   3. **Tests co-located.** Production code and its tests live in the same commit.

   Intermediate commits may break the build — that's fine. The final state is verified at Step 6.

   Out-of-scope tangents: commit the current chunk first, then leave the tangent as an `// Issue NNN:` comment per Step 4.

6. Quality gates.

   Run whichever scripts exist in `package.json`, in this order, using the package manager from Step 2: `<pm> run test`, `<pm> run typecheck`, `<pm> run lint`, `<pm> run build`. All present scripts must pass with zero errors. On failure: fix the root cause (in scope), re-run from the failing step. If a fix requires out-of-scope changes, document the blocker and stop — do not hack around it.

   Any fix required by a failing gate is its own commit (`fix:` or `refactor:` as appropriate). After the final gate passes, the working tree must be clean.

7. Mark the issue as done (mandatory). This step is the one agents most often forget. Downstream skills depend on the tracker being accurate. Do not skip and do not defer to after the completion report.

   Before running the script, verify the working tree is clean (`git status --porcelain=v1` empty). If it isn't, you missed a commit — handle it first.

   Run `node <SKILL_DIR>/scripts/mark-done.mjs --plan <plan> --id <id>`. The script sets the entry's `status` to `"done"` in `plans/<plan>/issues/index.json`, preserves the file's original single-line-per-entry formatting, validates by re-parsing after writing, and is idempotent. If the script exits non-zero, stop and surface the error before producing the completion report. The issue is not complete until this script succeeds.

8. Produce the completion report.

   <completion-report>
   ## Issue <NUMBER> — Completion Report

   **Status:** ✅ Complete / ⚠️ Partial (explain) / ❌ Blocked (explain)

   **Changes made:**
   - <file or component>: <what changed and why>

   **Quality gates:**
   - <command> — PASS / FAIL

   **index.json updated:** ✅ Yes (status set to "done") / ❌ No (explain)

   **Out-of-scope observations:**
   - <anything noted for other issues, or "None">

   **Did not touch:**
   - <key files/areas explicitly left unchanged>
   </completion-report>

   `index.json updated` must be ✅ Yes. If it isn't, the issue is not complete — go back to Step 7.

9. Update the progress log (optional but encouraged).

   **Append** a short entry to the very end of `plans/<plan>/progress.md` — never between existing entries, never at the top. The log is chronological; inserting in the middle breaks the timeline for the next agent. If `progress.md` does not exist, skip this step.

   <progress-entry>
   ### Issue <NUMBER> — <Issue Title>
   - <Gotcha, non-obvious decision, or useful context>
   - <Another if needed — keep to 2–4 bullets max>
   </progress-entry>

   Do not summarise what you did. Do not repeat the issue file. Write only what would help the next agent.
