# Worm Ranch Copilot Instructions

- Keep every source file below 500 lines.
- Treat `src/app` as the routing shell and keep simulation logic out of route files.
- Put gameplay rules in `src/game` and keep rendering/input concerns in components.
- Prefer minimal, focused edits and validate with `npm run verify` after substantive changes.
- Preserve the desktop and mobile rule split; do not collapse them into vague shared behavior.
- Silent analytics must remain best-effort and never block gameplay.
- Prefer the `Worm Ranch Gameplay` workspace agent for gameplay readability, input feel, HUD, or player-facing mechanics work.
