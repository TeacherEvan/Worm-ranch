# WORM RANCH — HANDOVER NOTES (next agent)

_**CRITICAL — WORKSPACE PATH**_
The working directory for this repo is:
    /home/leandi-duplessis/github/workspaces/Worm-ranch
There is **no space** in this path. (An earlier revision of this file named
`~/Documents/VS/GAMES/Worm ranch/` under user `ewaldt`; that is wrong for this
checkout. Resolve the path with `pwd` / `git remote -v` before acting — a
literal path copied from an old handover will silently land you somewhere else.)

_Last state verified: 2026-10-16. All facts below re-checked against the live tree this session — not copied from prior docs._

## 1. WHAT THIS REPO IS
- Next.js 16 (App Router, Turbopack) browser game, plain TypeScript. NO Convex, NO backend, NO DB.
- Remote: `https://github.com/TeacherEvan/Worm-ranch.git`
- Branch: **`main`**, **6 commits AHEAD of `origin/main`** — the hardening slice is committed locally but NOT pushed (push needs user authorization, see §8). Verify with `git status` before acting.
- AGENTS.md rule: this is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code. Live-context pointer: `docs/plans/worm-ranch-plan.md` + `docs/jobcard.md`.
- Hard user rule: "Don't fuck around in other repos" — scope work to THIS repo only.

## 2. CURRENT STATE (VERIFIED THIS SESSION)
Ran the full gate (`npm run verify`) on the live tree → **GREEN**:
- `vitest run`: **36 suites / 192 tests PASS**
- `eslint`: **0 errors, 0 warnings**
- `tsc --noEmit`: clean
- `next build`: compiled successfully, static + dynamic routes generated
HEAD at handover: the hardening slice — 6 commits `5b5b748`..`aa49ac2` plus
review follow-ups (E2E probe + split), all committed locally, NOT yet pushed.
Run `git log --oneline -10` for the exact current HEAD rather than trusting a
sha copied from this file.

Latest slice (committed): review-follow-up hardening — E2E launch-flow waits
raised to 5s, target automation contract asserted, real-browser canvas input
E2E added (CDP touch swipe + mouse press), pen-routing unit test, and
`handleStageKeyDown` extracted from `GameStage.tsx` (477 -> 456 lines) — see §3.

## 3. WHAT THE LATEST SLICES CHANGED
### 3a. Canvas pointer listeners
`GameStage.tsx` and `gameStageGestures.ts` used to **both** register
`pointerdown` / `pointermove` / `pointerup` / `pointercancel` on the stage
canvas, so every touch ran through two listeners in registration order.
Now `gameStageGestures.ts::bindPointerControls` owns **exactly one** listener
per canvas pointer event and routes by `pointerType` (touch → gesture tracker,
mouse/pen → direct press).

### 3b. Playwright E2E + the launch-plate stall it exposed
Added `playwright.config.ts` and `e2e/launch-flow.spec.ts` — `npm run test:e2e`.
16 tests across `desktop-chromium` and `mobile-chromium` covering welcome hero →
gate → mode menu → standard game → endless target color, plus a reduced-motion
pass. `GameStageOverlay` gained `data-target-callout` / `data-target-color` /
`data-target-progress` / `data-target-goal` / `data-target-game-over` as the
automation contract; read those instead of
parsing copy.

**The E2E immediately caught a real bug no unit test could:** the welcome launch
loader deadlocked at **78%** on desktop while the reel was already playable.
`onLoadedMetadata` fired before React attached its listener, so
`introVideoMetadataLoaded` stayed false while `introVideoCanPlay` went true, and
the plate never hit 100% — it kept gating first paint. Reproduced on desktop only;
the theory that mobile escapes the race is plausible but unverified. `canplay` implies `readyState >=
HAVE_METADATA`, so it now also records metadata readiness. Fixed in
`welcomeLaunchLoader.ts` and `WelcomeScreen.tsx`; guarded by
`welcomeLaunchLoader.test.ts`.

### 3c. Review follow-ups (committed)
- E2E nav waits use `NAV_TIMEOUT_MS = 5_000` (the shell transition is 220ms);
  the endless callout test reads `data-target-goal` / `data-target-progress`
  instead of parsing copy.
- `e2e/launch-flow.spec.ts` "canvas pointer input" describe drives REAL browser
  events: a CDP touch swipe advances the keyboard target (read it from the
  sr-only `[data-phase] [aria-live="polite"]` status), and a mouse press runs
  without page errors. jsdom cannot cover real pointer capture/ordering.
- Pen input (`pointerType === "pen"`) routes like mouse (direct press, no
  gesture tracking) — covered in `gameStageGestures.test.ts`.
- `handleStageKeyDown` (arrow/Home/End/Enter/Space routing) now lives in
  `gameStageKeyboard.ts` with its own unit suite; `GameStage.tsx` is back to
  456 lines. The interaction-test keyboard mock is shared via
  `createKeyboardModuleMock` in `gameStageTestHelpers.ts` — keep stub-based
  target resolution (`worm-1`) intact when editing those doMocks.

## 4. E2E GOTCHAS
- **E2E must run against a production build, not the dev server.**
  `layout.tsx` pulls Space Grotesk through `next/font/google`; the dev server
  blocks for ~120s on that fetch without gstatic access and then times out.
  `npm run build` is fine, so the config builds first and runs `npm start`.
- Run `npx playwright install chromium` after a fresh clone — the cached browser
  revisions are version-pinned, so a `@playwright/test` bump breaks the launch.
- `data-launch-loader-state` exists on **two** elements: the hero media surface
  and the loader plate itself (the plate hard-codes `"loading"` while mounted).
  Scope assertions to `[data-hero-media-surface="full-bleed"]` or you will read
  the wrong one.
- Shell hand-offs go through a timed transition screen (220ms, 0ms under reduced
  motion); assert on the destination screen rather than sleeping.

## 5. PLAN INVENTORY (scanned: root + docs/ + docs/plans/ + .archive/)
- `docs/plans/worm-ranch-plan.md` — **ACTIVE context pointer** (referenced by AGENTS.md). Banner states all slices done; remaining items = OPTIONAL debt. Leave in place.
- `docs/plans/.archive/2026-08-18-*` — audit + debrief + SECURITY + TRACEABILITY. **DONE**, committed, pushed.
- `docs/plans/.archive/HERMES_PLAN.ai.json` + `.html` — post-hoc snapshot (status "proposed", NO approval ticks). Its items already shipped in committed code. NOT an implement authorization; do not re-implement.
- All audited refactor slices (mode menu, transition, particle/motion layer, engine decomposition, pointer consolidation) are covered by the gate.

**CONCLUSION: No open ASSIGNED / unfinished plan work.** Only OPTIONAL product debt remains (below).

## 6. OPEN DEBT
1. **Legacy CSS aliases** — `--bg-soft`, `--panel`, `--panel-strong`, `--line`,
   `--muted`, `--accent-strong` in `src/app/globals.css` are referenced across
   ~10 component stylesheets. Needs a dedicated token-migration slice.
2. **Stray tracked asset** — `public/art/Gameplay backdrops/243-2436830_evil-clipart-baby-devil-sexy-devil-cartoon.jpeg`
   is tracked but referenced by nothing. The other 6 backdrops are referenced by
   `gameStageBackdropRotation.ts` and resolve correctly (the directory's space is
   URL-encoded as `%20`, which is fine). Quarantine the stray; deleting it needs
   user sign-off given the content.
3. **Optional product work (user call, not in any active plan):** visual gameplay smoke checks, Playwright E2E for launch→game flow, low-end mobile perf profiling.

## 7. STALE / CORRECTED HANDOVER FACTS
Facts that were true in a previous revision and are **no longer true** — do not
act on them:
- "public/art and public/fonts are UNTRACKED" → they are **tracked and committed**.
- `stash@{0}` (`wip-audit-unrelated-allowScripts-docs`) → **no stash exists**.
- `.prune/` directory → **does not exist**.
- "branch is 1 commit ahead of origin/main" → **STILL STALE AS OF THIS
  HANDOVER**: the branch is now 6+ commits ahead of `origin/main`; the slice is
  committed locally and awaiting user authorization to push (§8).

## 8. OPEN DECISIONS FOR NEXT AGENT (user authorization required)
- **PUSH + PR?** Push the local slice and open a PR when authorized.
- **Stray asset deletion** — see §6.2. Needs explicit approval.

## 9. PITFALLS / GOTCHAS (still valid)
- No `npm run verify` = no proof. Always re-run the full gate; never trust a plan-doc banner or a prior agent's self-report count.
- `rg -r` is the **replace** flag, not a recursive-search flag. Passing `rg -r "backdrops|..."` rewrites matches inline and produces garbled paths that look like URL bugs. Use plain `rg` for searching. (Cost me a false "broken backdrop path" diagnosis this session.)
- Don't trust a visual/path match: confirm the real on-disk directory before declaring a 404.
- Don't touch other repos (Devil-sDelight, BudgetBITCH, etc.) — user was explicit.
- Hermes-generated `HERMES_PLAN*.json` with `meta.status: "proposed"` + timestamp AFTER code = post-hoc snapshot, never an implement authorization.
- `git checkout -b <name> .` (trailing dot) corrupts `.git`. Use `git switch -c <name>`.
- Pointer events: one listener per canvas event, all in `bindPointerControls`. Two listeners on one event will double-fire in registration order.
- A `pointerup` that trails a `pointercancel` must not re-run gesture cleanup — guarded by `tracker.active`.

## 10. DEPLOY (inherited, NOT re-verified this session)
- Production reportedly live at `https://worm-ranch.vercel.app` (HTTP 200 per prior agent).
- Deploy: `vercel deploy --prod --yes` from repo root after commit/push.
- Treat the above as inherited, not independently confirmed this session.
