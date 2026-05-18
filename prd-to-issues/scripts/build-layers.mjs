#!/usr/bin/env node
/**
 * Compute topological layers from an issues index.json.
 *
 * Usage:
 *   node build-layers.mjs --index <path-to-index.json>
 *
 * Behaviour:
 *   - Reads the index.json at the given path.
 *   - Groups issues into dependency levels: level 0 has no blockers,
 *     level N has all blockers resolved in levels < N.
 *   - Writes layers.json alongside index.json.
 *   - Exits 1 if a dependency cycle is detected.
 *
 * Output: the resolved layers.json path on stdout. Errors on stderr.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { index: { type: "string" } },
  strict: true,
});

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

if (!values.index) {
  fail("Usage: node build-layers.mjs --index <path-to-index.json>");
}

/** @param {{ id: string; deps: string[] }[]} tasks */
function buildLayers(tasks) {
  const inDegree = new Map(tasks.map((t) => [t.id, t.deps.length]));

  const levels = [];
  let currentLevel = tasks.filter((t) => t.deps.length === 0).map((t) => t.id);
  const processed = new Set();

  while (currentLevel.length > 0) {
    levels.push({ level: levels.length, issues: [...currentLevel] });

    const nextLevel = [];
    currentLevel.forEach((id) => {
      processed.add(id);
      tasks.forEach((task) => {
        if (task.deps.includes(id)) {
          const newDegree = inDegree.get(task.id) - 1;
          inDegree.set(task.id, newDegree);
          if (newDegree === 0 && !processed.has(task.id)) {
            nextLevel.push(task.id);
          }
        }
      });
    });

    currentLevel = nextLevel;
  }

  if (processed.size !== tasks.length) {
    fail("Cycle detected in dependencies.");
  }

  return levels;
}

const tasks = JSON.parse(readFileSync(values.index, "utf8"));
const layers = buildLayers(tasks);

const outPath = join(dirname(values.index), "layers.json");
const body = layers
  .map((l) => `  { "level": ${l.level}, "issues": [${l.issues.map((i) => JSON.stringify(i)).join(", ")}] }`)
  .join(",\n");
writeFileSync(outPath, `[\n${body}\n]\n`);
process.stdout.write(`${outPath}\n`);
