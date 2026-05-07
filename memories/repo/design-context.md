# Design Context Memory

- Users: casual players, replayable score chase, quick repeat sessions.
- Tone: scrappy, mischievous, competitive.
- Direction: hillbilly farm meets space ranch, god-view perspective, kinetic arcade tension.
- Priorities: strong motion, interactive feedback, visual stimulation, fast replay loop.
- Avoid: Barbie-coded or kiddie styling, generic startup/game template UI, safe minimal shells.
- 2026-05-07 welcome hero repair: compliant HF workflow is the Gradio space `llamasky/Edweibin-flux-dev-nfsw` at `https://huggingface.co/spaces/llamasky/Edweibin-flux-dev-nfsw`, using its public `/infer` endpoint with the exact positive prompt passed as `prompt` and the exact negative prompt passed as `negative_prompt` in every accepted generation request.
- Exact positive prompt used for the accepted desktop batch and final master: `serious cinematic moonlit outlaw realism, a lone outlaw rider mounted directly on a colossal worm-snake hybrid, the hybrid itself is the only mount, crossing a dusty alien ranch at night, premium sci-fi western key art, subject left-of-center, open negative space on the right for title copy, visible creature head and body, moonlit midnight blue and steel gray palette with restrained amber dust, photorealistic textures, side-lit silhouette with readable anatomy, distant fence posts and mesas, dramatic scale, no green cast`.
- Exact negative prompt used as the actual generation input: `horse, second animal mount, separate snake, cartoon mascot style, cute, childish proportions, abstract placeholder, oversaturated green or pink-purple glow, neon fever dream, distorted anatomy, extra limbs, duplicate rider, duplicate creature, centered subject crowding copy space, text, caption, logo, watermark, collage artifacts`.
- Accepted desktop candidate batch settings: width `1024`, height `576`, guidance `4.0`, steps `20`, randomize seed `false`, seeds `424242`, `515151`, and `626262`.
- Candidate selection note: candidate 1 (`424242`) kept an extra motorcycle rider; candidate 3 (`626262`) introduced an extra figure and crowded the right side; candidate 2 (`515151`) was the strongest approved-direction frame and became the desktop master source.
- Final transform chain: desktop master source is candidate 2 from that batch, exported to `public/art/welcome-memory-desktop.webp` as a `1600x900` WebP with a softened darkened right-side copy-safe treatment derived from the same frame; mobile stays on the same master as a portrait treatment, exported to `public/art/welcome-memory-mobile.webp` as a `900x1400` WebP with the rider and creature emphasized in the upper portion and a calmer lower copy band.
- Launch readability rule: keep the home screen title-first with only essential actions; avoid diagnostic scan strips and long rules copy on the launch surface.
- Mobile HUD rule: reuse the existing clock status item as the permanent `Beat bell` countdown cue instead of adding separate timer chrome.
