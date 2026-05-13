#!/usr/bin/env node
/**
 * Resolve a plan name from the `plans/` directory.
 *
 * Usage:
 *   node resolve-plan.mjs [--plan <name>]
 *
 * Behaviour:
 *   - If --plan is supplied, validate `plans/<name>/issues/index.json` exists
 *     and echo the name back.
 *   - Otherwise list directories directly inside `plans/`:
 *       - 1 match  → echo it.
 *       - 0 match  → error (exit 1).
 *       - many     → error listing the choices, ask caller to pass --plan
 *                    (exit 2).
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

function validatePlan(name) {
  const indexPath = join("plans", name, "issues", "index.json");
  if (!existsSync(indexPath)) {
    fail(`Plan "${name}" has no index.json at ${indexPath}`);
  }
}

if (values.plan) {
  validatePlan(values.plan);
  process.stdout.write(`${values.plan}\n`);
  process.exit(0);
}

if (!existsSync("plans")) {
  fail("No `plans/` directory in the current working directory.");
}

const entries = readdirSync("plans").filter((f) =>
  statSync(join("plans", f)).isDirectory(),
);

if (entries.length === 0) {
  fail("No plans found under `plans/`.");
}
if (entries.length > 1) {
  fail(
    `Multiple plans found under \`plans/\`: ${entries.join(", ")}. ` +
      `Re-run with --plan <name>.`,
    2,
  );
}

validatePlan(entries[0]);
process.stdout.write(`${entries[0]}\n`);
