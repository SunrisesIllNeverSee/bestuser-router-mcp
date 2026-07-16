# Directory Submission Checklist — bestuser-router-mcp

> Everything packaged and ready. This checklist tells you exactly where to send each file and what to do at each directory. All assets are in `~/Desktop/SigRank-repos/bestuser-router-mcp/`.

## Packaged assets (all built)

| File | Purpose | Where it goes |
|------|---------|---------------|
| `package.json` | npm package manifest (has `mcpName`, author, repo, homepage) | npm |
| `bestuser-router.mcpb` | MCP Bundle (zip with manifest.json + code + node_modules, 4.6MB) | Smithery + Anthropic |
| `manifest.json` | .mcpb manifest (inside the .mcpb, also kept standalone for reference) | (inside .mcpb) |
| `server.json` | Official MCP Registry server descriptor | MCP Registry (via PR or mcp-publisher) |
| `glama.json` | Glama maintainer declaration | Glama (in repo root, auto-detected) |
| `MCP_SERVER_DESCRIPTION.md` | Human-readable server description for all directories | (in repo, referenced by directories) |
| `LICENSE` | MIT license | (in repo + inside .mcpb) |
| `README.md` | GitHub README | (in repo) |

## Pre-submission: npm publish (MUST DO FIRST)

Everything else depends on the npm package being live. The MCP Registry, Smithery, and Glama all reference the npm package.

- [ ] **`npm publish`** from inside `~/Desktop/SigRank-repos/bestuser-router-mcp/`
- [ ] Verify: `npm view bestuser-router-mcp version` returns `0.1.0`
- [ ] Verify: `npx bestuser-router-mcp` starts the server (prints `[bestuser-router-mcp] v0.1.0 ready (5 intent tools)`)

```bash
cd ~/Desktop/SigRank-repos/bestuser-router-mcp
npm publish
npm view bestuser-router-mcp version
```

---

## Directory 1: npm

**Status:** NOT published yet (404 on registry)

- [ ] Run `npm publish` (above)
- [ ] Verify package page: https://www.npmjs.com/package/bestuser-router-mcp
- [ ] Verify `npx bestuser-router-mcp` works

**No submission form needed.** `npm publish` is the submission.

---

## Directory 2: Smithery

**URL:** https://smithery.ai/new
**Type:** stdio server (publish via .mcpb bundle)
**Status:** NOT submitted

Smithery is the largest MCP marketplace. For stdio servers, you publish the `.mcpb` bundle.

### Option A: CLI publish (recommended)

```bash
# Install Smithery CLI if not already
npm install -g @smithery/cli

# Authenticate
smithery auth login

# Publish the .mcpb bundle
smithery mcp publish ~/Desktop/SigRank-repos/bestuser-router-mcp/bestuser-router.mcpb -n @SunrisesIllNeverSee/bestuser-router
```

### Option B: Web form

- [ ] Go to https://smithery.ai/new
- [ ] Upload `bestuser-router.mcpb`
- [ ] Fill in: name = `bestuser-router`, description from `MCP_SERVER_DESCRIPTION.md`
- [ ] Submit

### After submission
- [ ] Verify listing: https://smithery.ai/servers/SunrisesIllNeverSee/bestuser-router
- [ ] Verify install command works: `npx -y smithery mcp add SunrisesIllNeverSee/bestuser-router`

---

## Directory 3: Glama

**URL:** https://glama.ai/mcp/servers/submit
**Type:** stdio server (auto-detects from GitHub repo + npm)
**Status:** NOT submitted

Glama auto-detects servers from GitHub repos that have a `glama.json` in the root. The `glama.json` is already in the repo.

### Submission

- [ ] Go to https://glama.ai/mcp/servers/submit
- [ ] Enter GitHub repo URL: `https://github.com/SunrisesIllNeverSee/bestuser-router-mcp`
- [ ] Glama will auto-detect `glama.json` and `MCP_SERVER_DESCRIPTION.md`
- [ ] Confirm the listing

### After submission
- [ ] Verify listing: https://glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp
- [ ] Verify the 5 tools are listed with descriptions

---

## Directory 4: Official MCP Registry (registry.modelcontextprotocol.io)

**URL:** https://registry.modelcontextprotocol.io
**Type:** npm package (metadata only, registry points to npm)
**Status:** NOT submitted

The official MCP Registry is maintained by Anthropic. It only hosts metadata — the actual package lives on npm. Submission is via `mcp-publisher` CLI or a GitHub PR.

### Prerequisites (already done)
- [x] `mcpName` field added to `package.json`: `"io.github.SunrisesIllNeverSee/bestuser-router"`
- [x] `server.json` created with `registryType: "npm"`
- [x] npm package published (MUST do this first — see above)

### Option A: mcp-publisher CLI (recommended)

```bash
# Install mcp-publisher
brew install mcp-publisher
# or: npm install -g mcp-publisher

# Authenticate with GitHub
mcp-publisher auth login

# Publish
mcp-publisher publish --server-json ~/Desktop/SigRank-repos/bestuser-router-mcp/server.json
```

### Option B: GitHub PR (manual)

- [ ] Go to https://github.com/modelcontextprotocol/registry
- [ ] Navigate to `servers/` directory
- [ ] Create new file: `io/github/SunrisesIllNeverSee/bestuser-router.json` (copy contents from `server.json`)
- [ ] Open a PR
- [ ] Wait for review

### After submission
- [ ] Verify: https://registry.modelcontextprotocol.io/servers/io.github.SunrisesIllNeverSee/bestuser-router

---

## Directory 5: Anthropic Connectors Directory

**URL:** https://claude.com/docs/connectors/building/submission
**Type:** Desktop extension (.mcpb)
**Status:** NOT submitted

> **Important:** Anthropic now recommends **remote MCP servers** (Streamable HTTP + OAuth) for directory listing. Local stdio servers packaged as .mcpb are the **secondary** distribution path. BestUserRouter is a stdio server, so it goes the .mcpb route.

The `bestuser-router.mcpb` bundle is built and ready. It includes `manifest.json` with all 5 tools annotated with titles.

### Submission

- [ ] Go to https://claude.com/docs/connectors/building/submission
- [ ] Fill in the submission form:
  - **Server basics:** name = `bestuser-router`, tagline = `The marketable intent layer for "who is the best AI user?" queries`
  - **Connection details:** connector type = Desktop extension, transport = stdio
  - **Tools & resources:** list all 5 tools with titles (from `manifest.json`)
  - **Documentation:** link to `MCP_SERVER_DESCRIPTION.md` on GitHub: `https://github.com/SunrisesIllNeverSee/bestuser-router-mcp/blob/main/MCP_SERVER_DESCRIPTION.md`
  - **Privacy & compliance:** all tools read-only, no auth, no user data collected. Privacy policy: `https://signalaf.com/privacy`
  - **Test account:** N/A (no auth required)
  - **Branding:** logo from signalaf.com
- [ ] Upload `bestuser-router.mcpb`
- [ ] Submit for review

### After submission
- [ ] Wait for Anthropic review (timeline varies)
- [ ] Verify listing appears in Claude Desktop connector catalog

---

## Directory 6: MCPFind (optional, bonus)

**URL:** https://mcpfind.org/submit
**Type:** Index/directory
**Status:** NOT submitted

MCPFind indexes 6,700+ MCP servers across 21 categories. Easy submission.

- [ ] Go to https://mcpfind.org/submit
- [ ] Enter GitHub repo URL: `https://github.com/SunrisesIllNeverSee/bestuser-router-mcp`
- [ ] Select category: Developer Tools / AI Productivity
- [ ] Submit

---

## Summary checklist (print this)

```
PREREQUISITE (blocks everything else):
[ ] npm publish                    → cd ~/Desktop/SigRank-repos/bestuser-router-mcp && npm publish

DIRECTORIES (in order of impact):
[ ] Smithery                       → smithery mcp publish bestuser-router.mcpb -n @SunrisesIllNeverSee/bestuser-router
[ ] Glama                          → https://glama.ai/mcp/servers/submit (enter GitHub URL)
[ ] MCP Registry (official)        → mcp-publisher publish --server-json server.json
[ ] Anthropic Connectors Directory → https://claude.com/docs/connectors/building/submission (upload .mcpb)
[ ] MCPFind (bonus)                → https://mcpfind.org/submit (enter GitHub URL)

VERIFICATION (after each):
[ ] npm:       https://www.npmjs.com/package/bestuser-router-mcp
[ ] Smithery:  https://smithery.ai/servers/SunrisesIllNeverSee/bestuser-router
[ ] Glama:     https://glama.ai/mcp/servers/SunrisesIllNeverSee/bestuser-router-mcp
[ ] Registry:  https://registry.modelcontextprotocol.io/servers/io.github.SunrisesIllNeverSee/bestuser-router
[ ] Anthropic: check Claude Desktop connector catalog
[ ] MCPFind:   https://mcpfind.org (search "bestuser-router")
```

## Reference: what sigrank-mcp did

sigrank-mcp is already live on Smithery + Glama and submitted to Anthropic. Same pattern:
- Smithery: `smithery.ai/servers/burnmydays/sigrank-mcp` (LIVE)
- Glama: `glama.ai/mcp/servers/SunrisesIllNeverSee/sigrank-mcp` (LIVE)
- Anthropic: submitted by owner (confirmed)
- MCP Registry: not yet submitted (sigrank-mcp predates the registry)

BestUserRouter follows the same path, just with the .mcpb + server.json + glama.json already packaged.
