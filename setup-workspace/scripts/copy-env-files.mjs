#!/usr/bin/env node
/**
 * Copy every `.env*` file from the current working directory into a target
 * directory. Skips directories that happen to be named `.env.something`.
 *
 * Usage:
 *   node copy-env-files.mjs --dest <path>
 *
 * Output: one line per file copied + a final count line on stdout. Exit 0
 * even when zero files are copied (that is success, not failure). Errors on
 * stderr exit non-zero.
 */

import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { dest: { type: "string" } },
  strict: true,
});

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

if (!values.dest) fail("Missing required --dest <path>.");
if (!existsSync(values.dest)) fail(`Destination does not exist: ${values.dest}`);
if (!statSync(values.dest).isDirectory()) {
  fail(`Destination is not a directory: ${values.dest}`);
}

let copied = 0;
for (const f of readdirSync(".")) {
  if (f !== ".env" && !f.startsWith(".env.")) continue;
  // Skip template files like `.env.example`, `.env.local.example`.
  if (f.endsWith(".example")) continue;
  if (!statSync(f).isFile()) continue;
  copyFileSync(f, join(values.dest, f));
  process.stdout.write(`Copied ${f}\n`);
  copied++;
}
process.stdout.write(`${copied} .env file(s) copied\n`);
