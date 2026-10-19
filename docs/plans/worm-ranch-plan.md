# Worm Ranch Implementation Plan

**Status:** ✅ All committed + verified. Game mode flow + transition screen (92332d1) | ✅ Motion/particle layer hardened (1452020) | ✅ Canvas pointer listeners consolidated (2026-10-16) | ✅ Playwright E2E + launch-plate stall fixed (2026-10-16) | ✅ Codebase audit+refactor landed on `feat/codebase-audit-refactor` (pushed, gate GREEN). Open assigned plan work: NONE. See `docs/plans/.archive/2026-08-18-*` for the audit + READY debrief.

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

### 3. Canvas Pointer Listener Consolidation (2026-10-16)
- Replaced the split `GameStage` + `attachTouchControls` wiring with a single
  `bindPointerControls` binder in `gameStageGestures.ts`
- Each canvas pointer event (`pointerdown`, `pointermove`, `pointerup`,
  `pointercancel`, `pointerleave`) now has **exactly one** listener that routes
  by `pointerType`; previously all four touch-relevant events carried two
  listeners that fired in registration order on the same interaction
- Touch state cleanup (`releasePointerCapture` + pointer reset) is unified into
  the binder, and a `pointerup` trailing a cancelled gesture no longer re-runs
  the cleanup
- Added a 5-test binder suite to `src/components/gameStageGestures.test.ts` and a
  `GameStage.interaction.test.ts` guard asserting one listener per pointer event
- `npm run verify`: 36 suites / 192 tests, 0 lint errors, `next build` type-check clean

### 4. Browser E2E Coverage + Launch Plate Stall Fix (2026-10-16)
- Added Playwright E2E: `playwright.config.ts` + `e2e/launch-flow.spec.ts`
  (desktop + mobile chromium projects) covering welcome hero → gate →
  mode menu → standard game → endless target-color mode, plus a reduced-motion
  pass. Run with `npm run test:e2e`.
- **Bug found by the new E2E, not by any unit test:** the welcome launch loader
  deadlocked at **78%** on desktop while the intro reel was already playable.
  `introVideoCanPlay` was set by `onCanPlay`, but `introVideoMetadataLoaded`
  depended on an `onLoadedMetadata` event that fired before React attached its
  listener, so the plate never reached 100% and **kept gating first paint**.
  Device-dependent (only reproduced on desktop; mobile escaping the race is
  plausible but unverified), so no desktop-only unit test existed for it.
- Fix: `canplay` implies `readyState >= HAVE_METADATA`, so it now also records
  metadata readiness, and `getWelcomeLaunchLoaderProgress` /
  `getWelcomeLaunchLoaderPhase` treat can-play as proof of metadata. Guards:
  `welcomeLaunchLoader.test.ts` covers the missed-event snapshot.
- **Claim correction:** the jobcard previously recorded the completed slice as
  "intro video is enhancement-only instead of gating first paint". That was
  **not true** — the intro reel gate was still reachable. This session closed
  the gap.
- E2E needs a production build, not the dev server: `layout.tsx` loads Space
  Grotesk via `next/font/google`, and the dev server blocks on that fetch
  without gstatic access. `npm run build` is unaffected.
- Added `data-target-callout` / `data-target-color` / `data-target-progress` /
  `data-target-goal` / `data-target-game-over`
  attributes to `GameStageOverlay` so browser tests can read the live
  objective without parsing copy.
- `npm run verify`: 37 suites / 192 tests, eslint 0/0, tsc clean, build clean.

---

### 5. Review Follow-Up Hardening (2026-10-16)
- E2E nav waits use `NAV_TIMEOUT_MS = 5_000` (documented against the shell's
  real 220ms transition timer); the endless callout test asserts the full
  `data-target-*` contract (`callout`, `color`, `progress`, `goal`,
  `game-over`) instead of parsing copy.
- New `canvas pointer input` E2E describe (`hasTouch: true`): a CDP-dispatched
  real touch swipe must ADVANCE the keyboard target (poll the
  `Target worm N` number in the sr-only status), and a real mouse press must
  deliver exactly one `pointerdown` to the canvas with zero page errors.
  Mutation-checked: the swipe test fails if the touch path stops feeding the
  gesture tracker.
- Pen routing covered in `gameStageGestures.test.ts` (pen → direct press, no
  gesture tracking). Mutation-checked against a mouse-only routing change.
- `handleStageKeyDown` extracted from `GameStage.tsx` (477 → 456 lines) into
  `gameStageKeyboard.ts` with its own unit suite; interaction-test keyboard
  mocks consolidated onto `createKeyboardModuleMock` in
  `gameStageTestHelpers.ts` (keeps the stub `worm-1` determinism).
- `GameStage.interaction.test.ts` split: world-lifecycle tests moved to
  `GameStage.worldLifecycle.test.ts` (519 → 372 lines, under the 500-line
  budget).
- `npm run verify`: 37 suites / 192 tests, eslint 0/0, tsc clean, build clean.

---

## Open Debt (recorded in docs/jobcard.md)

| Item | Impact | Recommended Action |
|------|--------|-------------------|
| ~~`public/art` backdrops untracked~~ | **RESOLVED (2026-10-16)** | Tracked + audited: 6 of 7 backdrop files referenced by `gameStageBackdropRotation.ts`; launch poster/intro referenced by `welcomeHeroPresentation.ts`. The stray `Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg` was deleted on `feat/surgical-pruning-dead-code` (surgical-pruning sign-off obtained). |
| ~~Duplicate canvas pointer listeners~~ | **RESOLVED (2026-10-16)** | Consolidated via `bindPointerControls`; one listener per pointer event |
| Neon-token CSS aliases (`--bg-soft`, `--panel`, `--panel-strong`, `--line`, `--muted`, `--accent-strong`) kept "for backward compat" | Dual token system rots | Set deletion deadline (e.g., next slice) |
| `HANDOVER.md` at repo root | Stale as of 2026-08-19 (says 32 suites/159 tests, HEAD `28d5b46`, wrong absolute path, claims untracked art) | Reconcile or remove; supersedes-message now wrong in several places |

---

## Next Slice Decision (from jobcard)

The slice work described here is COMPLETE and verified. Remaining items are
OPTIONAL product debt, not assigned plan work — user decision required before
any are picked up:

1. **~~Automated E2E integration tests~~ — DONE (2026-10-16)**
2. **Low-end mobile perf profiling** — frame budget on constrained viewports
   (the new `mobile-chromium` E2E project can host a trace-based pass)
3. **Manual legibility pass** for the active target color on real devices
4. **Stray asset** — `public/art/Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg` is tracked but referenced nowhere. Quarantine it (delete needs user sign-off given the content).
5. **Token migration** — collapse the legacy CSS aliases (`--bg-soft`, `--panel`, `--panel-strong`, `--line`, `--muted`, `--accent-strong`) onto the neon token set.

Archive condition: met. This plan stays ACTIVE only because `AGENTS.md` and
other docs reference it as the live-context pointer; the completed slices are
archived under `docs/plans/.archive/2026-08-18-*`.

---

## Verification Gate

```bash
npm run verify
# → test:engine (192 tests / 37 suites) + lint (0 errors, 0 warnings) + next build (type-check clean)
# → test:e2e (playwright: 16 tests, desktop + mobile chromium — needs `npm run build` first)
```

Must stay green on every commit. CI runs this on push; note that Actions has
been billing-locked since between `35b608e` and `9ff82f7`, which is why that
commit shipped a broken canvas mock ungated. Until the lock clears, a pristine
clean clone plus `npm ci` is the closest available reproduction of what CI runs.

---

## Architecture Notes

- **App shell:** `WormRanchApp` owns `welcome → home → modeMenu → transition → game → home` flow
- **Game modes:** `standard` (level-based) | `targetEndless` (continuous, wrong-color = game over)
- **Motion layer:** `getMotionFeedback` (event→cue) + `getCueEffect` (cue→visual params) + particle burst system
- **Pointer input:** `gameStageGestures.ts::bindPointerControls` owns every canvas pointer
  listener — one listener per event, routed by `pointerType`. Touch is
  gesture-disambiguated (tap/swipe/hold, `HOLD_MS`); mouse/pen takes the direct
  press path. Do not add a second `addEventListener` for a pointer event on the
  stage canvas; extend `bindPointerControls` instead.
- **Reduced motion:** suppresses shake/dilation/overlay/particles but keeps per-cue flash color
- **Fonts:** Space Grotesk Variable (OFL) from `floriankarsten/space-grotesk` — committed to repo

---

## Related Docs

- `docs/jobcard.md` — live focus + open debt + archive condition
- `docs/visual-redesign-spec.md` — neon token system, layout tokens
- `docs/plans/.archive/2026-06-01-separate-game-mode-flow.md` — detailed task breakdown (completed)
- `docs/superpowers/specs/2026-06-01-game-mode-flow-design.md` — design rationale (completed)