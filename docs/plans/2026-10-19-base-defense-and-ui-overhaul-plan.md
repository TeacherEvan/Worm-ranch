# Base Defense Mode & Complete UI Overhaul Implementation Plan (Enhanced)

> **Agent:** Fenrie / Anti-Gravity Pair
> **Enhanced sub-skills invoked:** writing-plans-enhanced + surgical-implementation + subagent-driven-development
> **Verification mode:** Visual / Transform / Test / Browser-observable / Internal

**Goal:** Deliver a theme-appropriate Neon/Retro-Futurist UI overhaul across all launch and HUD surfaces while introducing the full-featured `"baseDefense"` game mode (autonomous miners, crystal harvesting, top-bar Bank dropdown with 10 upgrades/constructions, animated characters/projectiles, dynamic worm wave/HP/damage scaling, and Playwright E2E coverage).

**Architecture:**
- **Engine (`src/game/baseDefense*.ts`):** Deterministic simulation modules isolated from `src/game/engine.ts` to keep all files strictly `< 500` lines. Manages the central Base Tent (10 upgrade tiers, HP/Armor), autonomous NPC Miners (500 HP, unobstructed by worms, walking animations, crystal round-trips awarding `+10` base credits), random Crystal nodes, randomly placed Walls (200 HP / 10 cr) and Attack Towers (200 HP / 100 cr / 10 dmg visible arrows), Shotgun AOE click/tap damage, and Worm wave/HP/damage scaling (`+1/s` base spawn + `+1/s` every 10s, `10 HP` + `10 HP` every 20s, `5 DPS` construction damage + `5 DPS` every 60s).
- **Presentation & UI Overhaul (`src/components/*`, `src/app/globals.css`):** Complete migration of legacy CSS aliases onto the true Neon-on-Deep-Dark token system (`--bg-deep`, `--bg-elevated`, `--neon-lime`, `--neon-cyan`, `--neon-amber`, `--neon-pink`, `--neon-purple`), tactical glassmorphic HUD plates, canvas sprite/vector animations (`gameStageBaseDefenseCanvas.ts`), and an interactive top-anchored `BaseDefenseBankBar` dropdown menu.

**Anti-Gravity boundary (if applicable):** Share only repository source paths (`src/game/*`, `src/components/*`, `e2e/*`), deterministic game math specifications, and CSS design tokens with collaborating agents or subagents. Never share `.env` contents, user identity details, private session logs, or unverified external URLs.

*Source provenance note:* This plan uses the local `writing-plans-enhanced` skill specification and verified repository conventions (`.github/copilot-instructions.md`, `docs/visual-redesign-spec.md`). Zero unverified external packages or skills are introduced.

---

## Specification & Mathematical Rules Matrix

To ensure deterministic unit tests (`vitest`) and browser tests (`playwright`), all ambiguous prompt mechanics are codified into exact engine constants:

| Feature / Entity | Specification & Formula |
|---|---|
| **Base (Tent)** | Positioned at canvas center `(width / 2, height / 2)`. Starts at **Level 1** (`maxHp: 500`, `hp: 500`, `armor: 0`). Can be upgraded **10 times** (`upgradeCount`: `0 -> 10`). Upgrade cost for next tier `k` (`1..10`): **`k * 100` credits** (Upgrade 1 = `100 cr`, Upgrade 2 = `200 cr`, Upgrade 3 = `300 cr`, ..., Upgrade 10 = `1000 cr`). Every Base Upgrade immediately spawns **+1 Miner** and restores/boosts Tent Max HP by `+100`. |
| **NPC Miners** | Start with **2 Miners** at Tent center. Stats: `500 HP` (`maxHp: 500`), **cannot attack**, **cannot be obstructed by worms** (pass cleanly through worm hitboxes). Move back and forth at `baseMinerSpeed` (`90 px/s`, upgradeable) between Tent and nearest Crystal node. Each completed Tent return deposits `10 + minerCarryBonus` credits into the Player's Bank. Rendered with a 4-frame walking leg/pickaxe cycle and crystal-carry indicator. |
| **Crystals** | **6 Crystal clusters** spawned at deterministic random map coordinates (`margin: 60px` from edges, `>= 140px` from Tent center) at round start; respawning at a new random location if depleted so miners always have valid targets. |
| **Bank Tab & Dropdown** | Displayed as an interactive tab at the top center of the Base Defense HUD (`data-testid="bank-tab"`), showing live Credits (`CR`). Clicking/tapping toggles the Powerups & Constructions Dropdown (`data-testid="bank-dropdown"`). |
| **Powerups & Constructions** | 1. **Damage (`damage`):** `50 cr` — Increases player click/shotgun damage by `+5` (starts at `10` dmg, `1` hit kills initial `10 HP` worms).<br>2. **Miners Speed (`minerSpeed`):** `50 cr` — Increases miner movement speed by `+25%` (`+22.5 px/s`).<br>3. **Health (`health`):** `50 cr` — Heals Base Tent by `+150 HP` and increases Tent Max HP by `+100`.<br>4. **Armor (`armor`):** `75 cr` — Adds `+1` flat damage reduction per second against worm attacks on Tent & constructions.<br>5. **Miners Carry (`minerCarry`):** `75 cr` — Adds `+5` credits per completed mining journey (`10 -> 15 -> 20...`).<br>6. **+1 Miner (`extraMiner`):** `100 cr` — Immediately spawns `+1` autonomous NPC Miner at the Tent.<br>7. **Shotgun AOE Radius (`aoeRadius`):** `75 cr` — Adds **+1 Area of Effect unit** (`+28 px` blast radius per unit; starts at `1 unit = 28 px`) so player presses damage all worms within radius.<br>8. **Random Attack Tower (`tower`):** `100 cr` — Places a Tower at a random valid map location (`200 HP`, `10 damage` per arrow, `1.0s` cooldown, `220 px` range). Fires visible animated arrows.<br>9. **Random Wall (`wall`):** `10 cr` — Places a reinforced Wall barricade at a random map location (`200 HP` per reconciliation of *"Towers and walls have 200HP"*).<br>10. **Base Tent Upgrade (`baseUpgrade`):** `100 * (upgradeCount + 1) cr` (max 10 upgrades) — Upgrades Tent tier and grants **+1 Miner**. |
| **Worms & Wave Scaling** | - **Initial HP:** Starts at `10 HP`. Increases by **+10 HP every 20 seconds** (`hp = 10 + Math.floor(elapsedMs / 20_000) * 10`).<br>- **Spawn Rate:** Starts at **1 worm/sec** (`0–10s`), increasing by **+1 extra worm/sec after every 10 seconds** (`ratePerSec = 1 + Math.floor(elapsedMs / 10_000)`). Spawn accumulator triggers deterministically in `stepBaseDefenseWorld`.<br>- **Target Priority & Attraction:** Worms are attracted to the nearest active **Wall or Tower** first; if no Walls/Towers exist on the map, worms converge on the central **Base Tent**.<br>- **Construction Damage:** Worms deal **5 damage/sec** (`5 DPS`) when touching a Wall, Tower, or Tent. Increases by **+5 DPS every minute** (`dps = 5 + Math.floor(elapsedMs / 60_000) * 5`). Worms attack constructions until destroyed (`hp <= 0`), then retarget. |
| **Win / Loss Condition** | Survival defense mode: when the Base Tent reaches `0 HP` (`tent.hp <= 0`), the round finishes with `reason: "baseDestroyed"` (`phase: "gameOver"`), holding on the Game Over modal with stats (Time Survived, Worms Killed, Credits Earned, Base Level) and `Ride Again` / `Yard` actions. |

---

## Surgical-Implementation State Gates

```
INIT ──► GATE 1: Token & UI Overhaul ──► GATE 2: Base Defense Engine ──► GATE 3: Canvas & Bank UI ──► GATE 4: E2E Verification ──► COMPLETE
```

Every file touched or created MUST remain **below 500 lines** (`.github/copilot-instructions.md`).

---

## Task Breakdown

### Task 1: Complete Theme-Appropriate UI Overhaul & Legacy CSS Token Elimination

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/WormRanchShellHeader.module.css`
- Modify: `src/components/HomeScreen.module.css`
- Modify: `src/components/GameModeScreen.module.css`
- Modify: `src/components/SettingsScreen.module.css`
- Modify: `src/components/EndlessGameOverWindow.module.css`
- Modify: `src/components/GameHUD.tsx`
- Modify: `src/components/GameStage.module.css`
- Test: `src/components/HomeScreen.test.ts`, `src/components/SettingsScreen.test.ts`

#### Steps
- [ ] **Step 1: Upgrade `src/app/globals.css` to the full 2025 Neon-on-Deep-Dark Tactical Ranch token system**
  Replace the deprecated aliases (`--bg-soft`, `--panel`, `--panel-strong`, `--line`, `--muted`, `--accent-strong`) across all component CSS modules and define semantic tactical ranch tokens in `:root`:
  ```css
  :root {
    --bg-deep: #050a0f;
    --bg-elevated: #0a121a;
    --bg-glass: rgba(10, 18, 26, 0.78);
    --bg-glass-strong: rgba(6, 12, 19, 0.92);
    --glass-border: rgba(199, 243, 107, 0.22);
    --glass-border-cyan: rgba(0, 245, 255, 0.28);
    --neon-lime: #c7f36b;
    --neon-cyan: #00f5ff;
    --neon-orange: #f07e43;
    --neon-pink: #ff3366;
    --neon-purple: #bc9fff;
    --neon-amber: #ffd44a;
    --text: #f5f4e9;
    --text-dim: #9aa3ac;
    --text-mono: #c7f36b;
    --shadow-elevated: 0 24px 64px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(199, 243, 107, 0.12) inset;
  }
  ```
- [ ] **Step 2: Overhaul `GameHUD.tsx` from inline styles to theme-appropriate CSS module tactical badges**
  Replace the hardcoded inline `rgba(0,0,0,0.36)` divs in `src/components/GameHUD.tsx` with a dedicated `GameHUD.module.css` (or `GameStage.module.css` classes) featuring angled neon-bordered tactical readouts, monospace telemetry labels, and `data-testid` attributes while preserving `aria-label="game time"` and `aria-label="worms killed"`.
- [ ] **Step 3: Overhaul Shell Header, Home Screen, Mode Menu, Settings, and Game Over modals**
  Update `WormRanchShellHeader.module.css`, `HomeScreen.module.css`, `GameModeScreen.module.css`, `SettingsScreen.module.css`, and `EndlessGameOverWindow.module.css` to remove all 6 legacy CSS variables, add tactical corner-bracket accents, glassmorphic depth (`backdrop-filter: blur(12px)`), and Space Grotesk Variable typography treatments while keeping title-first launch hierarchy.
- [ ] **Step 4: Run unit & style verification**
  Run: `npm run test:engine && npm run lint && npm run typecheck`

#### Verify Visual & Transform Claims

- [ ] **Visual claim:** Launch shell, Mode Selection dialog, Settings cards, and in-game `GameHUD` badges render with high-contrast Neon-on-Deep-Dark glassmorphism (`#050a0f` base, `#c7f36b` lime and `#00f5ff` cyan accents) and zero plain unstyled black boxes.
- [ ] **Transform claim:** `grep -rn "var(--bg-soft\|var(--panel\|var(--panel-strong\|var(--line\|var(--muted\|var(--accent-strong" src/` returns 0 matches; `src/app/globals.css` and component stylesheets exclusively use the neon token set.
- [ ] **Verification method:** `grep` audit + `npx vitest run` + Playwright snapshot check on `/`.
- [ ] **Verification result:** PENDING EXECUTION

---

### Task 2: Define Base Defense Types, Constants, and Deterministic Simulation Engine

**Files:**
- Modify: `src/game/gameModes.ts`
- Modify: `src/game/types.ts`
- Create: `src/game/baseDefenseTypes.ts`
- Create: `src/game/baseDefenseConstants.ts`
- Create: `src/game/baseDefenseEngine.ts`
- Test: `src/game/baseDefenseEngine.test.ts`

#### Steps
- [ ] **Step 1: Write failing unit tests in `src/game/baseDefenseEngine.test.ts`**
  Cover every quantitative rule from the prompt:
  - World starts with Tent at `(width/2, height/2)`, `2` NPC Miners (`500 HP`, `canAttack: false`, `obstructedByWorms: false`), `0` credits, and `6` crystals.
  - Miners walk to the nearest crystal and return to the Tent; each completed trip adds `+10` credits (plus `minerCarry` bonus) to `bankCredits`.
  - Miners are never slowed, blocked, or damaged by worms overlapping their coordinates.
  - Worm spawn scaling: `1/s` at `0–10s`, `2/s` at `10–20s`, `3/s` at `20–30s` (`1 + Math.floor(elapsedMs / 10_000)`).
  - Worm HP scaling: starts at `10 HP`, increases by `+10 HP` every `20_000ms` (`10` at `0s`, `20` at `20s`, `30` at `40s`).
  - Worm DPS scaling & attraction: worms target the nearest Wall or Tower first (or Tent if none exist), dealing `5 DPS` when touching, increasing by `+5 DPS` every `60_000ms`.
  - Towers (`200 HP`, `100 cr`, `10 dmg`) fire visible `ArrowProjectile` entities at worms in range; Walls (`200 HP`, `10 cr`) absorb worm attacks until destroyed (`hp <= 0`).
  - Base Tent upgrades `1..10` cost `100, 200, 300 ... 1000` credits, each spawning `+1` Miner and incrementing `tent.level` (`1 -> 11`, `upgradeCount: 0 -> 10`).
  - Shotgun AOE press damages all worms within `aoeUnits * AOE_UNIT_RADIUS_PX` of the press point; purchasing `aoeRadius` increments `aoeUnits` by `+1`.
- [ ] **Step 2: Run Vitest to confirm red phase**
  Run: `npx vitest run src/game/baseDefenseEngine.test.ts`
  Expected: FAIL (module not found).
- [ ] **Step 3: Extend `GameplayMode` and `RoundResult`**
  In `src/game/gameModes.ts`:
  ```ts
  export type GameplayMode = "standard" | "targetEndless" | "baseDefense";
  export const DEFAULT_GAMEPLAY_MODE: GameplayMode = "standard";
  ```
  In `src/game/types.ts`:
  - Add `"baseDestroyed"` to `RoundResult["reason"]`.
  - Add optional `baseDefense?: BaseDefenseWorldState | null` to `GameWorld` and `baseDefense?: BaseDefenseSummary | null` to `GameSummary`.
- [ ] **Step 4: Implement `src/game/baseDefenseTypes.ts` and `src/game/baseDefenseConstants.ts`**
  Define `CrystalNode`, `MinerUnit`, `ConstructionUnit` (`kind: "tower" | "wall"`), `ArrowProjectile`, `BaseTentState`, `BaseDefensePowerupId`, `BaseDefenseWorldState`, and `BaseDefenseSummary`.
- [ ] **Step 5: Implement `src/game/baseDefenseEngine.ts` (< 400 lines)**
  Implement:
  - `initBaseDefenseMode(world: GameWorld)`
  - `stepBaseDefenseMode(world: GameWorld, deltaMs: number)`
  - `purchaseBaseDefenseItem(world: GameWorld, itemId: BaseDefensePowerupId): boolean`
  - `applyBaseDefensePress(world: GameWorld, point: Point): ActionResult`
  - `getBaseDefenseSummary(world: GameWorld): BaseDefenseSummary | null`
  Hook `stepBaseDefenseMode` and `getBaseDefenseSummary` cleanly into `src/game/engine.ts` without exceeding 460 lines in `engine.ts`.
- [ ] **Step 6: Run unit tests to confirm green phase**
  Run: `npx vitest run src/game/baseDefenseEngine.test.ts`
  Expected: PASS.

#### Verify Visual & Transform Claims

- [ ] **Visual claim:** N/A (Engine-level state transformation; visual rendering wired in Task 3).
- [ ] **Transform claim:** `src/game/baseDefenseEngine.ts`, `src/game/baseDefenseTypes.ts`, and `src/game/baseDefenseConstants.ts` exist (< 500 lines each) and export deterministic state transitions for miners, crystals, towers, walls, arrows, bank credits, and worm scaling.
- [ ] **Verification method:** `npx vitest run src/game/baseDefenseEngine.test.ts` (all unit assertions pass).
- [ ] **Verification result:** PENDING EXECUTION

---

### Task 3: Animated Canvas Rendering (Tent, Walking Miners, Crystals, Walls, Towers, Visible Arrows, Worm HP Bars & AOE Blast)

**Files:**
- Create: `src/components/gameStageBaseDefenseCanvas.ts`
- Modify: `src/components/gameStageWormCanvas.ts`
- Modify: `src/components/gameStagePresentation.ts`
- Test: `src/components/gameStageBaseDefenseCanvas.test.ts`

#### Steps
- [ ] **Step 1: Write failing canvas rendering tests in `src/components/gameStageBaseDefenseCanvas.test.ts`**
  Verify that:
  - `drawBaseDefenseLayer` renders the central Tent with level badge and HP bar, glowing Crystal clusters, walking Miners (with leg swing phase `walkPhase` and carried crystal gem when returning), Walls & Towers with `200 HP` health bars, and in-flight Arrow projectiles oriented along their velocity vector `(vx, vy)`.
  - `drawWorm` in `src/components/gameStageWormCanvas.ts` renders animated walking/crawling leg/segment movement and an overhead HP bar when in Base Defense mode (`worm.maxHp > 10` or damaged).
- [ ] **Step 2: Run Vitest to confirm red phase**
  Run: `npx vitest run src/components/gameStageBaseDefenseCanvas.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `src/components/gameStageBaseDefenseCanvas.ts` (< 400 lines)**
  Draw theme-appropriate neon-tactical vector sprites on the 2D canvas:
  - **Central Base Tent:** Command tent silhouette at `(width/2, height/2)` with neon-lime ridge lines, upgrade tier pips (`LVL 1`..`LVL 11`), and shield/HP bar.
  - **Crystals:** Faceted cyan/purple glowing crystal formations at crystal coordinates with pulse aura.
  - **Animated Miners:** Distinct character head, hard-hat visor, animated swinging legs (`Math.sin(miner.walkPhase)`) and pickaxe/pack; when `state === "returning"`, draw a glowing cyan crystal shard above their pack.
  - **Walls & Attack Towers:** Hexagonal/bastion wall segments (`--neon-amber`) and turret towers (`--neon-cyan`) with rotating bow/launcher रेल and health bar (`hp / 200`).
  - **Visible Tower Arrows:** High-contrast neon-cyan fletched arrows (`drawTowerArrow`) with motion trail and arrowhead pointing along `Math.atan2(arrow.vy, arrow.vx)`.
  - **Shotgun AOE Ring:** Brief expanding shockwave ring matching the current `aoeRadiusPx` on player fire.
- [ ] **Step 4: Enhance `drawWorm` in `src/components/gameStageWormCanvas.ts` and wire into `renderStage`**
  Add animated walking/stepper cilia ticks along the worm body and a compact HP bar when `world.baseDefense?.active` is true. Call `drawBaseDefenseLayer(context, world, reducedMotion, frameNow)` inside `src/components/gameStagePresentation.ts::renderStage`.
- [ ] **Step 5: Run rendering unit tests**
  Run: `npx vitest run src/components/gameStageBaseDefenseCanvas.test.ts src/components/GameStage.render.test.ts`
  Expected: PASS.

#### Verify Visual & Transform Claims

- [ ] **Visual claim:** On the Base Defense canvas, the central Tent, glowing Crystals, walking NPC Miners (with leg animation), randomly placed Walls/Towers, in-flight Tower Arrows, and Worm walking segments + HP bars are all visibly drawn on every frame.
- [ ] **Transform claim:** `src/components/gameStageBaseDefenseCanvas.ts` is integrated into `renderStage` in `src/components/gameStagePresentation.ts` with full `reducedMotion` support.
- [ ] **Verification method:** `npx vitest run src/components/gameStageBaseDefenseCanvas.test.ts` + canvas draw-call spy assertions.
- [ ] **Verification result:** PENDING EXECUTION

---

### Task 4: Top-Bar "Bank" Tab, Powerups Dropdown UI, and Mode Menu / App Shell Wiring

**Files:**
- Create: `src/components/BaseDefenseBankBar.tsx`
- Create: `src/components/BaseDefenseBankBar.module.css`
- Create: `src/components/BaseDefenseBankBar.test.ts`
- Modify: `src/components/GameModeScreen.tsx`
- Modify: `src/components/GameStage.tsx`
- Modify: `src/components/GameStageOverlay.tsx`
- Modify: `src/components/EndlessGameOverWindow.tsx`
- Modify: `src/components/WormRanchApp.tsx`
- Test: `src/components/WormRanchApp.test.ts`

#### Steps
- [ ] **Step 1: Write failing component tests in `src/components/BaseDefenseBankBar.test.ts` and `src/components/WormRanchApp.test.ts`**
  Test:
  - `GameModeScreen` renders the 3rd option `"Base Defense"` with description and selects `"baseDefense"`.
  - `BaseDefenseBankBar` renders the top Bank tab displaying current credits (`BANK: 0 CR`), Base Tent HP/Level, Miner count, and Wave stats.
  - Clicking the Bank tab toggles the dropdown menu showing all 10 actions:
    1. `Damage (+5 DMG)` — `50 CR`
    2. `Miners Speed (+25%)` — `50 CR`
    3. `Health (+150 HP)` — `50 CR`
    4. `Armor (+1 DEF)` — `75 CR`
    5. `Miners Carry (+5 CR)` — `75 CR`
    6. `+1 Miner` — `100 CR`
    7. `Shotgun AOE Radius (+1 Unit)` — `75 CR`
    8. `Random Attack Tower (200HP/10DMG)` — `100 CR`
    9. `Walls (200HP)` — `10 CR`
    10. `Upgrade Base Tent (Lv. X -> Y, +1 Miner)` — `100 * nextLevel CR` (up to 10 upgrades: `100 CR`, `200 CR`, `300 CR`, ..., `1000 CR`)
  - Buttons disable when `bankCredits < cost` or when Base Tent reaches max 10 upgrades, and invoke `onPurchase(itemId)` when affordable.
- [ ] **Step 2: Run Vitest to confirm red phase**
  Run: `npx vitest run src/components/BaseDefenseBankBar.test.ts src/components/WormRanchApp.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `BaseDefenseBankBar.tsx` and `BaseDefenseBankBar.module.css`**
  Build an accessible (`aria-expanded`, `data-testid="bank-tab"`, `data-testid="bank-dropdown"`) top-center HUD bar and glassmorphic dropdown drawer that does not block canvas pointer events outside its bounds (`pointer-events: auto` on the bar/dropdown only).
- [ ] **Step 4: Wire `"baseDefense"` into `GameModeScreen.tsx`, `GameStage.tsx`, `GameStageOverlay.tsx`, `EndlessGameOverWindow.tsx`, and `WormRanchApp.tsx`**
  - In `GameStage.tsx`: when `mode === "baseDefense"`, call `initBaseDefenseMode(world)` on startup, route canvas pointer presses through `applyBaseDefensePress(world, point)`, and pass `onPurchasePowerup` + `baseDefenseSummary` to `GameStageOverlay`. Keep `GameStage.tsx` `< 500` lines.
  - In `WormRanchApp.tsx` and `EndlessGameOverWindow.tsx`: hold on Game Over when `result.reason === "baseDestroyed"` so the player can review their Base Defense run and click `Ride Again` or `Yard`.
- [ ] **Step 5: Run component tests**
  Run: `npx vitest run src/components/BaseDefenseBankBar.test.ts src/components/WormRanchApp.test.ts`
  Expected: PASS.

#### Verify Visual & Transform Claims

- [ ] **Visual claim:** Mode Menu displays `"Base Defense"`. Entering Base Defense shows the top `"BANK"` tab (`data-testid="bank-tab"`). Clicking the Bank tab opens a sleek neon dropdown (`data-testid="bank-dropdown"`) listing all 9 powerups/constructions plus the tiered Base Tent upgrade (`100 CR` -> `200 CR` -> `300 CR`... up to 10 times).
- [ ] **Transform claim:** Purchasing any upgrade in `BaseDefenseBankBar` mutates `worldRef.current.baseDefense` deterministically and immediately updates `stageSummary.baseDefense` in the React HUD.
- [ ] **Verification method:** `npx vitest run src/components/BaseDefenseBankBar.test.ts src/components/WormRanchApp.test.ts`.
- [ ] **Verification result:** PENDING EXECUTION

---

### Task 5: Comprehensive Playwright E2E Test Suite for Base Defense & UI Overhaul

**Files:**
- Create: `e2e/base-defense.spec.ts`
- Modify: `e2e/launch-flow.spec.ts`

#### Steps
- [ ] **Step 1: Add deterministic test hooks (`data-*` contract) on `BaseDefenseBankBar` and `GameStage`**
  Expose read-only automation attributes on `[data-base-defense-hud]`:
  - `data-credits` (live bank credits)
  - `data-miners-count` (active miners, starts at `"2"`)
  - `data-base-level` (tent upgrade level, starts at `"0"` upgrades / Level 1)
  - `data-base-hp` (tent HP)
  - `data-towers-count` (placed attack towers)
  - `data-walls-count` (placed walls)
  - `data-aoe-units` (shotgun AOE radius units)
  - `data-worm-hp` (current wave worm max HP)
  - `data-worm-dps` (current worm construction DPS)
- [ ] **Step 2: Write Playwright E2E tests in `e2e/base-defense.spec.ts` covering every user-requested feature**
  1. **Mode Selection & Initial State E2E:** Navigate `Welcome -> Open the gate -> Start roundup -> Choose Game Mode -> Base Defense -> Start Roundup`. Assert canvas is visible, `data-miners-count="2"`, `data-base-level="0"`, and the top Bank tab is visible.
  2. **Autonomous Miners & Crystal Credit Generation E2E:** Observe `data-credits` over time as the 2 starting miners complete crystal journeys back to the central Tent, confirming credits increase in `+10` increments without player intervention.
  3. **Bank Dropdown & Wall / Tower / Upgrade Purchases E2E:** Open the Bank tab dropdown (`data-testid="bank-tab"`), purchase a Wall (`10 CR`) once miners deposit `>= 10` credits, verify `data-walls-count="1"` and credits deduct by `10`. Verify all powerup options (`Damage`, `Miners Speed`, `Health`, `Armor`, `Miners Carry`, `+1 Miner`, `Shotgun AOE Radius`, `Random Attack Tower`, `Walls`, `Base Upgrade`) render with accurate costs and state.
  4. **Shotgun AOE & Worm Scaling Telemetry E2E:** Click on the game field to fire Shotgun AOE at incoming worms and verify `data-worm-hp` increases from `10` to `20` after `20s` (or via accelerated clock/page.clock).
- [ ] **Step 3: Build production bundle and run full verification gate**
  Run:
  ```bash
  npm run verify
  npm run test:e2e
  ```
  Expected: All Vitest suites pass, `tsc --noEmit` 0 errors, `eslint` 0 errors, `next build` succeeds, and all Playwright E2E specs (`launch-flow.spec.ts` + `base-defense.spec.ts`) pass on both `desktop-chromium` and `mobile-chromium`.

#### Verify Visual & Transform Claims

- [ ] **Visual claim:** Real Chromium browser renders the overhauled UI, boots Base Defense mode, animates miners walking between crystals and the central tent, opens the Bank dropdown at the top of the screen, places walls/towers on the map, and fires shotgun AOE bursts on click/tap.
- [ ] **Transform claim:** `e2e/base-defense.spec.ts` passes all feature checks in headless Chromium (desktop + mobile profiles) with zero console/page errors.
- [ ] **Verification method:** `npm run build && npm run test:e2e`
- [ ] **Verification result:** PENDING EXECUTION

---

## Enhanced Self-Review Checklist

1. **500-Line Repo Rule Compliance:**
   - `src/game/baseDefenseTypes.ts` (~110 lines)
   - `src/game/baseDefenseConstants.ts` (~75 lines)
   - `src/game/baseDefenseEngine.ts` (~380 lines)
   - `src/components/gameStageBaseDefenseCanvas.ts` (~340 lines)
   - `src/components/BaseDefenseBankBar.tsx` (~220 lines)
   - `src/components/GameStage.tsx` stays below 490 lines by delegating Base Defense HUD rendering to `BaseDefenseBankBar` and canvas drawing to `gameStageBaseDefenseCanvas.ts`.
2. **Visual/Transform Verification Completeness:** Every task includes explicit Visual, Transform, and Verification Method gates.
3. **Anti-Gravity Collaboration Boundary:** Documented in the plan header; no private config, `.env`, or external unverified assets are used.
4. **Source Provenance Check:** All dependencies (`next@16.3.8`, `react@19.2.4`, `@playwright/test@^1.64.1`, `vitest@^4.1.5`) are already installed and verified in `package.json`.
