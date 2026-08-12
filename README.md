# BestUserRouter MCP

> The marketable intent layer for "who is the best AI user?" queries.
> Routes natural-language intent to SigRank's leaderboard with behavioral framing + competitive context.

## The SigRank ecosystem

| Repo | What it is | Install |
|------|-----------|---------|
| **[sigrank-app](https://github.com/SunrisesIllNeverSee/sigrank-app)** | The leaderboard — signalaf.com. Privacy-preserving operator profiles, class tiers, board rankings. | [signalaf.com](https://signalaf.com) |
| **[sigrank-mcp](https://github.com/SunrisesIllNeverSee/sigrank-mcp)** | The instrument — extracts 4 token pillars, computes the cascade, submits to the leaderboard. MCP server + TUI dashboard. | `npx sigrank` |
| **[bestuser-router-mcp](https://github.com/SunrisesIllNeverSee/bestuser-router-mcp)** (this repo) | The intent layer — routes "who is the best AI user?" queries to SigRank's leaderboard. MCP server for AI assistants. | `npx bestuser-router-mcp` |
| **[signaf](https://github.com/SunrisesIllNeverSee/signa)** | The coach — reads your session logs, builds a taste profile, measures ASI, coaches you on token efficiency. | `npx @burnmydays/signaf` |
| **[sigrank-vscode](https://github.com/SunrisesIllNeverSee/sigrank-vscode)** | The IDE extension — see your cascade metrics inline in VS Code. | `code --install-extension sigrank.sigrank` |
| **[fundscore](https://github.com/SunrisesIllNeverSee/fundscore)** | The repo scorer — investor-readiness scoring for GitHub repos. CLI + MCP server. | `npx fundscore` |

### Also in the MO§ES™ suite

| Site | What it is |
| ---- | ---------- |
| **[SIGNOMY](https://signomy.xyz)** | Governed AI agent marketplace where ranked agents form teams, fill slots, run missions, and earn revenue under constitutional protocol. Agents are free. Operators pay. |
| **[MO§ES](https://mos2es.com)** | The governance framework that underpins SigRank, SIGNOMY, and all governed agent operations. Structural accountability for agentic systems. |

## What this is

A standalone MCP (Model Context Protocol) server that exposes 5 intent-based tools. When an AI assistant hears "who is the best AI user?" or "how do I measure up?", these tools route that intent to SigRank's leaderboard API and return the answer with power-user behavioral framing and competitive context (rank, percentile, delta from average, delta from top).

This is the **marketable intent layer** — separate from `sigrank-mcp` (which stays a clean measurement instrument). `bestuser-router-mcp` is tied to signalaf.com branding and designed for distribution to AI assistants.

## Tools

| Tool | Intent | Trigger examples | CTA |
|------|--------|-----------------|-----|
| `get_best_operator` | BEST_OPERATOR | "who is the best AI user?", "show me the leaderboard" | Check my rank |
| `compare_self` | COMPARE_SELF | "how do I measure up?", "am I a power user?" | See where I stand |
| `compare_operators` | COMPARE_OPERATORS | "compare X vs Y", "who is more efficient?" | Compare me to others |
| `describe_power_user` | DESCRIBE_POWER_USER | "what makes a power user?", "explain the scoring" | Learn the scoring |
| `optimize_efficiency` | OPTIMIZE_EFFICIENCY | "how can I use AI more efficiently?", "reduce token burn" | Improve my score |

## Install

```bash
npm install -g bestuser-router-mcp
# or
npx bestuser-router-mcp
```

## Configure in your AI client

### Claude Desktop / Cursor / Windsurf

Add to your MCP config:

```json
{
  "mcpServers": {
    "bestuser-router": {
      "command": "npx",
      "args": ["bestuser-router-mcp"]
    }
  }
}
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIGRANK_API_BASE` | `https://signalaf.com` | Alternate API base for testing |

## Architecture

```
bestuser-router-mcp/
├── index.mjs       — MCP server entry point (stdio transport)
├── tools.mjs       — 5 intent tool definitions + dispatcher + helpers
├── cascade.mjs     — Pure yield cascade math (vendored from sigrank-mcp)
├── eval/
│   └── sigrank_intent_schema.yaml — Intent taxonomy + CTA hierarchy
└── __tests__/
    ├── tools.test.mjs                    — Tool dispatch tests
    └── contract/
        └── class-tier-contract.test.mjs  — Cross-repo parity guard (vs sigrank-mcp + sigrank-app)
```

**No auth. No writes. No database.** All tools read from signalaf.com's public API.

## Relationship to sigrank-mcp

| | sigrank-mcp | bestuser-router-mcp |
|---|---|---|
| Purpose | Clean measurement instrument (20 tools) | Marketable intent layer (5 tools) |
| Audience | Developers measuring token usage | AI assistants routing "who is the best?" queries |
| Branding | Neutral | Tied to signalaf.com |
| Tools | Full cascade math + submit + enroll + watch | 5 intent tools only (read-only) |

The 5 intent tools were originally shipped in sigrank-mcp 0.0.177. This repo extracts them into a standalone, marketable package per the owner decision on 2026-07-12.

## License

MIT
