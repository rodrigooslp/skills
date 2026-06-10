#!/usr/bin/env node
/**
 * Move a completed plan into the dated archive.
 *
 * Usage:
 *   node archive-plan.mjs --plan <name> [--date YYYY-MM-DD]
 *
 * Behaviour:
 *   - Re-verifies (defence in depth) that every issue in
 *     `plans/<plan>/issues.json` has status "done". Refuses to move otherwise.
 *   - Resolves the archive date: `--date` if given (must be YYYY-MM-DD),
 *     else today's local date.
 *   - Moves `plans/<plan>/` → `docs/.archive/<date>/<plan>/`, creating
 *     `docs/.archive/<date>/` if needed. Uses an atomic rename when possible
 *     and falls back to copy+remove across devices.
 *   - Refuses if the destination already exists.
 *
 * Output: a JSON object on stdout describing the move, e.g.
 *   { "plan": "auth", "date": "2026-06-09", "total": 13,
 *     "src": "plans/auth", "dest": "docs/.archive/2026-06-09/auth" }
 *
 * Exit code:
 *   0 → moved successfully.
 *   3 → not all issues are "done" (nothing moved).
 *   1 → usage / IO / parse error (message on stderr).
 */

import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    plan: { type: "string" },
    date: { type: "string" },
  },
  strict: true,
});

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

if (!values.plan) fail("Missing required --plan <name>.");

const planDir = join("plans", values.plan);
if (!existsSync(planDir)) fail(`Plan directory not found: ${planDir}`);

const issuesPath = join(planDir, "issues.json");
if (!existsSync(issuesPath)) fail(`Issues file not found: ${issuesPath}`);

let entries;
try {
  entries = JSON.parse(readFileSync(issuesPath, "utf8").replace(/^﻿/, ""));
} catch (err) {
  fail(`Failed to parse ${issuesPath} as JSON: ${err.message}`);
}
if (!Array.isArray(entries)) fail(`${issuesPath} must contain a JSON array.`);

const notDone = entries.filter((e) => e?.status !== "done");
if (notDone.length > 0) {
  const list = notDone.map((e) => `${e?.id} (${e?.status})`).join(", ");
  fail(`Refusing to archive "${values.plan}": ${notDone.length} issue(s) not done: ${list}`, 3);
}

let date = values.date;
if (date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`--date must be YYYY-MM-DD, got "${date}".`);
} else {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const archiveRoot = join("docs", ".archive", date);
const dest = join(archiveRoot, values.plan);
if (existsSync(dest)) {
  fail(`Destination already exists: ${dest}. Refusing to overwrite.`);
}

mkdirSync(archiveRoot, { recursive: true });

try {
  renameSync(planDir, dest);
} catch (err) {
  if (err.code === "EXDEV") {
    // Cross-device move: copy then remove the original.
    cpSync(planDir, dest, { recursive: true });
    rmSync(planDir, { recursive: true, force: true });
  } else {
    fail(`Failed to move ${planDir} → ${dest}: ${err.message}`);
  }
}

process.stdout.write(
  `${JSON.stringify({
    plan: values.plan,
    date,
    total: entries.length,
    src: planDir.split("\\").join("/"),
    dest: dest.split("\\").join("/"),
  })}\n`,
);
