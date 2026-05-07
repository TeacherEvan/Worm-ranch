import { describe, expect, it } from "vitest";
import { getGameplayLevel, getNextGameplayLevel, normalizeGameplayLevel } from "./levels";

describe("levels", () => {
  it("normalizes invalid level values back to the opening round", () => {
    expect(normalizeGameplayLevel(0)).toBe(1);
    expect(normalizeGameplayLevel(-4)).toBe(1);
    expect(normalizeGameplayLevel(2.9)).toBe(2);
  });

  it("builds deterministic desktop level overrides that raise pressure each round", () => {
    const opening = getGameplayLevel("desktop", 1);
    const later = getGameplayLevel("desktop", 3);

    expect(opening).toMatchObject({
      number: 1,
      label: "Level 1",
      themeIndex: 0,
      rules: {
        totalWorms: 100,
        timeLimitMs: 95_000,
        baseMaxSpeed: 0.5,
        teleportUnlockCount: 50,
      },
    });

    expect(later.number).toBe(3);
    expect(later.themeIndex).toBe(2);
    expect(later.rules.totalWorms).toBeGreaterThan(opening.rules.totalWorms ?? 0);
    expect(later.rules.timeLimitMs).toBeLessThan(opening.rules.timeLimitMs ?? Number.POSITIVE_INFINITY);
    expect(later.rules.baseMaxSpeed).toBeGreaterThan(opening.rules.baseMaxSpeed ?? 0);
    expect(later.rules.teleportUnlockCount).toBeGreaterThan(opening.rules.teleportUnlockCount ?? 0);
  });

  it("builds deterministic mobile level overrides and advances linearly after each round", () => {
    const opening = getGameplayLevel("mobile", 1);
    const later = getGameplayLevel("mobile", 4);

    expect(opening).toMatchObject({
      number: 1,
      label: "Level 1",
      themeIndex: 0,
      rules: {
        totalWorms: 10,
        timeLimitMs: 70_000,
        baseMaxSpeed: 0.5,
        touchBurstsToCapture: 2,
      },
    });

    expect(later.rules.totalWorms).toBeGreaterThan(opening.rules.totalWorms ?? 0);
    expect(later.rules.timeLimitMs).toBeLessThan(opening.rules.timeLimitMs ?? Number.POSITIVE_INFINITY);
    expect(later.rules.baseMaxSpeed).toBeGreaterThan(opening.rules.baseMaxSpeed ?? 0);
    expect(later.rules.touchBurstsToCapture).toBeGreaterThanOrEqual(opening.rules.touchBurstsToCapture ?? 0);
    expect(getNextGameplayLevel(later.number)).toBe(5);
  });
});