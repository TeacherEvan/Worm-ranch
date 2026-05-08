import { describe, expect, it } from "vitest";
import { applyAccuratePress, applyMiss, createWorld, startRound, stepWorld, type CreateWorldOptions } from "./engine";

function createDeterministicOptions(seed: number): CreateWorldOptions {
  let state = seed >>> 0;

  return {
    runtime: {
      random: () => {
        state = (state * 1_664_525 + 1_013_904_223) >>> 0;
        return state / 0x1_0000_0000;
      },
      now: () => 1_700_100_000_000 + seed,
    },
  };
}

function createActiveWorld(
  profile: "desktop" | "mobile",
  seed: number,
  options: CreateWorldOptions = {},
) {
  const world = createWorld(profile, 800, 540, {
    ...createDeterministicOptions(seed),
    ...options,
  });

  startRound(world);

  return world;
}

function countPsychedelicWorms(world: ReturnType<typeof createActiveWorld>) {
  return world.worms.filter((worm) => worm.visualVariant === "psychedelic").length;
}

function getPsychedelicWorm(world: ReturnType<typeof createActiveWorld>) {
  return world.worms.find((worm) => worm.visualVariant === "psychedelic");
}

function applyMisses(world: ReturnType<typeof createActiveWorld>, count: number) {
  for (let index = 0; index < count; index += 1) {
    expect(applyMiss(world)).toEqual({ kind: "miss" });
  }
}

function countActiveWorms(world: ReturnType<typeof createActiveWorld>) {
  return world.worms.filter((worm) => worm.state !== "captured").length;
}

describe("engine special worm", () => {
  it("tracks miss streak only during an active round", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(11));

    expect(applyMiss(world)).toEqual({ kind: "ignored" });
    expect(world.missStreak).toBe(0);

    startRound(world);

    expect(applyMiss(world)).toEqual({ kind: "miss" });
    expect(applyMiss(world)).toEqual({ kind: "miss" });
    expect(world.missStreak).toBe(2);
  });

  it("resets the miss streak after a successful active click", () => {
    const world = createActiveWorld("desktop", 13);
    const openingWorm = world.worms[0];

    if (!openingWorm) {
      throw new Error("expected an opening worm");
    }

    applyMisses(world, 4);

    expect(world.missStreak).toBe(4);
    expect(applyAccuratePress(world, openingWorm.id)).toMatchObject({ wormId: openingWorm.id });
    expect(world.missStreak).toBe(0);
    expect(countPsychedelicWorms(world)).toBe(0);
  });

  it("does not spawn a psychedelic worm during the first four consecutive misses", () => {
    const world = createActiveWorld("desktop", 17);

    applyMisses(world, 4);

    expect(world.missStreak).toBe(4);
    expect(countPsychedelicWorms(world)).toBe(0);
    expect(world.psychedelicWormSpawned).toBe(false);
  });

  it("spawns exactly one psychedelic worm on the fifth consecutive miss", () => {
    const world = createActiveWorld("desktop", 23);
    const initialCount = world.worms.length;

    applyMisses(world, 5);

    expect(world.missStreak).toBe(5);
    expect(world.psychedelicWormSpawned).toBe(true);
    expect(world.worms).toHaveLength(initialCount + 1);
    expect(countPsychedelicWorms(world)).toBe(1);
  });

  it("does not spawn when the miss streak is broken before the fifth miss", () => {
    const world = createActiveWorld("desktop", 29);
    const openingWorm = world.worms[0];

    if (!openingWorm) {
      throw new Error("expected an opening worm");
    }

    applyMisses(world, 4);
    expect(applyAccuratePress(world, openingWorm.id)).toMatchObject({ wormId: openingWorm.id });
    applyMisses(world, 4);

    expect(world.missStreak).toBe(4);
    expect(countPsychedelicWorms(world)).toBe(0);
  });

  it("does not spawn another psychedelic worm after later misses in the same round", () => {
    const world = createActiveWorld("desktop", 31);

    applyMisses(world, 8);

    expect(countPsychedelicWorms(world)).toBe(1);
  });

  it("does not spawn a psychedelic worm or restart the desktop finale after five consecutive misses", () => {
    const world = createActiveWorld("desktop", 35, {
      rules: {
        totalWorms: 2,
      },
    });
    const openingWorm = world.worms[0];

    if (!openingWorm) {
      throw new Error("expected an opening worm");
    }

    expect(applyAccuratePress(world, openingWorm.id)).toEqual({
      kind: "collect",
      wormId: openingWorm.id,
      collected: 1,
    });

    stepWorld(world, 1);

    const finaleStartedAt = world.finaleStartedAt;

    expect(finaleStartedAt).not.toBeNull();
    expect(countActiveWorms(world)).toBe(1);

    applyMisses(world, 5);

    expect(countPsychedelicWorms(world)).toBe(0);
    expect(countActiveWorms(world)).toBe(1);
    expect(world.finaleStartedAt).toBe(finaleStartedAt);
  });

  it("gives the spawned psychedelic worm normal desktop teleport and capture behavior", () => {
    const world = createActiveWorld("desktop", 37, {
      rules: {
        totalWorms: 3,
        teleportUnlockCount: 1,
      },
    });
    const ordinaryWorm = world.worms[0];

    if (!ordinaryWorm) {
      throw new Error("expected an ordinary worm");
    }

    expect(applyAccuratePress(world, ordinaryWorm.id)).toEqual({
      kind: "collect",
      wormId: ordinaryWorm.id,
      collected: 1,
    });
    expect(world.teleportsUnlocked).toBe(true);

    applyMisses(world, 5);

    const specialWorm = getPsychedelicWorm(world);

    if (!specialWorm) {
      throw new Error("expected a psychedelic worm");
    }

    expect(specialWorm.teleportsRemaining).toBe(1);
    expect(applyAccuratePress(world, specialWorm.id)).toEqual({
      kind: "teleport",
      wormId: specialWorm.id,
      immortal: false,
    });
    expect(specialWorm.teleportsRemaining).toBe(0);
    expect(applyAccuratePress(world, specialWorm.id)).toEqual({
      kind: "collect",
      wormId: specialWorm.id,
      collected: 2,
    });
    expect(specialWorm.state).toBe("captured");
  });

  it("gives the spawned psychedelic worm normal mobile tag and capture behavior", () => {
    const world = createActiveWorld("mobile", 41);

    applyMisses(world, 5);

    const specialWorm = getPsychedelicWorm(world);

    if (!specialWorm) {
      throw new Error("expected a psychedelic worm");
    }

    expect(applyAccuratePress(world, specialWorm.id)).toEqual({
      kind: "tag",
      wormId: specialWorm.id,
      bursts: 1,
    });
    expect(specialWorm.touchBursts).toBe(1);
    expect(specialWorm.state).toBe("tagged");
    expect(applyAccuratePress(world, specialWorm.id)).toEqual({
      kind: "collect",
      wormId: specialWorm.id,
      collected: 1,
    });
    expect(specialWorm.state).toBe("captured");
  });
});