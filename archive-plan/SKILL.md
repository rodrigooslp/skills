---
name: archive-plan
description: Archive a completed plan — verify every issue is done, move the plan folder into `docs/.archive/<YYYY-MM-DD>/`, record it in `docs/.archive/archive.md`, then commit. Use when the user asks to archive a plan, retire a finished plan, or "archive the auth plan now that it's shipped".
---

This skill is invoked when the user wants to archive a finished plan. Helper scripts under `<SKILL_DIR>/scripts/` handle the deterministic bits (plan resolution, the all-done check, and the folder move); you handle the archive-log entry and the commit. `<SKILL_DIR>` is the directory containing this `SKILL.md`.

Hard rules — never violate:

- Never move a plan unless **every** issue is "done". The scripts enforce this; do not work around a non-zero exit.
- Never hand-move the folder or hand-edit `issues.json` — go through the scripts.
- Never overwrite an existing archive destination.

1. Resolve the plan.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name. Exit 2 with a list = multiple plans; ask the user which and re-run with `--plan`. Surface other errors verbatim and stop.

2. Verify the plan is fully done.

   Run `node <SKILL_DIR>/scripts/check-all-done.mjs --plan <plan>`. Stdout = JSON `{ plan, total, allDone, notDone }`.

   - Exit 0 → every issue is "done"; continue.
   - Exit 3 → one or more issues are not "done". Stop and show the user the `notDone` list (id, slug, status). Do not archive.

3. Move the plan into the archive.

   Run `node <SKILL_DIR>/scripts/archive-plan.mjs --plan <plan>`. The script re-checks all-done (defence in depth), resolves today's date, and moves `plans/<plan>/` → `docs/.archive/<YYYY-MM-DD>/<plan>/`. Stdout = JSON `{ plan, date, total, src, dest }`. Surface any non-zero exit verbatim and stop. (Pass `--date YYYY-MM-DD` only if the user asks to backdate the entry.)

4. Record the entry in `docs/.archive/archive.md`.

   If the file does not exist, create it with the header template below. Then, under `## Archived plans`, find the `### <date>` subsection for today: if it already exists, append the new row to its existing table (do **not** add a second heading for the same date); if it doesn't, create it newest-first (above older dates) with the table header. Append one row for the plan just archived:

   ```
   | [<plan>](<date>/<plan>/PRD.md) | <one-sentence summary> | <total> |
   ```

   Derive the summary from the archived `docs/.archive/<date>/<plan>/PRD.md` (its Problem Statement / Solution) — one sentence, no more. `<total>` is the issue count from Step 3's JSON.

   <archive-md-header>
   # Archive

   Completed and retired planning artifacts, moved here once their work has shipped
   so the live `plans/` directory only holds active plans. Nothing here is
   maintained — these are point-in-time records (problem statement, per-issue specs,
   and the progress log with implementation notes/gotchas) kept for historical
   reference.

   ## Layout

   ```
   <archived-date>/<plan-name>/
     PRD.md           — the plan (problem, solution, user stories)
     progress.md      — per-issue tech notes and gotchas captured during the work
     issues/          — individual issue specs
     issues.json (status) + layers.json
   ```

   ## Archived plans

   ### <date>

   | Plan | Summary | Issues |
   | --- | --- | --- |
   </archive-md-header>

5. Commit. Invoke the [`commit-changes`](../commit-changes/SKILL.md) skill to stage and commit the move and the archive-log entry.

6. Report in 2–3 lines: the plan archived, the destination path, the issue count, and that it was committed.
