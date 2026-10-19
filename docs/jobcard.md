# Jobcard

Project: Worm Ranch

- Current focus: Ultimate graphics, audio-tactile punch, and tactical gameplay overhaul verified green across 40 unit suites (203 tests), typecheck, lint, production build, and all 28 Playwright E2E tests (desktop + mobile Chromium).
- Deployment target: Vercel
- Verification target: `npm run verify` (vitest 40/40 suites + typecheck + eslint + next build); browser flow via `npm run test:e2e` (playwright, 28/28 tests passing across desktop and mobile chromium)
- Completed slice: Ultimate graphics, audio-tactile & tactical overhaul:
  - Kinetic shotgun shockwaves with expanding concentric neon-cyan energy rings, bright core flashes, and explosive particle bursts on click.
  - Ascending floating credit notifications (`+10 CR`) with smooth vertical drift and alpha fade upon miner delivery.
  - Visceral organic ichor splat decals with directional droplet spray, jagged puddle outlines, and dissolving effervescent micro-bubbles during fadeout.
  - Multi-tiered command bunker complex with communications antenna mast, flashing beacon, and emergency red warning strobe when bunker HP drops below 30%.
  - Animated defensive turrets with rotating tracking heads following enemy worms, recoil kickback on arrow fire, and glowing energy charging coils.
  - Barricades / walls enhanced with holographic hex shield forcefield mesh.
  - Reactive tactical holo-grid with perimeter alert rings dynamically flaring crimson when enemy worms breach the 210px defense sector.
  - Zero start-game crystals, killed-worm drops, keyboard upgrade shortcuts [1]-[0], and mobile layout overlap safeguards.
  - All source files strictly under 500 lines budget.
- Next slice: low-end mobile performance profiling on constrained viewports, and a manual legibility pass for the active target color. The E2E smoke checks, launch->game integration coverage, and Base Defense flows are done.
- Open debt: `braces@3.0.3` carries a high-severity stack-exhaustion advisory reached only via dev tooling (`eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch`) with no patched release published — accepted risk. GitHub Actions is billing-locked, so no commit since `9ff82f7` has been confirmed by CI and `npm run verify` + `npm run test:e2e` is the authoritative evidence.
- Resolved this session: deleted stray tracked asset `public/art/Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg` (referenced by nothing; surgical-pruning sign-off obtained).
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
