# Worm Ranch

Worm Ranch is a display-aware chase toy built with Next.js. The game keeps separate desktop and mobile rule sets, pushes gameplay rules into `src/game`, and keeps rendering and input concerns in `src/components`.

## Development

Start the local app with:

```bash
npm run dev
```

The main verification path is:

```bash
npm run verify
```

That runs lint and a production build, which is the required validation path for substantive gameplay or UI changes.

## Architecture

- `src/app`: routing shell only
- `src/components`: rendering, HUD, and input-facing UI
- `src/game`: gameplay rules, simulation state, and display profile logic
- `src/lib`: non-blocking support utilities such as silent analytics logging

## Gameplay Change Guidelines

- Keep desktop and mobile behavior intentionally split.
- Prefer mechanic legibility improvements before balance rewrites when the mechanic already exists but is hard to read.
- Keep source files under 500 lines.
- Silent analytics must remain best-effort and must not block gameplay.

## Custom Agents

This repo includes a workspace agent at `.github/agents/gameplay-display-mechanics.agent.md` named `Worm Ranch Gameplay`.

Use it for Worm Ranch-specific gameplay readability, HUD clarity, input feel, and player-facing mechanics work.

## Next.js Note

This repo targets a newer Next.js version than many default examples. Check the local Next.js docs under `node_modules/next/dist/docs/` before assuming older framework behavior.
