# Worm Ranch Plan

Status: implemented, smoke-checked, and verified

## Goal

Move backdrop theming decisively into gameplay, add deterministic level progression, and make each new ride meaningfully harder without touching the welcome/startup surface.

## Scope

- Tie the staged gameplay backdrops to numbered gameplay levels instead of startup media.
- Add deterministic level progression across completed rounds.
- Apply profile-specific rule overrides per level so higher levels materially change play.
- Surface the current level in gameplay copy and the results tally.
- Refresh repo docs so they describe the shipped gameplay-level behavior.

## Non-goals

- Do not redesign the welcome screen again.
- Do not add a second HUD system when the existing gameplay overlay can carry level context.
- Do not convert the game into a multi-map navigation flow or a campaign screen.

## Owning Files

- `src/game/levels.ts`
- `src/game/levels.test.ts`
- `src/components/gameStageBackdropRotation.ts`
- `src/components/gameStageBackdropRotation.test.ts`
- `src/components/wormRanchLevelFlow.ts`
- `src/components/wormRanchLevelFlow.test.ts`
- `src/components/WormRanchApp.tsx`
- `src/components/WormRanchApp.test.ts`
- `src/components/GameStage.tsx`
- `src/components/GameStage.test.ts`
- `src/components/gameStagePhasePresentation.ts`
- `src/components/gameStagePhasePresentation.test.ts`
- `src/components/ResultsScreen.tsx`
- `src/components/ResultsScreen.test.ts`
- `README.md`
- `docs/jobcard.md`

## Implemented Slice

1. Re-routed staged art so the gameplay field owns backdrop theming and level-to-backdrop mapping.
2. Added deterministic numbered gameplay levels and per-profile rule ramps through the existing rule override seam.
3. Threaded the played level through gameplay copy, results, and replay progression.
4. Added focused regression coverage for level rules, backdrop mapping, stage presentation, app-shell level handoff, and results.
5. Updated docs to match the shipped gameplay-level behavior.

## Validation

1. `npx vitest run src/components/wormRanchLevelFlow.test.ts src/components/gameStageBackdropRotation.test.ts src/components/gameStagePhasePresentation.test.ts src/components/GameStage.test.ts src/components/WormRanchApp.test.ts`
Expected outcome: level progression, backdrop mapping, gameplay copy, and app-shell replay handoff all pass focused tests.
2. `npm run verify`
Expected outcome: the full repo gameplay/component tests, lint, and production build all pass.

## Manual Smoke Check

1. Desktop gameplay pass: the level HUD, bagged tally, and leave action remained readable over the gameplay backdrop while the staged art stayed decorative behind active worms.
2. Mobile gameplay pass: the `Beat bell` timer, bag rule chip, and level copy all fit cleanly in the compact HUD without obscuring the active play space.
3. Backdrop check: the gameplay backdrop stayed subdued enough that worms, target rings, and feedback cues remained easy to pick out at a glance.
