// Fairy lifecycle helpers — extracted from engine.ts to keep engine.ts under the 500-line budget.
// Internal to src/game: imported only by engine.ts. Type-only imports route through ./types (no cycle).

import type { EngineRuntime, Fairy, GameWorld, Worm } from "./types";
import { isFairyVisible } from "./types";
import { FAIRY_MORPH_DURATION_MS } from "./constants";

export function createFairy(world: GameWorld, worm: Worm): Fairy {
  const rules = world.rules;
  const morphDurationMs = FAIRY_MORPH_DURATION_MS;
  const flyDurationMs = Math.max(0, rules.fairyFadeAtMs - morphDurationMs);
  const trailFadeDurationMs = Math.max(0, rules.fairyTtlMs - rules.fairyFadeAtMs);
  const target = generateFairyTarget(world, worm);
  const control = generateFairyControlPoint(world, worm, target);

  return {
    id: `fairy-${worm.id}-${world.runtime.now()}`,
    wormId: worm.id,
    x: worm.x,
    y: worm.y,
    targetX: target.x,
    targetY: target.y,
    controlX: control.x,
    controlY: control.y,
    createdAt: world.runtime.now(),
    lifeMs: 0,
    ttlMs: rules.fairyTtlMs,
    morphDurationMs,
    flyDurationMs,
    trailFadeDurationMs,
    hue: (worm.hue + 120) % 360,
    state: "morphing",
  };
}

export function advanceFairies(world: GameWorld, deltaMs: number) {
  world.fairies = world.fairies.filter((fairy) => {
    fairy.lifeMs += deltaMs;
    fairy.state = getFairyState(fairy);

    return isFairyVisible(fairy);
  });
}

export function getFairyState(fairy: Fairy): Fairy["state"] {
  if (fairy.lifeMs < fairy.morphDurationMs) {
    return "morphing";
  }

  if (fairy.lifeMs < fairy.morphDurationMs + fairy.flyDurationMs) {
    return "flying";
  }

  if (fairy.lifeMs < fairy.ttlMs) {
    return "trailFading";
  }

  return "gone";
}

function generateFairyTarget(world: GameWorld, worm: Worm) {
  const offScreenDistance = 100;
  const edgeVariationX = 40;
  const edgeVariationY = 200;
  const edge = Math.floor(world.runtime.random() * 4);

  switch (edge) {
    case 0:
      return {
        x: worm.x + (world.runtime.random() - 0.5) * edgeVariationX,
        y: -offScreenDistance,
      };
    case 1:
      return {
        x: world.width + offScreenDistance,
        y: worm.y + (world.runtime.random() - 0.5) * edgeVariationY,
      };
    case 2:
      return {
        x: worm.x + (world.runtime.random() - 0.5) * edgeVariationX,
        y: world.height + offScreenDistance,
      };
    default:
      return {
        x: -offScreenDistance,
        y: worm.y + (world.runtime.random() - 0.5) * edgeVariationY,
      };
  }
}

function generateFairyControlPoint(
  world: GameWorld,
  worm: Worm,
  target: { x: number; y: number },
) {
  return {
    x: worm.x + (target.x - worm.x) * 0.5 + (world.runtime.random() - 0.5) * 20,
    y: Math.min(worm.y, target.y) - 50 - world.runtime.random() * 50,
  };
}

// Re-export so callers using EngineRuntime type resolution stay stable.
export type { EngineRuntime };
