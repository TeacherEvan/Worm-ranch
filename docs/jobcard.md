# Jobcard

Project: Worm Ranch

- Current focus: Base Defense mode integration and theme-appropriate UI overhaul complete. All files strictly conform to the <500 lines rule. Test suite at 40 suites (201 tests passing), Playwright E2E at 24 tests passing across desktop and mobile.
- Deployment target: Vercel
- Verification target: `npm run verify` (vitest 40/40 suites + eslint + next build type-check); browser flow via `npm run test:e2e` (playwright, 24 tests passing)
- Completed slice: Base Defense game mode and complete UI overhaul implemented: theme-wide token migration to Neon-on-Deep-Dark tactical system; elimination of legacy CSS aliases; Base Defense engine (`src/game/baseDefense*.ts`) with central tent, autonomous miners, crystal mining, walls, towers firing visible arrows, shotgun AOE player click, wave/HP/DPS scaling, and top-bar Bank dropdown with 10 upgrades; isolation of Base Defense from standard round timers and ghost finale; full Playwright E2E coverage for Base Defense HUD, credit accumulation, and construction purchases; all touched files under 500 lines budget.
- Next slice: low-end mobile performance profiling on constrained viewports, and a manual legibility pass for the active target color. The E2E smoke checks, launch->game integration coverage, and Base Defense flows are done.
- Open debt: `braces@3.0.3` carries a high-severity stack-exhaustion advisory reached only via dev tooling (`eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch`) with no patched release published — accepted risk. GitHub Actions is billing-locked, so no commit since `9ff82f7` has been confirmed by CI and `npm run verify` + `npm run test:e2e` is the authoritative evidence.
- Resolved this session: deleted stray tracked asset `public/art/Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg` (referenced by nothing; surgical-pruning sign-off obtained).
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
