# WORM RANCH — HANDOVER NOTES (next agent)

_**CRITICAL — WORKSPACE PATH**_
The working directory for this repo is:
    ~/Documents/VS/GAMES/Worm ranch/
    (absolute: /home/ewaldt/Documents/VS/GAMES/Worm ranch)
It contains a literal SPACE (and a lowercase "ranch"). **Every** shell call must quote it, e.g.
    cd "/home/ewaldt/Documents/VS/GAMES/Worm ranch"
or pass `workdir="/home/ewaldt/Documents/VS/GAMES/Worm ranch"`. A bare `cd ~/Documents/VS/GAMES/Worm ranch`
splits into two args and silently lands you in the wrong place. This is the single most common failure mode here.

_Last state verified: 2026-08-19. All facts below re-checked against the live tree this session — not copied from prior docs._
_This file supersedes the earlier HANDOVER.md draft, which incorrectly named branch `feat/codebase-audit-refactor` and HEAD `eb74851`; the work has since merged to **main**._

## 1. WHAT THIS REPO IS
- Next.js 16 (App Router, Turbopack) browser game, plain TypeScript. NO Convex, NO backend, NO DB.
- Remote: `https://github.com/TeacherEvan/Worm-ranch.git`
- Branch: **`main`** (upstream `origin/main`, 1 commit ahead)
- AGENTS.md rule: this is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code. Live-context pointer: `docs/plans/worm-ranch-plan.md` + `docs/jobcard.md`.
- Hard user rule: "Don't fuck around in other repos" — scope work to THIS repo only.

## 2. CURRENT STATE (VERIFIED THIS SESSION)
Ran the full gate (`npm run verify`) on the live tree → **GREEN**:
- `vitest run`: **32 suites / 159 tests PASS**
- `eslint`: **0 errors** (51 harmless warnings: unused test-import exports in `engineContinuous.ts`/`engineFairies.ts`; do not chase)
- `tsc --noEmit`: clean
- `next build`: compiled successfully, static + dynamic routes generated
HEAD: `28d5b46 refactor: remove 3 unused exported helpers (surgical prune)`

**No source files were changed while drafting this note.** Only docs/prune artifacts are new.

## 3. PLAN INVENTORY (scanned: root + docs/ + docs/plans/ + .archive/)
- `docs/plans/worm-ranch-plan.md` — **ACTIVE context pointer** (referenced by AGENTS.md). Banner states audit landed/verified; remaining items = OPTIONAL debt. Leave in place.
- `docs/plans/.archive/2026-08-18-*` — audit + debrief + SECURITY + TRACEABILITY. **DONE**, committed, pushed.
- `docs/plans/.archive/HERMES_PLAN.ai.json` + `.html` — post-hoc snapshot (status "proposed", NO approval ticks). Its items already shipped in committed code. NOT an implement authorization; do not re-implement.
- All audited refactor slices (mode menu, transition, particle/motion layer, engine decomposition) are merged to `main` and covered by the gate.

**CONCLUSION: No open ASSIGNED / unfinished plan work.** Only OPTIONAL product debt remains (below).

## 4. OPEN DEBT (real, uncommitted — not silently closed)
1. **Untracked assets:** `public/art/` (welcome posters, ~3MB launch intro mp4, ~8.8MB poster png, Gameplay backdrops/) and `public/fonts/SpaceGrotesk-VariableFont_wght.woff2` are UNTRACKED. `.gitignore` only excludes `public/art/Gameplay backdrops/output.mp4`. Decide: commit deliberately OR widen `.gitignore` before a Vercel deploy.
2. **Optional product work (user call, not in any active plan):** visual gameplay smoke checks, Playwright E2E for launch→game flow, low-end mobile perf profiling.

## 5. WORKING TREE AT HANDOVER (intentionally uncommitted)
```
 M  docs/jobcard.md                              (pre-existing tracked edit; accurate, left as-is)
?? HANDOVER.md                                   (this file)
?? .prune/                                       (surgical-pruning scratch output)
?? docs/plans/.archive/HERMES_PLAN.ai.json
?? docs/plans/.archive/HERMES_PLAN.html
?? "docs/surgical-pruning-0819-Worm ranch.html"
?? "surgical-pruning-0819-Worm ranch.html"
```
Nothing here is a code change. The `.prune/` dir and surgical-pruning HTML are disposable artifacts from a pruning tool run — safe to delete if unwanted.

## 6. OPEN DECISIONS FOR NEXT AGENT (user authorization required)
- **PUSH + PR?** Branch is green and safe; 1 commit ahead of `origin/main` (`28d5b46`). `git push` then open PR when authorized.
- **Reconcile `stash@{0}` (`wip-audit-unrelated-allowScripts-docs`) separately** — do NOT pop into this branch; it carries unrelated docs/WIP isolated on purpose.
- **Asset hygiene** — commit or `.gitignore` the untracked `public/art` + `public/fonts` before any Vercel deploy.

## 7. PITFALLS / GOTCHAS (still valid)
- No `npm run verify` = no proof. Always re-run the full gate; never trust a plan-doc banner or a prior agent's self-report count.
- The 51 lint warnings are test-file unused exports — harmless, don't chase unless asked.
- Don't touch other repos (Devil-sDelight, BudgetBITCH, etc.) — user was explicit.
- Hermes-generated `HERMES_PLAN*.json` with `meta.status: "proposed"` + timestamp AFTER code = post-hoc snapshot, never an implement authorization.
- `git checkout -b <name> .` (trailing dot) corrupts `.git`. Use `git switch -c <name>`.
- **Repo path has a SPACE** — always quote it (see top of this file).

## 8. DEPLOY (inherited, NOT re-verified this session)
- Production reportedly live at `https://worm-ranch.vercel.app` (HTTP 200 per prior agent).
- Deploy: `vercel deploy --prod --yes` from repo root after commit/push.
- Treat the above as inherited, not independently confirmed this session.
