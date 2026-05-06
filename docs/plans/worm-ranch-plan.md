# Worm Ranch Plan

Status: active, approved for execution

## Goal

Implement the approved mechanics-first redesign so desktop rounds are explicitly capped at 99 catches, the 100th worm is impossible to catch, mobile uses a readable two-hit touch flow, and all phase changes are visible and testable.

## Non-goals

- Do not add multiplayer, accounts, persistence, or a backend beyond best-effort event intake.
- Do not add art pipelines or external animation systems.
- Do not move simulation logic into `src/app` route files.
- Do not collapse desktop and mobile into one vague shared rule set.

## Architecture Summary

- Keep `src/app` responsible for routing shell and API endpoints only.
- Keep simulation rules, types, and deterministic transitions in `src/game`.
- Keep canvas rendering, HUD wiring, and pointer/touch handling in `src/components`.
- Keep silent analytics best-effort in `src/lib` and never let it block gameplay.
- Split entity state by responsibility: worm state, fairy state, round phase state.

## File Responsibilities

### Modify

- `src/game/engine.ts`
  Replace the prototype loop with explicit round phases and per-worm states.
- `src/components/GameStage.tsx`
  Render phase cues, ghost finale visuals, blink cues, and mobile tag feedback.
- `src/components/WormRanchApp.tsx`
  Simplify shell copy and HUD to match the approved player-facing design.
- `src/lib/logger.ts`
  Extend event names for phase changes, morph completion, and ghost finale.
- `src/app/api/events/route.ts`
  Accept the expanded best-effort event payloads.
- `docs/jobcard.md`
  Update focus as each major task completes.
- `docs/plans/worm-ranch-plan.md`
  Keep active until implementation is complete and user-verified.

### Create

- `src/game/types.ts`
  Shared round, worm, fairy, and action state definitions.
- `src/game/rules.ts`
  Desktop and mobile rule constants in one focused module.
- `src/game/engine.test.ts`
  Deterministic tests for phase and interaction rules.

### Leave Untouched Unless Required By Failing Validation

- `src/app/layout.tsx`
- `src/app/globals.css`
- `.github/copilot-instructions.md`
- `.copilotignore`
- `next.config.ts`

## Ordered Tasks

### Task 1: Normalize the gameplay model

Dependency: none

1. Create `src/game/types.ts` with explicit states:
   - round phases: `introCountdown`, `activeChase`, `blinkBand`, `ghostFinale`, `resolved`
   - desktop worm states: `roaming`, `blinkCharged`, `blinkRecover`, `ghost`, `captured`, `escaped`
   - mobile worm states: `roaming`, `tagged`, `captured`, `escaped`
   - fairy states: `rising`, `fading`, `gone`
2. Create `src/game/rules.ts` with separate desktop and mobile rule objects.
3. Refactor `src/game/engine.ts` to depend on those modules instead of keeping all state inline.
4. Add deterministic seams for randomness and ID generation without changing current gameplay rules, input semantics, or player-facing copy.

Test-first step:

1. Write failing tests in `src/game/engine.test.ts` proving the engine can initialize desktop with 100 worms and mobile with 10 worms, and that the initial engine-owned round phase is explicit.
2. Add a narrow `test:engine` script in `package.json` using Vitest.
3. Run `npm run lint` and `npm run test:engine`; expect test failures only for the unimplemented state model.

Implementation step:

1. Add the new files and update engine imports.
2. Keep each file below 500 lines by moving helpers out instead of extending one large engine file.
3. Keep Task 1 engine-model only; do not move app-shell screens into the engine or change current desktop/mobile interaction semantics.

Validation:

1. Run `npm run lint`
Expected outcome: no lint errors.
2. Run `npm run test:engine`.
Expected outcome: the new initialization and phase-surface tests pass.
3. Run `npm run verify`.
Expected outcome: no lint or build regressions.

### Task 2: Implement desktop chase, blink, and impossible finale rules

Dependency: Task 1

1. Add deterministic transitions in `src/game/engine.ts` for:
   - countdown blocks captures and panic
   - every desktop capture adds exactly `0.1` max speed to all survivors
   - at exactly 50 captures, every surviving worm gets one blink charge
   - first accurate click on a charged worm teleports and never captures
   - final remaining worm becomes `ghost`
   - ghost worm has infinite teleports and cannot be captured
   - round resolves as a dedicated ghost-escape outcome, never 100/100

Test-first step:

1. Add failing tests for each desktop rule above.
2. Run the narrow engine test command and confirm only the new desktop expectations fail.

Implementation step:

1. Add ghost worm identification to round state.
2. Add bounded teleport positioning and teleport-consumption logic.
3. Add explicit round result reason for `ghostEscaped` or equivalent dedicated finale result.

Validation:

1. Run the narrow engine test command.
Expected outcome: all desktop rule tests pass.
2. Run `npm run lint`.
Expected outcome: no lint errors after the engine refactor.

### Task 3: Implement mobile two-hit touch flow

Dependency: Task 1

1. Use the approved interpretation: each worm requires exactly two accurate taps, not literal browser double-clicks.
2. First touch anywhere must start global panic on the next simulation step.
3. First accurate tap on a worm moves it to `tagged` and shows visible `1/2` progress.
4. Second accurate tap captures the worm.
5. Tag state must be readable and must not be confused with desktop blink state.

Test-first step:

1. Add failing tests for first-touch panic, first tap tagging, and second tap capture.
2. Run the narrow engine test command and confirm the mobile expectations fail before implementation.

Implementation step:

1. Add mobile-only tag progress state to worms.
2. Keep mobile hit forgiveness and touch timing in `src/game/rules.ts`.

Validation:

1. Run the narrow engine test command.
Expected outcome: mobile interaction tests pass.
2. Run `npm run lint`.
Expected outcome: no lint regressions.

### Task 4: Render the phase language and entity readability

Dependency: Tasks 2 and 3

1. Update `src/components/GameStage.tsx` so phase changes are visible:
   - countdown state
   - live chase state
   - blink-armed state
   - ghost finale state
2. Add visible blink charge cues on desktop worms.
3. Add ghost worm silhouette or color treatment distinct from normal worms.
4. Add mobile tag feedback showing `1/2` before capture.
5. Keep fairy morph readable: hit, morph, rise, fade, gone.

Test-first step:

1. No unit test required for pure drawing changes if engine behavior is already covered.
2. Validate by wiring the render layer to tested engine state rather than inventing new logic in the component.

Implementation step:

1. Keep render-only calculations in the component.
2. Do not move any rule decisions out of the engine.

Validation:

1. Run `npm run lint`.
Expected outcome: no component lint errors.
2. Run `npm run build`.
Expected outcome: app builds successfully with the updated canvas and HUD wiring.

### Task 5: Reduce HUD and settings cognitive load

Dependency: Task 4

1. Update `src/components/WormRanchApp.tsx` HUD to show only:
   - bagged
   - remaining
   - time
   - phase chip
2. Phase chip text must change by state:
   - `Blinks arm in N`
   - `Blinks live`
   - `Ghost escaping`
3. Keep settings minimal:
   - display mode
   - reduced motion
   - silent analytics
4. Remove or demote non-decision UI such as fairy count and raw speed bonus from primary HUD.

Test-first step:

1. Structural review only unless UI state becomes hard to reason about.

Implementation step:

1. Keep shell copy concise and specific to the active profile.
2. Do not explain both desktop and mobile rules in the same large paragraph on the home screen.

Validation:

1. Run `npm run lint`.
Expected outcome: no shell regressions.
2. Run `npm run build`.
Expected outcome: app shell and gameplay route compile cleanly.

### Task 6: Expand silent analytics to the approved event model

Dependency: Tasks 2 through 5

1. Extend logger events to include:
   - `profile_detected`
   - `round_started`
   - `worm_collected`
   - `worm_teleported`
   - `worm_morphed`
   - `first_touch_rush_triggered`
   - `ghost_finale_started`
   - `round_ended`
2. Update `src/app/api/events/route.ts` to accept the expanded event set without blocking gameplay.

Test-first step:

1. Structural validation only unless logger parsing becomes nontrivial.

Implementation step:

1. Preserve `sendBeacon` first, `fetch` fallback behavior.
2. Do not add any user-facing analytics UI.

Validation:

1. Run `npm run lint`.
Expected outcome: no logger typing or route issues.
2. Run `npm run build`.
Expected outcome: route handler and client logger compile cleanly.

### Task 7: Full verification and review

Dependency: Tasks 1 through 6

1. Run the narrow engine test command.
Expected outcome: all engine rule tests pass.
2. Run `npm run verify`.
Expected outcome: lint and production build pass.
3. Manual review in `npm run dev`:
   - desktop countdown blocks interaction
   - desktop 50th catch arms visible blinks
   - desktop last worm becomes ghost and cannot be captured
   - mobile first touch starts panic
   - mobile worms require exactly two accurate taps
   - captures morph into fairies and float off screen

## Commands To Add Or Use

Current commands:

- `npm run lint`
- `npm run build`
- `npm run verify`

Planned command addition:

- add an engine-focused test script to `package.json`

Recommended final command sequence per completed task:

1. narrow engine test command
2. `npm run lint`
3. `npm run build` when render or routing changes are touched
4. `npm run verify` before calling the redesign complete

## Review Checklist

- 100/100 is impossible on desktop and expressed intentionally, not as a bug.
- The ghost finale is visible in both worm rendering and HUD copy.
- Desktop blink charges are visible before they are consumed.
- Mobile uses the approved two-tap interpretation, not browser double-click semantics.
- Each file remains below 500 lines.
- Silent analytics never interrupt input or round transitions.

## Deployment Steps

1. Run `npm run verify`.
Expected outcome: zero lint errors and successful production build.
2. Run a final manual smoke check with `npm run dev`.
Expected outcome: desktop and mobile rule paths both feel readable.
3. Deploy to Vercel.
Expected outcome: preview build works without server-side gameplay dependencies.

Archive note: keep this plan active until the redesign is implemented and verified by the user. Archive after user verification.
