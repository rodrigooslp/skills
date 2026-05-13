#!/usr/bin/env node
/**
 * Mark an issue as "done" in `plans/<plan>/issues/index.json`.
 *
 * Usage:
 *   node mark-done.mjs --plan <name> --id <id>
 *
 * Behaviour:
 *   - Normalises numeric ids to a zero-padded 3-digit string (`6` → `"006"`).
 *   - Loads the index, verifies the entry exists, sets its status to "done".
 *   - Preserves the original file formatting when the entry is on a single
 *     line (the project convention). If the entry spans multiple lines, the
 *     file is rewritten with JSON.stringify(.., null, 2) and a warning is
 *     printed.
 *   - Preserves a leading UTF-8 BOM if the original file had one.
 *   - Validates after writing — re-parses the file and confirms the entry
 *     now reports `"status": "done"`. Aborts non-zero if not.
 *   - If the entry is already "done", exits 0 without rewriting the file.
 *
 * Output: one short status line on stdout. Errors on stderr.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const raw = readFileSync(indexPath, "utf8");
const hadBom = raw.charCodeAt(0) === 0xfeff;
const stripped = hadBom ? raw.slice(1) : raw;

let entries;
try {
  entries = JSON.parse(stripped);
} catch (err) {
  fail(`Failed to parse ${indexPath} as JSON: ${err.message}`);
}
if (!Array.isArray(entries)) fail(`${indexPath} must contain a JSON array.`);

const entry = entries.find((e) => e?.id === id);
if (!entry) {
  const available = entries.map((e) => e?.id).filter(Boolean).join(", ");
  fail(`No entry with id "${id}" in ${indexPath}. Available ids: ${available}`);
}

if (entry.status === "done") {
  process.stdout.write(`Already done: ${id} (${entry.slug}). No change.\n`);
  process.exit(0);
}

// Try a line-based replacement first to preserve the user's formatting.
const lines = stripped.split("\n");
const idMatch = new RegExp(`"id"\\s*:\\s*"${id}"`);
const statusMatch = /"status"\s*:\s*"[^"]*"/;
let replaced = false;
const newLines = lines.map((line) => {
  if (replaced) return line;
  if (!idMatch.test(line) || !statusMatch.test(line)) return line;
  replaced = true;
  return line.replace(statusMatch, '"status": "done"');
});

let newContent;
let reformatted = false;
if (replaced) {
  newContent = newLines.join("\n");
} else {
  // Fallback: entry spans multiple lines. Reformat the whole file.
  entry.status = "done";
  newContent = JSON.stringify(entries, null, 2) + "\n";
  reformatted = true;
}

writeFileSync(indexPath, (hadBom ? "﻿" : "") + newContent, "utf8");

// Verify the write took effect.
let verifyEntries;
try {
  const verifyRaw = readFileSync(indexPath, "utf8").replace(/^﻿/, "");
  verifyEntries = JSON.parse(verifyRaw);
} catch (err) {
  fail(`Wrote ${indexPath} but it no longer parses as JSON: ${err.message}`);
}
const verifyEntry = verifyEntries.find((e) => e?.id === id);
if (verifyEntry?.status !== "done") {
  fail(`Wrote ${indexPath} but the entry for "${id}" still does not report "done".`);
}

const suffix = reformatted
  ? " (file was reformatted because the entry spanned multiple lines)"
  : "";
process.stdout.write(`Marked ${id} (${entry.slug}) as "done" in ${indexPath}${suffix}\n`);
