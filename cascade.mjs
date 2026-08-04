/**
 * cascade.mjs — pure SigRank yield cascade (vendored from sigrank-mcp).
 * No deps, no transport. Mirrors sigrank-app/lib/ingest/bridge.ts.
 *
 * Degenerate-input policy:
 *   - Any pillar that collapses a denominator returns null for affected metrics.
 *   - A `warnings[]` array is attached when any metric is null.
 *   - The cascade is NEVER thrown away — partial results are useful.
 */
export const round = (n, d) =>
  Number.isFinite(n) ? Number(n.toFixed(d)) : null;

/**
 * CLASS_TIERS — the 8 base tier names (K.01–K.08) for display.
 * SINGLE SOURCE OF TRUTH for tier-level display info.
 *
 * The permanent class is an EXPERIENCE ladder keyed on TOTAL TOKENS. Each tier
 * has 3 sub-stages (I/II/III) — 24 stages total. The 24 thresholds live in
 * RS05_CLASS_THRESHOLDS below. classify() returns the full sub-stage string
 * (e.g. "REFINER II"). Use tierOf() to extract the base tier name.
 *
 * TRANSMITTER is NOT on this ladder — it is a temporary peak badge (RS.08).
 *
 * Mirrors the server's canon-ids.ts CLASS_TIERS + ruleset.ts RS05_CLASS_THRESHOLDS.
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
 * Mirrors the server's SIGNAL_CLASSES set in lib/board/mappers.ts.
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

/**
 * RS05_CLASS_THRESHOLDS — 24 total-token breakpoints (8 tiers × 3 sub-stages).
 * Mirrors the server's lib/analytics/ruleset.ts RS05_CLASS_THRESHOLDS exactly.
 */
export const RS05_CLASS_THRESHOLDS = [
  { class: "ARCH+ I", totalMin: 7068201104627 },
  { class: "ARCH+ II", totalMin: 7068201104627 },
  { class: "ARCH+ III", totalMin: 7068201104627 },
  { class: "ARCH I", totalMin: 186207267611 },
  { class: "ARCH II", totalMin: 98543134083 },
  { class: "ARCH III", totalMin: 68766193943 },
  { class: "POWER I", totalMin: 39958782379 },
  { class: "POWER II", totalMin: 26955905621 },
  { class: "POWER III", totalMin: 19141226889 },
  { class: "BASE I", totalMin: 13960345961 },
  { class: "BASE II", totalMin: 10189224970 },
  { class: "BASE III", totalMin: 7747041813 },
  { class: "SEEKER I", totalMin: 5446673659 },
  { class: "SEEKER II", totalMin: 4014577247 },
  { class: "SEEKER III", totalMin: 2961798768 },
  { class: "REFINER I", totalMin: 2358346840 },
  { class: "REFINER II", totalMin: 1845750357 },
  { class: "REFINER III", totalMin: 1334876308 },
  { class: "BEARER I", totalMin: 984078167 },
  { class: "BEARER II", totalMin: 714619043 },
  { class: "BEARER III", totalMin: 431702990 },
  { class: "IGNITER I", totalMin: 216393332 },
  { class: "IGNITER II", totalMin: 88999166 },
  { class: "IGNITER III", totalMin: 0 },
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

export function cascade({ input, output, cacheCreate, cacheRead }) {
  const i = Number(input),
    o = Number(output),
    cw = Number(cacheCreate),
    cr = Number(cacheRead);
  const total = i + o + cw + cr;
  const warnings = [];

  const snrDenom = i + o;
  const snr = snrDenom > 0 ? o / snrDenom : null;
  if (snr === null) warnings.push("snr_undefined: input+output=0");

  const velocity = i > 0 ? o / i : null;
  if (velocity === null) warnings.push("velocity_undefined: input=0");

  const leverage = i > 0 ? cr / i : null;
  if (leverage === null) warnings.push("leverage_undefined: input=0");

  const yield_ =
    leverage !== null && velocity !== null ? leverage * velocity : null;
  if (yield_ === null && !warnings.some((w) => w.startsWith("yield")))
    warnings.push("yield_undefined: requires input>0");

  let dev10x = null;
  if (i > 0 && o > 0 && cw > 0 && cr > 0) {
    dev10x = Math.log10((o / i) * (cw / o) * (cr / cw));
  } else {
    warnings.push("dev10x_undefined: requires all four pillars > 0");
  }

  const result = {
    pillars: { input: i, output: o, cacheCreate: cw, cacheRead: cr, total },
    yield: round(yield_, 2),
    snr: round(snr, 4),
    leverage: round(leverage, 1),
    velocity: round(velocity, 3),
    dev10x: round(dev10x, 2),
    class: classify(total),
  };
  if (warnings.length > 0) result.warnings = warnings;
  return result;
}

/** Classify an operator's experience stage from total tokens. Mirrors the
 *  server's assignClass(totalTokens). Returns a full sub-stage string or UNCLASSED. */
export function classify(totalTokens) {
  if (totalTokens == null || !Number.isFinite(totalTokens)) return UNCLASSED;
  for (const t of RS05_CLASS_THRESHOLDS) {
    if (totalTokens >= t.totalMin) return t.class;
  }
  return "IGNITER III";
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
