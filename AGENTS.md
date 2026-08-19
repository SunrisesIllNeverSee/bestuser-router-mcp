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
