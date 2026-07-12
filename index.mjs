#!/usr/bin/env node
/**
 * BestUserRouter MCP server — the marketable intent layer for "who is the best
 * AI user?" queries.
 *
 * Routes natural-language intent to SigRank's leaderboard and returns behavioral
 * framing + competitive context. Calls signalaf.com's public API. No auth, no
 * writes.
 *
 * 5 intent tools:
 *   get_best_operator    — "who is the best AI user?"
 *   compare_self         — "how do I measure up?"
 *   compare_operators    — "compare X vs Y"
 *   describe_power_user  — "what makes a power user?"
 *   optimize_efficiency  — "how can I be more efficient?"
 *
 * Usage for AI clients: runs as an MCP stdio server in non-TTY context.
 *   npx bestuser-router-mcp
 *
 * Env overrides:
 *   SIGRANK_API_BASE — alternate API base (default: https://signalaf.com)
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, callTool } from "./tools.mjs";
import { readFileSync } from "node:fs";

function serverVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
    );
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

process.on("uncaughtException", (err) => {
  process.stderr.write(`[bestuser-router-mcp] uncaughtException: ${err?.stack || err}\n`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[bestuser-router-mcp] unhandledRejection: ${reason?.stack || reason}\n`);
  process.exit(1);
});

async function main() {
  const server = new Server(
    { name: "bestuser-router-mcp", version: serverVersion() },
    { capabilities: { tools: { listChanged: false } } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (!TOOLS.some((t) => t.name === req.params.name)) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${req.params.name}`);
    }
    try {
      const out = await callTool(req.params.name, req.params.arguments);
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[bestuser-router-mcp] v${serverVersion()} ready (5 intent tools)\n`);
}

main();
