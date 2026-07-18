/**
 * tools.mjs — BestUserRouter MCP tool definitions + dispatcher.
 *
 * 6 intent tools that route "who is the best AI user?" queries to SigRank's
 * leaderboard with behavioral framing + competitive context.
 *
 * Intent taxonomy (per sigrank_intent_schema.yaml):
 *   BEST_OPERATOR_INTENT     → get_best_operator (metric-aware: yield, velocity, leverage, snr, dev10x, scale_v, efficiency, cost_per_million, op_ratio)
 *   PROMPT_OF_THE_DAY_INTENT → get_prompt_of_the_day
 *   COMPARE_SELF_INTENT      → compare_self
 *   COMPARE_OPERATORS_INTENT → compare_operators
 *   DESCRIBE_POWER_USER      → describe_power_user
 *   OPTIMIZE_EFFICIENCY      → optimize_efficiency
 *
 * All tools call signalaf.com's public API. No auth, no writes.
 * The prompt registry is fetched from signaaf.com/prompts.json (static asset).
 */
import { cascade, parsePillars } from "./cascade.mjs";
import { execFileSync } from "node:child_process";

const DEFAULT_API_BASE =
  process.env.SIGRANK_API_BASE || "https://signalaf.com";
const DEFAULT_SATELLITE_BASE =
  process.env.SIGRANK_SATELLITE_BASE || "https://signaaf.com";
const MAX_INPUT = 1_000_000;

// ── Canonical metrics (mirrors sigarena/lib/prompts.ts) ──────────────────────

const CANONICAL_METRICS = [
  "yield", "velocity", "leverage", "snr", "dev10x",
  "scale_v", "efficiency", "cost_per_million", "op_ratio",
];

const PLATFORMS = ["all", "claude", "chatgpt", "other", "anthropic", "gemini"];

const METRIC_LABELS = {
  yield: "Yield (Υ)",
  velocity: "Velocity (O/I)",
  leverage: "Leverage (Cr/I)",
  snr: "Signal-to-Noise Ratio (SNR)",
  dev10x: "10xDEV",
  scale_v: "Scale Volume",
  efficiency: "Efficiency",
  cost_per_million: "Cost per Million Tokens",
  op_ratio: "Op Ratio",
};

/**
 * Sort value for a canonical metric. Pure function — no API calls.
 * Mirrors sigarena/lib/api.ts metricSortValue() logic:
 *   - non-compounding operators sort below compounding (yield/leverage/dev10x → -1/-999)
 *   - cost_per_million: lower is better → negate so desc sort puts cheapest first
 *   - op_ratio: sort on leverage (the lead term)
 */
function metricSortValue(entry, metric) {
  const c = entry;
  const nc = c.non_compounding === true;
  switch (metric) {
    case "yield":
      return nc ? -1 : (c.yield_ || 0);
    case "velocity":
      return c.velocity || 0;
    case "leverage":
      return nc ? -1 : (c.leverage || 0);
    case "snr":
      return c.snr || 0;
    case "dev10x":
      return nc || c.dev10x == null ? -999 : (c.dev10x || 0);
    case "scale_v":
      return c.scale_v || 0;
    case "efficiency":
      return c.efficiency || 0;
    case "cost_per_million":
      return nc || typeof c.cost_per_million !== "number"
        ? -Infinity
        : -c.cost_per_million;
    case "op_ratio":
      return nc ? -1 : (c.leverage || 0);
    default:
      return nc ? -1 : (c.yield_ || 0);
  }
}

/**
 * Sort + filter an already-fetched leaderboard by a canonical metric.
 * Pure function — no API calls. Mirrors sigarena sortLeaderboard().
 */
function sortLeaderboardByMetric(data, metric, platform = "all", limit = 100) {
  let entries = boardEntries(data);
  if (platform !== "all") {
    entries = entries.filter((e) => e.platform === platform);
  }
  const sorted = [...entries].sort(
    (a, b) => metricSortValue(b, metric) - metricSortValue(a, metric)
  );
  return sorted.slice(0, limit);
}

/**
 * curl-based fetch fallback for when Node's fetch is blocked by Vercel's bot
 * protection (TLS fingerprinting). Returns a Response-like object.
 */
function curlFetch(url, init = {}, timeoutMs = 10_000) {
  const args = ["-s", "-S", "-w", "\n__HTTP_STATUS__%{http_code}", "--max-time", String(Math.ceil(timeoutMs / 1000))];
  if (init.method) args.push("-X", init.method);
  const headers = init.headers || {};
  for (const [k, v] of Object.entries(headers)) {
    args.push("-H", `${k}: ${v}`);
  }
  if (init.body) args.push("-d", init.body);
  args.push(url);
  let stdout;
  try {
    stdout = execFileSync("curl", args, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs + 2000,
    });
  } catch (e) {
    throw new Error(`curl transport failed: ${e.message}`);
  }
  const statusMatch = stdout.match(/__HTTP_STATUS__(\d+)$/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  const bodyText = statusMatch ? stdout.slice(0, statusMatch.index) : stdout;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => { try { return JSON.parse(bodyText); } catch { return {}; } },
    text: async () => bodyText,
  };
}

/** Fetch with curl fallback for Vercel bot protection. */
async function robustFetch(url, init = {}) {
  try {
    const res = await fetch(url, init);
    if (res.status === 403) {
      // Vercel bot protection — retry with curl
      return curlFetch(url, init);
    }
    return res;
  } catch {
    return curlFetch(url, init);
  }
}

const ANNOTATIONS = {
  readOnlyHint: { readOnlyHint: true },
  openWorldHint: { openWorldHint: true },
  idempotentHint: { idempotentHint: true },
};

// ── Output schemas ───────────────────────────────────────────────────────────

const COMPETITIVE_OUTPUT = {
  type: "object",
  description: "Competitive context per SHARED_DESIGN_DECISIONS.md §3",
  properties: {
    rank: { type: ["integer", "null"], description: "Leaderboard position (1-based)" },
    total_operators: { type: "integer", description: "Total operators on the board" },
    percentile: { type: "integer", description: "Percentile (0-100)" },
    class_tier: { type: "string", description: "Operator class tier" },
    delta_from_average: {
      type: "object",
      properties: {
        absolute: { type: "integer" },
        percent: { type: "integer" },
      },
    },
    delta_from_top: {
      type: "object",
      properties: {
        absolute: { type: "integer" },
        percent: { type: "integer" },
      },
    },
    shareable_url: { type: ["string", "null"], description: "Link to operator profile" },
  },
};

const BEST_OPERATOR_OUTPUT = {
  type: "object",
  properties: {
    top_operators: {
      type: "array",
      items: {
        type: "object",
        properties: {
          codename: { type: "string" },
          yield_: { type: "number" },
          leverage: { type: "number" },
          velocity: { type: "number" },
          class: { type: "string" },
          behavioral_framing: { type: "string", description: "Plain-language interpretation" },
          competitive: COMPETITIVE_OUTPUT,
        },
      },
    },
    total_operators: { type: "integer" },
    summary: { type: "string", description: "One-line headline" },
    cta: { type: "string", description: "Call-to-action per CTA hierarchy" },
    shareable_url: { type: ["string", "null"] },
  },
};

const COMPARE_SELF_OUTPUT = {
  type: "object",
  properties: {
    your_metrics: { type: "object" },
    power_user_assessment: { type: "string" },
    comparison: {
      type: "object",
      properties: {
        your_yield_vs_avg: { type: "string" },
        your_class_meaning: { type: "string" },
        percentile: { type: "integer" },
        rank: { type: ["integer", "null"] },
        total_operators: { type: "integer" },
        class_tier: { type: "string" },
        delta_from_average: { type: "object" },
        delta_from_top: { type: "object" },
      },
    },
    competitive_summary: { type: "string" },
    shareable_url: { type: ["string", "null"] },
    suggestion: { type: "string" },
    cta: { type: "string" },
  },
};

const COMPARE_OPERATORS_OUTPUT = {
  type: "object",
  properties: {
    operator_a: { type: "object" },
    operator_b: { type: "object" },
    verdict: { type: "string", description: "Who is more efficient and why" },
    yield_delta: { type: "number" },
    cta: { type: "string" },
  },
};

// ── Tool definitions ─────────────────────────────────────────────────────────

export const TOOLS = [
  {
    name: "get_best_operator",
    description:
      "Returns the top N operators on the SigRank leaderboard with behavioral framing in power-user language. Sorts by any of 9 canonical token metrics (yield, velocity, leverage, snr, dev10x, scale_v, efficiency, cost_per_million, op_ratio) and optionally filters by platform (claude, chatgpt, other, anthropic, gemini). Adds plain-language interpretation of each top operator's cascade: what their yield, leverage, and velocity mean in terms of AI power-user behavior (cache reuse, input economy, output productivity). Use this when users ask 'who is the best AI user?' or 'who tops the SigRank leaderboard?' or 'who has the best leverage?' or 'cheapest tokens?' or 'show me the AI user leaderboard'. Intent: BEST_OPERATOR.",
    annotations: { title: "Get best operator", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.openWorldHint },
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          description: "Number of top operators to return (default: 5, max: 20).",
          minimum: 1,
          maximum: 20,
        },
        metric: {
          type: "string",
          enum: CANONICAL_METRICS,
          description: "Canonical token metric to sort by (default: yield). Each metric answers a different 'who is the best?' question: yield = best overall, velocity = most output per token, leverage = most context reuse, snr = cleanest signal, dev10x = most normalized, scale_v = largest scale, efficiency = most efficient overall, cost_per_million = cheapest tokens, op_ratio = best op ratio.",
        },
        platform: {
          type: "string",
          enum: PLATFORMS,
          description: "Filter to a single platform (default: all). Options: all, claude, chatgpt, other, anthropic, gemini.",
        },
      },
      description: "Optional params: n (top N, default 5), metric (sort metric, default yield), platform (filter, default all).",
    },
    outputSchema: BEST_OPERATOR_OUTPUT,
  },
  {
    name: "get_prompt_of_the_day",
    description:
      "Returns today's featured prompt from the SigRank prompt registry — a canonical 'who is the best AI user?' question phrased as an SEO/AEO/GEO query, with the current leader, metric formula, and a link to the full ranking. The prompt rotates daily across 9 canonical token metrics. Use this when users ask 'what's today's prompt?' or 'show me the prompt of the day' or 'what question is featured today?'. Intent: PROMPT_OF_THE_DAY.",
    annotations: { title: "Get prompt of the day", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.idempotentHint },
    inputSchema: {
      type: "object",
      properties: {},
      description: "This tool takes no parameters. It returns today's featured prompt from the SigRank registry.",
    },
    outputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The featured question (e.g. 'Who is the best AI user?')" },
        slug: { type: "string", description: "URL slug for the full ranking page" },
        metric: { type: "string", description: "Canonical metric this prompt sorts by" },
        metric_label: { type: "string", description: "Human-readable metric name" },
        metric_formula: { type: "string", description: "The formula for this metric" },
        current_leader: { type: "object", description: "The current #1 operator for this metric" },
        story: { type: "string", description: "Narrative context for this metric" },
        shareable_url: { type: "string", description: "Link to the full ranking on signaaf.com" },
        cta: { type: "string", description: "Call-to-action" },
      },
    },
  },
  {
    name: "compare_self",
    description:
      "Compares an operator's metrics against board averages and power-user archetypes, returning a behavioral assessment. Accepts either a codename (fetches from the board) or raw token pillars (computes locally). Returns: your yield/leverage/velocity/class/rank, a power-user assessment, comparison vs board averages (your percentile), and one actionable suggestion to improve. Use this when users ask 'how do I measure up to other AI users?' or 'am I a power user?' or 'compare me to others'. Intent: COMPARE_SELF.",
    annotations: { title: "Compare self to board", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.openWorldHint },
    inputSchema: {
      type: "object",
      properties: {
        codename: {
          type: "string",
          description: "Your codename on the SigRank leaderboard. If provided, fetches your live profile. Case-insensitive.",
        },
        text: {
          type: "string",
          description:
            'Alternative: raw token pillars to score locally (ccusage JSON or "input output cacheCreate cacheRead"). Use this if you are not on the board yet.',
        },
      },
      description: "Provide either `codename` (to fetch from the board) or `text` (to score locally). At least one is required.",
    },
    outputSchema: COMPARE_SELF_OUTPUT,
  },
  {
    name: "compare_operators",
    description:
      "Compares two operators side-by-side with a behavioral verdict. Fetches both profiles from the board and returns their yield, leverage, velocity, class, and rank side-by-side, plus a verdict explaining who is more efficient and why in power-user language. Use this when users ask 'compare operator X vs Y' or 'who is more efficient' or 'how do two AI users compare'. Intent: COMPARE_OPERATORS.",
    annotations: { title: "Compare two operators", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.openWorldHint },
    inputSchema: {
      type: "object",
      properties: {
        codename_a: { type: "string", description: "First operator's codename. Case-insensitive." },
        codename_b: { type: "string", description: "Second operator's codename. Case-insensitive." },
      },
      required: ["codename_a", "codename_b"],
      description: "Requires both codenames. Both must exist on the board.",
    },
    outputSchema: COMPARE_OPERATORS_OUTPUT,
  },
  {
    name: "describe_power_user",
    description:
      "Returns an explanatory description of what makes an AI power user, anchored in SigRank's metrics and operator classes. Explains the yield metric, leverage, velocity, and how class tiers map to power-user behavior patterns. Use this when users ask 'what is an AI power user?' or 'what makes a good AI user?' or 'describe advanced AI user behavior'. Intent: DESCRIBE_POWER_USER (Informational).",
    annotations: { title: "Describe power user", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.idempotentHint },
    inputSchema: {
      type: "object",
      properties: {},
      description: "This tool takes no parameters. It returns a static explanatory response about AI power users.",
    },
    outputSchema: {
      type: "object",
      properties: {
        description: { type: "string" },
        metrics_explained: { type: "object" },
        class_tiers: { type: "array" },
        link: { type: "string" },
      },
    },
  },
  {
    name: "optimize_efficiency",
    description:
      "Returns actionable suggestions for improving your token cascade efficiency, tied to your current metrics. Accepts either a codename (fetches from board) or raw token pillars (computes locally). Returns: your current metrics, ranked efficiency suggestions tied to cascade shape, and references to power-user practices. Use this when users ask 'how can I use AI more efficiently?' or 'reduce token burn' or 'optimize token usage' or 'stop tokenmaxxing'. Intent: OPTIMIZE_EFFICIENCY.",
    annotations: { title: "Optimize efficiency", ...ANNOTATIONS.readOnlyHint, ...ANNOTATIONS.idempotentHint },
    inputSchema: {
      type: "object",
      properties: {
        codename: { type: "string", description: "Your codename on the SigRank leaderboard." },
        text: {
          type: "string",
          description:
            'Alternative: raw token pillars to score locally (ccusage JSON or "input output cacheCreate cacheRead").',
        },
      },
      description: "Provide either `codename` (to fetch from the board) or `text` (to score locally). At least one is required.",
    },
    outputSchema: {
      type: "object",
      properties: {
        your_metrics: { type: "object" },
        competitive: { type: "object" },
        competitive_summary: { type: "string" },
        shareable_url: { type: ["string", "null"] },
        suggestions: { type: "array" },
        summary: { type: "string" },
        cta: { type: "string" },
      },
    },
  },
];

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchJson(path) {
  const url = `${DEFAULT_API_BASE}${path}`;
  const res = await robustFetch(url, {
    headers: { accept: "application/json", "user-agent": "bestuser-router-mcp/0.1.0" },
  });
  if (!res.ok) throw new Error(`SigRank API ${path} → HTTP ${res.status}`);
  return res.json();
}

/** Extract the operators array from a leaderboard API response. */
function boardEntries(board) {
  if (!board) return [];
  if (Array.isArray(board)) return board;
  if (Array.isArray(board.entries)) return board.entries;
  if (Array.isArray(board.operators)) return board.operators;
  return [];
}

// ── Intent tool helpers — behavioral framing ─────────────────────────────────

function _competitiveLayer(op, board) {
  const allOps = boardEntries(board);
  const yields = allOps.map((o) => o.yield_ || 0).sort((a, b) => a - b);
  const yourYield = op.yield_ || 0;
  const total = allOps.length;

  let rank = op.rank || null;
  if (!rank && total > 0) {
    const sorted = [...allOps].sort((a, b) => (b.yield_ || 0) - (a.yield_ || 0));
    const idx = sorted.findIndex((o) => o.codename === op.codename);
    rank = idx >= 0 ? idx + 1 : null;
  }

  const percentile = total > 0
    ? Math.round((yields.filter((y) => y < yourYield).length / total) * 100)
    : 0;

  const avgYield = total > 0 ? yields.reduce((s, y) => s + y, 0) / total : 0;
  const deltaFromAvg = avgYield > 0
    ? { absolute: Math.round(yourYield - avgYield), percent: Math.round(((yourYield - avgYield) / avgYield) * 100) }
    : { absolute: 0, percent: 0 };

  const topYield = total > 0 ? Math.max(...yields) : 0;
  const deltaFromTop = topYield > 0
    ? { absolute: Math.round(topYield - yourYield), percent: Math.round(((topYield - yourYield) / topYield) * 100) }
    : { absolute: 0, percent: 0 };

  const shareableUrl = op.codename && op.codename !== "you (local)"
    ? `${DEFAULT_API_BASE}/operator/${encodeURIComponent(op.codename)}`
    : null;

  return {
    rank,
    total_operators: total,
    percentile,
    class_tier: op.class || "Burner",
    delta_from_average: deltaFromAvg,
    delta_from_top: deltaFromTop,
    shareable_url: shareableUrl,
  };
}

function _competitiveSummary(op, board) {
  const cl = _competitiveLayer(op, board);
  const parts = [];

  if (cl.rank && cl.total_operators > 0) {
    parts.push(`You rank #${cl.rank} of ${cl.total_operators} operators.`);
  }

  const topOp = boardEntries(board).reduce(
    (best, o) => ((o.yield_ || 0) > (best?.yield_ || 0) ? o : best),
    null,
  );
  if (topOp && topOp.codename) {
    parts.push(`Top operator is ${topOp.codename} with Υ ${(topOp.yield_ || 0).toLocaleString()}.`);
  }

  if (cl.delta_from_average.percent !== 0) {
    const dir = cl.delta_from_average.percent > 0 ? "above" : "below";
    parts.push(`You're ${Math.abs(cl.delta_from_average.percent)}% ${dir} average.`);
  }

  if (cl.delta_from_top.percent > 0) {
    parts.push(`${cl.delta_from_top.percent}% below top.`);
  }

  return parts.join(" ");
}

function _behavioralFraming(op) {
  const y = op.yield_ || 0;
  const l = op.leverage || 0;
  const v = op.velocity || 0;
  const klass = op.class || "Burner";

  if (klass === "10xer" || klass === "TRANSMITTER" || klass === "ARCH+")
    return `Disciplined, system-level reuse: ${l.toFixed(1)}× leverage means heavy cache reuse over fresh input, ${v.toFixed(2)} velocity means more output per token spent. This is the AI power-user archetype.`;
  if (klass === "Builder" || klass === "ARCH" || klass === "POWER")
    return `Building cascade momentum: moderate cache reuse (${l.toFixed(1)}× leverage) with ${v.toFixed(2)} output velocity. Approaching power-user patterns — increase cache reuse to push higher.`;
  return `Early-stage cascade: ${v.toFixed(2)} output velocity with ${l.toFixed(1)}× leverage. Tokens are being burned more than compounded. Focus on reusing prior context (templates, prompts, workflows) to build leverage.`;
}

function _powerUserAssessment(klass, metrics) {
  const l = metrics.leverage || 0;
  const v = metrics.velocity || 0;
  if (klass === "10xer" || klass === "TRANSMITTER" || klass === "ARCH+")
    return `You are an AI power user. Your SigRank class (${klass}) indicates you reuse prior work heavily (${l.toFixed(1)}× leverage), get more out of each token (${v.toFixed(2)} velocity), and keep input lean. This is consistent with AI power-user behavior: iterative, efficient, multi-use patterns.`;
  if (klass === "Builder" || klass === "ARCH" || klass === "POWER")
    return `You are becoming an AI power user. Your ${klass} class shows growing cache reuse (${l.toFixed(1)}× leverage) and ${v.toFixed(2)} output velocity. You're building the habits — increase context reuse to push higher.`;
  return `You are not yet an AI power user. Your ${klass} class means tokens are being spent without compounding. The power-user shift: reuse prior context (prompts, templates, cached results) instead of starting fresh each time. Your leverage (${l.toFixed(1)}×) is the key metric to improve.`;
}

function _classMeaning(klass) {
  if (klass === "10xer" || klass === "TRANSMITTER" || klass === "ARCH+")
    return "AI power user archetype — disciplined, system-level reuse, high output per input.";
  if (klass === "Builder" || klass === "ARCH" || klass === "POWER")
    return "Building momentum — moderate reuse, approaching power-user patterns.";
  return "Early-stage — tokens burned more than compounded. Focus on cache reuse.";
}

function _improvementSuggestion(klass, metrics) {
  const l = metrics.leverage || 0;
  const v = metrics.velocity || 0;
  if (klass === "10xer" || klass === "TRANSMITTER" || klass === "ARCH+")
    return v < 1
      ? "Your leverage is excellent but velocity is under 1.0 — you're reading more cache than producing output. Push for more output per session."
      : "You're at the top tier. Maintain your cache architecture and experiment with longer sessions to compound yield further.";
  if (klass === "Builder" || klass === "ARCH" || klass === "POWER")
    return l < 5
      ? "Increase cache reuse: reuse prompts, templates, and workflows instead of starting from scratch. Each reused token multiplies your yield."
      : "Your leverage is solid. Focus on output velocity — produce more per session to push your yield up.";
  return "Start by reusing prior context. Instead of fresh prompts each time, build on cached results. Even a 2× increase in cache_read will dramatically improve your yield because input² is in the denominator.";
}

// ── Tool dispatcher ──────────────────────────────────────────────────────────

export async function callTool(name, args) {
  // ── get_best_operator (metric-aware) ──
  if (name === "get_best_operator") {
    const rawN = args?.n;
    const n = Math.min(20, Math.max(1, rawN == null ? 5 : Number(rawN)));
    const metric = CANONICAL_METRICS.includes(args?.metric) ? args.metric : "yield";
    const platform = PLATFORMS.includes(args?.platform) ? args.platform : "all";

    // Fetch the full board (up to 2000 operators) and sort client-side.
    // The signalaf.com API only sorts by yield; for other canonical metrics
    // we fetch all operators and sort locally (same approach as sigarena).
    const board = await fetchJson("/api/v1/leaderboard?metric=yield_&limit=2000");
    const allBoardOps = boardEntries(board);
    const sortedOps = sortLeaderboardByMetric(board, metric, platform, n);
    const total = allBoardOps.length;

    const top = sortedOps.map((op) => ({
      ...op,
      behavioral_framing: _behavioralFraming(op),
      competitive: _competitiveLayer(op, board),
    }));

    const best = top[0];
    const metricLabel = METRIC_LABELS[metric] || "Yield (Υ)";
    const summary = best
      ? `${best.codename} tops the SigRank leaderboard for ${metricLabel}${platform !== "all" ? ` on ${platform}` : ""} — ${_behavioralFraming(best)}`
      : "No operators on the board yet.";

    return {
      top_operators: top,
      total_operators: total,
      metric,
      platform,
      summary,
      cta: "Check my rank",
      shareable_url: best ? `${DEFAULT_API_BASE}/operator/${encodeURIComponent(best.codename)}` : null,
    };
  }

  // ── get_prompt_of_the_day ──
  if (name === "get_prompt_of_the_day") {
    // Fetch the prompt registry from signaaf.com (static asset, served from
    // Cloudflare's ASSETS binding — zero Worker invocations).
    const url = `${DEFAULT_SATELLITE_BASE}/prompts.json`;
    const res = await robustFetch(url, {
      headers: { accept: "application/json", "user-agent": "bestuser-router-mcp/0.1.0" },
    });
    if (!res.ok) throw new Error(`signaaf.com/prompts.json → HTTP ${res.status}`);
    const registry = await res.json();

    // Pick today's prompt using the same rotation as the sigarena homepage.
    // The registry has a `prompt_of_the_day` field with today's slug, OR
    // we compute it from the date (day-of-year % active prompts).
    const prompts = (registry.prompts || []).filter((p) => p.active);
    if (prompts.length === 0) throw new Error("No active prompts in registry.");

    const todaySlug = registry.prompt_of_the_day;
    let prompt = todaySlug
      ? prompts.find((p) => p.slug === todaySlug)
      : null;
    if (!prompt) {
      // Fallback: day-of-year rotation
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000,
      );
      prompt = prompts[dayOfYear % prompts.length];
    }

    return {
      question: prompt.question,
      slug: prompt.slug,
      metric: prompt.metric,
      metric_label: prompt.metric_label,
      metric_formula: prompt.metric_formula,
      current_leader: prompt.current_leader,
      story: prompt.story,
      shareable_url: `${DEFAULT_SATELLITE_BASE}/${prompt.slug}`,
      cta: "See the full ranking",
    };
  }

  // ── compare_self ──
  if (name === "compare_self") {
    const codename = String(args?.codename || "").trim();
    const text = String(args?.text || "").trim();

    if (!codename && !text)
      throw new Error("compare_self requires either `codename` (to fetch from the board) or `text` (raw token pillars to score locally).");

    let yourMetrics;
    if (codename) {
      yourMetrics = await fetchJson(`/api/v1/operators/${encodeURIComponent(codename)}`);
    } else {
      if (text.length > MAX_INPUT) {
        return { error: "input_too_large", detail: `text exceeds ${MAX_INPUT} chars.` };
      }
      const pillars = parsePillars(text);
      const c = cascade(pillars);
      yourMetrics = {
        codename: "you (local)",
        yield_: c.yield,
        leverage: c.leverage,
        velocity: c.velocity,
        class: c.class,
        rank: null,
      };
    }

    const board = await fetchJson("/api/v1/leaderboard?metric=yield_");
    const allOps = boardEntries(board);
    const yields = allOps.map((o) => o.yield_ || 0).sort((a, b) => a - b);
    const avgYield = yields.length ? yields.reduce((s, y) => s + y, 0) / yields.length : 0;
    const yourYield = yourMetrics.yield_ || 0;
    const percentile = yields.length
      ? Math.round((yields.filter((y) => y < yourYield).length / yields.length) * 100)
      : 0;

    const klass = yourMetrics.class || "Burner";
    const powerUserAssessment = _powerUserAssessment(klass, yourMetrics);
    const classMeaning = _classMeaning(klass);

    const yieldVsAvg = yields.length
      ? yourYield > avgYield
        ? `${(yourYield / avgYield).toFixed(1)}× the board average`
        : `${((yourYield / avgYield) * 100).toFixed(0)}% of the board average`
      : "board has no other operators";

    const suggestion = _improvementSuggestion(klass, yourMetrics);
    const competitive = _competitiveLayer(yourMetrics, board);
    const competitiveSummary = _competitiveSummary(yourMetrics, board);

    return {
      your_metrics: yourMetrics,
      power_user_assessment: powerUserAssessment,
      comparison: {
        your_yield_vs_avg: yieldVsAvg,
        your_class_meaning: classMeaning,
        percentile,
        rank: competitive.rank,
        total_operators: competitive.total_operators,
        class_tier: competitive.class_tier,
        delta_from_average: competitive.delta_from_average,
        delta_from_top: competitive.delta_from_top,
      },
      competitive_summary: competitiveSummary,
      shareable_url: competitive.shareable_url,
      suggestion,
      cta: "See where I stand",
    };
  }

  // ── compare_operators ──
  if (name === "compare_operators") {
    const nameA = String(args?.codename_a || "").trim();
    const nameB = String(args?.codename_b || "").trim();
    if (!nameA || !nameB)
      throw new Error("compare_operators requires both `codename_a` and `codename_b`.");

    const [opA, opB, board] = await Promise.all([
      fetchJson(`/api/v1/operators/${encodeURIComponent(nameA)}`),
      fetchJson(`/api/v1/operators/${encodeURIComponent(nameB)}`),
      fetchJson("/api/v1/leaderboard?metric=yield_"),
    ]);

    const yieldA = opA.yield_ || 0;
    const yieldB = opB.yield_ || 0;
    const delta = yieldA - yieldB;

    const winner = yieldA > yieldB ? opA : opB;
    const loser = yieldA > yieldB ? opB : opA;
    const verdict = `${winner.codename} is more token-efficient (${winner.yield_?.toLocaleString?.() || winner.yield_} vs ${loser.yield_?.toLocaleString?.() || loser.yield_} Υ). ${_behavioralFraming(winner)} ${loser.codename} ${_classMeaning(loser.class).toLowerCase()}`;

    return {
      operator_a: {
        codename: opA.codename,
        yield_: opA.yield_,
        leverage: opA.leverage,
        velocity: opA.velocity,
        class: opA.class,
        rank: opA.rank,
        competitive: _competitiveLayer(opA, board),
      },
      operator_b: {
        codename: opB.codename,
        yield_: opB.yield_,
        leverage: opB.leverage,
        velocity: opB.velocity,
        class: opB.class,
        rank: opB.rank,
        competitive: _competitiveLayer(opB, board),
      },
      verdict,
      yield_delta: delta,
      cta: "Compare me to others",
    };
  }

  // ── describe_power_user ──
  if (name === "describe_power_user") {
    return {
      description:
        "An AI power user isn't someone who sends the most tokens — it's someone who compounds signal. " +
        "Power users build workflows where cached context does the heavy lifting, fresh input stays lean, " +
        "and output per session is high. SigRank quantifies this with the yield metric (Υ = cache_read × output / input²).",
      metrics_explained: {
        yield_: "Yield (Υ) measures how well you compound signal, not how much you burn. High yield = your cached context is doing work for you.",
        leverage: "Leverage (Cr/I) measures how much you reuse prior work vs starting fresh. High leverage = you're building on cached results, not re-explaining everything.",
        velocity: "Velocity (O/I) measures how much output you get per token spent. High velocity = you're productive, not just active.",
      },
      class_tiers: [
        { class: "10xer", meaning: "AI power user archetype — disciplined, system-level reuse, high output per input. Leverage > 10×, high velocity." },
        { class: "Builder", meaning: "Building momentum — moderate cache reuse, approaching power-user patterns. Growing leverage and velocity." },
        { class: "Burner", meaning: "Early-stage — tokens burned more than compounded. Low leverage, low velocity. The shift: reuse prior context." },
      ],
      link: "https://signalaf.com/score — check your class tier and yield",
      shareable_url: `${DEFAULT_API_BASE}/score`,
      cta: "Learn the scoring",
    };
  }

  // ── optimize_efficiency ──
  if (name === "optimize_efficiency") {
    const codename = String(args?.codename || "").trim();
    const text = String(args?.text || "").trim();

    if (!codename && !text)
      throw new Error("optimize_efficiency requires either `codename` (to fetch from the board) or `text` (raw token pillars to score locally).");

    let metrics;
    if (codename) {
      metrics = await fetchJson(`/api/v1/operators/${encodeURIComponent(codename)}`);
    } else {
      if (text.length > MAX_INPUT) {
        return { error: "input_too_large", detail: `text exceeds ${MAX_INPUT} chars.` };
      }
      const pillars = parsePillars(text);
      const c = cascade(pillars);
      metrics = {
        codename: "you (local)",
        yield_: c.yield,
        leverage: c.leverage,
        velocity: c.velocity,
        class: c.class,
      };
    }

    const klass = metrics.class || "Burner";
    const l = metrics.leverage || 0;
    const v = metrics.velocity || 0;
    const y = metrics.yield_ || 0;

    const suggestions = [];

    if (l < 5) {
      suggestions.push({
        action: "Increase cache reuse — reuse prompts, templates, and workflows instead of starting from scratch",
        why: "Your leverage is " + l.toFixed(1) + "×, meaning most of your context is fresh input. Each reused cached token multiplies your yield because input² is in the denominator.",
        power_user_practice: "Power users build template libraries and workflow patterns they invoke repeatedly, letting cached context accumulate.",
      });
    }
    if (v < 1) {
      suggestions.push({
        action: "Increase output per session — produce more, don't just read",
        why: "Your velocity is " + v.toFixed(2) + ", meaning you're consuming more input than producing output. Yield rewards output production.",
        power_user_practice: "Power users maximize output per session — they ask AI to generate, transform, and produce, not just explain.",
      });
    }
    if (l >= 5 && v >= 1 && !(klass === "10xer" || klass === "TRANSMITTER" || klass === "ARCH+")) {
      suggestions.push({
        action: "Extend session length to compound cached context further",
        why: "Your leverage (" + l.toFixed(1) + "×) and velocity (" + v.toFixed(2) + ") are solid. Longer sessions with consistent context will push your yield higher.",
        power_user_practice: "Power users maintain long, context-rich sessions where the cache grows and compounds.",
      });
    }
    if (suggestions.length === 0) {
      suggestions.push({
        action: "Maintain your cascade architecture — you're at the top tier",
        why: "Your yield (" + y.toLocaleString() + "), leverage (" + l.toFixed(1) + "×), and velocity (" + v.toFixed(2) + ") are all strong. Keep doing what you're doing.",
        power_user_practice: "Power users don't rest on their metrics — they experiment with new workflow patterns and measure the impact.",
      });
    }

    const summary = `Your Υ Yield is ${y.toLocaleString()} (${klass}). ${_improvementSuggestion(klass, metrics)}`;

    const board = await fetchJson("/api/v1/leaderboard?metric=yield_");
    const competitive = _competitiveLayer(metrics, board);
    const competitiveSummary = _competitiveSummary(metrics, board);

    return {
      your_metrics: { yield_: y, leverage: l, velocity: v, class: klass },
      competitive: {
        rank: competitive.rank,
        total_operators: competitive.total_operators,
        percentile: competitive.percentile,
        class_tier: competitive.class_tier,
        delta_from_average: competitive.delta_from_average,
        delta_from_top: competitive.delta_from_top,
      },
      competitive_summary: competitiveSummary,
      shareable_url: competitive.shareable_url,
      suggestions,
      summary,
      cta: "Improve my score",
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
