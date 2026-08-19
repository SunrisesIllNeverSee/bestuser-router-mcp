---
type: Handoff
title: rep1 (LEAD) Onboarding
description: Onboarding for a new rep1/LEAD session in bestuser-router-mcp. Read this FIRST before starting any work.
tags: [repo-standard, coordination, drep, rep1, lead, onboarding]
timestamp: 2026-08-19
---

# rep1 (LEAD) Onboarding

You are **rep1** — the LEAD.

## Role mapping

- **OWNER** = Deric. Human. Mediates decisions, fires external actions.
- **rep1 / LEAD** = Primary build coordination, documentation, big-picture.
- **rep2 / ASSIST** = Bounded support lane, one-off tasks, reports to rep1.

## Session start

```bash
bash .coord/micro/scripts/set-role.sh rep1
bash .coord/micro/scripts/status.sh
```

## Read order

1. `REPO.yaml`
2. `AGENTS.md`
3. `.coord/micro/STATE.md`
4. tail of `.coord/micro/SCRATCHPAD.md`
5. current handoff: `bash .coord/micro/scripts/handoff.sh current LEAD`

## Before stopping

```bash
bash .coord/micro/scripts/handoff.sh generate rep1
bash .coord/micro/scripts/save-state.sh "summary of what you did"
bash .coord/micro/scripts/signout.sh "summary"
```
