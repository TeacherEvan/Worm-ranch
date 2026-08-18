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

describe("engine.interaction", () => {
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

  it("hit detection reaches across the visible worm length instead of only the head radius", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(97));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    const point = {
      x: worm.x + worm.radius * 2.4,
      y: worm.y,
    };

    expect(findWormIdAtPoint(world, point)).toBe(worm.id);
  });

  it("gives the default touch target a little more reach beyond the visible body", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(98));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    const point = {
      x: worm.x + worm.radius * 3,
      y: worm.y,
    };

    expect(findWormIdAtPoint(world, point)).toBe(worm.id);
  });

  it("cuts the default opening pace in half for desktop while leaving mobile unchanged", () => {
    expect(DESKTOP_RULES.baseMaxSpeed).toBe(0.25);
    expect(MOBILE_RULES.baseMaxSpeed).toBe(0.5);
  });

  it("captures create a fairy morph that phases from morphing to flight to trail fade", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(91));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);
    expect(applyAccuratePress(world, worm.id)).toEqual({
      kind: "collect",
      wormId: worm.id,
      collected: 1,
    });

    const fairy = world.fairies[0];

    if (!fairy) {
      throw new Error("expected a fairy morph");
    }

    expect(fairy.state).toBe("morphing");

    stepWorld(world, 1_999);
    expect(world.fairies[0]?.state).toBe("morphing");

    stepWorld(world, 1);
    expect(world.fairies[0]?.state).toBe("flying");

    stepWorld(world, 1_499);
    expect(world.fairies[0]?.state).toBe("flying");

    stepWorld(world, 1);
    expect(world.fairies[0]?.state).toBe("trailFading");

    stepWorld(world, 3_499);
    expect(world.fairies[0]?.state).toBe("trailFading");

    stepWorld(world, 1);
    expect(world.fairies).toHaveLength(0);
  });

  it("countdown touches do not leak mobile escape movement onto the first live frame", () => {
    const world = createWorld("mobile", 800, 540, {
      ...createDeterministicOptions(92),
      rules: {
        baseMaxSpeed: 1,
        speedBonusPerCollect: 0,
        directionChangeRate: 0,
        crawlAmplitude: 0.5,
        crawlPhaseIncrement: 0,
      },
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    worm.x = 400;
    worm.y = 200;
    worm.vx = 0;
    worm.vy = 0;
    worm.direction = 0;
    worm.crawlPhase = Math.PI / 2;

    triggerTouchRush(world, { x: 390, y: 200 });
    stepWorld(world, world.countdownMs);

    expect(world.rushTriggered).toBe(false);
    expect(worm.x).toBe(400);
    expect(worm.y).toBe(200);
    expect(worm.vx).toBe(0);
    expect(worm.vy).toBe(0);

    stepWorld(world, 16);

    expect(worm.vx).toBeCloseTo(1, 4);
    expect(worm.vy).toBeCloseTo(0.5, 4);
    expect(worm.x).toBeCloseTo(401, 4);
    expect(worm.y).toBeCloseTo(200.5, 4);
  });

  it("countdown blocks mobile rush arming", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(53));

    triggerTouchRush(world, { x: 180, y: 210 });

    expect(world.rushTriggered).toBe(false);

    stepWorld(world, MOBILE_RULES.introCountdownMs);

    expect(world.countdownMs).toBe(0);
    expect(world.rushTriggered).toBe(false);
  });
});
