# Jobcard

Project: Worm Ranch

- Current focus: codebase audit & refactor milestone completed — all source files <500 lines, particle burst system wired with reduced-motion fallback, per-tone gravity bug fixed, test:engine unified to all 28 suites (160 tests passing), legacy CSS token aliases consolidated.
- Deployment target: Vercel
- Verification target: `npm run verify` (vitest 28/28 suites + eslint + next build type-check)
- Completed slice: gameplay launch no longer blocks on backdrop preload; the welcome intro now renders poster-first without a blocking launch plate; intro video is enhancement-only instead of gating first paint; standard worms now use stable named colors; continuous target-color play now refills to the level cap; the stage HUD/callout now surfaces the active target color; the welcome hero is full-bleed; the default shell flow is `welcome -> home -> modeMenu -> transition -> game -> home`; engine, presentation, and app shell decomposed below 500-line budget; particle burst system active.
- Next slice: visual gameplay smoke checks, automated end-to-end integration tests, and performance profiling on low-end mobile viewports.
- Open debt: Fonts/backdrop assets (`public/fonts`, `public/art/Gameplay backdrops/output.mp4`) are untracked — commit or gitignore deliberately before Vercel deploy.
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
