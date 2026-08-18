import { describe, expect, it } from "vitest";
import { DESKTOP_RULES, MOBILE_RULES } from "./rules";
import { STANDARD_WORM_COLORS } from "./wormColors";
import {
  applyAccuratePress,
  createWorld,
  findWormIdAtPoint,
  getSummary,
  setPointer,
  startContinuousMode,
  startRound,
  stopContinuousMode,
  stepWorld,
  triggerTouchRush,
} from "./engine";
import {
  createDeterministicOptions,
  createFixedRuntime,
  getSnapshot,
  createActiveDesktopWorld,
  createContinuousActiveWorld,
  getActiveWormCount,
  getActiveStandardWormIdByColor,
  captureDesktopWorms,
} from "./engineTestHelpers";

describe("engine.step", () => {
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

  it("worms within the pointer threat radius take a direct escape vector", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(151),
      rules: {
        baseMaxSpeed: 1,
        speedBonusPerCollect: 0,
        directionChangeRate: 0,
        crawlAmplitude: 0.5,
        crawlPhaseIncrement: 0.05,
        cursorThreatRadius: 140,
        cursorEscapeMultiplier: 2.2,
      },
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);

    worm.x = 400;
    worm.y = 200;
    worm.direction = 0;
    worm.crawlPhase = Math.PI / 2;

    setPointer(world, { x: 390, y: 200 });
    stepWorld(world, 16);

    expect(worm.vx).toBeCloseTo(2.2, 4);
    expect(worm.vy).toBeCloseTo(0, 4);
    expect(worm.x).toBeCloseTo(402.2, 4);
    expect(worm.y).toBeCloseTo(200, 4);
  });

  it("worms outside the threat radius keep the crawl motion", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(157),
      rules: {
        baseMaxSpeed: 1,
        speedBonusPerCollect: 0,
        directionChangeRate: 0,
        crawlAmplitude: 0.5,
        crawlPhaseIncrement: 0,
        cursorThreatRadius: 140,
      },
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);

    worm.x = 400;
    worm.y = 200;
    worm.direction = 0;
    worm.crawlPhase = Math.PI / 2;
    setPointer(world, { x: 620, y: 200 });

    stepWorld(world, 16);

    expect(worm.vx).toBeCloseTo(1, 4);
    expect(worm.vy).toBeCloseTo(0.5, 4);
    expect(worm.x).toBeCloseTo(401, 4);
    expect(worm.y).toBeCloseTo(200.5, 4);
  });

  it("worms directly under the pointer still escape instead of stalling", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(163),
      rules: {
        baseMaxSpeed: 1,
        speedBonusPerCollect: 0,
        directionChangeRate: 0,
        crawlAmplitude: 0,
        crawlPhaseIncrement: 0,
        cursorThreatRadius: 140,
        cursorEscapeMultiplier: 2.2,
      },
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);

    worm.x = 400;
    worm.y = 200;
    worm.direction = Math.PI / 2;
    setPointer(world, { x: 400, y: 200 });

    stepWorld(world, 16);

    expect(worm.vx).toBeCloseTo(0, 4);
    expect(worm.vy).toBeCloseTo(2.2, 4);
    expect(worm.x).toBeCloseTo(400, 4);
    expect(worm.y).toBeCloseTo(202.2, 4);
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
