// Continuous-mode worm spawn/refill helpers — extracted from engine.ts.
// Internal to src/game: imported only by engine.ts.

import type { ContinuousColorTargetState, GameWorld, GameSummaryTargetColor } from "./types";
import { isWormActive } from "./types";
import { isContinuousColorTargetVisible } from "./continuousColorTargets";
import { getWormColorById } from "./wormColors";
import { createStandardWorm } from "./specialWorms";

export function spawnContinuousWorm(world: GameWorld) {
  const inactiveIndex = world.worms.findIndex((worm) => !isWormActive(worm));
  const spawnIndex = inactiveIndex >= 0 ? inactiveIndex : world.worms.length;
  const worm = createStandardWorm(spawnIndex, world.rules, world.width, world.height, world.runtime);

  if (inactiveIndex >= 0) {
    world.worms[inactiveIndex] = worm;
    return;
  }

  world.worms.push(worm);
}

export function refillContinuousWorms(world: GameWorld) {
  while (world.worms.filter(isWormActive).length < world.rules.totalWorms) {
    spawnContinuousWorm(world);
  }
}

export function getTargetColorSummary(
  targetColor: ContinuousColorTargetState | null,
  continuousActive: boolean,
  now: number,
): GameSummaryTargetColor | null {
  if (!continuousActive || !targetColor) {
    return null;
  }

  const color = getWormColorById(targetColor.colorId);

  return {
    colorId: targetColor.colorId,
    label: color.label,
    progress: targetColor.progress,
    goal: targetColor.goal,
    visible: isContinuousColorTargetVisible(targetColor, now),
  };
}


