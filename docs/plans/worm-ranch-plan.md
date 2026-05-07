# Worm Ranch Plan

Status: implemented and verified, awaiting manual mobile smoke check

## Goal

Keep the launch flow light and replay-focused by stripping the home screen down to catchy titles and essential actions, while making the mobile timer feel like a constant motivation cue instead of buried HUD admin data.

## Scope

- Simplify the `home` screen down to title-first launch controls.
- Remove the home diagnostics strip and the long explanatory rules paragraph.
- Reuse the existing mobile HUD clock as a permanent countdown cue.
- Refresh repo docs so they match the shipped launch flow, timer presentation, and validation path.

## Non-goals

- Do not rewrite the welcome media flow again.
- Do not broaden this pass into new gameplay rules beyond the already-shipped easier opening touch feel.
- Do not add a second mobile timer component when the existing status item can carry the cue.

## Owning Files

- `src/components/HomeScreen.tsx`
- `src/components/HomeScreen.module.css`
- `src/components/WormRanchApp.tsx`
- `src/components/gameStagePhasePresentation.ts`
- `src/components/HomeScreen.test.ts`
- `src/components/gameStagePhasePresentation.test.ts`
- `README.md`
- `docs/jobcard.md`

## Implemented Slice

1. Removed the long rules copy and scan-strip diagnostics from the home screen.
2. Kept the home surface to a kicker, a short title, and the existing start/settings/back actions.
3. Reframed the mobile HUD clock as `Beat bell` with an always-visible `Xs left` countdown during live play.
4. Updated docs to describe the current launch flow, timer cue, and verification path.

## Validation

1. `npx vitest run src/components/HomeScreen.test.ts src/components/gameStagePhasePresentation.test.ts`
Expected outcome: the simplified home screen and motivating mobile timer behavior both pass focused tests.
2. `npm run verify`
Expected outcome: the full repo gameplay/component tests, lint, and production build all pass.

## Remaining Manual Check

1. Play one mobile round and confirm the `Beat bell` timer stays readable without crowding the compact HUD.
2. Confirm the title-only home screen still feels clear on desktop and mobile without the removed diagnostics strip.
