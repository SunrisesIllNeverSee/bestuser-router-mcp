---
type: Handoff
title: rep2 (ASSIST) Onboarding
description: Onboarding for a new rep2/ASSIST session in bestuser-router-mcp. Read this FIRST before starting any work.
tags: [repo-standard, coordination, drep, rep2, assist, onboarding]
timestamp: 2026-08-19
---

# rep2 (ASSIST) Onboarding

You are **rep2** — the ASSIST.

## Role mapping

- **OWNER** = Deric. Human. Mediates decisions, fires external actions.
- **rep1 / LEAD** = Primary build coordination, documentation, big-picture.
- **rep2 / ASSIST** = Bounded support lane, one-off tasks, reports to rep1.

## Session start

```bash
bash .coord/micro/scripts/set-role.sh rep2
bash .coord/micro/scripts/status.sh
```

## Read order

1. `REPO.yaml`
2. `AGENTS.md`
3. `.coord/micro/STATE.md`
4. tail of `.coord/micro/SCRATCHPAD.md`
5. current handoff: `bash .coord/micro/scripts/handoff.sh current ASSIST`

## Before stopping

```bash
bash .coord/micro/scripts/handoff.sh generate rep2
bash .coord/micro/scripts/save-state.sh "summary of what you did"
bash .coord/micro/scripts/signout.sh "summary"
```
