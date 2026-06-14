# Separate Game Mode Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate endless target-color game mode behind a pre-run mode menu, keep endless play running until a wrong-color bag, hold on a real Game Over window for that mode, and show a shared loading screen between displays.

**Architecture:** Keep gameplay-mode selection at the app shell, not inside individual buttons. `WormRanchApp` will own screen transitions, selected game mode, and the shared loading screen; `GameStage` will accept the chosen mode and only start continuous target-color rules for the endless mode. Endless wrong-color failures will be handled as an app-owned post-round hold so the stage stays visible until the player chooses replay or return-home.

**Tech Stack:** Next.js 16 client components, React 19 state/effects, TypeScript, Vitest

---

### Task 1: Introduce shared game-mode and transition state at the app shell

**Files:**
- Create: `src/game/gameModes.ts`
- Create: `src/components/GameModeScreen.tsx`
- Create: `src/components/ScreenTransition.tsx`
- Modify: `src/components/WormRanchApp.tsx`
- Test: `src/components/WormRanchApp.test.ts`

- [ ] **Step 1: Write the failing app-shell tests**

```ts
it("routes home start through the mode menu instead of entering gameplay immediately", async () => {
  // render with screenState = "home"
  // call homeScreenProps.onStart()
  // expect the next render to contain mode-menu content instead of GameStage
});

it("shows the transition screen before entering gameplay from the mode menu", async () => {
  // select targetEndless from the mode menu
  // start the selected mode
  // expect transition markup before the game screen is rendered
});

it("restarts the selected endless mode after game-over replay", async () => {
  // end the stage with reason: "wrongColor"
  // trigger replay from the endless game-over window
  // expect the app to preserve targetEndless and restart through transition
});
```

- [ ] **Step 2: Run the targeted test file and verify it fails**

Run: `npx vitest run src/components/WormRanchApp.test.ts`

Expected: FAIL because the app still jumps directly from home/settings to `game`, has no mode-menu state, and has no transition screen or replay-hold flow.

- [ ] **Step 3: Add shared mode and transition primitives**

```ts
// src/game/gameModes.ts
export type GameplayMode = "standard" | "targetEndless";

export const DEFAULT_GAMEPLAY_MODE: GameplayMode = "standard";
```

```tsx
// src/components/GameModeScreen.tsx
type GameModeScreenProps = {
  selectedMode: GameplayMode;
  onModeChange: (mode: GameplayMode) => void;
  onBack: () => void;
  onStart: () => void;
};
```

```tsx
// src/components/ScreenTransition.tsx
type ScreenTransitionProps = {
  title: string;
  detail: string;
  reducedMotion: boolean;
};
```

- [ ] **Step 4: Rework `WormRanchApp` state so navigation is explicit**

```ts
type AppScreen = "welcome" | "home" | "settings" | "modeMenu" | "transition" | "game";

type TransitionTarget =
  | { screen: "home" }
  | { screen: "settings" }
  | { screen: "modeMenu" }
  | { screen: "game"; mode: GameplayMode };

type PendingRoundResult = RoundResult | null;
```

```ts
const [selectedMode, setSelectedMode] = useState<GameplayMode>(DEFAULT_GAMEPLAY_MODE);
const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);
const [pendingRoundResult, setPendingRoundResult] = useState<PendingRoundResult>(null);
```

```ts
const beginTransition = (target: TransitionTarget) => {
  setTransitionTarget(target);
  setScreen("transition");
};
```

- [ ] **Step 5: Route launch actions through the mode menu and transition screen**

```ts
const openModeMenu = () => setScreen("modeMenu");

const startSelectedMode = () => {
  beginTransition({ screen: "game", mode: selectedMode });
};

useEffect(() => {
  if (screen !== "transition" || !transitionTarget) {
    return;
  }

  const timer = window.setTimeout(() => {
    if (transitionTarget.screen === "game") {
      setRunProfile(effectiveProfile);
      setScreen("game");
      return;
    }

    setScreen(transitionTarget.screen);
  }, reducedMotion ? 0 : 220);

  return () => window.clearTimeout(timer);
}, [effectiveProfile, reducedMotion, screen, transitionTarget]);
```

- [ ] **Step 6: Render the new surfaces in `WormRanchApp`**

```tsx
{screen === "modeMenu" && (
  <GameModeScreen
    selectedMode={selectedMode}
    onModeChange={setSelectedMode}
    onBack={() => beginTransition({ screen: "home" })}
    onStart={startSelectedMode}
  />
)}

{screen === "transition" && (
  <ScreenTransition
    title="Switching displays"
    detail="Rolling the next ranch surface into place."
    reducedMotion={settings.reducedMotion}
  />
)}
```

- [ ] **Step 7: Re-run the targeted app-shell tests**

Run: `npx vitest run src/components/WormRanchApp.test.ts`

Expected: PASS for mode-menu entry, transition handoff, and preserved endless replay selection.

- [ ] **Step 8: Commit**

```bash
git add src/game/gameModes.ts src/components/GameModeScreen.tsx src/components/ScreenTransition.tsx src/components/WormRanchApp.tsx src/components/WormRanchApp.test.ts
git commit -m "feat: add mode menu transition flow"
```

### Task 2: Wire `GameStage` so standard and endless modes start differently

**Files:**
- Modify: `src/components/GameStage.tsx`
- Modify: `src/game/engine.ts`
- Test: `src/components/GameStage.test.ts`
- Test: `src/game/engine.test.ts`

- [ ] **Step 1: Write the failing startup-mode tests**

```ts
it("does not enable continuous mode when GameStage starts in standard mode", () => {
  // mount GameStage with mode="standard"
  // assert summary targetColor is absent and continuousActive is false
});

it("enables continuous target-color play when GameStage starts in targetEndless mode", () => {
  // mount GameStage with mode="targetEndless"
  // assert targetColor is present and continuousActive is true
});
```

- [ ] **Step 2: Run the targeted stage and engine tests to verify they fail**

Run: `npx vitest run src/components/GameStage.test.ts src/game/engine.test.ts`

Expected: FAIL because `GameStage` always calls `startContinuousMode(world)` during initialization.

- [ ] **Step 3: Add a mode prop to `GameStage`**

```ts
type GameStageProps = {
  backdropUrl?: string | null;
  level: number;
  mode: GameplayMode;
  profile: DisplayProfile;
  reducedMotion: boolean;
  onSummaryChange: (summary: GameSummary) => void;
  onRoundEnd: (result: RoundResult) => void;
  onEvent: (name: EventName, details?: Record<string, unknown>) => void;
};
```

- [ ] **Step 4: Make stage startup conditional**

```ts
const [initialWorld] = useState(() => {
  const world = createWorld(profile, 800, 540, { rules: levelRules });
  if (mode === "targetEndless") {
    startContinuousMode(world);
  } else {
    startRound(world);
  }
  return world;
});
```

```ts
if (nextWorld !== initialWorld) {
  if (mode === "targetEndless") {
    startContinuousMode(nextWorld);
  } else {
    startRound(nextWorld);
  }
}
```

- [ ] **Step 5: Keep engine behavior focused on mode-specific round rules**

```ts
if (world.continuousMode?.active) {
  refillContinuousWorms(world);
  world.targetColor = registerContinuousColorRemoval(world.targetColor, worm.colorId, world.worms, world.runtime);
}
```

This step is verification-driven: only adjust engine code if tests reveal standard startup now needs a small helper or guard. Do not refactor unrelated movement or target-color behavior.

- [ ] **Step 6: Re-run the targeted startup tests**

Run: `npx vitest run src/components/GameStage.test.ts src/game/engine.test.ts`

Expected: PASS for standard startup and endless startup behavior.

- [ ] **Step 7: Commit**

```bash
git add src/components/GameStage.tsx src/game/engine.ts src/components/GameStage.test.ts src/game/engine.test.ts
git commit -m "feat: split standard and endless stage startup"
```

### Task 3: Hold endless-mode wrong-color failures on a real Game Over window

**Files:**
- Create: `src/components/EndlessGameOverWindow.tsx`
- Modify: `src/components/WormRanchApp.tsx`
- Modify: `src/components/WormRanchApp.test.ts`
- Modify: `src/components/gameStagePhasePresentation.ts`

- [ ] **Step 1: Write the failing endless-failure tests**

```ts
it("keeps the game screen mounted after an endless wrong-color result", async () => {
  // fire onRoundEnd({ reason: "wrongColor", ... }) while mode is targetEndless
  // expect the next render to still contain the game surface
});

it("shows replay and yard actions in the endless game-over window", async () => {
  // assert replay and return-home controls render with the failure summary
});
```

- [ ] **Step 2: Run the app-shell tests and verify they fail**

Run: `npx vitest run src/components/WormRanchApp.test.ts`

Expected: FAIL because wrong-color results still leave gameplay immediately.

- [ ] **Step 3: Add the endless failure window**

```tsx
type EndlessGameOverWindowProps = {
  result: RoundResult;
  onReplay: () => void;
  onReturnHome: () => void;
};
```

```tsx
<section role="dialog" aria-modal="true">
  <h2>Game Over</h2>
  <p>{`Wrong color bagged. ${result.collected} worms secured before the miss.`}</p>
  <button autoFocus onClick={onReplay}>Ride again</button>
  <button onClick={onReturnHome}>Yard</button>
</section>
```

- [ ] **Step 4: Change `handleRoundEnd` in `WormRanchApp` so endless wrong-color holds**

```ts
const handleRoundEnd = useCallback((result: RoundResult) => {
  if (selectedModeRef.current === "targetEndless" && result.reason === "wrongColor") {
    setPendingRoundResult(result);
    return;
  }

  beginTransition({ screen: "home" });
}, [beginTransition]);
```

- [ ] **Step 5: Overlay the window on top of gameplay and wire actions**

```tsx
{screen === "game" && pendingRoundResult ? (
  <EndlessGameOverWindow
    result={pendingRoundResult}
    onReplay={() => {
      setPendingRoundResult(null);
      beginTransition({ screen: "game", mode: selectedMode });
    }}
    onReturnHome={() => {
      setPendingRoundResult(null);
      beginTransition({ screen: "home" });
    }}
  />
) : null}
```

- [ ] **Step 6: Keep in-stage copy aligned with the held failure state**

```ts
if (summary.continuousActive && summary.phase === "gameOver") {
  return {
    title: "GAME OVER",
    body: summary.targetColor ? `Wrong color bagged. Target was ${summary.targetColor.label}.` : "Wrong color bagged.",
    hint: "Choose replay or return to yard.",
  };
}
```

- [ ] **Step 7: Re-run the endless-failure tests**

Run: `npx vitest run src/components/WormRanchApp.test.ts`

Expected: PASS for held failure state, replay, and return-home actions.

- [ ] **Step 8: Commit**

```bash
git add src/components/EndlessGameOverWindow.tsx src/components/WormRanchApp.tsx src/components/WormRanchApp.test.ts src/components/gameStagePhasePresentation.ts
git commit -m "feat: hold endless game over for player action"
```

### Task 4: Finish shared transition coverage and full verification

**Files:**
- Modify: `src/components/WormRanchApp.tsx`
- Modify: `src/components/WormRanchApp.test.ts`
- Modify: `src/components/HomeScreen.tsx`
- Modify: `src/components/SettingsScreen.tsx`

- [ ] **Step 1: Write the failing transition-coverage tests**

```ts
it("routes welcome to home through the transition screen", async () => {
  // open the gate from welcome
  // expect transition markup before home
});

it("routes settings back to home through the transition screen", async () => {
  // call settings back action
  // expect transition markup before home
});
```

- [ ] **Step 2: Run the app-shell tests and verify they fail**

Run: `npx vitest run src/components/WormRanchApp.test.ts`

Expected: FAIL anywhere a direct `setScreen(...)` path still bypasses the transition surface.

- [ ] **Step 3: Replace remaining direct screen swaps with transition helpers**

```ts
onOpenGate={() => beginTransition({ screen: "home" })}
onBack={() => beginTransition({ screen: "welcome" })}
onOpenSettings={() => beginTransition({ screen: "settings" })}
onBack={() => beginTransition({ screen: "home" })}
```

- [ ] **Step 4: Keep button components simple**

```tsx
// HomeScreen and SettingsScreen stay presentational:
<button onClick={onStart}>Start roundup</button>
<button onClick={onOpenSettings}>Ranch settings</button>
<button onClick={onBack}>Back to yard</button>
```

No local screen logic belongs in these components; they should keep delegating to `WormRanchApp`.

- [ ] **Step 5: Run the repository validation commands**

Run: `npm run test:engine`

Expected: PASS

Run: `npm run verify`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/WormRanchApp.tsx src/components/WormRanchApp.test.ts src/components/HomeScreen.tsx src/components/SettingsScreen.tsx
git commit -m "feat: route app displays through transition screen"
```
