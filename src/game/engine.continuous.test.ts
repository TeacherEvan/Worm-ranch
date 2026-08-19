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

describe("engine.continuous", () => {
  it("pauses the round timer while continuous mode is active", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(43));
    startRound(world);
    world.timerMs = 1_000;

    startContinuousMode(world);
    stepWorld(world, 2_000);

    expect(world.timerMs).toBe(1_000);
    expect(world.roundResult).toBeNull();
    expect(getSummary(world).continuousActive).toBe(true);
  });

  it("recycles inactive worm slots during continuous mode spawns", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(47));
    startRound(world);
    const initialLength = world.worms.length;
    const firstWorm = world.worms[0];

    if (!firstWorm) {
      throw new Error("expected a worm");
    }

    firstWorm.state = "captured";
    startContinuousMode(world);
    stepWorld(world, 1_200);

    const replacementWorm = world.worms[0];

    if (!replacementWorm) {
      throw new Error("expected a replacement worm");
    }

    const canonicalColor = STANDARD_WORM_COLORS.find((color) => color.id === replacementWorm.colorId);

    expect(world.worms).toHaveLength(initialLength);
    expect(replacementWorm.id).toBe("worm-1");
    expect(replacementWorm.state).toBe("roaming");
    expect(replacementWorm.visualVariant).toBe("standard");
    expect(canonicalColor).toBeDefined();
    expect(replacementWorm.colorId).not.toBeNull();
    expect(replacementWorm.hue).toBe(canonicalColor?.hue);
    expect(world.worms.filter((worm) => worm.state !== "captured" && worm.state !== "escaped")).toHaveLength(
      initialLength,
    );
  });

  it("refills active worms immediately when continuous mode starts after captures", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(49));
    startRound(world);

    const capturedIds = world.worms.slice(0, 3).map((worm) => worm.id);

    for (const wormId of capturedIds) {
      expect(applyAccuratePress(world, wormId)).toMatchObject({
        kind: "collect",
        wormId,
      });
    }

    expect(getActiveWormCount(world)).toBe(world.rules.totalWorms - 3);

    startContinuousMode(world);

    expect(getActiveWormCount(world)).toBe(world.rules.totalWorms);
    expect(getSummary(world).targetColor).toMatchObject({
      colorId: expect.any(String),
      label: expect.any(String),
      progress: 0,
      goal: 2,
      visible: true,
    });
  });

  it("normalizes ghost finale state immediately when continuous mode starts", () => {
    const world = createWorld("desktop", 800, 540, {
      runtime: createFixedRuntime(0).runtime,
      rules: {
        totalWorms: 2,
        introCountdownMs: 1,
        ghostFinaleDurationMs: 25,
        touchBurstsToCapture: 1,
        baseMaxSpeed: 0,
        directionChangeRate: 0,
        speedBonusPerCollect: 0,
      },
    });

    startRound(world);

    const firstWorm = world.worms[0];

    if (!firstWorm) {
      throw new Error("expected a worm");
    }

    expect(applyAccuratePress(world, firstWorm.id)).toMatchObject({
      kind: "collect",
      wormId: firstWorm.id,
    });
    expect(getSummary(world).phase).toBe("ghostFinale");
    expect(
      world.worms.some((worm) => worm.state === "ghost" && worm.state === "ghost"),
    ).toBe(true);

    startContinuousMode(world);

    expect(getSummary(world)).toMatchObject({
      continuousActive: true,
      phase: "activeChase",
    });
    expect(
      world.worms
        .filter((worm) => worm.state !== "captured" && worm.state !== "escaped")
        .every((worm) => worm.state !== "ghost"),
    ).toBe(true);
  });

  it("normalizes ghost finale state immediately when continuous mode stops", () => {
    const world = createWorld("desktop", 800, 540, {
      runtime: createFixedRuntime(0).runtime,
      rules: {
        totalWorms: 1,
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

    expect(getSummary(world)).toMatchObject({
      continuousActive: true,
      phase: "activeChase",
      finalWormActive: false,
      targetColor: expect.any(Object),
    });
    expect(
      world.worms.filter((worm) => worm.state !== "captured" && worm.state !== "escaped"),
    ).toMatchObject([
      expect.objectContaining({
        state: "roaming",
      }),
    ]);

    stopContinuousMode(world);

    expect(getSummary(world)).toMatchObject({
      continuousActive: false,
      phase: "ghostFinale",
      finalWormActive: true,
      targetColor: null,
    });
    expect(
      world.worms.filter((worm) => worm.state !== "captured" && worm.state !== "escaped"),
    ).toMatchObject([
      expect.objectContaining({
        state: "ghost",
      }),
    ]);
  });

  it("announces the active target color for 2 seconds", () => {
    const { world, advanceNow } = createContinuousActiveWorld("desktop", 4);

    expect(getSummary(world).targetColor).toMatchObject({
      colorId: "sun-yellow",
      label: "YELLOW",
      progress: 0,
      goal: 2,
      visible: true,
    });

    advanceNow(1_999);
    expect(getSummary(world).targetColor?.visible).toBe(true);

    advanceNow(1);
    expect(getSummary(world).targetColor?.visible).toBe(false);
  });

  it("starts the target flash when live gameplay begins if continuous mode was enabled during countdown", () => {
    const clock = createFixedRuntime(0, 1_700_300_000_000);
    const world = createWorld("desktop", 800, 540, {
      runtime: clock.runtime,
      rules: {
        totalWorms: 4,
        introCountdownMs: 500,
        ghostFinaleDurationMs: 25,
        touchBurstsToCapture: 1,
        baseMaxSpeed: 0,
        directionChangeRate: 0,
        speedBonusPerCollect: 0,
      },
    });

    startContinuousMode(world);
    clock.advanceNow(400);
    stepWorld(world, 400);

    expect(world.countdownMs).toBe(100);
    expect(getSummary(world).targetColor).toMatchObject({
      progress: 0,
      goal: 2,
      visible: true,
    });

    clock.advanceNow(100);
    stepWorld(world, 100);

    expect(world.countdownMs).toBe(0);
    expect(getSummary(world).phase).toBe("activeChase");

    clock.advanceNow(1_999);
    expect(getSummary(world).targetColor?.visible).toBe(true);

    clock.advanceNow(1);
    expect(getSummary(world).targetColor?.visible).toBe(false);
  });

  it("increments target progress when the active color is removed", () => {
    const { world } = createContinuousActiveWorld("desktop", 4);
    const initialTarget = getSummary(world).targetColor;

    if (!initialTarget) {
      throw new Error("expected an active target color");
    }

    const targetWormId = getActiveStandardWormIdByColor(world, initialTarget.colorId);

    expect(applyAccuratePress(world, targetWormId)).toMatchObject({
      kind: "collect",
      wormId: targetWormId,
    });
    expect(getSummary(world).targetColor).toMatchObject({
      colorId: initialTarget.colorId,
      progress: 1,
      goal: 2,
    });
  });

  it("retargets after two matching removals", () => {
    const { world } = createContinuousActiveWorld("desktop", 4);

    expect(getSummary(world).targetColor).toMatchObject({
      colorId: "sun-yellow",
      progress: 0,
      goal: 2,
    });

    const firstTargetId = getActiveStandardWormIdByColor(world, "sun-yellow");
    expect(applyAccuratePress(world, firstTargetId)).toMatchObject({
      kind: "collect",
      wormId: firstTargetId,
    });

    const secondTargetId = getActiveStandardWormIdByColor(world, "sun-yellow");
    expect(applyAccuratePress(world, secondTargetId)).toMatchObject({
      kind: "collect",
      wormId: secondTargetId,
    });

    expect(getSummary(world).targetColor).toMatchObject({
      colorId: "fence-red",
      label: "RED",
      progress: 0,
      goal: 2,
      visible: true,
    });
  });

  it("spawns replacement worms instead of ending the round", () => {
    const { world } = createContinuousActiveWorld("mobile", 1);
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    expect(applyAccuratePress(world, worm.id)).toEqual({
      kind: "collect",
      wormId: worm.id,
      collected: 1,
    });
    expect(world.worms).toHaveLength(1);
    expect(getActiveWormCount(world)).toBe(1);
    expect(world.roundResult).toBeNull();
  });

  it("ends continuous play with game over when the wrong color is bagged", () => {
    const { world } = createContinuousActiveWorld("desktop", 4);
    const initialTarget = getSummary(world).targetColor;

    if (!initialTarget) {
      throw new Error("expected an active target color");
    }

    const wrongColorWorm = world.worms.find(
      (worm) =>
        worm.visualVariant === "standard" &&
        worm.colorId !== null &&
        worm.colorId !== initialTarget.colorId &&
        worm.state !== "captured" &&
        worm.state !== "escaped",
    );

    if (!wrongColorWorm || !wrongColorWorm.colorId) {
      throw new Error("expected an active wrong-color worm");
    }

    expect(applyAccuratePress(world, wrongColorWorm.id)).toMatchObject({
      kind: "collect",
      wormId: wrongColorWorm.id,
      collected: 0,
    });

    expect(world.roundResult).toMatchObject({
      reason: "wrongColor",
      collected: 0,
      remaining: 4,
      wrongColorId: wrongColorWorm.colorId,
      targetColorId: initialTarget.colorId,
    });
    expect(getSummary(world).phase).toBe("gameOver");
  });

  it("does not set roundResult during continuous play when the target color is bagged", () => {
    const { world } = createContinuousActiveWorld("desktop", 2);
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    expect(applyAccuratePress(world, worm.id)).toMatchObject({
      kind: "collect",
      wormId: worm.id,
    });

    stepWorld(world, world.rules.ghostFinaleDurationMs);

    expect(world.roundResult).toBeNull();
    expect(getSummary(world).phase).toBe("activeChase");
  });
});
