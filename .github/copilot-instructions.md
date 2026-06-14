# Worm Ranch Copilot Instructions

Start here:

- Repo overview and scripts: [README.md](../README.md)
- Active implementation plan: [docs/plans/worm-ranch-plan.md](../docs/plans/worm-ranch-plan.md)
- Current focus tracker: [docs/jobcard.md](../docs/jobcard.md)
- Gameplay specialist: [Worm Ranch Gameplay](agents/gameplay-display-mechanics.agent.md)
- Full documentation hub: [docs/README.md](../docs/README.md)

Core repo rules:

- Keep every source file below 500 lines.
- Treat `src/app` as the routing shell and API surface; keep simulation logic out of route files.
- Keep gameplay rules, deterministic transitions, and profile-specific behavior in `src/game`.
- Keep rendering, HUD wiring, and input-facing UI in `src/components`.
- Prefer title-first launch surfaces; explain rules through live HUD and state feedback before adding home-screen copy blocks.
- Keep support utilities such as silent analytics in `src/lib`.
- Preserve the desktop and mobile rule split; do not collapse them into vague shared behavior.
- Silent analytics must remain best-effort and never block gameplay.
- Prefer minimal, focused edits.

Validation:

- Run `npm run test:engine` first when touching gameplay rules in `src/game`.
- Run `npm run verify` after substantive changes.

Agent guidance:

- Prefer the `Worm Ranch Gameplay` workspace agent for gameplay readability, input feel, HUD, or other player-facing mechanics work.
