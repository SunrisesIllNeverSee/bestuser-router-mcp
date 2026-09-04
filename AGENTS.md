# Repository Operating Instructions

## Startup order

Before creating, moving, renaming, or deleting files:

1. Read `REPO.yaml`.
2. Read this file.
3. If coordination is enabled, read `.coord/micro/STATE.md` and the tail of `.coord/micro/SCRATCHPAD.md`.
4. If the work spans repositories, read `.coord/macro/LINK.yaml` and `.coord/macro/MACRO_STATE.md`.
5. Run `python3 .repo/scripts/repo_check.py` before making structural changes to understand existing drift.

## Root policy

Do not create a new root directory unless it is allowed by the selected `.repo/profiles/<type>.json` profile or explicitly added to `REPO.yaml`.

Do not place reports, design docs, PDFs, generated outputs, screenshots, exports, or temporary notes in root.

## Canonical-document policy

Do not create `_final`, `_new`, `_updated`, `_revised`, `_copy`, numbered-copy, or similar versions of active documents. Update the canonical file or archive the superseded file with provenance.

## Generated-output policy

Generated reports/results belong in the profile's artifact/result root, not alongside source.

## Archive policy

Archive is provenance-preserving. Do not silently edit archived material. If an archived record must change, document why in the active coordination bus/handoff.

## Micro coordination

Micro coordination lives under `.coord/micro/`.

- Before work: set a role and read state + scratchpad tail.
- During work: use the scratchpad for material task assignment, blockers, decisions, and handoff notes.
- Before stopping: save state and sign out.

Do not create alternate scratchpads or parallel hidden coordination buses.

## Macro coordination

Macro coordination lives under `.coord/macro/` and is used only when a build spans repositories/systems. It may point to a shared build hub. Do not use macro coordination as a permanent organization inventory.

## Git behavior

- Prefer small, intentional commits.
- Do not force-push the protected default branch.
- Do not bypass repository validation just to merge.
- Structural moves should be isolated where practical so link/import breakage is reviewable.

## Validation

Before handoff or PR:

```bash
python3 .repo/scripts/repo_check.py --ci
```

## Upsilon Architecture Context (2026-08-28)

**Architecture:** `MO§ES → Upsilon → SigRank | SignalAF`

- **Upsilon** = measurement engine / enterprise product (the engine that measures)
- **SigRank** = public leaderboard / benchmark / proof surface (live at signalaf.com)
- **SignalAF** = public distribution / platform brand
- **Yield (Υ)** = metric inside Upsilon: `(cache_read × output) / input²`
- **MO§ES™** = governance framework / methodology

**Owner clarification (2026-08-28):** The primary change is the Upsilon pilot.
agent-universe and sigrank-app changes are minimal — just pointing toward the
pilot and establishing architecture context. All repos get this context so they
understand where it came from and don't try rewriting everything every time.

**Do NOT:**
- Rename package/repo/CLI names (sigrank-app, sigrank-mcp, npx sigrank) — these are technical identifiers
- Rename "SigRank" where it means the public leaderboard/benchmark
- Conflate "Upsilon" (product) with "Yield" (metric) — they are different things
- Mass-rewrite historical/archive content to conform to new branding
- Change patent claims without legal review

**Preserved:**
- `npx sigrank` CLI command
- `sigrank` npm package name
- `sigrank-app`, `sigrank-mcp` repo names
- All URLs (signalaf.com, sigeconomy.com, mos2es.org, signomy.xyz)
- "SigRank leaderboard/board/ranks" references
- Historical and archive content

**Canon source:** Search Authority (commit 790d403). Load canon context before
modifying product definitions, metrics, or terminology:
```bash
export SEARCH_AUTHORITY_PATH="${SEARCH_AUTHORITY_PATH:-$HOME/Developer/_control/search-authority}"
python3 "$SEARCH_AUTHORITY_PATH/canon_cli.py" context sigrank
python3 "$SEARCH_AUTHORITY_PATH/canon_cli.py" context upsilon
```

## stickypads — check the shared board

Before starting work, check the shared operational board for tasks assigned
to you or this repo:

```bash
python3 ~/Developer/_control/stickypads/scripts/check_in.py --agent <your-name>
```

Or clone the ello-ops repo and run from there. The board has:
- TODOs across all repos
- Memos/notes from other agents and the owner
- Current session state

If you discover work that can't be completed immediately, create a task or
drop a note:

```bash
# Create a formal task
python3 ~/Developer/_control/stickypads/scripts/create_task.py \
    --title "Specific actionable title" \
    --project <this-repo-name> \
    --owner <your-name>

# Drop a quick memo (no format required)
python3 ~/Developer/_control/stickypads/scripts/drop.py \
    --from <this-repo-name> \
    "Quick note about what needs attention"
```

At session end or meaningful completion, reconcile this repo's coord kit
state into stickypads:

```bash
python3 ~/Developer/_control/stickypads/scripts/reconcile_coord.py \
    --repo-path . --dry-run
```
