---
name: address-tech-debt
description: Wrap up work on a PRD by actually fixing the tech debt called out in `progress.md`. Reads every bullet, distinguishes real deferred work from informational notes, autonomously implements the fixes that are obvious, asks the user only when an option choice has real consequences, and reports what was changed. Use when the user asks to wrap up a plan, address the tech debt from a PRD, clean up loose ends from `progress.md`, or finalize a plan before deleting its folder — e.g. "address the tech debt from the dashboard-refactor plan".
---

This skill runs **after** every issue in a plan is merged and **before** the plan folder is deleted. The goal is to **fix** the tech debt left behind — not to archive it. Bundles the plan resolver under `<SKILL_DIR>/scripts/` (the canonical script shared with `work-on-issue`, kept in sync via `.build/`). `<SKILL_DIR>` is the directory containing this `SKILL.md`.

1. Resolve plan and locate the progress doc.

   Run `node <SKILL_DIR>/scripts/resolve-plan.mjs [--plan <name>]`. Stdout = plan name; exit 2 with a list = ask the user which and re-run with `--plan`.

   Read `plans/<plan>/progress.md`. If the file does not exist, stop — there is nothing to address. Also read `plans/<plan>/PRD.md` for spec context only.

2. Inventory every bullet.

   Build a flat list of every bullet point, grouped by `### Issue <N>` heading. Don't act yet. The bullets follow the convention from [`work-on-issue`](../work-on-issue/SKILL.md) Step 10: "gotcha, non-obvious decision, or useful context" — they were not written as a TODO list, so each one needs to be triaged.

3. Triage each bullet into **Skip** or **Act**:

   - **Skip — Informational.** Describes what was done; no latent issue. Example: "An additional fixture was added beyond the three real pages named in the issue."
   - **Skip — Decision record with no follow-on.** Explains a non-obvious choice but does not imply any current code needs changing. Example: "Colour token chosen: `success` because primary is already loaded with Ongoing-publication semantics."
   - **Act — Deferred work.** Explicit "not in scope here", "still needs a wiring decision", "follow-up needed", or a named gap with no resolution. Example: "scan-trigger reconciliation for the Unverified-book Issue (PRD §31) still needs a wiring decision — either move `onBookChanged` into `BookService.update` or open a new arrow."
   - **Act — Guidance flagging latent risk.** A "don't do X" or "if you touch Y, do Z" rule. Verify the current code already complies; if it doesn't, fix it. If it does, Skip. Example: "Don't reintroduce `Field` for the title without re-deciding the wrap rule" — check that `Field` is not in the title path; if it is, the issue regressed.

   A single bullet can split into two actions (e.g. a decision **and** a deferred wiring task). Handle each half on its own.

4. For each **Act** bullet, do the work:

   - **Implement the fix.** Make the code change the bullet points to — the deferred refactor, the missing wiring, the broken invariant. In-scope means the surface area named in the bullet; do not chase tangents.
   - **Update docs only when the fix requires it** — e.g. the fix introduces a new public function that needs a doc comment, changes a documented behaviour in `README.md`, or adds a new entry to a changelog the repo maintains. Do not move prose out of `progress.md` for archival reasons; `progress.md` is allowed to disappear.
   - **Open a follow-up issue** only when the deferred work is too large to fit in this pass *and* the repo already has a convention for follow-ups (a `tech-debt/` plan, a `TODO.md`, GitHub issues). If there is no existing convention, ask the user before introducing one — see Step 5.

5. Surface to the user only when:

   - Two reasonable options exist and the bullet itself names them (e.g. "either move X into Y or open a new arrow"). Pick a recommendation, but let the user choose.
   - The fix touches a public API or a shared component used outside the plan's scope.
   - The deferred work is large enough to need its own issue and the repo has no follow-up convention.
   - The bullet hints at a deeper design issue, not a localised debt.

   Do **not** ask when the fix is a one-line change, when you're verifying that current code already complies with a guidance bullet, or when the fix is mechanically obvious from the bullet's wording.

6. Act on every obvious item **autonomously**. Use the `commit-changes` skill at meaningful checkpoints — one commit per bucket of related changes, not one giant commit at the end. Track each action you took so you can list it in Step 8.

   Out-of-scope tangents you discover while fixing: do not chase them. Note them in the final report and move on.

7. Quality gates — run only if you changed code. Detect the package manager (see [`work-on-issue`](../work-on-issue/SKILL.md) Step 2 table) and run `<pm> run typecheck`, `<pm> run lint`, `<pm> run test:related` if present in `package.json`. Fix failures in scope and re-run from the failing step.

8. Produce the final report.

   <action-report>
   ## Tech debt — `<plan>`

   **Fixed:**
   - &lt;one-line description of the fix&gt; → &lt;file:line or path&gt;
   - &lt;one-line description&gt; → opened follow-up &lt;path&gt; (only when the fix was too large for this pass)

   **Verified (guidance already complied with, no change needed):**
   - &lt;short summary of the bullet&gt; → &lt;file:line where the check landed&gt;

   **Needs your input:**

   ### Issue &lt;N&gt; — &lt;short summary of the bullet&gt;
   - **Situation:** &lt;one-sentence read of what's at stake&gt;
   - **Options:**
     1. &lt;option A&gt;
     2. &lt;option B&gt;
   - **Recommendation:** &lt;A or B&gt; — &lt;one-sentence reason&gt;

   &lt;repeat per open question&gt;

   **Status:** ✅ Ready to delete plan folder / ⚠️ Pending your input on &lt;N&gt; item(s)
   </action-report>

   Summarise every bullet — never paste the bullet verbatim, even when it's the heading of an open question. The user can re-read `progress.md` for the full text. Every open question gets a summary + situation + options + recommendation — never just "what should I do?". The status line tells the user whether the plan folder is safe to delete now.
