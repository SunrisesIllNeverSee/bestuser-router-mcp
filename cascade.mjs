/**
 * cascade.mjs — SigRank yield cascade facade.
 *
 * The canonical cascade math (cascade, classify, round, RS05_CLASS_THRESHOLDS)
 * is now imported from the published `@sigrank/cascade` package instead of
 * being vendored here. This file re-exports that math and keeps the
 * display/parsing helpers (CLASS_TIERS, SIGNAL_CLASSES, UNCLASSED, tierOf,
 * stageOf, bandOf, parsePillars) that are not part of the package's pure-math
 * surface.
 *
 * API note: `@sigrank/cascade`'s `cascade()` takes positional args
 *   cascade(input, output, cacheCreate, cacheRead)
 * and returns { yield, snr, leverage, velocity, dev10x, class, warnings, pillars }.
 *
 * Degenerate-input policy (from the package):
 *   - Any pillar that collapses a denominator returns null for affected metrics.
 *   - A `warnings[]` array is attached when any metric is null.
 *   - The cascade is NEVER thrown away — partial results are useful.
 */

// ── Canonical math (re-exported from the published package) ────────────────
export {
  cascade,
  classify,
  round,
  RS05_CLASS_THRESHOLDS,
} from "@sigrank/cascade";

/**
 * CLASS_TIERS — the 8 base tier names (K.01–K.08) for display.
 * SINGLE SOURCE OF TRUTH for tier-level display info.
 *
 * The permanent class is an EXPERIENCE ladder keyed on TOTAL TOKENS. Each tier
 * has 3 sub-stages (I/II/III) — 24 stages total. The 24 thresholds live in
 * RS05_CLASS_THRESHOLDS (re-exported from @sigrank/cascade above). classify()
 * returns the full sub-stage string (e.g. "REFINER II"). Use tierOf() to
 * extract the base tier name.
 *
 * TRANSMITTER is NOT on this ladder — it is a temporary peak badge (RS.08).
 */
export const CLASS_TIERS = [
  "ARCH+",
  "ARCH",
  "POWER",
  "BASE",
  "SEEKER",
  "REFINER",
  "BEARER",
  "IGNITER",
];

/**
 * SIGNAL_CLASSES — the full 24 sub-stage names (8 tiers × 3 sub-stages I/II/III).
 */
export const SIGNAL_CLASSES = [
  "ARCH+ I", "ARCH+ II", "ARCH+ III",
  "ARCH I", "ARCH II", "ARCH III",
  "POWER I", "POWER II", "POWER III",
  "BASE I", "BASE II", "BASE III",
  "SEEKER I", "SEEKER II", "SEEKER III",
  "REFINER I", "REFINER II", "REFINER III",
  "BEARER I", "BEARER II", "BEARER III",
  "IGNITER I", "IGNITER II", "IGNITER III",
];

export const UNCLASSED = "UNCLASSED";

/** Extract the base tier name from a sub-stage string (e.g. "ARCH+ I" → "ARCH+"). */
export function tierOf(cls) {
  if (cls === UNCLASSED || cls == null) return cls;
  const parts = String(cls).split(" ");
  if (parts.length >= 2 && ["I", "II", "III"].includes(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(" ");
  }
  return cls;
}

/** Extract the sub-stage from a sub-stage string (e.g. "ARCH+ I" → "I"). */
export function stageOf(cls) {
  if (cls === UNCLASSED || cls == null) return null;
  const parts = String(cls).split(" ");
  const stage = parts[parts.length - 1];
  return stage === "I" || stage === "II" || stage === "III" ? stage : null;
}

/**
 * Map a class tier to a power-user band. The 8 experience tiers collapse into 5
 * behavioral bands + UNCLASSED.
 */
const BAND = {
  "ARCH+": "high",
  ARCH: "high",
  POWER: "mid",
  BASE: "mid",
  SEEKER: "early",
  REFINER: "early",
  BEARER: "entry",
  IGNITER: "entry",
  [UNCLASSED]: "nodata",
};

export function bandOf(klass) {
  return BAND[tierOf(klass)] ?? "nodata";
}

export function parsePillars(text) {
  const t = String(text || "").trim();
  const pw = [];

  try {
    const j = JSON.parse(t);
    if (j && typeof j === "object" && !Array.isArray(j)) {
      const g = (...keys) => {
        for (const k of keys) if (j[k] != null) return j[k];
        return null;
      };
      const input = g("input", "tokens_input_fresh", "inputTokens", "input_tokens");
      const output = g("output", "tokens_output", "outputTokens", "output_tokens");
      const cacheCreate = g("cacheCreate", "tokens_cache_creation", "cache_creation_tokens");
      const cacheRead = g("cacheRead", "tokens_cache_read", "cache_read_tokens");
      if ([input, output, cacheCreate, cacheRead].every((v) => v != null)) {
        const pillars = {
          input: Number(input),
          output: Number(output),
          cacheCreate: Number(cacheCreate),
          cacheRead: Number(cacheRead),
        };
        if ([pillars.input, pillars.output, pillars.cacheCreate, pillars.cacheRead].some((v) => !Number.isFinite(v)))
          throw new Error("Non-numeric pillar value in JSON.");
        if ([pillars.input, pillars.output, pillars.cacheCreate, pillars.cacheRead].some((v) => v < 0))
          pw.push("negative_pillar: one or more pillars is negative");
        if (pw.length > 0) pillars._parseWarnings = pw;
        return pillars;
      }
    }
  } catch (e) {
    if (e.message.startsWith("Non-numeric")) throw e;
  }

  if (/[a-zA-Z]/.test(t))
    pw.push("positional_from_mixed_text: extracted numbers from text with alphabetic characters");

  const nums = (t.match(/-?\d[\d,]*\.?\d*/g) || []).map((s) => Number(s.replace(/,/g, "")));
  if (nums.length >= 4) {
    const [input, output, cacheCreate, cacheRead] = nums;
    if (nums.length > 4)
      pw.push(`positional_extra_numbers: found ${nums.length} numbers, using first 4`);
    const pillars = { input, output, cacheCreate, cacheRead };
    if ([input, output, cacheCreate, cacheRead].some((v) => v < 0))
      pw.push("negative_pillar: one or more pillars is negative");
    if (pw.length > 0) pillars._parseWarnings = pw;
    return pillars;
  }
  throw new Error(
    "Could not parse 4 token pillars (input, output, cacheCreate, cacheRead) from the input.",
  );
}
