# Worm Ranch

Worm Ranch is a display-aware chase toy built with Next.js. The game keeps separate desktop and mobile rule sets, pushes gameplay rules into `src/game`, and keeps rendering and input concerns in `src/components`.

## Current Experience

- Welcome now opens on a full-bleed launch surface instead of the older framed hero card, so the startup art is no longer cropped inside a decorative shell.
- Gameplay backdrops belong to the in-round field, not the startup flow, and the active play shell now stays full-viewport once a run begins.
- Runs now default into continuous play: worms keep refilling, the board does not auto-resolve into a results screen, and leaving through the game exit returns directly to home.
- Gameplay now flashes a 2-second target-color directive over the field, then hides it until the player removes two worms of that named color and triggers the next callout.
- Standard worms now use stable named colors with stronger contrast so the target-color callout is readable in motion on desktop and mobile.
- Mobile rounds still keep a persistent `Beat bell` timer in the HUD so the countdown feels like pressure, not buried admin data.
- Successful worm actions now follow a fixed stage-audio cadence: six western gunshots, then three whip cracks, then the pattern repeats.
- The dinosaur cue is currently disabled so the gunshot-whip cadence remains the only active gameplay sound feedback.
- After five consecutive miss clicks in an active round, one psychedelic blinking worm spawns as an extra target and obeys the same desktop and mobile bagging rules as the other worms.

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

For gameplay-rule changes, run `npm run test:engine` first so engine and stage regressions fail fast before the full verify pass.

Bundled gameplay audio sources and attribution are tracked in `docs/audio-sources.md` and `public/audio/gameplay/ATTRIBUTION.txt`.

## Documentation

Full documentation hub: [docs/README.md](docs/README.md)

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
