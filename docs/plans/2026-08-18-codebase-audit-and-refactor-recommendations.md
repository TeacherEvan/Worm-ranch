# Worm Ranch — Codebase Audit, Refactor & Recommendations

**Date:** 2026-08-18 (revised)
**Scope:** Architectural audit, 500-line rule enforcement, test coverage unification, particle system integration, CSS token consolidation, production verification.
**Verification target:** `npm run verify` — `vitest run` (27/27 suites) → `eslint` → `next build`.

---

## 1. Plan Header

### 1.1 Goals

| # | Goal | Why it matters |
|---|------|----------------|
| 1 | Fix a latent bug in `stepParticles` (gravity hardcoded to `collect` tone) | Fairy particles float the wrong direction; existing tests do not cover per-tone gravity |
| 2 | Unify `test:engine` to cover all 27 suites (5 are missing) | CI currently lets `gameStageHUD`, `gameStageTargetCallout`, `SettingsScreen`, `WormRanchShellHeader`, `continuousColorTargets` silently drift |
| 3 | Enforce the 500-line rule on three offenders | `engine.ts` (658), `gameStagePresentation.ts` (579), `WormRanchApp.tsx` (522) — requires multiple extraction groups per file, not just one |
| 4 | Wire the dormant particle burst system into live canvas rendering | `gameStageParticles.ts` is fully tested in isolation; zero draw calls exist in `GameStage.tsx` |
| 5 | Consolidate legacy CSS aliases | Dual token system creates drift risk at theming boundaries |

### 1.2 Architecture Map (current state)

```
src/app/
└── page.tsx               <- Suspense boundary -> WormRanchApp

src/components/
├── WormRanchApp.tsx       <- "use client" boundary; app state machine (522 lines OVER)
│   ├── screen routing: welcome -> home -> settings -> modeMenu -> transition -> game
│   ├── useSyncExternalStore(subscribeToSettings)   <- settings sync
│   ├── 8 useEffect hooks  <- analytics, PWA install, resize, transition timer
│   ├── EndlessGameOverWindow (inline component, lines 460-486)  <- should be own file
│   └── preloadGameplayBackdrop (module-private helper, lines 488-518)
│
├── GameStage.tsx          <- RAF game loop, canvas shell, event wiring (480 lines OK)
│   ├── particlesRef       <- MISSING: not wired yet
│   ├── handleAction()     <- pushFeedback() called; no particle burst emitted
│   ├── loop()             <- stepWorld -> stepFeedback -> renderStage -> updateSummary
│   └── getMotionFeedback() -> setMotionCue() -> CSS data-feedback-cue attribute
│
├── gameStagePresentation.ts  <- Canvas drawing entry (579 lines OVER)
│   ├── renderStage()      <- 7 positional args; DO NOT add particles as arg 8
│   ├── drawStaticStageBackdrop / drawPointerCorral <- move to backdrop module
│   └── drawWorm / drawWormSilhouette / traceWormBody <- move to worm module
│
├── gameStageMotion.ts     <- 252 lines OK: getMotionFeedback + getCueEffect (5 cues)
├── gameStageParticles.ts  <- 350 lines OK but DORMANT; BUG on line 232 (see s3)
├── gameStageCanvas.ts     <- 102 lines OK
└── gameStageActionEcho.ts <- 146 lines OK

src/game/
├── engine.ts              <- Deterministic state machine (658 lines OVER)
│   ├── Public: createWorld, stepWorld, applyAccuratePress, applyMiss,
│   │   findWormIdAtPoint, getSummary, resizeWorld, setPointer, triggerTouchRush,
│   │   startContinuousMode, stopContinuousMode, startRound
│   └── Private module helpers:
│       ├── FAIRY GROUP (~84 lines): createFairy, advanceFairies, getFairyState,
│       │   generateFairyTarget, generateFairyControlPoint -> src/game/engineFairies.ts
│       ├── CONTINUOUS GROUP (~36 lines): spawnContinuousWorm, refillContinuousWorms,
│       │   getTargetColorSummary -> src/game/engineContinuous.ts
│       └── PHASE SYNC GROUP (~65 lines): advanceWormTimers, syncWormStates,
│           updateRoundPhase -> src/game/enginePhase.ts
│       engine.ts after all extractions: ~473 lines OK
│
└── movement.ts / rules.ts / types.ts / detection.ts / levels.ts <- all under 500
```

### 1.3 Tech Stack

- **Next.js 16.2.4** (App Router + Turbopack), **React 19.2.4**, **TypeScript 5**
- **Vitest 4.1.5** — 27 suites, 151 tests (5 currently missing from `test:engine`)
- **Vanilla CSS Modules** — Neon token system (canonical: `--neon-*`, `--bg-*`); legacy aliases (`--bg`, `--accent`, `--danger`) still used in some modules
- **Canvas 2D** — Static backdrop offscreen cache; 60 fps RAF; no WebGL

### 1.4 Effort Estimate

5 milestones / 11 tasks / ~4–5 engineering hours.

---

## 2. Milestone Timeline

```
M1 — Bug Fix + Test Coverage ........................ ~30 min
  Task 1.1  RED: write failing test for stepParticles gravity bug
  Task 1.2  GREEN: fix stepParticles; fairy particles must float
  Task 1.3  Unify test:engine -> vitest run (all 27 files)

M2 — engine.ts Decomposition ........................ ~60 min
  Task 2.1  Extract FAIRY GROUP -> src/game/engineFairies.ts
  Task 2.2  Extract CONTINUOUS GROUP -> src/game/engineContinuous.ts
  Task 2.3  Extract PHASE SYNC GROUP -> src/game/enginePhase.ts
            engine.ts target: <480 lines

M3 — gameStagePresentation.ts Decomposition ......... ~60 min
  Task 3.1  Extract worm drawing -> src/components/gameStageWormCanvas.ts
  Task 3.2  Extract backdrop/corral -> src/components/gameStageBackdropCanvas.ts
            gameStagePresentation.ts target: <300 lines

M4 — Particle System Integration .................... ~60 min
  Task 4.1  Add particlesRef + stepParticles call in RAF loop
  Task 4.2  Emit action bursts from handleAction (collect/tag/teleport/outlaw)
  Task 4.3  Emit stage-cue bursts from getMotionFeedback (in RAF, not React effect)

M5 — App Shell + CSS Cleanup ........................ ~45 min
  Task 5.1  Extract EndlessGameOverWindow to its own component + module CSS
  Task 5.2  Extract preloadGameplayBackdrop -> src/lib/backdropPreload.ts
  Task 5.3  Consolidate --bg / --accent / --danger CSS aliases
  Task 5.4  npm run verify: 27 suites + eslint + next build
```

---

## 3. Critical Bug: stepParticles Gravity Hardcoded to collect Tone

### 3.1 Root Cause

`gameStageParticles.ts` line 232:

```ts
// BUG: always uses collect gravity (0.00018 downward) — ignores per-particle config
p.vy += TONE_CONFIGS.collect.gravity * deltaMs;
```

Every particle uses `collect`'s gravity regardless of tone.
- `fairy` tone: configured `gravity: -0.00008` (intentional upward float) — silently falls down instead.
- `teleport` tone: configured `gravity: 0` (radial, no pull) — silently drifts down.

### 3.2 Why Tests Missed It

`gameStageCueEffects.test.ts:124-133` tests with the `collect` tone (the one that happens to be hardcoded) and only checks `alive[i].x !== before[i].x`. No y-axis assertion. No cross-tone gravity check.

### 3.3 Fix

Add `gravity: number` to the `Particle` type. Stamp it from `rest.gravity` in `createBurst`. Use `p.gravity` in `stepParticles`.

```ts
// Particle type — add gravity field:
export type Particle = {
  // ... existing fields
  gravity: number;  // px/ms squared — copied from tone config at spawn
};

// createBurst — stamp gravity onto each particle:
particles.push({
  // ... existing fields
  gravity: rest.gravity,
});

// stepParticles line 232 — use p.gravity:
// BEFORE: p.vy += TONE_CONFIGS.collect.gravity * deltaMs;
// AFTER:
p.vy += p.gravity * deltaMs;
```

### 3.4 Companion Fix: Particle Cap Not Enforced

The module comment says "Max 60 particles per frame (GPU-friendly)" but neither `stepParticles` nor `drawParticles` enforces this. Multi-event overlap (rush-start during a collect streak) can spike past 60. Enforce in the RAF loop after `stepParticles`:

```ts
particlesRef.current = stepParticles(particlesRef.current, delta);
if (particlesRef.current.length > 60) {
  particlesRef.current = particlesRef.current.slice(-60);
}
```

---

## 4. Particle System Integration (Milestone 4 Detail)

### 4.1 Key Design Decision: Particles Live Outside renderStage()

`renderStage(context, world, reducedMotion, feedback, selectedWormId, level, staticBackdrop)` already has 7 positional args. An 8th arg is an API smell and forces every mock in `GameStage.test.ts` to update.

**Correct pattern:** call `drawParticles()` in the RAF loop *after* `renderStage()`. Particles are visual post-processing over the game world, not part of the world model.

### 4.2 Ref Placement in GameStage.tsx

After the existing `feedbackIdRef` (line 88):
```ts
const feedbackRef = useRef<StageFeedback[]>([]);
const feedbackIdRef = useRef(0);
const particlesRef = useRef<Particle[]>([]);   // ADD HERE
```

Reset in the loop setup effect (near line 160):
```ts
feedbackRef.current = [];
particlesRef.current = [];                      // ADD HERE
finishedRef.current = false;
```

### 4.3 Action Burst Emission — handleAction Injection Points

`handleAction` at `GameStage.tsx:265` has worm position data via the `pushFeedback` pattern. Add burst emission alongside `pushFeedback`, guarded by `!reducedMotionRef.current`:

```ts
if (result.kind === "collect") {
  pushFeedback(result);
  const worm = worldRef.current.worms.find((w) => w.id === result.wormId);
  if (worm && !reducedMotionRef.current) {
    particlesRef.current = [
      ...particlesRef.current,
      ...createBurstFromTone("collect", worm.x, worm.y - worm.radius * 1.8),
    ];
  }
  onEventRef.current("worm_collected", { wormId: result.wormId, collected: result.collected });
}
if (result.kind === "tag") {
  pushFeedback(result);
  const worm = worldRef.current.worms.find((w) => w.id === result.wormId);
  if (worm && !reducedMotionRef.current) {
    particlesRef.current = [
      ...particlesRef.current,
      ...createBurstFromTone("tag", worm.x, worm.y),
    ];
  }
}
if (result.kind === "teleport") {
  pushFeedback(result);
  const tone = result.immortal ? "outlaw" : "teleport";
  const worm = worldRef.current.worms.find((w) => w.id === result.wormId);
  if (worm && !reducedMotionRef.current) {
    particlesRef.current = [
      ...particlesRef.current,
      ...createBurstFromTone(tone, worm.x, worm.y),
    ];
  }
  onEventRef.current("worm_teleported", { wormId: result.wormId, immortal: result.immortal });
}
```

> **Timing note:** `worm.x` / `worm.y` are read AFTER `applyAccuratePress` has run, so for `teleport`, worm coordinates are already at the NEW position when `handleAction` is called. If burst should appear at the departure point, read worm coords before `applyAccuratePress` in the pointer handler. This is a gameplay-feel call — defer to the `Worm Ranch Gameplay` workspace agent.

### 4.4 RAF Loop Integration

In `loop()` at `GameStage.tsx:360`:

```ts
const loop = (timestamp: number) => {
  const last = lastTimestampRef.current ?? timestamp;
  const delta = Math.min(32, timestamp - last);
  lastTimestampRef.current = timestamp;

  stepWorld(worldRef.current, delta);
  emitFairyLifecycleEvents();
  stepFeedback(feedbackRef.current, delta);

  // NEW: step particles, enforce 60-particle cap
  particlesRef.current = stepParticles(particlesRef.current, delta);
  if (particlesRef.current.length > 60) {
    particlesRef.current = particlesRef.current.slice(-60);
  }

  renderStage(                              // unchanged — no new args
    context,
    worldRef.current,
    reducedMotionRef.current,
    feedbackRef.current,
    keyboardTargetRef.current,
    level,
    staticBackdropRef.current?.canvas ?? null,
  );

  // NEW: draw particles on top of game world
  drawParticles(context, particlesRef.current, reducedMotionRef.current);

  updateSummary();
  // ...remainder unchanged
};
```

### 4.5 Stage-Cue Particle Bursts

Stage cues (`rush-start`, `blink-armed`, `final-outlaw`, etc.) are handled via CSS `data-feedback-cue` + CSS animations. The `getCueEffect()` function already maps each cue to a `particleTone` and `particleCount` but this is never consumed. Emit bursts in the RAF loop when `getMotionFeedback` detects a cue:

```ts
// In loop(), after stepWorld, before renderStage:
const rawSummary = getSummary(worldRef.current);
const motionFeedback = getMotionFeedback(lastParticleSummaryRef.current, rawSummary);
lastParticleSummaryRef.current = rawSummary;

if (!reducedMotionRef.current && motionFeedback.stageCue !== "none") {
  const cueEffect = getCueEffect(motionFeedback.stageCue, false);
  if (cueEffect.particleTone) {
    const cx = worldRef.current.width / 2;
    const cy = worldRef.current.height / 2;
    particlesRef.current = [
      ...particlesRef.current,
      ...createBurstFromTone(cueEffect.particleTone, cx, cy, cueEffect.particleCount),
    ];
  }
}
```

---

## 5. engine.ts Decomposition Budget

The previous version of this plan said "extract fairy logic" and claimed it would bring `engine.ts` under 500 lines. That was wrong.

| Extraction | Functions | Lines removed | engine.ts result |
|---|---|---|---|
| Fairy group only | createFairy, advanceFairies, getFairyState, generateFairyTarget, generateFairyControlPoint | ~84 | 574 — still over |
| + Continuous group | spawnContinuousWorm, refillContinuousWorms, getTargetColorSummary | +36 = 120 | 538 — still over |
| + Phase sync group | advanceWormTimers, syncWormStates, updateRoundPhase | +65 = 185 | **473 — OK** |

Three extraction modules, all private to `src/game/`:

- **`src/game/engineFairies.ts`** — createFairy, advanceFairies, getFairyState, generateFairyTarget, generateFairyControlPoint
- **`src/game/engineContinuous.ts`** — spawnContinuousWorm, refillContinuousWorms, getTargetColorSummary
- **`src/game/enginePhase.ts`** — advanceWormTimers, syncWormStates, updateRoundPhase

All three modules are internal — they export nothing to consumers outside `src/game/engine.ts`. The public API surface does not change.

**Critical rule:** `randomBetween` and `clamp` (used by both `engineFairies` and `enginePhase`) stay in `engine.ts` or move to a shared `engineUtils.ts`. Do not duplicate.

---

## 6. WormRanchApp.tsx Decomposition

### 6.1 Line Attribution

| Block | Lines | What it is | Worth own file? |
|---|---|---|---|
| State declarations | 49–85 | 11 useState, 9 useRef | No — colocation is correct |
| logEvent + handleStageEvent | 87–120 | Analytics dispatching callbacks | Yes → `useAppAnalytics` |
| Navigation handlers | 123–152 | beginTransition, returnHome, handleRoundEnd | No — routing glue belongs in app shell |
| Ref-sync effects (x6) | 154–188 | Sync refs from state on each render | No — boilerplate; right here is correct |
| PWA install effect | 190–221 | beforeinstallprompt / appinstalled listeners | Yes → `useInstallPrompt` |
| Display resize effect | 223–233 | detectDisplayProfile on resize | No — one effect, inline is fine |
| Analytics effects (x3) | 235–290 | settings, display snapshot, screen view logging | Yes → part of `useAppAnalytics` |
| Transition timer effect | 292–325 | setTimeout -> setScreen | No — tight coupling to screen state |
| Install/settings callbacks | 327–341 | handleInstallRequest, updateSetting | No — trivial |
| Derived display values | 343–352 | shellProfile, welcomeMetrics | No — pure computation |
| JSX render | 354–458 | All screens | No — routing render tree belongs here |
| EndlessGameOverWindow | 460–486 | Inline modal component with 3 CSS class refs | Yes — own file + module CSS |
| preloadGameplayBackdrop | 488–518 | Async image decode helper | Yes -> src/lib/backdropPreload.ts |
| isDeferredInstallPromptEvent | 520–522 | Type guard | Moves alongside useInstallPrompt |

**After extraction: WormRanchApp.tsx approx 350 lines — OK.**

---

## 7. Audit Findings Summary

| Category | Finding | Severity |
|---|---|---|
| Bug | `stepParticles` gravity hardcoded to `collect` tone — fairy/teleport particles behave wrong | High |
| File Length | `engine.ts` (658 lines) — needs 3 extraction groups, not 1 | High |
| File Length | `gameStagePresentation.ts` (579 lines) — two extraction groups | High |
| File Length | `WormRanchApp.tsx` (522 lines) — 3 targeted extractions + inline component | High |
| Test Coverage | `test:engine` omits 5 test files: `gameStageHUD`, `gameStageTargetCallout`, `SettingsScreen`, `WormRanchShellHeader`, `continuousColorTargets` | Medium |
| Dormant Feature | Particle burst system fully tested but not wired; no canvas draw calls in `GameStage.tsx` | Low |
| Particle Cap | 60-particle cap documented in comments but not enforced in code | Low |
| CSS Tokens | Legacy `--bg`, `--accent`, `--danger` aliases used alongside canonical `--neon-*` | Low |

---

## 8. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Engine extraction breaks determinism | Run full 27-suite verify before and after each extraction. Functions are pure; only call-site moves, not logic. |
| engineFairies.ts circular import | Route type imports through `./types`, never through `./engine`. Already the correct pattern in the codebase. |
| Particle burst at wrong worm position on teleport | Read worm coords before `applyAccuratePress`; pass as arg to `handleAction`. Defer gameplay-feel decision to `Worm Ranch Gameplay` agent. |
| Analytics effect ordering change after hook extraction | Keep effect dependency arrays and call order identical. Assert event order in integration smoke test. |
| Particles render under reduced-motion | Guard every burst emission with `!reducedMotionRef.current`. drawParticles has a reduced-motion branch but it should never be reached if guard is correct. |
| Legacy CSS token removal breaks visuals | Run `rg '\-\-bg\b|\-\-accent\b|\-\-danger\b' src --include="*.css"` before touching any token. Migrate one module at a time with a verify pass between each. |

---

## 9. Bite-Sized Tasks (TDD Steps)

### Milestone 1 — Bug Fix + Test Coverage

**Task 1.1 — RED: write failing test for stepParticles per-tone gravity**

- File: [`src/components/gameStageCueEffects.test.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/gameStageCueEffects.test.ts)
- Add inside `describe("particle burst system")`:

```ts
it("applies per-tone gravity — fairy particles drift upward, teleport particles have zero drift", () => {
  // fairy tone: gravity -0.00008 (upward) — vy should decrease (more negative) after step
  const fairy = createBurstFromTone("fairy", 200, 200);
  const fairyInitialVy = fairy.map((p) => p.vy);
  const fairyAfter = stepParticles(fairy, 100);
  for (let i = 0; i < fairyAfter.length; i++) {
    expect(fairyAfter[i].vy).toBeLessThanOrEqual(fairyInitialVy[i]);
  }

  // teleport tone: gravity 0 — vy unchanged after step
  const teleport = createBurstFromTone("teleport", 200, 200);
  const teleportInitialVy = teleport.map((p) => p.vy);
  const teleportAfter = stepParticles(teleport, 100);
  for (let i = 0; i < teleportAfter.length; i++) {
    expect(teleportAfter[i].vy).toBeCloseTo(teleportInitialVy[i], 5);
  }
});
```

- Expected: test fails — `stepParticles` uses `collect` gravity for all.
- Verify: `npx vitest run src/components/gameStageCueEffects.test.ts` → 1 failing.

---

**Task 1.2 — GREEN: fix stepParticles + Particle type + createBurst**

- File: [`src/components/gameStageParticles.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/gameStageParticles.ts)
1. Add `gravity: number` to `Particle` type after `spin`.
2. In `createBurst()`, add `gravity: rest.gravity` to the particle push object.
3. Line 232: replace `TONE_CONFIGS.collect.gravity` with `p.gravity`.
- Verify: `npx vitest run src/components/gameStageCueEffects.test.ts` → all pass including new test.

---

**Task 1.3 — Unify test:engine**

- File: [`package.json`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/package.json)
- Change `"test:engine"` value from the hardcoded 22-file list to: `"vitest run"`
- Missing suites added: `gameStageHUD.test.ts`, `gameStageTargetCallout.test.ts`, `SettingsScreen.test.ts`, `WormRanchShellHeader.test.ts`, `continuousColorTargets.test.ts`
- Verify: `npm run test:engine` → 27/27 suites pass, no new failures.

---

### Milestone 2 — engine.ts Decomposition

**Task 2.1 — Extract FAIRY GROUP**

- Create: [`src/game/engineFairies.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/game/engineFairies.ts)
- Move from `engine.ts`: `createFairy` (lines 395-421), `advanceFairies` (423-430), `getFairyState` (501-515), `generateFairyTarget` (618-645), `generateFairyControlPoint` (648-653).
- Imports in engineFairies.ts: `Fairy`, `GameWorld`, `Worm`, `isFairyVisible` from `./types`; `FAIRY_MORPH_DURATION_MS` from `./constants`. Note: `randomBetween` stays in engine.ts — pass it as a parameter or import it from engineUtils.ts.
- In engine.ts: `import { createFairy, advanceFairies } from "./engineFairies"`.
- Verify: `npx vitest run src/game/engine.test.ts` — all pass; `wc -l src/game/engine.ts` → ~574.

---

**Task 2.2 — Extract CONTINUOUS GROUP**

- Create: [`src/game/engineContinuous.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/game/engineContinuous.ts)
- Move: `spawnContinuousWorm` (444-455), `refillContinuousWorms` (475-479), `getTargetColorSummary` (481-499).
- Verify: `npx vitest run src/game/engine.test.ts` — all pass; `wc -l src/game/engine.ts` → ~538.

---

**Task 2.3 — Extract PHASE SYNC GROUP**

- Create: [`src/game/enginePhase.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/game/enginePhase.ts)
- Move: `advanceWormTimers` (517-525), `syncWormStates` (527-558), `updateRoundPhase` (560-583).
- Verify: `npx vitest run src/game/engine.test.ts` — all pass; `wc -l src/game/engine.ts` → ~473 OK.

---

### Milestone 3 — gameStagePresentation.ts Decomposition

**Task 3.1 — Extract Worm Drawing**

- Create: [`src/components/gameStageWormCanvas.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/gameStageWormCanvas.ts)
- Move from `gameStagePresentation.ts`: `drawWorm`, `drawWormSilhouette`, `drawWormStateChip`, `getWormStateChip`, `traceWormBody`, and worm-path helpers.
- Direction: `gameStagePresentation.ts` imports from `gameStageWormCanvas.ts`, not the reverse.
- Verify: `npx vitest run src/components/GameStage.test.ts src/components/gameStageWormVisuals.test.ts` — all pass.

---

**Task 3.2 — Extract Backdrop and Corral Drawing**

- Create: [`src/components/gameStageBackdropCanvas.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/gameStageBackdropCanvas.ts)
- Move: `drawStaticStageBackdrop`, `drawPointerCorral`, `drawStageBaseFill`, backdrop gradient helpers.
- Update import in `gameStageCanvas.ts:1` — currently imports `drawStaticStageBackdrop` from `gameStagePresentation`; change to `gameStageBackdropCanvas`.
- Verify: `npx vitest run src/components/GameStage.test.ts` — all pass; `wc -l src/components/gameStagePresentation.ts` → target below 300.

---

### Milestone 4 — Particle System Integration

**Task 4.1 — RAF Loop: step + draw particles**

- File: [`src/components/GameStage.tsx`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/GameStage.tsx)
- Add import: `import { createBurstFromTone, stepParticles, drawParticles, type Particle } from "@/components/gameStageParticles"`.
- Add `const particlesRef = useRef<Particle[]>([])` after line 88.
- Add `particlesRef.current = []` in loop setup effect near line 160.
- In `loop()` after `stepFeedback`: step particles + cap to 60.
- After `renderStage()`: call `drawParticles(context, particlesRef.current, reducedMotionRef.current)`.
- Verify: `npx vitest run src/components/GameStage.test.ts` — existing tests pass; add `gameStageParticles` identity stub to harness if needed.

---

**Task 4.2 — Action Bursts in handleAction**

- File: [`src/components/GameStage.tsx`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/GameStage.tsx)
- Per code in section 4.3 above — emit `createBurstFromTone(tone, worm.x, worm.y)` for `collect`, `tag`, `teleport`, `outlaw` results.
- Every emission is guarded by `!reducedMotionRef.current`.
- Verify: `npx vitest run src/components/GameStage.test.ts` — no regressions.

---

**Task 4.3 — Stage-Cue Bursts in RAF**

- File: [`src/components/GameStage.tsx`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/GameStage.tsx)
- Per section 4.5 above — add `lastParticleSummaryRef`, compare raw summaries in `loop()`, emit `getCueEffect(cue).particleTone` burst at canvas center.
- Verify: `npx vitest run src/components/gameStageCueEffects.test.ts src/components/GameStage.test.ts` — all pass.

---

### Milestone 5 — App Shell + CSS Cleanup

**Task 5.1 — Extract EndlessGameOverWindow**

- Create: [`src/components/EndlessGameOverWindow.tsx`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/EndlessGameOverWindow.tsx), [`src/components/EndlessGameOverWindow.module.css`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/EndlessGameOverWindow.module.css)
- Move: component (lines 460-486) + CSS classes `overWindow`, `overActions`, `replay`, `yard` from `WormRanchApp.module.css`.
- Verify: `npx vitest run src/components/WormRanchApp.test.ts` — all pass.

---

**Task 5.2 — Extract preloadGameplayBackdrop + useInstallPrompt**

- Create: [`src/lib/backdropPreload.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/lib/backdropPreload.ts) — move `preloadGameplayBackdrop` (lines 488-518).
- Create: [`src/components/useInstallPrompt.ts`](file:///home/ewaldt/Documents/VS/GAMES/Worm%20ranch/src/components/useInstallPrompt.ts) — move `beforeinstallprompt`/`appinstalled` effect (lines 190-221) + `isDeferredInstallPromptEvent` + `handleInstallRequest`.
- Verify: `wc -l src/components/WormRanchApp.tsx` → target ~350; `npx vitest run src/components/WormRanchApp.test.ts` — all pass.

---

**Task 5.3 — CSS Token Consolidation**

- Audit: `rg '\-\-bg\b|\-\-accent\b|\-\-danger\b' src --include="*.css"`
- Migrate: `--bg` to `--bg-deep`, `--accent` to `--neon-orange`, `--danger` to `--neon-pink`.
- Remove alias declarations from `src/app/globals.css` once all usages are migrated.
- Verify: Visual review in dev; `npm run lint` → 0 errors.

---

**Task 5.4 — Full Verification**

```bash
npm run verify
```

Success criteria:
- vitest run: 27/27 suites, 151+ tests pass.
- eslint: 0 errors, 0 warnings.
- next build: clean type-check, static export succeeds.

---

## 10. File Size Targets

| File | Before | After | Status |
|---|---|---|---|
| `src/game/engine.ts` | 658 | ~473 | OK |
| `src/components/gameStagePresentation.ts` | 579 | below 300 | OK |
| `src/components/WormRanchApp.tsx` | 522 | ~350 | OK |
| `src/components/gameStageParticles.ts` | 350 | ~355 (gravity field) | OK |
| `src/game/engineFairies.ts` | new | ~95 | OK |
| `src/game/engineContinuous.ts` | new | ~45 | OK |
| `src/game/enginePhase.ts` | new | ~75 | OK |
| `src/components/gameStageWormCanvas.ts` | new | ~180 | OK |
| `src/components/gameStageBackdropCanvas.ts` | new | ~120 | OK |
| `src/components/EndlessGameOverWindow.tsx` | inline | ~35 | OK |
| `src/lib/backdropPreload.ts` | inline | ~35 | OK |
