import { describe, expect, it } from "vitest";
import { getTargetCallout } from "./gameStageTargetCallout";
import type { GameSummary } from "@/game/types";

function createSummary(overrides: Partial<GameSummary> = {}): GameSummary {
  return {
    profile: "desktop",
    phase: "activeChase",
    collected: 0,
    remaining: 8,
    fairies: 0,
    timerMs: 42_000,
    continuousActive: true,
    speedBonus: 0,
    teleportsUnlocked: false,
    countdownMs: 0,
    finalWormActive: false,
    rushTriggered: false,
    targetColor: null,
    ...overrides,
  };
}

describe("gameStageTargetCallout", () => {
  it("maps a visible target color into a raw black-text payload with plain color naming", () => {
    const summary = createSummary({
      targetColor: {
        colorId: "pond-blue",
        label: "BLUE",
        progress: 0,
        goal: 2,
        visible: true,
      },
    });

    expect(getTargetCallout(summary)).toEqual({
      visible: true,
      colorId: "pond-blue",
      label: "BLUE",
      progress: 0,
      goal: 2,
      textColor: "#000000",
      gameOver: false,
    });
  });

  it("hides the callout after the announce window closes", () => {
    const summary = createSummary({
      targetColor: {
        colorId: "pond-blue",
        label: "BLUE",
        progress: 1,
        goal: 2,
        visible: false,
      },
    });

    expect(getTargetCallout(summary).visible).toBe(false);
  });

  it("keeps the plain target color visible during game over", () => {
    const summary = createSummary({
      phase: "gameOver",
      targetColor: {
        colorId: "fence-red",
        label: "RED",
        progress: 0,
        goal: 2,
        visible: false,
      },
    });

    expect(getTargetCallout(summary)).toEqual({
      visible: true,
      colorId: "fence-red",
      label: "RED",
      progress: 0,
      goal: 2,
      textColor: "#000000",
      gameOver: true,
    });
  });
});
