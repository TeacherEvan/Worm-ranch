# Continuous Color Target Relaunch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the round-based stage flow with a continuous color-target chase, make worm colors legible and intentional, and fix the app-shell launch/layering issues that currently keep gameplay from opening reliably.

**Architecture:** Keep gameplay rules and state transitions in `src/game`, but add an explicit worm-color model and a target-color director that controls the 2-second announce flash and the "clear two matching worms, then retarget" loop. Keep rendering and HUD/UI work in `src/components`, split `GameStage` into smaller presentation/runtime pieces so files stay below the repo’s 500-line limit, and make app-shell launch non-blocking so gameplay can mount even if backdrop preloading stalls or fails.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, CSS Modules

---

## Goal

- Ship a continuous gameplay mode where worms have more distinct named colors.
- Flash a black-text color directive over gameplay for 2 seconds.
- Keep the directive active until the player removes two worms of that color, then announce the next color.
- Keep worms spawning until the player exits back to the main menu.
- Remove the current gameplay-entry failure and simplify the visual layering that is dulling gameplay and cropping the launch art.

## Non-goals

- Do not add online state, persistence, or multiplayer.
- Do not replace the existing desktop/mobile rule split.
- Do not redesign audio behavior unless a touched test must be updated for the new flow.
- Do not move simulation logic into `src/app` route files.

## File Responsibility Map

**Create**

- `src/game/wormColors.ts`
  Own the canonical gameplay color set, color labels shown to players, and helpers for assigning/reserving worm colors.
- `src/game/continuousColorTargets.ts`
  Own the target-color lifecycle: choose target, track progress toward two removals, control 2-second announce visibility, and pick the next target.
- `src/game/continuousColorTargets.test.ts`
  Regression coverage for target selection, announce timing, and retarget behavior.
- `src/components/gameStageTargetCallout.ts`
  Map game summary state into a practical, black-text gameplay directive payload.
- `src/components/gameStageTargetCallout.test.ts`
  Regression coverage for callout copy, visibility windows, and progress display.
- `src/components/GameStageOverlay.tsx`
  Own HUD, callout, leave button slotting, and top-layer gameplay copy so `GameStage.tsx` stays below 500 lines.

**Modify**

- `src/game/types.ts`
  Add explicit worm color identity and continuous target summary fields.
- `src/game/specialWorms.ts`
  Move standard worm coloring to the new palette helpers and ensure psychedelic worms remain visually distinct.
- `src/game/engine.ts`
  Integrate continuous target state, infinite replacement spawning, and removal-driven retargeting.
- `src/game/engine.test.ts`
  Cover respawn behavior, no-auto-end behavior, and target-progress updates.
- `src/game/engineSpecialWorm.test.ts`
  Adjust expectations if psychedelic worms now participate in the new color model.
- `src/components/GameStage.tsx`
  Reduce to stage orchestration, canvas runtime wiring, and overlay composition only.
- `src/components/GameStage.test.ts`
  Cover the continuous overlay contract and removal-triggered retarget handoff.
- `src/components/gameStagePresentation.ts`
  Render higher-contrast gameplay backdrops and more color-distinct worms.
- `src/components/gameStagePhasePresentation.ts`
  Replace round-end copy with continuous-play HUD copy and expose color-target state.
- `src/components/gameStagePhasePresentation.test.ts`
  Cover target-color copy and the removal-progress wording.
- `src/components/gameStageWormVisuals.ts`
  Make worm visuals read as discrete colors instead of minor hue shifts.
- `src/components/WormRanchApp.tsx`
  Start gameplay without blocking on backdrop preload, keep the app in game until quit, and bypass results for the new continuous mode.
- `src/components/WormRanchApp.test.ts`
  Cover non-blocking launch and home-to-game-to-home flow without a results transition.
- `src/components/HomeScreen.module.css`
  Adjust home launch layout to match the simplified, full-bleed shell direction.
- `src/components/WelcomeScreen.tsx`
  Simplify the launch surface structure so hero media is not framed/cropped by the old card shell.
- `src/components/WelcomeScreen.module.css`
  Remove the cropping frame treatment and rebalance contrast/overlay strength.
- `src/components/WormRanchApp.module.css`
  Simplify page-shell sizing rules so gameplay owns the viewport cleanly.
- `README.md`
  Update the current-experience and validation sections.
- `docs/jobcard.md`
  Move current focus to the continuous color-target relaunch slice.

**Leave untouched**

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/lib/logger.ts`
- `public/audio/**`
- `src/components/ResultsScreen.tsx`

`ResultsScreen` can stay in the repo for now, but it should no longer be part of the default gameplay flow once this plan is complete.

## Ordered Tasks

### Task 1: Pin the gameplay launch failure and unblock the game screen

**Why first:** `WormRanchApp.beginRun()` currently waits on backdrop preloading before it sets `screen="game"`. If image decode or load stalls, the home screen keeps rendering and gameplay never mounts. Fixing launch first gives the rest of the work a stable entry point.

**Files:**

- Modify: `src/components/WormRanchApp.tsx`
- Test: `src/components/WormRanchApp.test.ts`

- [ ] **Step 1: Add a failing app-shell regression test**

Add a focused test in `src/components/WormRanchApp.test.ts` that verifies `onStart()` moves the app into gameplay even if backdrop preload rejects or never resolves immediately.

Suggested test shape:

```ts
it("enters gameplay without blocking on backdrop preload", async () => {
  vi.stubGlobal("Image", class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    complete = false;
    decode() {
      return new Promise<void>(() => undefined);
    }
    set src(_value: string) {}
  });

  await homeScreenProps?.onStart();
  await renderApp();

  expect(gameStageProps?.level).toBe(1);
});
```

- [ ] **Step 2: Run the narrow test and confirm the expected failure**

Run:

```bash
npx vitest run src/components/WormRanchApp.test.ts -t "enters gameplay without blocking on backdrop preload"
```

Expected: FAIL because `beginRun()` does not set the game screen until `preloadGameplayBackdrop()` settles.

- [ ] **Step 3: Implement the minimal launch fix**

Update `src/components/WormRanchApp.tsx` so `beginRun()` commits the next session/profile/level and sets `screen="game"` before awaiting any best-effort backdrop preload.

Implementation outline:

```ts
const beginRun = () => {
  const nextRunProfile = effectiveProfile;
  const runPlan = screenRef.current === "results" ? nextRunPlan : getInitialGameplayRunPlan();

  sessionIdRef.current = crypto.randomUUID();
  runProfileRef.current = nextRunProfile;
  currentLevelRef.current = runPlan.level;

  setCurrentLevel(runPlan.level);
  setNextRunPlan(runPlan);
  setSessionId(sessionIdRef.current);
  setRunProfile(nextRunProfile);
  setResult(null);
  setScreen("game");

  void preloadGameplayBackdrop(runPlan.backdropUrl);
};
```

Do not add fallback state to `src/app`; keep the fix local to the app shell.

- [ ] **Step 4: Re-run the focused launch test and the broader app-shell test file**

Run:

```bash
npx vitest run src/components/WormRanchApp.test.ts
```

Expected: PASS. Existing level-flow coverage still passes with the new non-blocking launch behavior.

- [ ] **Step 5: Review the diff and mark the task complete**

Check that only the launch handoff changed and that results/home behavior has not been partially rewritten yet.

### Task 2: Introduce explicit worm colors instead of weak hue drift

**Why second:** The color-call gameplay cannot be reliable until the game has stable, named colors that are readable both in engine state and on the canvas.

**Files:**

- Create: `src/game/wormColors.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/specialWorms.ts`
- Test: `src/game/continuousColorTargets.test.ts`
- Test: `src/game/engineSpecialWorm.test.ts`

- [ ] **Step 1: Add failing tests for named color assignment**

Add tests that prove standard worms come from a bounded named palette and psychedelic worms remain exempt from the standard directive loop.

Suggested test cases:

```ts
expect(getStandardWormColor(0).label).toBe("Sun Yellow");
expect(getStandardWormColor(1).label).toBe("Fence Red");
expect(createStandardWorm(0, rules, 800, 540, runtime).colorId).toBe("sun-yellow");
expect(createPsychedelicWorm(world).visualVariant).toBe("psychedelic");
```

- [ ] **Step 2: Run the narrow engine-side tests and confirm failure**

Run:

```bash
npx vitest run src/game/engineSpecialWorm.test.ts src/game/continuousColorTargets.test.ts
```

Expected: FAIL because named color helpers and `worm.colorId` do not exist yet.

- [ ] **Step 3: Implement the color model**

Create `src/game/wormColors.ts` and thread the new type through `src/game/types.ts` and `src/game/specialWorms.ts`.

Implementation outline:

```ts
export const STANDARD_WORM_COLORS = [
  { id: "sun-yellow", label: "Sun Yellow", hue: 52 },
  { id: "fence-red", label: "Fence Red", hue: 12 },
  { id: "pond-blue", label: "Pond Blue", hue: 204 },
  { id: "clover-green", label: "Clover Green", hue: 132 },
];

export type WormColorId = (typeof STANDARD_WORM_COLORS)[number]["id"];

export function getStandardWormColor(index: number) {
  return STANDARD_WORM_COLORS[index % STANDARD_WORM_COLORS.length];
}
```

Thread `colorId` onto `Worm`, keep `hue` for rendering math, and derive standard worm hue from the named palette instead of `(index * 17) % 360`.

- [ ] **Step 4: Re-run the focused color tests**

Run:

```bash
npx vitest run src/game/engineSpecialWorm.test.ts src/game/continuousColorTargets.test.ts
```

Expected: PASS. Standard worms now expose stable named colors and psychedelic worms are still distinct.

- [ ] **Step 5: Review the task boundary**

Confirm this task did not yet change game flow, only the worm identity model.

### Task 3: Add continuous target-color gameplay in the engine

**Why third:** The continuous loop is a gameplay-rule change and belongs in `src/game` before the HUD and canvas start rendering it.

**Files:**

- Create: `src/game/continuousColorTargets.ts`
- Test: `src/game/continuousColorTargets.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/engine.ts`
- Test: `src/game/engine.test.ts`

- [ ] **Step 1: Add failing engine tests for continuous target behavior**

Add focused tests that cover all new rules:

```ts
it("announces the active target color for 2 seconds", () => {});
it("increments target progress only when the active color is removed", () => {});
it("retargets after two matching removals", () => {});
it("spawns replacement worms instead of ending the round", () => {});
it("does not set roundResult during continuous play", () => {});
```

Use deterministic runtime overrides so the tests can assert exact target visibility windows and worm counts.

- [ ] **Step 2: Run the narrow engine tests and confirm the expected failure**

Run:

```bash
npx vitest run src/game/engine.test.ts src/game/continuousColorTargets.test.ts
```

Expected: FAIL because the engine still uses the round-ending capture rules and has no target-color director.

- [ ] **Step 3: Implement the target-color director and infinite replacement loop**

Create a small state machine in `src/game/continuousColorTargets.ts` and integrate it in `src/game/engine.ts`.

Implementation outline:

```ts
export type ContinuousTargetState = {
  colorId: WormColorId;
  label: string;
  removalsNeeded: 2;
  removalsComplete: number;
  visibleUntilMs: number;
};

export function createContinuousTargetState(nowMs: number, colorId: WormColorId): ContinuousTargetState {
  return {
    colorId,
    label: getWormColorSpec(colorId).label,
    removalsNeeded: 2,
    removalsComplete: 0,
    visibleUntilMs: nowMs + 2_000,
  };
}
```

Engine requirements:

- Add target state to `GameWorld` and summary state to `GameSummary`.
- Treat a successful removal of a matching color as progress toward the current directive.
- When progress reaches 2, immediately choose the next target color from currently available standard worms and set a new 2-second visibility window.
- Replace removed worms so active worm count stays at the configured level cap.
- Keep desktop/mobile interaction rules intact, but suppress automatic round completion in the continuous mode.
- Preserve the leave-to-home action as the only default exit path.

- [ ] **Step 4: Re-run the focused engine tests and then the repo’s gameplay test command**

Run:

```bash
npx vitest run src/game/engine.test.ts src/game/continuousColorTargets.test.ts
npm run test:engine
```

Expected: PASS. The narrow tests prove the new rule loop, and `npm run test:engine` confirms no regressions across engine/component gameplay tests.

- [ ] **Step 5: Review task scope before UI work**

Confirm the engine now exposes stable target-color summary data and infinite play, but has not yet changed the screen layout.

### Task 4: Rebuild the stage overlay around the target-color callout and simplify GameStage boundaries

**Why fourth:** Once the engine exposes the correct state, the stage can render the 2-second directive, stronger worm colors, and a simpler overlay without mixing more logic into the already oversized `GameStage.tsx`.

**Files:**

- Create: `src/components/gameStageTargetCallout.ts`
- Test: `src/components/gameStageTargetCallout.test.ts`
- Create: `src/components/GameStageOverlay.tsx`
- Modify: `src/components/GameStage.tsx`
- Modify: `src/components/gameStagePresentation.ts`
- Modify: `src/components/gameStagePhasePresentation.ts`
- Modify: `src/components/gameStagePhasePresentation.test.ts`
- Modify: `src/components/gameStageWormVisuals.ts`
- Test: `src/components/GameStage.test.ts`

- [ ] **Step 1: Add failing presentation tests for the callout and continuous HUD copy**

Add tests that pin the new player-facing behavior:

```ts
expect(getTargetCallout(summary)).toEqual({
  visible: true,
  title: "TAP POND BLUE",
  progress: "0/2",
  textColor: "#000000",
});

expect(getStagePresentation(summary, "desktop", 1).copy.body).toContain("Remove 2 Pond Blue worms");
```

- [ ] **Step 2: Run the narrow component tests and confirm failure**

Run:

```bash
npx vitest run src/components/gameStageTargetCallout.test.ts src/components/gameStagePhasePresentation.test.ts src/components/GameStage.test.ts
```

Expected: FAIL because the current overlay is phase-based, does not expose target colors, and `GameStage.tsx` has no dedicated callout layer.

- [ ] **Step 3: Implement the overlay split and target callout**

Move HUD and messaging markup into `src/components/GameStageOverlay.tsx` and keep `GameStage.tsx` focused on runtime wiring.

Implementation outline:

```tsx
export function GameStageOverlay({
  hud,
  statusItems,
  targetCallout,
  onLeave,
}: GameStageOverlayProps) {
  return (
    <>
      <GameHUD {...hud} />
      {targetCallout.visible ? (
        <div className={styles.targetCallout}>
          <strong>{targetCallout.title}</strong>
          <span>{targetCallout.progress}</span>
        </div>
      ) : null}
      <div className={styles.statusStrip}>{/* ... */}</div>
    </>
  );
}
```

Presentation requirements:

- The flashed directive text is always black.
- The flashed directive remains visible for 2 seconds, then disappears until the next target is assigned.
- The practical size works on desktop and mobile without covering the entire field.
- Worm rendering uses stronger hue separation and contrast so the named colors are readable in motion.
- `GameStage.tsx` stays below 500 lines after the split.

- [ ] **Step 4: Re-run the focused stage tests**

Run:

```bash
npx vitest run src/components/gameStageTargetCallout.test.ts src/components/gameStagePhasePresentation.test.ts src/components/GameStage.test.ts src/components/gameStageWormVisuals.test.ts
```

Expected: PASS. The stage now presents the continuous color directive, progress text, and clearer worm colors.

- [ ] **Step 5: Review structure and file sizes**

Confirm `src/components/GameStage.tsx` is back under the repo’s 500-line source-file limit and that overlay concerns now live in the new component.

### Task 5: Simplify the home/welcome/game shell and remove the results detour from active play

**Why fifth:** The gameplay loop is now continuous, so the app shell must stop routing players into a results screen, and the launch surfaces need their framing/cropping treatment removed.

**Files:**

- Modify: `src/components/WormRanchApp.tsx`
- Modify: `src/components/WormRanchApp.test.ts`
- Modify: `src/components/WormRanchApp.module.css`
- Modify: `src/components/HomeScreen.module.css`
- Modify: `src/components/WelcomeScreen.tsx`
- Modify: `src/components/WelcomeScreen.module.css`
- Test: `src/components/WelcomeScreen.test.ts`
- Test: `src/components/HomeScreen.test.ts`

- [ ] **Step 1: Add failing tests for the new flow and simplified launch structure**

Add tests that prove:

- starting from home enters gameplay,
- gameplay returns directly to home on quit,
- results are no longer shown in the default flow,
- welcome hero media is rendered in a full-bleed surface instead of the old framed card structure.

Suggested assertions:

```ts
expect(resultsScreenProps).toBeNull();
expect(homeHtml).not.toContain("heroCard");
expect(gameExitProps).not.toBeNull();
```

- [ ] **Step 2: Run the narrow shell tests and confirm failure**

Run:

```bash
npx vitest run src/components/WormRanchApp.test.ts src/components/WelcomeScreen.test.ts src/components/HomeScreen.test.ts
```

Expected: FAIL because the current app still routes through results and the welcome surface still uses the cropped frame card.

- [ ] **Step 3: Implement the shell cleanup**

Implementation requirements:

- Remove results from the default post-start gameplay path.
- Keep `WormRanchGameExit` as the primary escape hatch.
- Change the welcome/home layout so hero media is not clipped by the old card frame.
- Increase gameplay background energy by reducing the heavy dark wash and over-framing in the shell CSS.
- Keep gameplay full-viewport without nested width clamps from the page shell.

Useful structural target:

```tsx
type AppScreen = "welcome" | "home" | "settings" | "game";
```

and in CSS:

```css
.page[data-screen="game"] {
  width: 100vw;
  min-height: 100svh;
  padding: 0;
}

.welcomeSurface {
  position: relative;
  min-height: clamp(420px, 72svh, 760px);
  overflow: clip;
}
```

- [ ] **Step 4: Re-run the focused shell tests and do a dev smoke check**

Run:

```bash
npx vitest run src/components/WormRanchApp.test.ts src/components/WelcomeScreen.test.ts src/components/HomeScreen.test.ts
npm run dev
```

Expected: Tests PASS. In the browser, welcome art is no longer visibly cropped by the old frame treatment, the game opens from home, and quitting returns to home.

- [ ] **Step 5: Mark the flow rewrite complete**

Confirm that the default user path is now `welcome -> home -> game -> home`.

### Task 6: Refresh docs and run final verification

**Why last:** Docs and project focus should only be updated after the shipped behavior and validation commands are settled.

**Files:**

- Modify: `README.md`
- Modify: `docs/jobcard.md`
- Review: `docs/plans/2026-05-31-color-target-relaunch-plan.md`

- [ ] **Step 1: Update the docs to match shipped behavior**

Document these facts:

- gameplay is continuous until the player quits,
- named worm colors drive the target-call system,
- the 2-second directive overlay is part of live gameplay,
- gameplay launch no longer waits on backdrop preload.

- [ ] **Step 2: Run the full verification command**

Run:

```bash
npm run verify
```

Expected: PASS. The repo’s gameplay tests, lint run, and production build all succeed.

- [ ] **Step 3: Perform a manual smoke pass**

Check all of these in the running app:

- The home screen opens gameplay immediately.
- Worm colors are visually distinct at a glance.
- The target-color flash appears for 2 seconds, then hides.
- After two removals of the named color, a new color flash appears.
- Worms keep spawning and gameplay does not auto-end.
- Quit returns cleanly to the home screen.
- The welcome/home media is not visibly cropped by an overlay frame.
- Gameplay backdrop reads brighter and less dull than the current build.

- [ ] **Step 4: Review the final diff and mark the slice ready for implementation review**

Confirm the work stayed within the planned files and did not pull unrelated route or analytics changes into scope.

## Review Gates

- After Task 1: gameplay launch is stable before broader feature work continues.
- After Task 3: engine state fully supports continuous color-target play before UI rewrites continue.
- After Task 4: file sizes and overlay structure satisfy repo boundaries before shell cleanup continues.
- After Task 6: `npm run verify` is green before any branch-finish or deployment step.

## Deployment Notes

- Deploy only after `npm run verify` passes locally.
- Use a preview deployment first so the welcome/home/game visual cleanup can be checked on desktop and mobile.
- If visual regressions appear, roll back by reverting the shell/CSS task independently from the engine tasks; Task 4 and Task 5 are intentionally separated to make that safe.