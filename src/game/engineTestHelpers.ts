import { expect } from "vitest";
import {
  applyAccuratePress,
  createWorld,
  startContinuousMode,
  startRound,
  type CreateWorldOptions,
} from "./engine";

export function createDeterministicOptions(seed: number): CreateWorldOptions {
  let state = seed >>> 0;

  return {
    runtime: {
      random: () => {
        state = (state * 1_664_525 + 1_013_904_223) >>> 0;
        return state / 0x1_0000_0000;
      },
      now: () => 1_700_000_000_000 + seed,
    },
  };
}

export function createFixedRuntime(randomValue = 0, startAt = 1_700_300_000_000) {
  let nowValue = startAt;

  return {
    runtime: {
      random: () => randomValue,
      now: () => nowValue,
    },
    advanceNow: (deltaMs: number) => {
      nowValue += deltaMs;
    },
  };
}

export function getSnapshot(profile: "desktop" | "mobile", seed: number) {
  const world = createWorld(profile, 800, 540, createDeterministicOptions(seed));
  return {
    profile: world.profile,
    phase: world.phase,
    totalWorms: world.worms.length,
    firstThree: world.worms.slice(0, 3).map((worm) => ({
      id: worm.id,
      x: Number(worm.x.toFixed(4)),
      y: Number(worm.y.toFixed(4)),
      vx: Number(worm.vx.toFixed(4)),
      vy: Number(worm.vy.toFixed(4)),
      state: worm.state,
    })),
  };
}

export function createActiveDesktopWorld(seed: number) {
  const world = createWorld("desktop", 800, 540, createDeterministicOptions(seed));
  startRound(world);
  return world;
}

export function createContinuousActiveWorld(profile: "desktop" | "mobile", totalWorms: number, randomValue = 0) {
  const clock = createFixedRuntime(randomValue);
  const world = createWorld(profile, 800, 540, {
    runtime: clock.runtime,
    rules: {
      totalWorms,
      introCountdownMs: 1,
      ghostFinaleDurationMs: 25,
      touchBurstsToCapture: 1,
      baseMaxSpeed: 0,
      directionChangeRate: 0,
      speedBonusPerCollect: 0,
    },
  });

  startRound(world);
  startContinuousMode(world);

  return {
    world,
    advanceNow: clock.advanceNow,
  };
}

export function getActiveWormCount(world: ReturnType<typeof createWorld>) {
  return world.worms.filter((worm) => worm.state !== "captured" && worm.state !== "escaped").length;
}

export function getActiveStandardWormIdByColor(world: ReturnType<typeof createWorld>, colorId: string) {
  const worm = world.worms.find(
    (candidate) =>
      candidate.colorId === colorId && candidate.state !== "captured" && candidate.state !== "escaped",
  );

  if (!worm) {
    throw new Error(`expected active worm for ${colorId}`);
  }

  return worm.id;
}

export function captureDesktopWorms(world: ReturnType<typeof createActiveDesktopWorld>, count: number) {
  const wormIds = world.worms.slice(0, count).map((worm) => worm.id);

  for (const wormId of wormIds) {
    expect(applyAccuratePress(world, wormId)).toMatchObject({ kind: "collect", wormId });
  }
}
