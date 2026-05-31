import type { ProfileRules } from "./rules";
import { isWormActive, type EngineRuntime, type GameWorld, type PsychedelicWorm, type StandardWorm, type Worm } from "./types";
import { getStandardWormColor } from "./wormColors";

const SPECIAL_WORM_SPAWN_MISS_COUNT = 5;

export function createStandardWorm(
  index: number,
  rules: ProfileRules,
  width: number,
  height: number,
  runtime: EngineRuntime,
): StandardWorm {
  const color = getStandardWormColor(index);

  return createWorm({
    id: `worm-${index + 1}`,
    rules,
    width,
    height,
    runtime,
    colorId: color.id,
    hue: color.hue,
    teleportsRemaining: 0,
    visualVariant: "standard",
  });
}

export function createPsychedelicWorm(world: GameWorld): PsychedelicWorm {
  return createWorm({
    id: `worm-psychedelic-${world.runtime.now()}-${world.missStreak}`,
    rules: world.rules,
    width: world.width,
    height: world.height,
    runtime: world.runtime,
    colorId: null,
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
};

type CreateStandardWormOptions = CreateWormOptions & {
  colorId: StandardWorm["colorId"];
  visualVariant: StandardWorm["visualVariant"];
};

type CreatePsychedelicWormOptions = CreateWormOptions & {
  colorId: PsychedelicWorm["colorId"];
  visualVariant: PsychedelicWorm["visualVariant"];
};

type CreateAnyWormOptions = CreateStandardWormOptions | CreatePsychedelicWormOptions;

function createWorm(options: CreateStandardWormOptions): StandardWorm;
function createWorm(options: CreatePsychedelicWormOptions): PsychedelicWorm;
function createWorm(options: CreateAnyWormOptions): Worm {
  const { id, rules, width, height, runtime, colorId, hue, teleportsRemaining, visualVariant } = options;
  const initialVx = randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed);
  const initialVy = randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed);
  const direction = Math.atan2(initialVy, initialVx || 0.0001);
  const crawlPhase = randomBetween(runtime, 0, Math.PI * 2);

  const wormBase = {
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
    teleportsRemaining,
    touchBursts: 0,
    state: "roaming" as const,
    stateTimerMs: 0,
  };

  if (visualVariant === "standard") {
    return {
      ...wormBase,
      visualVariant,
      colorId,
    };
  }

  return {
    ...wormBase,
    visualVariant,
    colorId,
  };
}

function randomBetween(runtime: EngineRuntime, min: number, max: number) {
  return min + runtime.random() * (max - min);
}