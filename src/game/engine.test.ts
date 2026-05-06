import { describe, expect, it } from "vitest";
import { DESKTOP_RULES, MOBILE_RULES } from "./rules";
import {
  applyAccuratePress,
  createWorld,
  getSummary,
  setPointer,
  startRound,
  stepWorld,
  triggerTouchRush,
  type CreateWorldOptions,
} from "./engine";

function createDeterministicOptions(seed: number): CreateWorldOptions {
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

function getSnapshot(profile: "desktop" | "mobile", seed: number) {
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

function createActiveDesktopWorld(seed: number) {
  const world = createWorld("desktop", 800, 540, createDeterministicOptions(seed));
  startRound(world);
  return world;
}

function captureDesktopWorms(world: ReturnType<typeof createActiveDesktopWorld>, count: number) {
  const wormIds = world.worms.slice(0, count).map((worm) => worm.id);

  for (const wormId of wormIds) {
    expect(applyAccuratePress(world, wormId)).toMatchObject({ kind: "collect", wormId });
  }
}

describe("engine", () => {
  it("createWorld initializes desktop runs with 100 roaming worms", () => {
    const snapshot = getSnapshot("desktop", 17);

    expect(snapshot.profile).toBe("desktop");
    expect(snapshot.phase).toBe("introCountdown");
    expect(snapshot.totalWorms).toBe(DESKTOP_RULES.totalWorms);
    expect(snapshot.firstThree.every((worm) => worm.state === "roaming")).toBe(true);
    expect(snapshot).toEqual(getSnapshot("desktop", 17));
  });

  it("createWorld initializes mobile runs with 10 roaming worms", () => {
    const snapshot = getSnapshot("mobile", 29);

    expect(snapshot.profile).toBe("mobile");
    expect(snapshot.phase).toBe("introCountdown");
    expect(snapshot.totalWorms).toBe(MOBILE_RULES.totalWorms);
    expect(snapshot.firstThree.every((worm) => worm.state === "roaming")).toBe(true);
    expect(snapshot).toEqual(getSnapshot("mobile", 29));
  });

  it("mobile first touch anywhere arms rush and starts panic on the next live simulation step", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(41));
    startRound(world);

    triggerTouchRush(world, { x: 120, y: 140 });

    expect(world.rushTriggered).toBe(false);
    expect(world.pendingRushTrigger).toBe(true);

    stepWorld(world, 16);

    expect(world.rushTriggered).toBe(true);
    expect(world.pendingRushTrigger).toBe(false);
  });

  it("mobile first accurate tap tags a worm without capturing it", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(83));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);

    expect(applyAccuratePress(world, worm.id)).toEqual({ kind: "tag", wormId: worm.id, bursts: 1 });
    expect(world.collected).toBe(0);
    expect(worm.touchBursts).toBe(1);
    expect(worm.state).toBe("tagged");
  });

  it("mobile second accurate tap on the same worm captures it", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(89));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);

    expect(applyAccuratePress(world, worm.id)).toEqual({ kind: "tag", wormId: worm.id, bursts: 1 });
    expect(applyAccuratePress(world, worm.id)).toEqual({
      kind: "collect",
      wormId: worm.id,
      collected: 1,
    });
    expect(world.collected).toBe(1);
    expect(worm.state).toBe("captured");
  });

  it("countdown blocks mobile rush arming", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(53));

    triggerTouchRush(world, { x: 180, y: 210 });

    expect(world.rushTriggered).toBe(false);
    expect(world.pendingRushTrigger).toBe(false);

    stepWorld(world, MOBILE_RULES.introCountdownMs);

    expect(world.countdownMs).toBe(0);
    expect(world.rushTriggered).toBe(false);
    expect(world.pendingRushTrigger).toBe(false);
  });

  it("getSummary exposes the engine-owned round phase", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(71));

    expect(getSummary(world).phase).toBe("introCountdown");

    startRound(world);
    expect(getSummary(world).phase).toBe("activeChase");

    world.teleportsUnlocked = true;
    stepWorld(world, 16);
    expect(getSummary(world).phase).toBe("blinkBand");
  });

  it("desktop teleports use the active profile rules distance", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(97),
      rules: { teleportDistance: 25 },
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);
    worm.x = 400;
    worm.y = 270;
    worm.teleportsRemaining = 1;

    expect(applyAccuratePress(world, worm.id)).toEqual({ kind: "teleport", wormId: worm.id, immortal: false });
    expect(Math.hypot(worm.x - 400, worm.y - 270)).toBeCloseTo(25, 4);
  });

  it("desktop countdown blocks captures and panic movement", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(101));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    worm.x = 320;
    worm.y = 220;
    worm.vx = 0;
    worm.vy = 0;

    setPointer(world, { x: 300, y: 200 });

    expect(applyAccuratePress(world, worm.id)).toEqual({ kind: "ignored" });

    stepWorld(world, 120);

    expect(world.collected).toBe(0);
    expect(worm.state).toBe("roaming");
    expect(worm.x).toBe(320);
    expect(worm.y).toBe(220);
    expect(worm.vx).toBe(0);
    expect(worm.vy).toBe(0);
  });

  it("desktop captures add 0.1 speed and unlock exactly one blink charge at 50 captures", () => {
    const world = createActiveDesktopWorld(103);

    captureDesktopWorms(world, 49);

    expect(world.collected).toBe(49);
    expect(getSummary(world).speedBonus).toBeCloseTo(4.9, 5);
    expect(world.teleportsUnlocked).toBe(false);
    expect(world.worms.filter((worm) => worm.state === "blinkCharged")).toHaveLength(0);

    const fiftieth = world.worms[49];

    if (!fiftieth) {
      throw new Error("expected fiftieth worm");
    }

    expect(applyAccuratePress(world, fiftieth.id)).toEqual({
      kind: "collect",
      wormId: fiftieth.id,
      collected: 50,
    });

    const survivors = world.worms.filter((worm) => worm.state !== "captured" && worm.state !== "escaped");

    expect(world.teleportsUnlocked).toBe(true);
    expect(getSummary(world).speedBonus).toBeCloseTo(5, 5);
    expect(survivors).toHaveLength(50);
    expect(survivors.every((worm) => worm.state === "blinkCharged")).toBe(true);
    expect(survivors.every((worm) => worm.teleportsRemaining === 1)).toBe(true);
  });

  it("desktop blink charges teleport on the first accurate click without capturing", () => {
    const world = createActiveDesktopWorld(107);

    captureDesktopWorms(world, 50);

    const chargedWorm = world.worms.find((worm) => worm.state === "blinkCharged");

    if (!chargedWorm) {
      throw new Error("expected a blink-charged worm");
    }

    const collectedBefore = world.collected;
    const origin = { x: chargedWorm.x, y: chargedWorm.y };

    expect(applyAccuratePress(world, chargedWorm.id)).toEqual({
      kind: "teleport",
      wormId: chargedWorm.id,
      immortal: false,
    });

    expect(world.collected).toBe(collectedBefore);
    expect(chargedWorm.teleportsRemaining).toBe(0);
    expect(chargedWorm.state).toBe("blinkRecover");
    expect(Math.hypot(chargedWorm.x - origin.x, chargedWorm.y - origin.y)).toBeGreaterThan(0);
  });

  it("desktop ghost finale resolves with a dedicated ghost-escape result and never 100 of 100", () => {
    const world = createActiveDesktopWorld(109);

    for (const worm of world.worms.slice(0, 99)) {
      worm.state = "captured";
      worm.stateTimerMs = 0;
    }
    world.collected = 99;

    stepWorld(world, 16);

    const ghost = world.worms[99];

    if (!ghost) {
      throw new Error("expected final worm");
    }

    expect(ghost.state).toBe("ghost");
    expect(getSummary(world).phase).toBe("ghostFinale");
    expect(applyAccuratePress(world, ghost.id)).toEqual({
      kind: "teleport",
      wormId: ghost.id,
      immortal: true,
    });
    expect(world.collected).toBe(99);

    stepWorld(world, DESKTOP_RULES.ghostFinaleDurationMs);

    expect(world.roundResult).toEqual({
      reason: "ghostEscape",
      collected: 99,
      remaining: 1,
    });
  });

  it("desktop ghost finale timeout uses the active world rules", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(113),
      rules: { ghostFinaleDurationMs: 25 },
    });

    startRound(world);

    for (const worm of world.worms.slice(0, 99)) {
      worm.state = "captured";
      worm.stateTimerMs = 0;
    }
    world.collected = 99;

    stepWorld(world, 16);
    expect(getSummary(world).phase).toBe("ghostFinale");
    expect(world.roundResult).toBeNull();

    stepWorld(world, 24);
    expect(world.roundResult).toBeNull();

    stepWorld(world, 1);
    expect(world.roundResult).toEqual({
      reason: "ghostEscape",
      collected: 99,
      remaining: 1,
    });
  });
});