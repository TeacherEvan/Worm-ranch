# Jobcard

Project: Worm Ranch

- Current focus: motion/feedback layer hardening — `gameStageMotion.ts` (cue→effect mapping) and `gameStageParticles.ts` (neon burst system) now have tests wired into `npm run verify`; reduced-motion path preserves per-cue flash color for legibility while suppressing shake/dilation/overlay/particles
- Current focus: continuous color-target gameplay, stronger worm color identity, and a cleaner launch-to-game shell that keeps the active play field readable and full-viewport
- Deployment target: Vercel
- Verification target: `npm run verify` (test:engine + lint + next build type-check)
- Completed slice: gameplay launch no longer blocks on backdrop preload; the welcome intro now renders poster-first without a blocking launch plate; intro video is enhancement-only instead of gating first paint; standard worms now use stable named colors; continuous target-color play now refills to the level cap; the stage HUD/callout now surfaces the active target color; the welcome hero is full-bleed; and the default shell flow is `welcome -> home -> game -> home`
- Next slice: finish final smoke checks and decide whether the next pass should focus on polishing the live target-call readability, tightening manual mobile layout checks, or simplifying any remaining legacy flow surfaces
- Open debt (tracked 2026-08-01): [plans/worm-ranch-plan.md](plans/worm-ranch-plan.md) is referenced by AGENTS.md and is present on disk — restored in commit bdb39d0, so the AGENTS.md pointer is valid. The neon-token CSS aliases (`--bg`, `--accent`, `--danger`, etc.) are kept "for backward compat during transition" and should be deleted on a set deadline. The fonts/backdrop assets (`public/fonts`, `public/art/Gameplay backdrops/output.mp4`) are untracked — commit or gitignore deliberately before Vercel deploy.
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
