# BestUserRouter MCP

> **The marketable intent layer for "who is the best AI user?" queries.**
> Routes natural-language intent to [SigRank's leaderboard](https://signalaf.com) with behavioral framing + competitive context. Read-only. No auth. No writes.

<div align="center">

**7 intent tools that make any AI assistant answer "who is the best AI user?" with live data.**

Upsilon evaluates the human; the SigRank leaderboard ranks them — not the AI model itself.

[![npm version](https://img.shields.io/npm/v/bestuser-router-mcp.svg?style=flat-square&color=gold)](https://www.npmjs.com/package/bestuser-router-mcp)
[![license](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-node-grey.svg?style=flat-square)](https://nodejs.org)
[![live](https://img.shields.io/badge/board-signalaf.com-gold.svg?style=flat-square)](https://signalaf.com)
[![SunrisesIllNeverSee/bestuser-router-mcp MCP server](https://glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp/badges/score.svg)](https://glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp)

</div>

<p align="center">
  <a href="https://www.npmjs.com/package/bestuser-router-mcp"><img src="https://img.shields.io/badge/$%20npx%20bestuser--router--mcp-gold?style=for-the-badge&logo=npm&logoColor=white&labelColor=1a1a1a&color=daa520" alt="npx bestuser-router-mcp" /></a>
</p>

## Table of Contents

- [The SigRank ecosystem](#the-sigrank-ecosystem)
- [Quickstart](#quickstart)
- [Tools](#tools)
- [Install](#install)
- [Configure in your AI client](#configure-in-your-ai-client)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [Privacy](#privacy)
- [Relationship to sigrank-mcp](#relationship-to-sigrank-mcp)
- [Dev / test](#dev--test)
- [License](#license)

---

## The SigRank ecosystem

| Repo | What it is | Install |
|------|-----------|---------|
| **[sigrank-app](https://github.com/SunrisesIllNeverSee/sigrank-app)** | The leaderboard — signalaf.com. Privacy-preserving operator profiles, class tiers, board rankings. | [signalaf.com](https://signalaf.com) |
| **[sigrank-mcp](https://github.com/SunrisesIllNeverSee/sigrank-mcp)** | The instrument — extracts 4 token pillars, computes the cascade, submits to the leaderboard. MCP server + TUI dashboard. 25 tools. | `npx sigrank` |
| **[bestuser-router-mcp](https://github.com/SunrisesIllNeverSee/bestuser-router-mcp)** (this repo) | The intent layer — routes "who is the best AI user?" queries to SigRank's leaderboard. MCP server for AI assistants. 7 tools. | `npx bestuser-router-mcp` |
| **[sigarena](https://github.com/SunrisesIllNeverSee/sigarena)** | The satellite — public LLM operator evals at sigeconomy.com. Read-only leaderboard, SEO/AEO surface. | [sigeconomy.com](https://sigeconomy.com) |
| **[signaf](https://github.com/SunrisesIllNeverSee/signa)** | The coach — reads your session logs, builds a taste profile, measures ASI, coaches you on token efficiency. | `npx @burnmydays/signaf` |
| **[sigrank-vscode](https://github.com/SunrisesIllNeverSee/sigrank-vscode)** | The IDE extension — see your cascade metrics inline in VS Code. | `code --install-extension sigrank.sigrank` |
| **[fundscore](https://github.com/SunrisesIllNeverSee/fundscore)** | The repo scorer — investor-readiness scoring for GitHub repos. CLI + MCP server. | `npx fundscore` |

### Also in the MOSES suite

| Site | What it is |
| ---- | ---------- |
| **[SIGNOMY](https://signomy.xyz)** | Governed AI agent marketplace where ranked agents form teams, fill slots, run missions, and earn revenue under constitutional protocol. Agents are free. Operators pay. |
| **[MOSES](https://mos2es.com)** | The governance framework that underpins SigRank, SIGNOMY, and all governed agent operations. Structural accountability for agentic systems. |

---

## Quickstart

```bash
# One command — no install, no config, no auth
npx bestuser-router-mcp
```

That's it. The server starts as a stdio MCP server. Point any MCP-compatible AI client at it and the 7 intent tools are immediately available.

Or install globally:

```bash
npm install -g bestuser-router-mcp
bestuser-router-mcp
```

**Repo:** [`SunrisesIllNeverSee/bestuser-router-mcp`](https://github.com/SunrisesIllNeverSee/bestuser-router-mcp)
**npm:** [bestuser-router-mcp](https://www.npmjs.com/package/bestuser-router-mcp)
**Glama:** [glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp](https://glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp)
**Live board:** [signalaf.com](https://signalaf.com)

---

## Tools

7 intent-based tools. All read-only. No auth. No writes. No database.

| Tool | Intent | Trigger examples | What it returns |
|------|--------|-----------------|-----------------|
| `get_best_operator` | BEST_OPERATOR | "who is the best AI user?", "show me the leaderboard" | Top N operators with behavioral framing — yield, leverage, velocity in power-user language |
| `compare_self` | COMPARE_SELF | "how do I measure up?", "am I a power user?" | Your metrics vs board averages + power-user assessment + percentile + one actionable suggestion |
| `compare_operators` | COMPARE_OPERATORS | "compare X vs Y", "who is more efficient?" | Two operators side-by-side with yield, leverage, velocity, class, rank + behavioral verdict |
| `describe_power_user` | DESCRIBE_POWER_USER | "what makes a power user?", "explain the scoring" | Yield metric, leverage, velocity, class tiers explained as power-user behavior patterns |
| `optimize_efficiency` | OPTIMIZE_EFFICIENCY | "how can I use AI more efficiently?", "reduce token burn" | Your current metrics + ranked efficiency suggestions tied to cascade shape |
| `get_prompt_of_the_day` | PROMPT_OF_THE_DAY | "what's today's prompt?", "show me the prompt of the day" | Today's featured prompt from the SigRank registry — question, metric, current leader, shareable URL |
| `discover_peers` | DISCOVER_PEERS | "who should I learn from?", "find me a mentor" | Mentors (1-2 class tiers above), peers (same tier), complementary operators (strength = your weakness) |

### Tool arguments

| Tool | Args | Notes |
|------|------|-------|
| `get_best_operator` | `{n?, metric?}` | n: top N (default 5, max 20). metric: yield, velocity, leverage, snr, dev10x, scale_v, efficiency, cost_per_million, op_ratio |
| `compare_self` | `{codename?}` or `{text?}` | codename: fetch from board. text: 4 whitespace-delimited token counts (input output cacheCreate cacheRead) |
| `compare_operators` | `{codename_a, codename_b}` | Both required. Case-insensitive. |
| `describe_power_user` | `{}` | No parameters. Returns explanatory description. |
| `optimize_efficiency` | `{codename?}` or `{text?}` | Same as compare_self — either codename or raw pillars |
| `get_prompt_of_the_day` | `{}` | No parameters. Rotates daily across 9 canonical metrics. |
| `discover_peers` | `{codename, platform?, n?}` | codename required. platform: filter by platform. n: per category (default 5, max 20). |

---

## Install

```bash
npm install -g bestuser-router-mcp
# or
npx bestuser-router-mcp
```

### Install from GitHub

```bash
git clone https://github.com/SunrisesIllNeverSee/bestuser-router-mcp.git
cd bestuser-router-mcp
npm install
node index.mjs
```

---

## Configure in your AI client

### Claude Desktop / Cursor / Windsurf

Add to your MCP config (`.mcp.json` or equivalent):

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

Or if installed globally:

```json
{
  "mcpServers": {
    "bestuser-router": {
      "command": "bestuser-router-mcp"
    }
  }
}
```

### Glama

1. Go to [glama.ai/mcp/servers/@SunrisesIllNeverSee/bestuser-router-mcp](https://glama.ai/mcp/servers/@SunrisesIllNeverSee/bestuser-router-mcp)
2. Click **Install Server**
3. In chat, type `@bestuser-router-mcp` followed by your question, e.g. `@bestuser-router-mcp who is the best AI user?`

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIGRANK_API_BASE` | `https://signalaf.com` | Leaderboard API base (signalaf.com) |
| `SIGRANK_SATELLITE_BASE` | `https://sigeconomy.com` | Satellite site for prompt registry + shareable URLs |

---

## Architecture

```
bestuser-router-mcp/
├── index.mjs       — MCP server entry point (stdio transport, server instructions)
├── tools.mjs       — 7 intent tool definitions + dispatcher + helpers
├── cascade.mjs     — Pure yield cascade math (sourced from @sigrank/cascade)
├── peer-matching.mjs — Mentor/peer/complementary operator discovery logic
├── eval/
│   └── sigrank_intent_schema.yaml — Intent taxonomy + CTA hierarchy
└── __tests__/
    ├── tools.test.mjs                    — Tool dispatch tests
    └── contract/
        └── class-tier-contract.test.mjs  — Cross-repo parity guard (vs sigrank-mcp + sigrank-app)
```

**No auth. No writes. No database.** All tools read from signalaf.com's public API.

---

## Privacy

This server makes only read-only HTTP GET requests to `signalaf.com` and `sigeconomy.com`. It:

- Sends no user data, tokens, or prompts to any server
- Writes nothing to disk
- Requires no authentication or API keys
- Makes no POST/PUT/DELETE requests
- Stores no cookies or session state

The only data that leaves the server is the tool name and arguments you pass to it. All responses come from SigRank's public leaderboard API.

---

## Relationship to sigrank-mcp

| | sigrank-mcp | bestuser-router-mcp |
|---|---|---|
| Purpose | Clean measurement instrument (25 tools) | Marketable intent layer (7 tools) |
| Audience | Developers measuring token usage | AI assistants routing "who is the best?" queries |
| Branding | Neutral | Tied to signalaf.com |
| Tools | Full cascade math + submit + enroll + watch | 7 intent tools only (read-only) |
| Writes | Yes (submit to leaderboard) | No (read-only) |
| Auth | Yes (enroll + connect code) | No (public API only) |
| Transport | stdio (MCP) + TUI | stdio (MCP) only |

The 5 original intent tools were shipped in sigrank-mcp 0.0.177. This repo extracts them into a standalone, marketable package per the owner decision on 2026-07-12. Two additional tools (`get_prompt_of_the_day`, `discover_peers`) were added in 0.2.0.

---

## Dev / test

```bash
npm install
npm test                    # 14 tests
node index.mjs              # start server (pipe JSON-RPC to stdin)
```

**Bun (faster):**

```bash
bun install
bun test                    # same tests, ~10-30x faster
```

---

## License

MIT
