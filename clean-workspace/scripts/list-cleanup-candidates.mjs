#!/usr/bin/env node
/**
 * For a given plan, list cleanup candidates — issues whose `status` is
 * "done" in `plans/<plan>/issues/index.json` AND whose `id` exists as a
 * subfolder of `worktrees/<plan>/`.
 *
 * Usage:
 *   node list-cleanup-candidates.mjs --plan <name>
 *
 * Output: JSON array (possibly empty) on stdout, sorted ascending by id:
 *   [
 *     { "id": "001", "slug": "task-framework-extension",
 *       "worktreePath": "worktrees/<plan>/001" },
 *     ...
 *   ]
 *
 * Exit 0 even when empty. Errors on stderr.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
const plan = values.plan;

const indexPath = join("plans", plan, "issues", "index.json");
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

const slugById = new Map();
const doneIds = new Set();
for (const e of entries) {
  if (typeof e?.id !== "string" || typeof e?.slug !== "string" || typeof e?.status !== "string") {
    fail(`${indexPath} contains an entry missing id/slug/status: ${JSON.stringify(e)}`);
  }
  slugById.set(e.id, e.slug);
  if (e.status === "done") doneIds.add(e.id);
}

const planWorktrees = join("worktrees", plan);
const existingIds = existsSync(planWorktrees)
  ? readdirSync(planWorktrees).filter((f) => statSync(join(planWorktrees, f)).isDirectory())
  : [];

const candidates = existingIds
  .filter((id) => doneIds.has(id))
  .sort()
  .map((id) => ({
    id,
    slug: slugById.get(id),
    worktreePath: `worktrees/${plan}/${id}`,
  }));

process.stdout.write(`${JSON.stringify(candidates)}\n`);
