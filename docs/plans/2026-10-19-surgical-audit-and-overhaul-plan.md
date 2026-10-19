# Masterclass Implementation Plan: Tactical UI Overhaul, Dynamic Mechanics & FX Engine

> **Agent:** Antigravity / DeepMind Advanced Agentic Coding
> **Directives:** UI overhaul & layout review, Playwright bounding-box overlap safeguards, upgrade shortcut keys `[1]`-`[0]`, mathematically center-locked tent, drastic tactical map revamp, killed worms drop crystals with splat decals, arcade-grade special effects.
> **Repo Invariants:** Every file strictly `< 500` lines; deterministic game math in `src/game/`; presentation in `src/components/`; zero test flakiness.

---

## 1. Goal Description

Worm Ranch is evolving from a casual clicker into an arcade-grade tactical base defense survival experience. This masterclass overhaul solves five critical gameplay and architectural requirements:
1. **Dynamic Combat Economy:** Eliminates the static starting crystals (`initialCrystals = []`). Killing worms now spawns dropped crystal gems at their exact death coordinates.
2. **Juicy Special Effects & Splats:** Defeated worms trigger organic viscous ichor splats on the terrain floor, accompanied by particle shockwaves, crystal pop animations, tower arrow trails/sparks, and miner pickaxe strike bursts.
3. **Drastic Tactical Map Revamp:** Replaces the basic corral backdrop with a high-tech tactical arena featuring a breathing hex-grid, rotating radar sweep, concentric defense perimeter rings, and glowing power conduits linking the Tent to placed structures.
4. **Center-Locked Command Base:** Fixes coordinate drift in `resizeWorld` so the Base Tent is mathematically pinned to `(width / 2, height / 2)` across all window resizes, device rotations, and aspect ratios.
5. **Keyboard Requisition Shortcuts (`1`–`0`, `B`):** Enables instant tactical purchases via hotkeys with visible shortcut badges on the Bank dropdown.
6. **Playwright Layout Overlap Safeguards:** Implements mathematical bounding-box collision detection in E2E tests, guaranteeing that HUD badges, Bank bars, and dropdowns never collide or clip on desktop or mobile viewports.

---

## 2. User Review Required & Design Decisions

> [!IMPORTANT]
> **Crystal Lifecycle & Miner Pathfinding Protocol:**
> - When a worm dies from player shotgun AOE or tower arrows, it drops **1 Crystal Gem** worth **10 Credits** (plus wave bonuses) at its death coordinates `(worm.x, worm.y)`.
> - If miners are idle or en route to a depleted node, they immediately repath to the nearest dropped crystal.
> - To preserve 60/120 FPS performance during high-intensity endless waves, dropped crystals have a maximum concurrent cap of **24 active gems** on the map. If uncollected for >45 seconds, older crystals gradually dissipate.

> [!TIP]
> **Tactical Upgrade Shortcut Bindings:**
> Shortcut keys will function globally during Base Defense mode (both when the dropdown is closed or open):
> - `[1]`: Player Damage (`damage`, 50 CR)
> - `[2]`: Miner Speed (`minerSpeed`, 50 CR)
> - `[3]`: Base Health (`health`, 50 CR)
> - `[4]`: Armor Plating (`armor`, 75 CR)
> - `[5]`: Miner Carry (`minerCarry`, 75 CR)
> - `[6]`: Extra Miner (`extraMiner`, 100 CR)
> - `[7]`: Shotgun Radius (`aoeRadius`, 75 CR)
> - `[8]`: Attack Tower (`tower`, 100 CR)
> - `[9]`: Defense Wall (`wall`, 10 CR)
> - `[0]`: Upgrade Tent (`baseUpgrade`, Level Tier * 100 CR)
> - `[B]`: Toggle Requisitions Drawer Open / Close
> - `[Esc]`: Close Requisitions Drawer

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Combat & Destruction
        P[Player Shotgun Click] -->|Radius Check| W[Worm Damage]
        T[Attack Towers] -->|Animated Arrows| W
        W -->|HP <= 0| WD[Worm Defeated Event]
    end

    subgraph Visual FX & Splat Engine
        WD -->|Spawn Decal| S[Ichor Splat Buffer: Fluid Ground Stain]
        WD -->|Spawn Particles| FX1[Ichor Spray & Confetti Burst]
        WD -->|Pop Physics| CD[Dropped Crystal Gem at Death Coords]
    end

    subgraph Autonomous Miner AI
        CD -->|Spatial Scan| M[Autonomous NPC Miners]
        M -->|Pathfind| M2[Walk to Crystal Node]
        M2 -->|Pickaxe Cycle + FX| M3[Harvest & Collect Credits]
        M3 -->|Return to Center| TB[Central Tent (width/2, height/2)]
        TB -->|Deposit| BK[Bank Credits Pool]
    end

    subgraph Tactical Controls & HUD
        KB[Keyboard 1-0 / B] -->|Hotkey Dispatcher| ACT[Purchase Powerup / Construction]
        ACT -->|Deduct Credits| BK
        ACT -->|Construct| C[Spawn Wall / Tower / Upgrade Tent]
        C -->|Dynamic Conduits| MAP[Tactical Hex Map & Radar Sweep]
    end
```

---

## 4. Proposed Changes Grouped by Component

---

### Component 1: Simulation & Game Engine (`src/game/`)

#### [MODIFY] `src/game/baseDefenseTypes.ts`
- Extend `CrystalNode` to track drop dynamics:
  ```ts
  export type CrystalNode = Point & {
    id: string;
    remainingCredits: number;
    createdAtMs: number;
    isDrop?: boolean;
    bounceOffset?: number;
  };
  ```
- Add `SplatDecal` and `SpecialEffectEvent` types:
  ```ts
  export type SplatDecal = Point & {
    id: string;
    radius: number;
    color: string;
    alpha: number;
    rotation: number;
    droplets: Array<{ dx: number; dy: number; r: number }>;
    createdAtMs: number;
  };
  ```
- Add `splats: SplatDecal[]` to `BaseDefenseWorldState`.

#### [MODIFY] `src/game/baseDefenseConstants.ts`
- Define crystal drop constants and decay timers:
  ```ts
  export const MAX_DROPPED_CRYSTALS = 24;
  export const CRYSTAL_DROP_CREDITS = 10;
  export const CRYSTAL_DECAY_MS = 45_000;
  export const SPLAT_LIFETIME_MS = 1_800;
  export const MAX_ACTIVE_SPLATS = 32;
  ```

#### [MODIFY] `src/game/baseDefenseSimulation.ts`
- **Remove start crystals:** In `initBaseDefenseMode`, set `crystals = []`.
- **Worm death drop logic:** In `stepArrows` and `applyBaseDefensePress`, when `worm.baseDefense.hp <= 0`:
  ```ts
  // Spawn crystal drop:
  if (bd.crystals.length < MAX_DROPPED_CRYSTALS) {
    bd.crystals.push({
      id: `drop-${Date.now()}-${Math.random()}`,
      x: worm.x,
      y: worm.y,
      remainingCredits: CRYSTAL_DROP_CREDITS,
      createdAtMs: bd.elapsedMs,
      isDrop: true,
      bounceOffset: 0,
    });
  }
  // Spawn splat decal:
  spawnSplatDecal(bd, worm.x, worm.y, worm.radius, worm.color ?? "#c7f36b");
  ```
- **Miner pathfinding recovery:** If a miner's target crystal is collected by another miner, the miner recalculates the nearest target instantly without pausing or deadlocking.

#### [MODIFY] `src/game/engine.ts`
- **Center-locked tent invariant in `resizeWorld`:**
  ```ts
  export function resizeWorld(world: GameWorld, width: number, height: number) {
    world.width = width;
    world.height = height;
    if (world.baseDefense?.active) {
      world.baseDefense.tent.x = width / 2;
      world.baseDefense.tent.y = height / 2;
    }
  }
  ```

---

### Component 2: Presentation & Visual FX Engine (`src/components/`)

#### [NEW] `src/components/gameStageSplats.ts`
- Organic, fluid-simulation splat rendering on the terrain layer:
  - Draws a central viscous puddle with organic irregular blobs (`context.ellipse`).
  - Radiates 4–7 micro-droplets flung along velocity vectors.
  - Multi-tier color rendering: neon core with darker splatter edge.
  - Smooth quadratic opacity fade over `SPLAT_LIFETIME_MS` (`1.8s`).

#### [NEW] `src/components/gameStageTacticalMap.ts`
- Complete visual map revamp:
  - **Tactical Hex Grid:** Subtle vector hexagonal matrix (`#00f5ff` at 3–6% opacity) with ambient breathing cycle.
  - **Perimeter Defense Range Rings:** Concentric tactical arcs around the central Base Tent at 75px, 150px, and 240px.
  - **Sweeping Radar Beam:** Radial scanning vector rotating at 0.5 rev/sec with fading phosphor sweep trail.
  - **Energy Conduits:** Luminous power trace lines linking the Base Tent to all constructed Walls and Towers, pulsing with active energy sparks.
  - **Atmospheric Biospores:** Subtle floating neon dust motes drifting across the ranch to give atmospheric volume.

#### [NEW] `src/components/gameStageVisualEffects.ts`
- High-impact special effects suite:
  - **Shotgun Blast Ring:** Expanding shockwave wave ripple with muzzle smoke sparks on player clicks.
  - **Arrow Flight Trail & Kinetic Impact:** High-speed fletched arrow contrails and multi-spark burst on hitting worms.
  - **Crystal Gem Pop & Aura:** Bouncing spawn animation with glittering diamond facets and rotating cyan pulse aura.
  - **Mining Impact FX:** Sparks flying off the crystal node whenever a miner strikes it with their pickaxe.
  - **Base Tent Shield Arc:** Cyan electric deflection arcs when the Tent absorbs worm attacks.
  - **Level-Up Fireworks:** Multi-colored radial burst celebration when upgrading the Base Tent.

#### [MODIFY] `src/components/gameStageBaseDefenseCanvas.ts`
- Wire the tactical map, splats, and special effects into the canvas rendering cycle:
  1. `drawTacticalMapBackdrop(context, world, frameNow)`
  2. `drawSplatDecals(context, world, frameNow)`
  3. `drawDroppedCrystals(context, world, frameNow)`
  4. `drawConstructionsAndPowerLines(context, world, frameNow)`
  5. `drawBaseTentCenter(context, world, frameNow)`
  6. `drawAnimatedMiners(context, world, frameNow)`
  7. `drawProjectilesAndSpecialFX(context, world, frameNow)`

---

### Component 3: Tactical HUD & Keyboard Hotkeys (`src/components/`)

#### [MODIFY] `src/components/BaseDefenseBankBar.tsx`
- Add keyboard shortcut badges (`[1]`, `[2]`, ..., `[0]`) to each shop item row in `SHOP_OPTIONS`.
- Add active purchase toast animation indicating which upgrade was triggered.
- Add keyboard accessibility attributes (`aria-keyshortcuts="1"`, etc.).
- Add compact responsive styling so the Bank bar never overlaps HUD badges.

#### [MODIFY] `src/components/BaseDefenseBankBar.module.css`
- Neon tactical styling:
  - Angled cyber-brackets on the Bank Tab container.
  - Monospace telemetry typography with high-contrast text glow.
  - Dedicated shortcut badge chips:
    ```css
    .shortcutBadge {
      font-size: 10px;
      font-weight: 700;
      color: var(--neon-cyan);
      background: rgba(0, 245, 255, 0.12);
      border: 1px solid rgba(0, 245, 255, 0.35);
      border-radius: 4px;
      padding: 1px 5px;
      margin-right: 6px;
    }
    ```
  - Media query for screens `<= 480px` to adjust padding and prevent layout collisions.

#### [MODIFY] `src/components/gameStageKeyboard.ts`
- Expand `handleStageKeyDown` to intercept number keys `1`–`9`, `0`, and `b`/`B`:
  ```ts
  const POWERUP_SHORTCUTS: Record<string, BaseDefensePowerupId> = {
    "1": "damage",
    "2": "minerSpeed",
    "3": "health",
    "4": "armor",
    "5": "minerCarry",
    "6": "extraMiner",
    "7": "aoeRadius",
    "8": "tower",
    "9": "wall",
    "0": "baseUpgrade",
  };
  ```
- When pressed in Base Defense mode, execute `onPurchase(powerupId)` and play purchase audio confirmation.
- Pressing `B` or `b` toggles the requisitions dropdown open/closed.
- Pressing `Escape` closes the dropdown.

#### [MODIFY] `src/components/GameStage.tsx`
- Pass keyboard shortcut callbacks to `handleStageKeyDown`.
- Keep `GameStage.tsx` lean (< 470 lines) by delegating all canvas map drawing and splats to helper modules.

---

### Component 4: Playwright E2E Overlapping Safeguards (`e2e/`)

#### [MODIFY] `e2e/base-defense.spec.ts`
- Implement automated bounding-box non-intersection algorithm:
  ```ts
  async function assertNoLayoutOverlap(page: Page, selectors: string[]) {
    const locators = selectors.map((s) => page.locator(s));
    const boxes = await Promise.all(
      locators.map(async (loc) => (await loc.isVisible()) ? await loc.boundingBox() : null)
    );
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!a || !b) continue;
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        expect(overlaps, `Collision between ${selectors[i]} and ${selectors[j]}`).toBe(false);
      }
    }
  }
  ```
- **Test 1: Layout Collision Safeguard:** Assert that `.bankBarContainer`, `.timeBadge`, `.killsBadge`, and `.targetCallout` have zero bounding-box overlaps on both desktop (`1280x720`) and mobile (`390x844`).
- **Test 2: Zero Initial Crystals & Worm Kill Crystal Drop:** Assert world starts with 0 crystals, killing a worm spawns a crystal, and miners collect it.
- **Test 3: Upgrade Shortcut Keys:** Press keyboard keys `'1'`, `'9'`, and `'b'`, asserting credit deduction, wall placement, and dropdown toggling.
- **Test 4: Center-Locked Base Tent on Dynamic Resize:** Resize browser viewport from 1280x720 to 800x600, assert canvas center coordinates match Tent location.

---

## 5. File Line Count & Budget Matrix (<500 LOC Enforcement)

| File Path | Estimated LOC | Budget Max | Strategy |
|---|---|---|---|
| `src/game/baseDefenseTypes.ts` | 130 LOC | 500 LOC | Pure interface definitions. |
| `src/game/baseDefenseConstants.ts` | 75 LOC | 500 LOC | Mathematical constants. |
| `src/game/baseDefenseSimulation.ts` | 340 LOC | 500 LOC | Drop generation, miner pathing. |
| `src/game/engine.ts` | 462 LOC | 500 LOC | Center-locked tent in `resizeWorld`. |
| `src/components/gameStageSplats.ts` | 140 LOC | 500 LOC | Dedicated splat decal renderer. |
| `src/components/gameStageTacticalMap.ts` | 185 LOC | 500 LOC | Dedicated hex grid and radar sweep. |
| `src/components/gameStageVisualEffects.ts` | 165 LOC | 500 LOC | Shockwaves, arrow trails, spark bursts. |
| `src/components/gameStageBaseDefenseCanvas.ts` | 320 LOC | 500 LOC | Layered composition. |
| `src/components/BaseDefenseBankBar.tsx` | 215 LOC | 500 LOC | Keyboard shortcut chips & drawer. |
| `src/components/gameStageKeyboard.ts` | 125 LOC | 500 LOC | Clean hotkey mapping. |
| `src/components/GameStage.tsx` | 468 LOC | 500 LOC | Modular delegation to companion files. |
| `e2e/base-defense.spec.ts` | 210 LOC | 500 LOC | Layout overlap & hotkey coverage. |

---

## 6. Verification Plan

### Automated Verification Gates
```bash
# 1. Run Vitest Unit Tests (40+ suites, 205+ tests)
npm run test:engine

# 2. Typecheck & Strict Linting
npm run typecheck
npm run lint

# 3. Production Build
npm run build

# 4. Playwright Browser E2E Tests (Desktop + Mobile Chromium)
npm run test:e2e
```

### Manual Verification Steps
1. **Initial Arena State:** Launch Base Defense mode. Confirm map starts with **0 crystals** and the Base Tent is positioned at the exact visual center.
2. **Combat & Crystal Drops:** Click/tap near incoming worms to fire shotgun. Confirm:
   - Green ichor splat decal appears on the ground.
   - Worm drops a glowing crystal gem at its death point.
   - Autonomous miners immediately pivot, walk to the dropped crystal, perform pickaxe strike animation, and carry the gem back to the Tent.
3. **Keyboard Shortcuts:** Press keys `1` through `0` and verify immediate purchase with credit deductions. Press `B` to toggle dropdown.
4. **Visual Overhaul:** Verify tactical hex grid, perimeter defense rings, radar sweep, and glowing power lines connecting Tent to towers.
5. **Responsive & Window Resize:** Resize window and verify Tent stays centered and HUD badges never overlap.
