# Implementation Plan: Ultimate Graphics, Audio-Tactile & Tactical Gameplay Overhaul

## Goal Description
Push the visual quality, audio-tactile punch, and tactical immersion of **Worm Ranch** (especially Base Defense mode and Tactical Map) to the highest possible standard:
1. **Kinetic Shotgun AOE Shockwaves:** Render expanding explosive shockwave rings, blast smoke particles, and subtle camera rumble on every shotgun blast.
2. **Prismatic Crystal Visuals & Vacuum Uplift:** Refactored crystalline gem cluster rendering with refractive facets, glowing prism rays, vacuum particle trails when miners harvest, and floating `+10 CR` credit ascent notifications.
3. **Visceral Directional Splatter Physics & Evaporation:** Directional blood-splat physics aligned with shotgun blast vectors, blood-spatter impact rings, and effervescent dissolving foam as splats fade out.
4. **Animated Tactical Turrets & Reinforced Barricades:** Towers with rotating tracking heads angled toward target worms, animated recoil kicks, and glowing energy reload coils; barricade walls with animated forcefield reinforcement scanlines.
5. **Command Bunker Base Complex:** Architectural stepped blast-door bunker, rotating beacon mast, level insignia, and pulsating red emergency alarm strobe when tent HP drops under 30%.
6. **Holo-Grid Interactive Scanlines:** Terrain matrix grid waves reacting when enemy worms cross defense perimeter thresholds.
7. **Strict Architecture & Line Limits:** Keep all modified and new files under 500 lines, maintain separation of concerns, and retain 100% green verification across unit and Playwright E2E suites.

---

## Objectives

- [x] OBJ-001: Extend BaseDefenseWorldState and types to track shotgun blasts, floating text indicators (`+10 CR`), and turret tracking angles in `src/game/baseDefenseTypes.ts` and `src/game/baseDefenseConstants.ts`.
- [x] OBJ-002: Add shotgun explosive blast particle tone to `src/components/gameStageParticles.ts` and wire shotgun blasts into simulation in `src/game/baseDefenseSimulation.ts` and `src/game/baseDefenseEngine.ts`.
- [x] OBJ-003: Implement kinetic shotgun shockwave rendering and ascending floating credit notifications in `src/components/gameStageVisualEffects.ts`.
- [x] OBJ-004: Enhance organic ichor splat rendering with directional droplet physics, impact rings, and effervescent dissolving sizzle foam in `src/components/gameStageSplats.ts`.
- [x] OBJ-005: Transform central tent into multi-tiered reinforced command bunker complex with beacon mast and low-HP red emergency strobe in `src/components/gameStageBaseDefenseCanvas.ts`.
- [x] OBJ-006: Add rotating tracking turret heads, recoil animation, and glowing energy coils to towers in `src/components/gameStageBaseDefenseCanvas.ts`.
- [x] OBJ-007: Add animated holographic hex shield mesh to barricades/walls in `src/components/gameStageBaseDefenseCanvas.ts`.
- [x] OBJ-008: Implement dynamic holo-grid incursion ripples and sector alerts when enemy worms cross perimeter thresholds in `src/components/gameStageTacticalMap.ts`.
- [x] OBJ-009: Connect shotgun shockwaves and floating credit events into `GameStage.tsx` and Base Defense canvas rendering loop without exceeding 500 lines.
- [x] OBJ-010: Verify all 40 unit test suites, typecheck, lint, build, and all 28 Playwright E2E tests pass cleanly.
