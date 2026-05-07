# Worm Ranch Plan

Status: active, ready for implementation

## Approved Design Assumption

This plan assumes the approved direction is a welcome-screen refresh centered on generated key art: a cinematic, exaggerated “worm-riding-snake memory” scene that feels scrappy, mischievous, and space-ranch rather than clip-art or hand-drawn placeholder art. The art is decorative background storytelling, while the text layer stays calmer, shorter, and easier to scan.

## Goal

Replace the current abstract CSS-drawn welcome art with art-directed generated hero imagery, reduce the welcome screen’s information density, and keep the resulting implementation fast, responsive, and isolated from gameplay logic.

## Non-goals

- Do not change gameplay rules, input timing, scoring, or analytics behavior.
- Do not move simulation logic into `src/app` or the welcome screen.
- Do not add an external CMS, image service dependency, or runtime art generation.
- Do not broaden the redesign into the game, results, or settings screens unless validation exposes a layout dependency.
- Do not keep adding styles to `src/components/WormRanchApp.module.css`; split welcome-only presentation into focused files.

## Architecture Summary

- Keep `src/app/page.tsx` as the route shell only.
- Keep the welcome-screen composition in `src/components`.
- Treat the first-load header as part of the welcome redesign rather than a permanently global block; give it explicit component ownership so welcome density can change without accidentally restyling game or settings views.
- Treat generated art as a static asset served from `public`.
- Use a focused welcome component and welcome-specific CSS module so source files stay readable and under repo size limits.
- Keep the generated art decorative; the actionable content remains text and buttons in the React layer.
- Preserve `reducedMotion` handling so any ambient movement can be disabled without affecting navigation.

## File Responsibilities

### Modify

- `src/components/WormRanchApp.tsx`
  Replace the inline welcome-screen markup with focused component calls, keep screen-state ownership in one place, and stop treating the first-load header as an unowned shared block.
- `package.json`
  Extend `test:engine` so the new welcome presentation test is part of the normal verification path.
- `docs/jobcard.md`
  Track implementation progress for the welcome refresh.
- `docs/plans/worm-ranch-plan.md`
  Keep this plan active until the new welcome screen is implemented and approved.

### Create

- `src/components/WelcomeScreen.tsx`
  Own the welcome-screen structure, CTA wiring, and decorative art composition.
- `src/components/WelcomeScreen.module.css`
  Own the welcome-screen layout, art framing, overlays, and responsive behavior.
- `src/components/WormRanchShellHeader.tsx`
  Own the title, eyebrow, and scan chips with a `welcome` and `standard` density variant so the first-load screen can simplify without broad shell churn.
- `src/components/welcomeHeroPresentation.ts`
  Define the static asset metadata, crop intent, decorative treatment toggles, and any reduced-motion-friendly presentation flags.
- `src/components/welcomeHeroPresentation.test.ts`
  Verify the selected asset metadata and reduced-motion presentation behavior without needing a full browser test harness.
- `public/art/welcome-memory-desktop.webp`
  Primary landscape key art for desktop.
- `public/art/welcome-memory-mobile.webp`
  Alternate crop for narrow viewports if the desktop crop does not preserve the rider silhouette and CTA space.

### Leave Untouched Unless Validation Forces a Small Follow-up

- `src/game/**`
- `src/lib/**`
- `src/app/api/**`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `next.config.ts`

## Ordered Tasks

### Task 1: Lock the welcome-screen ownership boundary

Dependency: none

1. Create `src/components/WormRanchShellHeader.tsx` and move the current title, eyebrow, and chip block out of `src/components/WormRanchApp.tsx`.
2. Give the header a `welcome` density variant so the first-load screen can reduce copy and chip count without changing the rest of the app shell by accident.
3. Create `src/components/WelcomeScreen.tsx` and move the current welcome-screen JSX out of `src/components/WormRanchApp.tsx`.
4. Create `src/components/WelcomeScreen.module.css` and move all welcome-only styles out of `src/components/WormRanchApp.module.css`.
5. Keep `WormRanchApp` responsible only for screen state, shared metrics, and CTA callbacks.
6. Preserve current button behavior exactly: `Open the gate` routes to home and `Rig the tack` routes to settings.

Test-first step:

1. No new unit test is required for the extraction itself.
2. Before styling changes, run `npm run lint` to confirm the current baseline is clean.

Implementation step:

1. Keep the extraction behavior-preserving except for the intentional welcome-header density reduction.
2. Do not alter gameplay, settings, or results markup in this task.
3. Remove dead welcome selectors from `src/components/WormRanchApp.module.css` once the new module owns them.

Validation:

1. Run `npm run lint`.
Expected outcome: no lint errors after the component split.
2. Run `npm run build`.
Expected outcome: the app still compiles and the home route renders through `WormRanchApp`.

### Task 2: Add the generated-art presentation model

Dependency: Task 1

1. Create `src/components/welcomeHeroPresentation.ts` with typed metadata for:
   - desktop asset path
   - mobile asset path
   - focal point or crop intent
   - overlay strength
   - whether ambient motion layers should be enabled
2. Create `src/components/welcomeHeroPresentation.test.ts` covering:
   - desktop asset selection for wide layouts
   - mobile asset selection for narrow layouts
   - reduced-motion disabling any optional motion layer flags
3. Keep the presentation helper pure so it can be verified in Vitest without browser-only APIs.
4. Update `package.json` so `npm run test:engine` includes `src/components/welcomeHeroPresentation.test.ts`.

Test-first step:

1. Write the presentation tests first.
2. Run `npm run test:engine` and confirm the new welcome presentation tests fail for missing implementation only.

Implementation step:

1. Implement the helper with plain objects and narrow functions.
2. Do not put image-selection logic directly in JSX if it can live in the helper.

Validation:

1. Run `npm run test:engine`.
Expected outcome: the new welcome presentation tests pass alongside existing tests.
2. Run `npm run lint`.
Expected outcome: no type or lint regressions.

### Task 3: Approve and stage the generated art assets

Dependency: Task 2

1. Produce candidate images using the asset brief in this plan.
2. Select one approved desktop image and, if needed, one approved mobile crop before any layout integration begins.
3. Add the approved generated art files under `public/art/` only after the crop and composition are signed off.
4. Reject assets that hide the rider silhouette behind copy-safe zones or that force unreadable overlays.

Test-first step:

1. Structural review only.
2. Before accepting the files, compare the candidates against the copy-safe zone and mobile-crop requirements listed in this plan.

Implementation step:

1. Keep filenames stable once approved so layout work does not chase moving asset targets.
2. If the desktop art cannot crop cleanly to mobile, require the dedicated mobile asset now instead of forcing a later redesign.

Validation:

1. Confirm both approved files exist under `public/art/`.
Expected outcome: the desktop asset is ready, and the mobile asset exists when one shared crop is not sufficient.

### Task 4: Integrate static key art into the welcome hero

Dependency: Task 3

1. In `src/components/WelcomeScreen.tsx`, render the approved art with `next/image` so the browser gets responsive sizing, preload priority, and stable layout.
2. Keep the art decorative with `alt=""` and `aria-hidden` if the copy already conveys the experience.
3. Add overlay treatments in `src/components/WelcomeScreen.module.css` that keep buttons readable without burying the art.
4. Preserve a dedicated text-safe zone so the rider silhouette and worm-snake action remain visible on both desktop and mobile.

Test-first step:

1. Re-run `npm run test:engine` before integration to confirm the helper tests remain green.
2. Start `npm run dev` and use the current welcome screen as the visual baseline for layout, button positions, and first-load behavior.

Implementation step:

1. Use static imports or direct `/art/...` paths consistently in one approach.
2. Prefer subtle ambient overlays over rebuilding the old worm/fence CSS illustration.
3. Keep the welcome art load path local and offline-safe.

Validation:

1. Run `npm run lint`.
Expected outcome: no Next.js image or accessibility lint failures.
2. Run `npm run build`.
Expected outcome: image optimization and production compilation succeed.
3. Run `npm run dev`.
Expected outcome: the welcome hero paints with no layout jump and no broken image references.

### Task 5: Rewrite the welcome copy for faster scanning

Dependency: Task 4

1. Shorten the hero deck and any surrounding welcome metrics so the screen reads as one scene, one promise, and two actions.
2. Keep the tone mischievous and space-ranch, but remove copy that feels overloaded or apologizes for the art.
3. Ensure the welcome text complements the new “memory” art instead of explaining game rules that already belong on the home screen.
4. Keep primary CTA labels stable unless the user explicitly approves different wording.

Test-first step:

1. Structural review only.
2. Before editing copy, identify which lines still need to remain visible above the fold on a narrow mobile viewport.

Implementation step:

1. Favor one short eyebrow, one strong heading, and one compact support paragraph.
2. Keep welcome metrics secondary and scannable.

Validation:

1. Run `npm run lint`.
Expected outcome: no JSX regressions.
2. Manual check in `npm run dev` at a narrow viewport.
Expected outcome: no overflow, awkward wrapping, or CTA displacement.

### Task 6: Tune responsive behavior and reduced-motion handling

Dependency: Tasks 4 and 5

1. Verify the desktop and mobile crops independently.
2. If one asset cannot crop well enough for both widths, keep the dedicated mobile asset rather than forcing one compromised image.
3. Disable or simplify any ambient overlay motion when `reducedMotion` is enabled.
4. Ensure the hero still feels intentional on touch devices where hover styles do not apply.

Test-first step:

1. Extend `src/components/welcomeHeroPresentation.test.ts` before changing logic if responsive selection rules change.
2. Re-run the narrow test command and confirm only the new responsive expectations fail.

Implementation step:

1. Keep any viewport-based branching inside the presentation helper or CSS, not spread across multiple components.
2. Do not add runtime resize listeners just for decorative art.

Validation:

1. Run `npm run test:engine`.
Expected outcome: presentation tests still pass.
2. Run `npm run verify`.
Expected outcome: lint, tests, and production build all pass.

### Task 7: Manual review, asset QA, and sign-off

Dependency: Tasks 1 through 6

1. Review the welcome screen in `npm run dev` at approximately `1440x900`, `1024x768`, `768x1024`, and `390x844`.
2. Confirm the rider silhouette, worm-snake action, and CTA area remain readable in each layout.
3. Check that the art compression is acceptable:
   - no obvious banding in gradients
   - no blurry rider focal point
   - no distracting halos around subject edges
4. Confirm that the home, settings, game, and results screens are visually untouched unless intentionally adjusted during extraction.

Validation:

1. Run `npm run verify` one final time.
Expected outcome: full verification passes.
2. Capture screenshots for desktop and mobile welcome states for user approval.
Expected outcome: one desktop and one mobile image clearly show the final composition.

## Asset Brief For The Generated Images

Use this brief when producing the actual hero art outside the repo:

- Subject: a worm riding a snake like an exaggerated, half-mythic ranch memory.
- Tone: extreme, kinetic, mischievous, strange, not polished-corporate.
- Setting: dusty space-ranch at dusk or night, with atmospheric glow rather than flat cartoon daylight.
- Composition: strong central silhouette with negative space preserved for copy and CTA buttons.
- Avoid: clip-art eyes, children’s-book proportions, meme collage, realistic horror, or muddy low-contrast backgrounds.
- Output target: landscape hero around `1600x1100` for desktop and portrait crop around `900x1200` for mobile.
- Export target: `.webp`, optimized for web, with the focal subject remaining sharp after compression.

## Commands And Expected Outcomes

1. `npm run lint`
Expected outcome: no ESLint errors after each major UI slice.
2. `npm run test:engine`
Expected outcome: existing tests plus `src/components/welcomeHeroPresentation.test.ts` pass.
3. `npm run build`
Expected outcome: production build succeeds with the new image assets.
4. `npm run verify`
Expected outcome: end-to-end repo verification passes before review.
5. `npm run dev`
Expected outcome: manual welcome-screen smoke test is possible on desktop and mobile viewports.

## Review And Deployment Steps

1. Request design review on the desktop and mobile welcome screenshots before merging.
2. If the art direction is approved but the crop is not, regenerate or recrop assets before touching layout again.
3. Merge only after `npm run verify` passes and manual smoke checks confirm the rest of the app is unaffected.
4. Deploy through the normal Vercel path after approval; no infrastructure changes are required.

## Self-Review Checklist

- Coverage: every welcome-screen requirement maps to a task.
- Order: extraction happens before asset integration, so the art work lands in focused files.
- Specificity: file paths, commands, and validation outcomes are explicit.
- Testability: the new helper is unit-testable and the visual work has manual QA steps.
- Scope: gameplay, analytics, and route architecture stay out of the redesign.
