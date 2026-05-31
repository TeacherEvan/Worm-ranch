# Jobcard

Project: Worm Ranch

- Current focus: gameplay readability through deterministic level pressure, stage-action audio cadence, and consecutive-miss surprise targets that stay legible on desktop and mobile
- Current focus: continuous color-target gameplay, stronger worm color identity, and a cleaner launch-to-game shell that keeps the active play field readable and full-viewport
- Deployment target: Vercel
- Verification target: `npm run verify`
- Completed slice: gameplay launch no longer blocks on backdrop preload; standard worms now use stable named colors; continuous target-color play now refills to the level cap; the stage HUD/callout now surfaces the active target color; the welcome hero is full-bleed; and the default shell flow is `welcome -> home -> game -> home`
- Next slice: finish final smoke checks and decide whether the next pass should focus on polishing the live target-call readability, tightening manual mobile layout checks, or simplifying any remaining legacy flow surfaces
- Archive condition: move the plan to an archive only after the continuous color-target slice remains covered by `npm run verify` and a live shell/game smoke pass
