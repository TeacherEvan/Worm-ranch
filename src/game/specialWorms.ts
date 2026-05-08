import type { ProfileRules } from "./rules";
import { isWormActive, type EngineRuntime, type GameWorld, type Worm, type WormVisualVariant } from "./types";

const SPECIAL_WORM_SPAWN_MISS_COUNT = 5;

export function createStandardWorm(
  index: number,
  rules: ProfileRules,
  width: number,
  height: number,
  runtime: EngineRuntime,
): Worm {
  return createWorm({
    id: `worm-${index + 1}`,
    rules,
    width,
    height,
    runtime,
    hue: (index * 17) % 360,
    teleportsRemaining: 0,
    visualVariant: "standard",
  });
}

export function createPsychedelicWorm(world: GameWorld): Worm {
  return createWorm({
    id: `worm-psychedelic-${world.runtime.now()}-${world.missStreak}`,
    rules: world.rules,
    width: world.width,
    height: world.height,
    runtime: world.runtime,
    hue: randomBetween(world.runtime, 0, 360),
    teleportsRemaining: world.profile === "desktop" && world.teleportsUnlocked ? 1 : 0,
    visualVariant: "psychedelic",
  });
}

export function shouldSpawnPsychedelicWorm(world: GameWorld) {
  if (world.profile === "desktop" && world.worms.filter(isWormActive).length <= 1) {
    return false;
  }

  return !world.psychedelicWormSpawned && world.missStreak >= SPECIAL_WORM_SPAWN_MISS_COUNT;
}

type CreateWormOptions = {
  id: string;
  rules: ProfileRules;
  width: number;
  height: number;
  runtime: EngineRuntime;
  hue: number;
  teleportsRemaining: number;
  visualVariant: WormVisualVariant;
};

function createWorm(options: CreateWormOptions): Worm {
  const { id, rules, width, height, runtime, hue, teleportsRemaining, visualVariant } = options;
  const initialVx = randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed);
  const initialVy = randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed);
  const direction = Math.atan2(initialVy, initialVx || 0.0001);
  const crawlPhase = randomBetween(runtime, 0, Math.PI * 2);

  return {
    id,
    x: randomBetween(runtime, rules.baseRadius + 20, width - rules.baseRadius - 20),
    y: randomBetween(runtime, rules.baseRadius + 20, height - rules.baseRadius - 20),
    vx: initialVx,
    vy: initialVy,
    direction,
    crawlPhase,
    radius: rules.baseRadius + (Math.round(hue) % 3),
    hue,
    wave: crawlPhase,
    visualVariant,
    teleportsRemaining,
    touchBursts: 0,
    state: "roaming",
    stateTimerMs: 0,
  };
}

function randomBetween(runtime: EngineRuntime, min: number, max: number) {
  return min + runtime.random() * (max - min);
}