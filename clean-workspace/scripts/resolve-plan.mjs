#!/usr/bin/env node
/**
 * Resolve a plan name from the `worktrees/` directory (subfolders are plan
 * names for this skill). Once chosen, validates that
 * `plans/<name>/issues/index.json` also exists.
 *
 * Usage:
 *   node resolve-plan.mjs [--plan <name>]
 *
 * Behaviour:
 *   - If --plan is supplied, validate `plans/<name>/issues/index.json` and
 *     `worktrees/<name>/` both exist, then echo the name.
 *   - Otherwise list directories directly inside `worktrees/`:
 *       - 1 match → echo it (after validating its index.json).
 *       - 0 match → exit 2 ("nothing to clean up").
 *       - many    → exit 1 with list of choices.
 *
 * Output: the resolved plan name on stdout. Errors on stderr.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { plan: { type: "string" } },
  strict: true,
});

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function validate(name) {
  const indexPath = join("plans", name, "issues", "index.json");
  if (!existsSync(indexPath)) fail(`Plan "${name}" has no index.json at ${indexPath}`);
  const wtDir = join("worktrees", name);
  if (!existsSync(wtDir)) fail(`No worktree directory at ${wtDir} for plan "${name}".`, 2);
}

if (values.plan) {
  validate(values.plan);
  process.stdout.write(`${values.plan}\n`);
  process.exit(0);
}

if (!existsSync("worktrees")) {
  fail("No `worktrees/` directory in the current working directory — nothing to clean up.", 2);
}

const entries = readdirSync("worktrees").filter((f) =>
  statSync(join("worktrees", f)).isDirectory(),
);

if (entries.length === 0) {
  fail("No plan subdirectories under `worktrees/` — nothing to clean up.", 2);
}
if (entries.length > 1) {
  fail(
    `Multiple plans under \`worktrees/\`: ${entries.join(", ")}. ` +
      `Re-run with --plan <name>.`,
    1,
  );
}

validate(entries[0]);
process.stdout.write(`${entries[0]}\n`);
