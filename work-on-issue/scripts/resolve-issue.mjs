#!/usr/bin/env node
/**
 * Resolve which issue the agent should work on for a plan.
 *
 * Usage:
 *   node resolve-issue.mjs --plan <name> [--id <id>]
 *
 * Behaviour:
 *   - With --id: look up that entry in `plans/<plan>/issues/index.json`.
 *     A numeric id is zero-padded to 3 digits (`6` → `"006"`).
 *   - Without --id: walk entries in ascending id order, return the first
 *     entry whose `status` is not "done". Exit 2 if all are done.
 *   - Always also reports each dependency's status and whether the
 *     companion markdown file exists.
 *
 * Output: JSON on stdout:
 *   {
 *     "id": "008",
 *     "slug": "service-release",
 *     "status": "pending",
 *     "file": "plans/<plan>/issues/008-service-release.md",
 *     "fileExists": true,
 *     "deps": [
 *       { "id": "005", "slug": "body-parsers", "status": "done", "missing": false },
 *       ...
 *     ],
 *     "unfinishedDeps": [
 *       { "id": "007", "slug": "...", "status": "pending", "missing": false }
 *     ]
 *   }
 *
 * Errors on stderr exit non-zero.
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

function readJson(path) {
  // Strip a UTF-8 BOM if present — PowerShell `Out-File -Encoding utf8` and a
  // few editors on Windows write one, which breaks `JSON.parse`.
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

if (!values.plan) fail("Missing required --plan <name>.");

const indexPath = join("plans", values.plan, "issues", "index.json");
if (!existsSync(indexPath)) fail(`Index file not found: ${indexPath}`);

let entries;
try {
  entries = readJson(indexPath);
} catch (err) {
  fail(`Failed to parse ${indexPath} as JSON: ${err.message}`);
}
if (!Array.isArray(entries)) fail(`${indexPath} must contain a JSON array.`);

for (const e of entries) {
  if (typeof e?.id !== "string" || typeof e?.slug !== "string" || typeof e?.status !== "string") {
    fail(`${indexPath} contains an entry missing id/slug/status: ${JSON.stringify(e)}`);
  }
}

const byId = new Map(entries.map((e) => [e.id, e]));

let target;
if (values.id) {
  let id = values.id;
  if (/^\d+$/.test(id)) id = id.padStart(3, "0");
  target = byId.get(id);
  if (!target) {
    const available = entries.map((e) => e.id).join(", ");
    fail(`No entry with id "${id}" in ${indexPath}. Available ids: ${available}`);
  }
} else {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  target = sorted.find((e) => e.status !== "done");
  if (!target) {
    fail(`All issues in plan "${values.plan}" are marked "done".`, 2);
  }
}

const deps = (Array.isArray(target.deps) ? target.deps : []).map((depId) => {
  const dep = byId.get(depId);
  return {
    id: depId,
    slug: dep?.slug ?? null,
    status: dep?.status ?? null,
    missing: !dep,
  };
});
const unfinishedDeps = deps.filter((d) => d.missing || d.status !== "done");

const file = `plans/${values.plan}/issues/${target.id}-${target.slug}.md`;

process.stdout.write(
  `${JSON.stringify({
    id: target.id,
    slug: target.slug,
    status: target.status,
    file,
    fileExists: existsSync(file),
    deps,
    unfinishedDeps,
  })}\n`,
);
