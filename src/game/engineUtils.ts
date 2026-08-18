// Shared engine utilities used by the extracted engine modules.
// `randomBetween` and `clamp` are consumed by engineFairies.ts and enginePhase.ts
// (and other engine internals), so they live here to avoid duplication.

import type { EngineRuntime, GameWorld } from "./types";

export function randomBetween(runtime: EngineRuntime, min: number, max: number): number {
  return min + runtime.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getWormSpeed(world: GameWorld): number {
  const rules = world.rules;
  const base = rules.baseMaxSpeed + world.collected * rules.speedBonusPerCollect;
  const multiplier = world.continuousMode?.speedMultiplier ?? 1;
  const speed = base * multiplier;
  return clamp(speed, 0, rules.rushSpeed);
}
