# Worm Ranch Implementation Plan

**Status:** ✅ Game mode flow + transition screen complete (commit 92332d1) | ✅ Motion/particle layer hardened (commit 1452020) | 🔄 Next slice decision pending

---

## Completed Slices

### 1. Game Mode Menu + Transition Screen + Endless Game Over Flow (2026-06)
**Commits:** 92332d1, a26cc2d, d70ab53
- Added `modeMenu` screen with Standard / Endless target-color selection
- Added shared `transition` screen between all display handoffs
- Endless wrong-color failure now holds on a real Game Over window (Replay / Yard)
- App shell (`WormRanchApp`) owns screen flow and mode state
- `GameStage` receives `mode` prop and only starts continuous mode for `targetEndless`
- Full test coverage wired into `npm run verify`

### 2. Motion / Particle Feedback Layer Hardening (2026-08-01)
**Commit:** 1452020
- Restored `gameStageMotion.ts::getMotionFeedback` to correct `GameSummary` schema
- Rewrote `getCueEffect` as single-source-of-truth with reduced-motion path that preserves **per-cue flash colors** (accessibility win: rush=orange, blink/clock=cyan, outlaw=pink)
- Fixed `gameStageParticles.ts` `colorVariance` union violation
- Added `gameStageCueEffects.test.ts` (12 tests) + fixed existing motion test
- Replaced corrupted `public/fonts/SpaceGrotesk-VariableFont_wght.woff2` (was HTML 404) with genuine Space Grotesk variable woff2
- Ignored 25MB unreferenced `output.mp4`
- `npm run verify`: 139 tests pass, 0 lint errors, `next build` type-check clean

---

## Open Debt (recorded in docs/jobcard.md)

| Item | Impact | Recommended Action |
|------|--------|-------------------|
| `docs/plans/worm-ranch-plan.md` missing | AGENTS.md points here, misleads next agent | **This file** — done by creating it |
| Neon-token CSS aliases (`--bg`, `--accent`, `--danger`, etc.) kept "for backward compat" | Dual token system rots | Set deletion deadline (e.g., next slice) |
| Untracked `public/art` backdrops (webp/avif/jpg) | 11 files, some likely unused | Audit references; gitignore or commit |

---

## Next Slice Decision (from jobcard)

Choose one focus:
1. **Polish live target-call readability** — HUD/callout legibility for the active target color
2. **Tighten manual mobile layout checks** — ensure reduced-motion, touch targets, safe-area all hold
3. **Simplify remaining legacy flow surfaces** — delete dead code paths, consolidate aliases

Archive condition: move this plan to `docs/plans/.archive/` only after the chosen slice remains covered by `npm run verify` and a live shell/game smoke pass.

---

## Verification Gate

```bash
npm run verify
# → test:engine (139 tests) + lint (0 errors) + next build (type-check clean)
```

Must stay green on every commit. CI runs this on push.

---

## Architecture Notes

- **App shell:** `WormRanchApp` owns `welcome → home → modeMenu → transition → game → home` flow
- **Game modes:** `standard` (level-based) | `targetEndless` (continuous, wrong-color = game over)
- **Motion layer:** `getMotionFeedback` (event→cue) + `getCueEffect` (cue→visual params) + particle burst system
- **Reduced motion:** suppresses shake/dilation/overlay/particles but keeps per-cue flash color
- **Fonts:** Space Grotesk Variable (OFL) from `floriankarsten/space-grotesk` — committed to repo

---

## Related Docs

- `docs/jobcard.md` — live focus + open debt + archive condition
- `docs/visual-redesign-spec.md` — neon token system, layout tokens
- `docs/superpowers/plans/2026-06-01-separate-game-mode-flow.md` — detailed task breakdown (completed)
- `docs/superpowers/specs/2026-06-01-game-mode-flow-design.md` — design rationale (completed)