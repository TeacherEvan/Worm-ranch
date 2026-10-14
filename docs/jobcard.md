# Jobcard

Project: Worm Ranch

- Current focus: codebase audit, 500-line rule decomposition (`WormRanchApp.tsx`, `engine.ts`, `gameStagePresentation.ts`), Vitest test suite unification, particle burst integration, and neon token consolidation — see [docs/plans/2026-08-18-codebase-audit-and-refactor-recommendations.md](plans/2026-08-18-codebase-audit-and-refactor-recommendations.md)
- Deployment target: Vercel
- Verification target: `npm run verify` (vitest run + lint + next build type-check)
- Completed slice: gameplay launch no longer blocks on backdrop preload; the welcome intro now renders poster-first without a blocking launch plate; intro video is enhancement-only instead of gating first paint; standard worms now use stable named colors; continuous target-color play now refills to the level cap; the stage HUD/callout now surfaces the active target color; the welcome hero is full-bleed; and the default shell flow is `welcome -> home -> game -> home`
- Next slice: execute Milestone 1 (unify test script & verify all 27 suites), Milestone 2 (extract fairy logic & modularize WormRanchApp), Milestone 3 (decompose canvas rendering & wire particles), Milestone 4 (token consolidation & verify)
- Open debt (tracked 2026-08-18): Neon-token CSS aliases (`--bg`, `--accent`, `--danger`) in `globals.css` scheduled for removal in Milestone 4. Untracked large video `output.mp4` already ignored.
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
