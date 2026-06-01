import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_COLOR_TARGET_FLASH_MS,
  CONTINUOUS_COLOR_TARGET_GOAL,
  createContinuousColorTargetState,
  isContinuousColorTargetVisible,
  resetContinuousColorTargetVisibility,
  registerContinuousColorRemoval,
} from "./continuousColorTargets";
import { DESKTOP_RULES } from "./rules";
import { createStandardWorm } from "./specialWorms";
import { getStandardWormColor } from "./wormColors";

function createDeterministicRuntime(randomValue = 0.25, startAt = 1_700_200_000_000) {
  let nowValue = startAt;

  return {
    random: () => {
      return randomValue;
    },
    now: () => nowValue,
    advanceNow: (deltaMs: number) => {
      nowValue += deltaMs;
    },
  };
}

function createStandardWorms(count: number) {
  const runtime = createDeterministicRuntime();

  return Array.from({ length: count }, (_, index) =>
    createStandardWorm(index, DESKTOP_RULES, 800, 540, runtime),
  );
}

describe("continuous color targets", () => {
  it("assigns plain named colors from the expanded standard palette", () => {
    expect(getStandardWormColor(0).label).toBe("YELLOW");
    expect(getStandardWormColor(1).label).toBe("RED");
    expect(getStandardWormColor(4).label).toBe("ORANGE");
    expect(getStandardWormColor(5).label).toBe("PURPLE");
    expect(getStandardWormColor(6).id).toBe("sun-yellow");

    const worm = createStandardWorm(0, DESKTOP_RULES, 800, 540, createDeterministicRuntime());

    expect(worm.colorId).toBe("sun-yellow");
    expect(worm.hue).toBe(52);
  });

  it("picks from active standard worms and ignores psychedelic worms", () => {
    const runtime = createDeterministicRuntime(0.99);
    const standardWorms = createStandardWorms(4);
    const psychedelicWorm = {
      ...standardWorms[0],
      id: "worm-psychedelic",
      visualVariant: "psychedelic" as const,
      colorId: null,
      hue: 310,
    };

    const state = createContinuousColorTargetState([psychedelicWorm, ...standardWorms], runtime);

    expect(state).toMatchObject({
      colorId: "clover-green",
      label: "GREEN",
      progress: 0,
      goal: CONTINUOUS_COLOR_TARGET_GOAL,
      visibleUntilMs: 1_700_200_000_000 + CONTINUOUS_COLOR_TARGET_FLASH_MS,
    });
  });

  it("tracks matching removals and retargets after the goal is met", () => {
    const runtime = createDeterministicRuntime(0);
    const worms = createStandardWorms(4);
    const initial = createContinuousColorTargetState(worms, runtime);

    if (!initial) {
      throw new Error("expected an initial target state");
    }

    expect(initial).toMatchObject({
      colorId: "sun-yellow",
      label: "YELLOW",
      progress: 0,
      goal: 2,
    });

    const afterNonMatch = registerContinuousColorRemoval(initial, "fence-red", worms, runtime);
    expect(afterNonMatch).toMatchObject({
      colorId: "sun-yellow",
      progress: 0,
      goal: 2,
    });

    const afterFirstMatch = registerContinuousColorRemoval(afterNonMatch, "sun-yellow", worms, runtime);
    expect(afterFirstMatch).toMatchObject({
      colorId: "sun-yellow",
      progress: 1,
      goal: 2,
    });

    runtime.advanceNow(CONTINUOUS_COLOR_TARGET_FLASH_MS + 1);
    expect(isContinuousColorTargetVisible(afterFirstMatch, runtime.now())).toBe(false);

    const afterSecondMatch = registerContinuousColorRemoval(afterFirstMatch, "sun-yellow", worms, runtime);
    expect(afterSecondMatch).toMatchObject({
      colorId: "fence-red",
      label: "RED",
      progress: 0,
      goal: 2,
      visibleUntilMs: runtime.now() + CONTINUOUS_COLOR_TARGET_FLASH_MS,
    });
    expect(isContinuousColorTargetVisible(afterSecondMatch, runtime.now())).toBe(true);
  });

  it("restarts the visibility window from the current runtime time", () => {
    const runtime = createDeterministicRuntime(0, 1_700_200_000_000);
    const worms = createStandardWorms(4);
    const initial = createContinuousColorTargetState(worms, runtime);

    if (!initial) {
      throw new Error("expected an initial target state");
    }

    runtime.advanceNow(CONTINUOUS_COLOR_TARGET_FLASH_MS + 250);

    const reset = resetContinuousColorTargetVisibility(initial, runtime);

    expect(reset).toMatchObject({
      colorId: initial.colorId,
      label: initial.label,
      progress: initial.progress,
      goal: initial.goal,
      visibleUntilMs: runtime.now() + CONTINUOUS_COLOR_TARGET_FLASH_MS,
    });
    expect(isContinuousColorTargetVisible(reset, runtime.now())).toBe(true);
  });
});