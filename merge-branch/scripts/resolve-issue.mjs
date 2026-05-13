#!/usr/bin/env node
/**
 * Resolve an issue id to its slug, given a plan.
 *
 * Usage:
 *   node resolve-issue.mjs --plan <name> --id <id>
 *
 * Behaviour:
 *   - Normalises numeric ids to a zero-padded 3-digit string (`6` → `"006"`).
 *   - Looks up the entry by id in `plans/<plan>/issues/index.json`.
 *   - Errors with the list of available ids if no match is found.
 *
 * Output: JSON object on stdout:
 *   {
 *     "id": "006",
 *     "slug": "repositories",
 *     "status": "done",
 *     "worktreePath": "worktrees/<plan>/006"
 *   }
 *
 * Errors on stderr.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    plan: { type: "string" },
    id: { type: "string" },
  },
  strict: true,
});

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

if (!values.plan) fail("Missing required --plan <name>.");
if (!values.id) fail("Missing required --id <id>.");

let id = values.id;
if (/^\d+$/.test(id)) id = id.padStart(3, "0");

const indexPath = join("plans", values.plan, "issues", "index.json");
if (!existsSync(indexPath)) fail(`Index file not found: ${indexPath}`);

function readJson(path) {
  // Strip a UTF-8 BOM if present — PowerShell `Out-File -Encoding utf8` and a
  // few editors on Windows write one, which breaks `JSON.parse`.
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

let entries;
try {
  entries = readJson(indexPath);
} catch (err) {
  fail(`Failed to parse ${indexPath} as JSON: ${err.message}`);
}
if (!Array.isArray(entries)) fail(`${indexPath} must contain a JSON array.`);

const entry = entries.find((e) => e?.id === id);
if (!entry) {
  const available = entries.map((e) => e?.id).filter(Boolean).join(", ");
  fail(`No entry with id "${id}" in ${indexPath}. Available ids: ${available}`);
}

if (typeof entry.slug !== "string") fail(`Entry "${id}" has no string slug.`);

process.stdout.write(
  `${JSON.stringify({
    id: entry.id,
    slug: entry.slug,
    status: entry.status,
    worktreePath: `worktrees/${values.plan}/${entry.id}`,
  })}\n`,
);
