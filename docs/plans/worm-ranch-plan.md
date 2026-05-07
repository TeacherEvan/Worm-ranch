# Worm Ranch Plan

Status: active, ready for implementation

## Approved Design Assumption

This plan assumes the approved direction is the serious, cinematic welcome-art option shown in the browser review: moonlit outlaw realism with a lone rider mounted on a giant worm-snake silhouette crossing a dusty alien ranch at night. The image should read like premium key art, not cute, not abstract placeholder illustration, and not a neon fever-dream.

## Goal

Replace the current welcome hero art with a much stronger Hugging Face-generated desktop/mobile asset pair while keeping the existing welcome component structure, calm copy, and two-action layout intact.

## Non-goals

- Do not rewrite the welcome component tree again.
- Do not change gameplay rules, app flow, analytics, install behavior, or PWA files.
- Do not add runtime image generation, external fetches, or product dependencies on Hugging Face.
- Do not broaden this pass into home, settings, game, or results screens unless the new art exposes a narrow layout defect.
- Do not change CTA wording unless the final crop forces a tiny copy-wrap fix.

## Architecture Summary

- Keep `src/components/WelcomeScreen.tsx` as the integration point for the welcome hero.
- Keep `src/components/welcomeHeroPresentation.ts` as the single source of truth for art asset metadata, crop intent, safe zones, and reduced-motion presentation flags.
- Treat Hugging Face generation as an offline asset pipeline that ends in static files under `public/art/`.
- Tune readability in `src/components/WelcomeScreen.module.css`; do not spread art-specific positioning logic across unrelated components.
- Preserve stable asset filenames when possible so the runtime code changes stay minimal.

## File Responsibilities

### Modify

- `docs/jobcard.md`
  Track the focused art-refresh slice instead of the broader welcome redesign.
- `docs/plans/worm-ranch-plan.md`
  Keep this plan current until the approved art pass is shipped.
- `public/art/welcome-memory-desktop.webp`
  Replace the current desktop placeholder with the approved Hugging Face desktop master.
- `public/art/welcome-memory-mobile.webp`
  Replace the current mobile placeholder with the approved narrow crop or dedicated mobile render.
- `src/components/welcomeHeroPresentation.ts`
  Update metadata only if the final art requires different crop intent, safe-zone naming, or layout selection rules.
- `src/components/welcomeHeroPresentation.test.ts`
  Update tests first if the helper contract changes.
- `src/components/WelcomeScreen.module.css`
  Adjust overlay strength, object positioning, or safe-zone styling if the new art needs a tighter fit.
- `src/components/WelcomeScreen.tsx`
  Touch only if `sizes`, preload behavior, or hero wiring needs a small follow-up after the asset swap.

### Leave Untouched Unless Validation Forces a Small Follow-up

- `src/components/WormRanchApp.tsx`
- `src/components/WormRanchShellHeader.tsx`
- `src/game/**`
- `src/lib/**`
- `src/app/**`
- `package.json`

## Approved Art Brief

- Subject: one clear rider silhouette mounted on a massive worm-snake hybrid crossing a dusty alien ranch.
- Mood: cinematic, moody, dangerous, and premium rather than playful or goofy.
- Lighting: cold moonlight with restrained warm dust highlights.
- Palette: midnight blues, steel grays, dusted amber accents; avoid purple-heavy or candy neon color balance.
- Desktop composition: keep the main action left-of-center so the right copy column can stay readable.
- Mobile composition: keep the rider and the strongest curve of the creature above the lower copy band.
- Surface quality: crisp silhouette edges, readable anatomy, no mushy faces, no extra limbs, no text baked into the art.
- Negative prompt: cartoon mascot style, clip-art, childish proportions, oversaturated pink-purple glow, distorted anatomy, watermarks, logos, captions, collage artifacts.
- Export requirement: deliver local WebP files only, with a desktop master at or above `1600x900` and a mobile master at or above `900x1400` before final compression.

## Ordered Tasks

### Task 1: Lock the Hugging Face prompt pack and candidate gate

Dependency: none

1. Convert the art brief above into one exact positive prompt and one exact negative prompt for the generation run.
2. Decide whether to use the Hugging Face browser workflow or a VS Code extension; install the extension only if it reduces export friction for this repo-local asset pass.
3. Generate at least three desktop candidates in the approved direction before choosing one.
4. Reject any candidate that looks cartoony, muddy, text-stamped, or too busy for the existing copy-safe zones.

Test-first step:

1. Structural review only.
2. Before accepting any image, compare it against the brief in this plan and confirm it still supports the current right-column desktop copy layout.

Implementation step:

1. Keep the prompt pack in the working notes or PR description so the generation path is reproducible.
2. Prefer one coherent generation run over mixing unrelated styles.

Validation:

1. External Hugging Face generation step.
Expected outcome: at least three viable desktop candidates exist locally for review.

### Task 2: Approve and stage the desktop/mobile assets

Dependency: Task 1

1. Choose the strongest desktop candidate.
2. Decide whether the mobile image can be a clean crop of the desktop master or needs its own dedicated render.
3. Export the approved files to `public/art/welcome-memory-desktop.webp` and `public/art/welcome-memory-mobile.webp`.
4. Keep the filenames stable unless a code-level contract change is unavoidable.

Test-first step:

1. Structural review only.
2. Before copying files into the repo, confirm the mobile framing still preserves the rider silhouette above the lower copy band.

Implementation step:

1. Replace the existing files in place.
2. Do not start CSS tuning until the asset filenames and crops are final.

Validation:

1. Run `file public/art/welcome-memory-desktop.webp public/art/welcome-memory-mobile.webp`.
Expected outcome: both files resolve as WebP images.
2. Run `ls public/art`.
Expected outcome: the welcome hero filenames remain stable and present.

### Task 3: Update the presentation helper only if the art contract changed

Dependency: Task 2

1. If the approved assets require different crop intent, safe-zone metadata, or breakpoint selection, update `src/components/welcomeHeroPresentation.test.ts` first.
2. Run `npm run test:engine` and confirm the failure is isolated to the changed welcome presentation expectation.
3. Implement the minimum helper update in `src/components/welcomeHeroPresentation.ts`.
4. Keep viewport selection logic in the helper rather than duplicating it in JSX or CSS comments.

Test-first step:

1. Edit the helper test before the helper implementation when the contract changes.
2. Run `npm run test:engine`.
Expected outcome: the changed welcome presentation expectation fails before the implementation update.

Implementation step:

1. Keep the helper pure and metadata-driven.
2. Avoid new browser-only logic in the helper.

Validation:

1. Run `npm run test:engine`.
Expected outcome: welcome presentation tests pass again.
2. Run `npm run lint`.
Expected outcome: no type or lint regressions.

### Task 4: Tune the welcome hero around the approved art

Dependency: Task 2, and Task 3 if helper metadata changed

1. Start from the existing welcome shell and tune only what the new art requires.
2. Adjust `src/components/WelcomeScreen.module.css` overlay strength, object position, or safe-zone alignment so the copy stays legible without flattening the art.
3. Touch `src/components/WelcomeScreen.tsx` only if `next/image` sizing, preload, or hero wrapper attributes need a small follow-up.
4. Keep the image decorative with the current accessibility treatment.

Test-first step:

1. Run `npm run dev` before CSS changes to confirm the current layout baseline.
2. If a helper contract changed in Task 3, re-run `npm run test:engine` before any CSS edits so the logic baseline is already green.

Implementation step:

1. Keep the shell structure stable.
2. Prefer small overlay and crop-position changes over new layout branches.
3. Do not reintroduce duplicate desktop/mobile image render paths.

Validation:

1. Run `npm run lint`.
Expected outcome: no JSX, CSS-module, or Next.js image lint regressions.
2. Run `npm run build`.
Expected outcome: production compilation succeeds with the new assets.
3. Run `npm run dev`.
Expected outcome: the welcome hero loads the new art with no broken image references or layout jump.

### Task 5: Manual art QA, review, and deployment gate

Dependency: Tasks 2 through 4

1. Review the welcome screen at approximately `1440x900`, `1024x768`, `768x1024`, and `390x844`.
2. Confirm the rider silhouette, creature curve, and CTA-safe regions remain readable in each viewport.
3. Check for image-quality failures: muddy anatomy, extra limbs, banding, halos, watermark residue, or unreadable focal detail.
4. Confirm the rest of the app still looks unchanged outside the welcome hero.

Test-first step:

1. Structural review only.
2. Capture the desktop and mobile welcome states for approval before calling the slice done.

Validation:

1. Run `npm run verify`.
Expected outcome: tests, lint, and production build all pass.
2. Review the final screenshots.
Expected outcome: one desktop and one mobile capture clearly show the approved hero art and readable copy.

## Review And Deployment Steps

1. Review the generated-asset diff first so the staged WebP files and any helper/CSS follow-ups are easy to inspect.
2. Review the welcome screen locally in `npm run dev` before handing off to a preview deploy.
3. Run `npm run verify` after the final asset and layout adjustments.
4. Ship through the normal Vercel preview flow.
Expected outcome: the preview matches the approved local desktop and mobile welcome screenshots.

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
