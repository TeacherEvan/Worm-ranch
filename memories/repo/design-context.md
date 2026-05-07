# Design Context Memory

- Users: casual players, replayable score chase, quick repeat sessions.
- Tone: scrappy, mischievous, competitive.
- Direction: hillbilly farm meets space ranch, god-view perspective, kinetic arcade tension.
- Priorities: strong motion, interactive feedback, visual stimulation, fast replay loop.
- Avoid: Barbie-coded or kiddie styling, generic startup/game template UI, safe minimal shells.
- 2026-05-07 welcome hero repair: HF workflow `black-forest-labs/FLUX.1-dev` space at `https://huggingface.co/spaces/black-forest-labs/FLUX.1-dev`, model `black-forest-labs/FLUX.1-dev`, API endpoint `/infer`.
- Exact positive prompt used for the successful source render: `a moonlit rider on a giant worm crossing a desert`.
- Exact negative prompt recorded for review gating, not accepted by this workflow: `cartoon, mascot, cute, extra limbs, detached secondary creature, duplicate heads, center-right subject crowding copy space, busy background, purple neon, text, logo, watermark`.
- Successful source render settings: randomize seed `true`, returned seed `868214514`, width `1536`, height `896`, guidance `3.5`, steps `28`, flipped `false`.
- Final transform chain: downloaded successful official render URL from the HF `/infer` stream, resized to `1600x900` WebP for `public/art/welcome-memory-desktop.webp`; mobile is a crop of that same source, not a separate render, extracted at `left=280 top=0 width=576 height=896` then resized to `900x1400` WebP for `public/art/welcome-memory-mobile.webp`.
- Follow-up note: additional HF desktop candidate runs were blocked the same day by official `ZeroGPU quota exceeded` errors and multiple community space runtime failures, so this repair ships the cleanest successful official render recovered from that run.
