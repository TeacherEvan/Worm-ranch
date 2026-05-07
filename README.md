# Worm Ranch

Worm Ranch is a display-aware chase toy built with Next.js. The game keeps separate desktop and mobile rule sets, pushes gameplay rules into `src/game`, and keeps rendering and input concerns in `src/components`.

## Current Experience

- Welcome opens with the launch intro video, then hands off to the poster image behind a themed loader with real progress.
- Home stays title-first with essential actions only: start, settings, back, and the optional install prompt.
- Mobile rounds keep a persistent `Beat bell` timer in the HUD so the countdown feels like pressure, not buried admin data.
- Early-round touch play is slightly easier with a larger worm target radius and a slower opening speed.

## Development

Start the local app with:

```bash
npm run dev
```

The launcher prefers port `3000` and automatically falls back to the next open port if `3000` is already busy.

The main verification path is:

```bash
npm run verify
```

That runs the focused gameplay/component tests, lint, and a production build, which is the required validation path for substantive gameplay or UI changes.

## Architecture

- `src/app`: routing shell only
- `src/components`: rendering, HUD, and input-facing UI
- `src/game`: gameplay rules, simulation state, and display profile logic
- `src/lib`: non-blocking support utilities such as silent analytics logging

## Gameplay Change Guidelines

- Keep desktop and mobile behavior intentionally split.
- Prefer mechanic legibility improvements before balance rewrites when the mechanic already exists but is hard to read.
- Prefer title-first launch surfaces and move rules explanation into live HUD cues instead of home-screen copy blocks.
- Keep source files under 500 lines.
- Silent analytics must remain best-effort and must not block gameplay.

## Custom Agents

This repo includes a workspace agent at `.github/agents/gameplay-display-mechanics.agent.md` named `Worm Ranch Gameplay`.

Use it for Worm Ranch-specific gameplay readability, HUD clarity, input feel, and player-facing mechanics work.

## Next.js Note

This repo targets a newer Next.js version than many default examples. Check the local Next.js docs under `node_modules/next/dist/docs/` before assuming older framework behavior.
