#!/usr/bin/env node
/**
 * Sync bundled helper scripts from the canonical `.build/scripts/` folder into
 * each skill's own `scripts/` folder, driven by `.build/skills.json`.
 *
 * The canonical copy of every script lives in `.build/scripts/`. Each skill
 * keeps a self-contained `scripts/` folder (so the skill folder stays portable
 * when copied out on its own) — but those copies are GENERATED. Edit the
 * canonical script or `skills.json`, then run this to regenerate.
 *
 * Usage:
 *   node .build/sync.mjs            Write the copies (default).
 *   node .build/sync.mjs --check    Verify only; exit 1 if anything is out of
 *                                   sync. Writes nothing. (Handy for CI.)
 *
 * Behaviour:
 *   - For each skill in skills.json, copy each declared script from
 *     `.build/scripts/<src>` to `<skill>/scripts/<dest>`.
 *   - Prune `.mjs` files in a skill's `scripts/` folder that the metadata does
 *     not declare (the folder is a pure generated artifact).
 *   - Fail if a declared canonical script is missing, or if any canonical
 *     script is never used by any skill (orphan).
 *
 * Output: a per-skill summary on stdout. Errors on stderr (exit 1).
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const canonicalDir = join(scriptDir, "scripts");
const metadataPath = join(scriptDir, "skills.json");

const check = process.argv.includes("--check");

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

if (!existsSync(metadataPath)) fail(`Metadata not found: ${metadataPath}`);
const metadata = readJson(metadataPath);
if (!metadata?.skills || typeof metadata.skills !== "object") {
  fail(`${metadataPath} must have a "skills" object.`);
}

/** Normalise an entry to { src, dest }. */
function normalise(entry, skill) {
  if (typeof entry === "string") return { src: entry, dest: entry };
  if (entry && typeof entry.src === "string" && typeof entry.dest === "string") {
    return { src: entry.src, dest: entry.dest };
  }
  fail(`Skill "${skill}" has a malformed script entry: ${JSON.stringify(entry)}`);
}

const usedCanonical = new Set();
const drift = [];
let copied = 0;
let pruned = 0;

for (const [skill, entries] of Object.entries(metadata.skills)) {
  if (!Array.isArray(entries)) fail(`Skill "${skill}" must map to an array.`);

  const skillDir = join(repoRoot, skill);
  if (!existsSync(skillDir)) fail(`Skill directory not found: ${skillDir}`);
  const destDir = join(skillDir, "scripts");

  const declaredDests = new Set();
  const lines = [];

  for (const raw of entries) {
    const { src, dest } = normalise(raw, skill);
    usedCanonical.add(src);
    declaredDests.add(dest);

    const srcPath = join(canonicalDir, src);
    if (!existsSync(srcPath)) {
      fail(`Skill "${skill}" references missing canonical script: .build/scripts/${src}`);
    }
    const destPath = join(destDir, dest);

    const inSync =
      existsSync(destPath) &&
      readFileSync(srcPath, "utf8") === readFileSync(destPath, "utf8");

    if (inSync) {
      lines.push(`    = ${dest}`);
      continue;
    }

    if (check) {
      drift.push(`${skill}/scripts/${dest}`);
      lines.push(`    ✗ ${dest} (out of sync)`);
      continue;
    }

    mkdirSync(destDir, { recursive: true });
    copyFileSync(srcPath, destPath);
    copied++;
    lines.push(`    → ${dest}${src === dest ? "" : ` (from ${src})`}`);
  }

  // Prune undeclared .mjs files in the generated folder.
  if (existsSync(destDir)) {
    for (const file of readdirSync(destDir)) {
      if (!file.endsWith(".mjs") || declaredDests.has(file)) continue;
      if (check) {
        drift.push(`${skill}/scripts/${file} (undeclared)`);
        lines.push(`    ✗ ${file} (undeclared — would prune)`);
      } else {
        rmSync(join(destDir, file));
        pruned++;
        lines.push(`    - ${file} (pruned — not in metadata)`);
      }
    }
  }

  process.stdout.write(`${skill}\n${lines.join("\n")}\n`);
}

// Orphan check: every canonical script must be used by at least one skill.
const orphans = readdirSync(canonicalDir)
  .filter((f) => f.endsWith(".mjs") && !usedCanonical.has(f))
  .sort();
if (orphans.length > 0) {
  fail(`Orphaned canonical scripts (not used by any skill): ${orphans.join(", ")}`);
}

if (check) {
  if (drift.length > 0) {
    fail(`\nOut of sync (${drift.length}). Run \`node .build/sync.mjs\` to fix:\n  ${drift.join("\n  ")}`);
  }
  process.stdout.write("\nAll skill scripts are in sync.\n");
} else {
  process.stdout.write(`\nSynced ${copied} file(s), pruned ${pruned}.\n`);
}
