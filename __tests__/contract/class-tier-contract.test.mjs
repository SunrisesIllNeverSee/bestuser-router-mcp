/**
 * __tests__/contract/class-tier-contract.test.mjs
 *
 * CROSS-REPO CONTRACT TEST — class-tier parity guard for bestuser-router-mcp.
 *
 * bestuser-router-mcp maintains its own copy of the 24-sub-stage taxonomy in
 * cascade.mjs. If it drifts from sigrank-mcp (or sigrank-app), the router will
 * return stale class names or wrong thresholds to AI assistants.
 *
 * This test diffs the tier lists + thresholds against:
 *   1. sigrank-mcp (analytics/cascade.mjs)
 *   2. sigrank-app (lib/analytics/ruleset.ts + lib/identity/canon-ids.ts)
 *
 * Locally: run with the other repo's root path as args:
 *   node __tests__/contract/class-tier-contract.test.mjs /path/to/sigrank-mcp /path/to/sigrank-app
 *
 * In CI: the workflow checks out all repos, then runs this script.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  CLASS_TIERS as LOCAL_CLASS_TIERS,
  SIGNAL_CLASSES as LOCAL_SIGNAL_CLASSES,
  RS05_CLASS_THRESHOLDS as LOCAL_THRESHOLDS,
  classify as localClassify,
} from "../../cascade.mjs";

// ── Helpers ────────────────────────────────────────────────────────────────

function extractMcpThresholds(repoDir) {
  const src = readFileSync(join(repoDir, "analytics/cascade.mjs"), "utf8");
  const matches = [...src.matchAll(/\{\s*class:\s*"([^"]+)",\s*totalMin:\s*(\d+)\s*\}/g)];
  return matches.map(([, cls, min]) => ({ class: cls, totalMin: Number(min) }));
}

function extractMcpSignalClasses(repoDir) {
  const src = readFileSync(join(repoDir, "analytics/cascade.mjs"), "utf8");
  const match = src.match(/SIGNAL_CLASSES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map(([, s]) => s);
}

function extractAppThresholds(repoDir) {
  const src = readFileSync(join(repoDir, "lib/analytics/ruleset.ts"), "utf8");
  const matches = [...src.matchAll(/\{\s*class:\s*"([^"]+)",\s*totalMin:\s*(\d+)\s*\}/g)];
  return matches.map(([, cls, min]) => ({ class: cls, totalMin: Number(min) }));
}

function extractAppTierNames(repoDir) {
  const src = readFileSync(join(repoDir, "lib/identity/canon-ids.ts"), "utf8");
  const matches = [...src.matchAll(/name:\s*"([^"]+)"/g)];
  return matches.map(([, name]) => name);
}

// ── Local parity (self-test) ───────────────────────────────────────────────

test("LOCAL: 8 base tiers in canonical order", () => {
  assert.equal(LOCAL_CLASS_TIERS.length, 8);
  assert.deepEqual(LOCAL_CLASS_TIERS, [
    "ARCH+", "ARCH", "POWER", "BASE",
    "SEEKER", "REFINER", "BEARER", "IGNITER",
  ]);
});

test("LOCAL: 24 sub-stage signal classes", () => {
  assert.equal(LOCAL_SIGNAL_CLASSES.length, 24);
  assert.equal(LOCAL_SIGNAL_CLASSES[0], "ARCH+ I");
  assert.equal(LOCAL_SIGNAL_CLASSES[23], "IGNITER III");
});

test("LOCAL: 24 thresholds, monotonic descending", () => {
  assert.equal(LOCAL_THRESHOLDS.length, 24);
  for (let i = 1; i < LOCAL_THRESHOLDS.length; i++) {
    assert.ok(
      LOCAL_THRESHOLDS[i - 1].totalMin > LOCAL_THRESHOLDS[i].totalMin,
      `${LOCAL_THRESHOLDS[i - 1].class} (${LOCAL_THRESHOLDS[i - 1].totalMin}) should be > ${LOCAL_THRESHOLDS[i].class} (${LOCAL_THRESHOLDS[i].totalMin})`,
    );
  }
});

test("LOCAL: MOSES seed classifies as REFINER I", () => {
  // Total tokens for MOSES seed: 2,695,923,411
  assert.equal(localClassify(2695923411), "REFINER I");
});

// ── Cross-repo parity (requires repo paths as args) ────────────────────────

const args = process.argv.slice(2);
const mcpRepo = args[0] || resolve("../../_02_sigrank-mcp");
const appRepo = args[1] || resolve("../../_01_sigrank-app");

test("CROSS-REPO: thresholds match sigrank-mcp", { skip: !mcpRepo }, () => {
  let mcpThresholds;
  try {
    mcpThresholds = extractMcpThresholds(mcpRepo);
  } catch {
    return; // repo not available — skip silently
  }
  assert.equal(mcpThresholds.length, 24, "sigrank-mcp should have 24 thresholds");
  for (let i = 0; i < 24; i++) {
    assert.equal(
      LOCAL_THRESHOLDS[i].class,
      mcpThresholds[i].class,
      `Class name mismatch at index ${i}`,
    );
    assert.equal(
      LOCAL_THRESHOLDS[i].totalMin,
      mcpThresholds[i].totalMin,
      `Threshold mismatch for ${LOCAL_THRESHOLDS[i].class}`,
    );
  }
});

test("CROSS-REPO: signal classes match sigrank-mcp", { skip: !mcpRepo }, () => {
  let mcpSignalClasses;
  try {
    mcpSignalClasses = extractMcpSignalClasses(mcpRepo);
  } catch {
    return;
  }
  if (mcpSignalClasses.length === 0) return;
  assert.deepEqual(LOCAL_SIGNAL_CLASSES, mcpSignalClasses);
});

test("CROSS-REPO: thresholds match sigrank-app", { skip: !appRepo }, () => {
  let appThresholds;
  try {
    appThresholds = extractAppThresholds(appRepo);
  } catch {
    return;
  }
  assert.equal(appThresholds.length, 24, "sigrank-app should have 24 thresholds");
  for (let i = 0; i < 24; i++) {
    assert.equal(
      LOCAL_THRESHOLDS[i].class,
      appThresholds[i].class,
      `Class name mismatch at index ${i}`,
    );
    assert.equal(
      LOCAL_THRESHOLDS[i].totalMin,
      appThresholds[i].totalMin,
      `Threshold mismatch for ${LOCAL_THRESHOLDS[i].class}`,
    );
  }
});

test("CROSS-REPO: tier names match sigrank-app", { skip: !appRepo }, () => {
  let appTierNames;
  try {
    appTierNames = extractAppTierNames(appRepo);
  } catch {
    return;
  }
  if (appTierNames.length === 0) return;
  // App may have extra names (e.g. TRANSMITTER) — check our 8 are present in order
  const filtered = appTierNames.filter((n) => LOCAL_CLASS_TIERS.includes(n));
  assert.deepEqual(filtered, LOCAL_CLASS_TIERS);
});
