#!/usr/bin/env node
/**
 * Check whether every issue in a plan's `issues.json` has status "done".
 *
 * Usage:
 *   node check-all-done.mjs --plan <name>
 *
 * Behaviour:
 *   - Reads `plans/<plan>/issues.json`.
 *   - An issue counts as finished only when its `status` is exactly "done";
 *     any other value (pending, in-progress, blocked, …) is "not done".
 *
 * Output: a JSON object on stdout (always), e.g.
 *   { "plan": "auth", "total": 13, "allDone": true, "notDone": [] }
 *   { "plan": "auth", "total": 13, "allDone": false,
 *     "notDone": [ { "id": "007", "slug": "ui-shell", "status": "pending" } ] }
 *
 * Exit code:
 *   0 → all issues are "done" (safe to archive).
 *   3 → one or more issues are not "done" (do NOT archive).
 *   1 → usage / IO / parse error (message on stderr).
 */

import { existsSync, readFileSync } from "node:fs";
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

if (!values.plan) fail("Missing required --plan <name>.");

const issuesPath = join("plans", values.plan, "issues.json");
if (!existsSync(issuesPath)) fail(`Issues file not found: ${issuesPath}`);

function readJson(path) {
  // Strip a UTF-8 BOM if present — PowerShell `Out-File -Encoding utf8` and a
  // few editors on Windows write one, which breaks `JSON.parse`.
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

let entries;
try {
  entries = readJson(issuesPath);
} catch (err) {
  fail(`Failed to parse ${issuesPath} as JSON: ${err.message}`);
}
if (!Array.isArray(entries)) fail(`${issuesPath} must contain a JSON array.`);

for (const e of entries) {
  if (typeof e?.id !== "string" || typeof e?.slug !== "string" || typeof e?.status !== "string") {
    fail(`${issuesPath} contains an entry missing id/slug/status: ${JSON.stringify(e)}`);
  }
}

const notDone = entries
  .filter((e) => e.status !== "done")
  .map((e) => ({ id: e.id, slug: e.slug, status: e.status }))
  .sort((a, b) => a.id.localeCompare(b.id));

const allDone = notDone.length === 0;

process.stdout.write(
  `${JSON.stringify({ plan: values.plan, total: entries.length, allDone, notDone })}\n`,
);

process.exit(allDone ? 0 : 3);
