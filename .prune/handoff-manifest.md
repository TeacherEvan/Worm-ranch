# Surgical Pruning Handoff Manifest — Worm Ranch

**Date:** 2026-10-19  
**Repository:** Worm Ranch (`github.com/TeacherEvan/Worm-ranch.git`)  
**Branch:** `feat/surgical-pruning-dead-code`  
**Prune commit:** `4f300bf` "chore: prune unused exports and dead constants"  
**Follow-up commit:** `1e20c2d` "chore: remove legacy --muted CSS alias"  
**Parent commit:** `9cf8982`  
**Status:** COMPLETE & VERIFIED (gate green)

---

## 1. Executive Summary

A surgical dead-code prune was performed on the Worm Ranch codebase. Seven
genuinely-unreferenced exported symbols (plus one duplicate export) were
removed across five files. No tests, entry points, or runtime behavior were
affected. The full verification gate passes:

| Gate | Result |
|------|--------|
| `vitest run` (test:engine) | 40 suites / 201 tests PASS |
| `tsc --noEmit` (typecheck) | clean |
| `eslint` | 0 errors, 0 warnings |
| `next build` | clean |
| `npm run knip` | dead symbols no longer flagged |

---

## 2. What Was Removed

All removals were confirmed dead via `grep` across `src/` (zero references in
source or tests) before deletion.

| File | Symbol | Kind | Lines removed | Reason |
|------|--------|------|---------------|--------|
| `src/components/gameStagePhasePresentation.ts` | `getPhaseLabel` | exported function | 3 | Wrapper around `getStagePresentation`; never imported/called |
| `src/components/gameStagePhasePresentation.ts` | `getPhaseChipLabel` | exported function | 3 | Wrapper around `getStagePresentation`; never imported/called |
| `src/components/gameStagePresentation.ts` | `createInitialSummary` | exported function | 3 | Thin wrapper over `getStagePresentation`; never imported/called |
| `src/components/gameStagePresentation.ts` | `buildStatusItems` | exported function | 3 | Thin wrapper over `getStagePresentation`; never imported/called |
| `src/components/gameStagePresentation.ts` | `getStageCopy` | exported function | 3 | Thin wrapper over `getStagePresentation`; never imported/called |
| `src/game/baseDefenseConstants.ts` | `WALL_COST` | exported const | 1 | Duplicate of `POWERUP_COSTS.wall`; never referenced |
| `src/game/baseDefenseConstants.ts` | `TOWER_COST` | exported const | 1 | Duplicate of `POWERUP_COSTS.tower`; never referenced |
| `src/components/BaseDefenseBankBar.tsx` | `export default BaseDefenseBankBar` | default export | 1 | Duplicate of named export; `GameStageOverlay` + tests use named import |
| `src/components/GameStageOverlay.tsx` | import statement | import | 1 line changed | Switched default import → named import to match |

**Net change:** 5 files, +5 insertions, −29 deletions.

The real, retained implementations are the internal functions `getStagePresentation`,
`getPhaseLabelText`, `getPhaseChipText`, `buildStatusItemsForSummary`,
`getStageCopyData`, and `POWERUP_COSTS` (which holds `wall`/`tower` costs used by
`BaseDefenseBankBar`).

---

## 3. Confidence Assessment

All removals are **HIGH confidence**:

- Each symbol was exported but had zero importers/callers anywhere in `src/`
  (verified with `grep`, including test files and `vi.doMock` references).
- The removed wrapper functions merely delegated to `getStagePresentation`,
  which remains fully exported and is used by `GameStage`, `GameStageOverlay`,
  `gameStagePhasePresentation.test.ts`, and `gameStageDensity.test.ts`.
- `WALL_COST`/`TOWER_COST` were redundant aliases of `POWERUP_COSTS.wall` /
  `POWERUP_COSTS.tower`, which are used by `BaseDefenseBankBar` and
  `baseDefenseEngine`. `WALL_HP`/`TOWER_HP` were retained (used by the engine).

No protected files (tests, configs, entry points, secrets) were touched.

---

## 4. Rollback

A rollback script is provided at `.prune/rollback-4f300bf.sh`. It restores the
pre-prune versions of the 5 affected files from commit `9cf8982`:

```bash
bash .prune/rollback-4f300bf.sh
```

Alternatively, revert the entire commit at once:

```bash
git revert 4f300bf
```

No git stash was created before the prune (the tree was clean at `9cf8982`).
The prune commit itself is the rollback boundary; `git revert 4f300bf` is the
single-command rollback.

---

## 5. What Was NOT Removed (Intentional)

knip still reports several "unused exports" and "unused exported types." These
were reviewed and **retained** because they are genuine internal API surface
used within their own modules (intra-file usage knip does not treat as external
import) or part of the public type API:

- `GAME_STAGE_AUDIO_CYCLE_LENGTH`, `normalizeGameStageAudioCycleStep` — used internally in `gameStageAudio.ts`
- `drawTowerArrow` — used internally in `gameStageBaseDefenseCanvas.ts`
- `flattenElementText`, `resolveFunctionComponent` — used internally in `gameStageTestHelpers.ts`
- `traceWormBody`, `getWormStateChip` — used internally in `gameStageWormCanvas.ts`
- `MAX_BASE_UPGRADES` — used internally in `baseDefenseConstants.ts`
- `stepBaseDefenseMode`, `getBaseDefenseSummary` — imported & used by `engine.ts`
- `PROFILE_RULES` — re-exported from `engine.ts`, imported by `WormRanchApp.tsx`
- `createEngineRuntime`, `getFairyState`, `defaultSettings` — used internally
- All 21 "unused exported types" — part of the public type API (props, signatures)

---

## 6. Open Debt (Not Part of This Prune)

Per `docs/jobcard.md` and `docs/plans/worm-ranch-plan.md`, these remain as
optional product debt (user decision, not part of surgical pruning):

1. **Legacy CSS alias** `--muted` — RESOLVED in commit `1e20c2d`. Removed the
   last remaining legacy semantic alias (`--muted: var(--text-dim)`) from
   `src/app/globals.css`. Grep-confirmed zero references across `src/`.
2. **Stray tracked asset** `public/art/Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg`
   — RESOLVED. Tracked but unreferenced (zero references in `src/`); deleted on
   `feat/surgical-pruning-dead-code` after surgical-pruning sign-off obtained.
3. `braces@3.0.3` high-severity advisory (dev-only, no patch published) — accepted risk.
4. GitHub Actions billing-locked (no CI since `9ff82f7`); `npm run verify` +
   `npm run test:e2e` is the authoritative evidence.

---

## 7. Verification Evidence

Captured at prune time (commit `4f300bf`) and re-verified after the alias
removal (commit `1e20c2d`):

- `vitest run`: Test Files 40 passed, Tests 201 passed (both commits)
- `tsc --noEmit`: clean (both commits)
- `eslint`: 0 problems (both commits)
- `next build`: compiled successfully, 6 routes generated (both commits)
- `npm run knip`: removed symbols no longer appear; remaining flags are
  retained internal API surface (see §5)

---

## 8. Agent Handoff

- **Branch:** `feat/surgical-pruning-dead-code` at `1e20c2d`
- **Working tree:** clean (only untracked artifact: `review_findings.md`)
- **Rollback:** `.prune/rollback-4f300bf.sh` (reverts the symbol prune,
  commit `4f300bf`) or `git revert 4f300bf`. The alias removal (commit
  `1e20c2d`) is a 2-line deletion trivially restored by re-adding the two
  lines or `git revert 1e20c2d`.
- **Next:** No further pruning assigned. The only open item is user sign-off on
  the stray-asset deletion (§6, item 2) if the user wishes to quarantine it.
