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
    class: classify(yield_, dev10x),
  };
  if (warnings.length > 0) result.warnings = warnings;
  return result;
}

export function classify(yieldVal, dev10x) {
  if (yieldVal >= 1000 || dev10x >= 3) return "TRANSMITTER";
  if (dev10x >= 1.45) return "ARCH+";
  if (dev10x >= 1.35) return "ARCH";
  if (dev10x >= 1.2) return "POWER";
  if (dev10x >= 1.0) return "BASE";
  if (dev10x >= 0) return "SEEKER";
  if (dev10x >= -0.3) return "REFINER";
  return "IGNITER";
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
