---
type: Coordination
title: Micro Coordination Bus
description: Append-only working coordination bus for agents operating inside this repository.
tags: [repo-standard, coordination, scratchpad]
timestamp: 2026-08-18
---


# Micro Coordination Bus

## Protocol

- Read the tail before beginning material work.
- Append assignments, blockers, decisions, and completion reports.
- Do not use this as durable product documentation; promote durable knowledge into the appropriate repo document.

## Log

### 2026-08-26 — Devin (GLM-5.2 High)

- Assignment: rewire bestuser-router-mcp to import cascade math from @sigrank/cascade npm package.
- Scope: replace vendored cascade math in cascade.mjs with re-exports from @sigrank/cascade@0.1.1. Update tools.mjs call sites from object-form to positional-form. Keep local display helpers (CLASS_TIERS, tierOf, parsePillars, etc.) that aren't in the npm package.
- Decision: re-export pattern in cascade.mjs rather than updating all import paths — minimizes diff while sourcing canonical math from npm.
- Commit: eaaa448
- Tests: 14/14 pass, MO§ES Υ 18436.98 verified.
- Status: complete.

