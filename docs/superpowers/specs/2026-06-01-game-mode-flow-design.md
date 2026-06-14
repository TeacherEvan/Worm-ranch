# Game Mode Flow Design

**Status:** 🔄 **Active — Design Complete, Implementation Pending**

## Problem

Worm Ranch currently boots directly into one gameplay path that always starts continuous play inside `GameStage`. That creates two player-facing problems:

1. The endless target-color behavior is not exposed as a distinct mode, even though the engine already contains continuous spawning and wrong-color fail logic.
2. Wrong-color failures do not surface as a visible Game Over state because the app immediately routes back home when the stage ends.

The requested update is to introduce a separate game mode menu, preserve endless target-color play as its own selectable mode, keep worms spawning forever in that mode until the player bags the wrong color, and add a shared loading screen between displays.

## Goals

- Add a game mode menu before every run starts.
- Preserve the current standard run as its own selectable mode.
- Add an endless target-color mode where worms keep spawning and the run only ends on a wrong-color bag.
- Show a real Game Over window in endless mode and wait for player input before leaving the stage.
- Show a shared loading screen during display handoffs.

## Non-Goals

- Reworking the existing standard-mode rules beyond what is needed to separate them from endless mode.
- Replacing the existing in-stage HUD language or core worm rendering.
- Adding progression, scoring ladders, or persistence for game mode selection.

## Root Cause Summary

### Endless mode behavior

The engine already supports continuous play:

- `startContinuousMode(world)` enables target-color play.
- `applyAccuratePress` refills worms after correct captures.
- `finishWorld(world, "wrongColor")` is the intended ending condition for wrong-color bags.

The engine is therefore close to the desired endless behavior already.

### Missing Game Over window

`GameStage` correctly detects a round result and emits `onRoundEnd(roundResult)`. The app-level handler in `WormRanchApp` currently routes straight back to home, which prevents the game-over presentation from remaining on screen long enough to be seen or acted on.

### Missing loading screen

`WormRanchApp` swaps directly between `welcome`, `home`, `settings`, and `game`. There is no transition state that can render a shared handoff screen during navigation.

## Proposed Architecture

### 1. App-level screen flow

Add two new app-level concepts:

- `modeMenu` screen: displayed before gameplay starts
- `transition` screen: shared loading state between any two displays

The high-level flow becomes:

- `welcome`
- `home`
- `settings`
- `modeMenu`
- `transition`
- `game`

Every screen change should pass through a small transition helper so the loading screen can be shown consistently instead of duplicating transition logic at each button handler.

### 2. Explicit game mode selection

Introduce a selected game mode in app state, with at least:

- `standard`
- `targetEndless`

The mode menu owns the choice. `GameStage` receives the selected mode and initializes the engine accordingly.

### 3. Split gameplay startup by mode

`GameStage` should stop unconditionally calling `startContinuousMode` on mount.

- `standard` mode starts a normal world and follows the standard level/profile rules.
- `targetEndless` mode starts continuous mode and uses the target-color HUD/game-over presentation.

This change makes the mode behavior explicit and avoids accidentally applying endless rules to every run.

### 4. Endless-mode failure hold

When `targetEndless` ends because of `wrongColor`:

- keep the stage mounted
- keep the final summary visible
- show a dedicated Game Over window/modal over the stage
- wait for player input

Expected actions:

- `Ride again`: restart the same mode through the shared loading transition
- `Yard`: return to home through the shared loading transition

Standard mode can continue using its existing end flow unless implementation reveals a shared result surface is simpler and does not change standard behavior.

### 5. Shared loading screen

Add one reusable loading screen component for display handoffs. It should:

- render between all display changes, including the new mode menu
- use the repo’s existing loader tone rather than introducing a disconnected visual language
- support reduced motion
- disappear automatically once the destination screen is ready

The transition layer should be app-owned rather than embedded in individual screens so the behavior stays consistent.

## UX Details

### Mode menu

The game mode menu should be a dedicated window/screen before the run starts. It must clearly present:

- Standard mode
- Endless target-color mode

Each option should include short descriptive copy so the player understands the rules before starting.

### Endless Game Over window

The endless failure window should clearly state:

- that the run ended because the wrong color was bagged
- what the target color was
- how many worms were bagged before failure

Primary action focus should land on replay.

### Loading screen behavior

Loading must appear during transitions for:

- welcome -> home
- home/settings -> mode menu
- mode menu -> game
- game -> home
- any equivalent reverse route between displays

The loading screen does not need to fake long waits; it only needs to provide a visible handoff state so transitions feel intentional instead of abrupt.

## File-Level Plan

Likely touched areas:

- `src/components/WormRanchApp.tsx`
  - add mode menu state
  - add transition state
  - hold endless game-over flow until player action
- `src/components/GameStage.tsx`
  - accept a game mode prop
  - only start continuous mode for the endless target-color mode
- `src/game/engine.ts`
  - likely no core rule change beyond any mode-specific wiring discovered during implementation
- `src/components/*`
  - add a mode menu screen/window
  - add a shared loading screen
  - add a dedicated endless game-over window or adapt an existing result surface carefully
- tests around app flow and gameplay mode startup

## Testing Strategy

Add or update tests to cover:

1. Standard mode start path does not automatically enter continuous target-color play.
2. Endless target-color mode keeps spawning replacements after correct bags.
3. Endless target-color mode ends on wrong-color bags and keeps the Game Over window visible until player action.
4. App navigation routes through the loading screen between displays.
5. Replay from endless Game Over restarts the same mode.

## Risks and Mitigations

### Risk: mode wiring accidentally changes standard gameplay

Mitigation: make mode selection explicit and add tests that standard mode does not start continuous behavior.

### Risk: loading state creates flicker or double navigation

Mitigation: centralize transitions in `WormRanchApp` instead of triggering them ad hoc from multiple components.

### Risk: Game Over overlays conflict with existing in-stage overlay text

Mitigation: keep the modal/window app-owned or clearly layered above the stage so failure actions are unambiguous.
