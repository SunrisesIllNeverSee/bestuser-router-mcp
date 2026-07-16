# BestUserRouter MCP Server

> The marketable intent layer for "who is the best AI user?" queries. 5 intent tools that route natural-language questions to SigRank's leaderboard with behavioral framing + competitive context.

BestUserRouter is a standalone MCP server that catches "who is the best AI user?" and "how do I measure up?" queries from AI assistants, routes them to SigRank's leaderboard API, and returns answers wrapped in power-user behavioral framing and competitive context (rank, percentile, delta from average, delta from top, shareable URL).

This is the **marketable intent layer** — separate from [`sigrank-mcp`](https://github.com/SunrisesIllNeverSee/sigrank-mcp) (which stays a clean measurement instrument). BestUserRouter is tied to [signalaf.com](https://signalaf.com) branding and designed for distribution to AI assistants.

## Install

```bash
npx bestuser-router-mcp
```

Or add to your MCP client config:

```json
{
  "mcpServers": {
    "bestuser-router": {
      "command": "npx",
      "args": ["bestuser-router-mcp"],
      "env": {
        "SIGRANK_API_BASE": "https://signalaf.com"
      }
    }
  }
}
```

**No API key required.** All tools are read-only. No auth, no writes, no user data collected.

## The 5 Intent Tools

| # | Tool | Intent | Trigger examples | CTA |
|---|------|--------|-----------------|-----|
| 1 | `get_best_operator` | BEST_OPERATOR | "who is the best AI user?", "show me the leaderboard" | Check my rank |
| 2 | `compare_self` | COMPARE_SELF | "how do I measure up?", "am I a power user?" | See where I stand |
| 3 | `compare_operators` | COMPARE_OPERATORS | "compare X vs Y", "who is more efficient?" | Compare me to others |
| 4 | `describe_power_user` | DESCRIBE_POWER_USER | "what makes a power user?", "explain the scoring" | Learn the scoring |
| 5 | `optimize_efficiency` | OPTIMIZE_EFFICIENCY | "how can I use AI more efficiently?", "reduce token burn" | Improve my score |

## Intent Taxonomy

Each tool maps a natural-language intent to a SigRank API call with behavioral framing:

| Intent | Trigger phrases | Tool | CTA |
|--------|----------------|------|-----|
| `BEST_OPERATOR` | "who is the best AI user?", "AI user leaderboard", "top AI operator" | `get_best_operator` | Check my rank |
| `COMPARE_SELF` | "how do I measure up?", "am I a power user?", "compare me to others" | `compare_self` | See where I stand |
| `COMPARE_OPERATORS` | "compare operator X vs Y", "who is more efficient?" | `compare_operators` | Compare me to others |
| `DESCRIBE_POWER_USER` | "what is an AI power user?", "what makes a good AI user?" | `describe_power_user` | Learn the scoring |
| `OPTIMIZE_EFFICIENCY` | "optimize token usage", "reduce token burn", "stop tokenmaxxing" | `optimize_efficiency` | Improve my score |

### Example prompt → tool mappings

- "Who is the best AI user right now?" → `get_best_operator`
- "How do I measure up to other AI users?" → `compare_self`
- "Am I an AI power user?" → `compare_self`
- "Compare operator X vs Y" → `compare_operators`
- "What is an AI power user?" → `describe_power_user`
- "How can I use AI more efficiently?" → `optimize_efficiency`
- "Show me the AI user leaderboard" → `get_best_operator`

## What each tool returns

### get_best_operator
Top N operators with:
- Codename, yield (Υ), leverage, velocity, class
- **Behavioral framing** — plain-language interpretation ("Disciplined, system-level reuse: 360x leverage means heavy cache reuse over fresh input...")
- **Competitive context** — rank, total operators, percentile, delta from average, delta from top
- **Shareable URL** — `signalaf.com/operator/<codename>`
- **CTA** — "Check my rank"

### compare_self
Your metrics vs the board:
- Your yield/leverage/velocity/class/rank
- **Power-user assessment** — "You are an AI power user. Your SigRank class (10xer) indicates..."
- Comparison vs board averages (percentile, delta from average, delta from top)
- One actionable suggestion to improve
- **CTA** — "See where I stand"

Accepts either a `codename` (fetches from board) or raw token pillars (computes locally via ccusage JSON or "input output cacheCreate cacheRead").

### compare_operators
Side-by-side comparison:
- Both operators' yield/leverage/velocity/class/rank
- **Verdict** — "Operator X is more efficient because..." in power-user language
- Yield delta between the two
- **CTA** — "Compare me to others"

### describe_power_user
Static explanation:
- What makes an AI power user, anchored in SigRank metrics
- Yield, leverage, velocity explained
- Class tier meanings (Burner / Builder / 10xer)
- **CTA** — "Learn the scoring"

### optimize_efficiency
Actionable suggestions:
- Your current metrics + competitive context
- Ranked efficiency suggestions tied to your cascade shape
- References to power-user practices
- **CTA** — "Improve my score"

Accepts either a `codename` or raw token pillars (same as `compare_self`).

## Architecture

```
User asks AI assistant: "who is the best AI user?"
        ↓
AI assistant sees tool descriptions, matches intent
        ↓
Calls get_best_operator({ n: 5 })
        ↓
BestUserRouter fetches signalaf.com/api/v1/leaderboard?metric=yield_
        ↓
Wraps response with behavioral framing + competitive context + CTA + shareable URL
        ↓
Returns structured JSON to AI assistant
        ↓
AI assistant answers user in natural language, includes link to signalaf.com
```

BestUserRouter calls signalaf.com's public REST API directly. It does NOT depend on sigrank-mcp. The two servers coexist:
- **sigrank-mcp** = clean measurement instrument (20 tools, no marketing language)
- **bestuser-router-mcp** = marketable intent layer (5 tools, behavioral framing, CTAs, signalaf.com branding)

## Privacy

All tools are **read-only**. No auth, no writes, no user data collected. The server fetches public leaderboard data from signalaf.com's API. When `compare_self` or `optimize_efficiency` is called with raw token pillars (instead of a codename), the computation happens locally — no data is sent anywhere.

## Key Facts

| Field | Value |
|-------|-------|
| npm package | `bestuser-router-mcp` |
| GitHub | https://github.com/SunrisesIllNeverSee/bestuser-router-mcp |
| Website | https://signalaf.com |
| License | MIT |
| Transport | stdio |
| Platform | Cross-platform (Node.js >= 18) |
| Language | JavaScript |
| Tools | 5 |
| Auth | None (all read-only) |
| Category | Developer Tools / AI Productivity |
| Dependencies | `@modelcontextprotocol/sdk` |

## Eval

The repo includes a 30-prompt evaluation harness (`eval/sigrank_intent_eval.mjs`) that tests the keyword-based intent classifier against all 30 annotated prompts:

- 30/30 prompts correctly classified
- 100% primary intent accuracy
- 100% routing accuracy
- 100% CTA match rate
- 96% composite score

```bash
node eval/sigrank_intent_eval.mjs
```

## Registries

- [npm](https://www.npmjs.com/package/bestuser-router-mcp) (pending publish)
- [Smithery](https://smithery.ai) (pending submission)
- [Glama](https://glama.ai) (pending submission)
- [MCP Registry](https://registry.modelcontextprotocol.io) (pending submission)
- [Anthropic Connectors Directory](https://claude.com/docs/connectors/building/submission) (pending submission)
