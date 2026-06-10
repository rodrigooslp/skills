#!/usr/bin/env node
/**
 * Pick the next pending issue from a plan's issues.json.
 *
 * Usage:
 *   node pick-next-issue.mjs --plan <name>
 *
 * Behaviour:
 *   - Read `plans/<plan>/issues.json`.
 *   - Sort entries by `id` (lexicographic — ids are zero-padded strings).
 *   - Return the first entry whose `status` is not "done".
 *   - If every entry is "done", exit 2 with a message.
 *
 * Output: JSON object `{ "id": "...", "slug": "...", "status": "..." }` on
 * stdout. Errors on stderr.
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
if (!existsSync(issuesPath)) fail(`Index file not found: ${issuesPath}`);

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

const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
const next = sorted.find((e) => e.status !== "done");

if (!next) {
  fail(`All issues in plan "${values.plan}" are marked "done". Nothing to set up.`, 2);
}

process.stdout.write(`${JSON.stringify({ id: next.id, slug: next.slug, status: next.status })}\n`);
