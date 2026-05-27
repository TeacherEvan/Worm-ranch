import { describe, expect, it } from "vitest";
import { getMotionFeedback } from "./gameStageMotion";
import type { GameSummary } from "@/game/types";

function createSummary(overrides: Partial<GameSummary> = {}): GameSummary {
  return {
    profile: "desktop",
    phase: "live",
    collected: 0,
    remaining: 100,
    fairies: 0,
    timerMs: 60_000,
    continuousActive: false,
    speedBonus: 0,
    teleportsUnlocked: false,
    countdownMs: 0,
    finalWormActive: false,
    rushTriggered: false,
    ...overrides,
  };
}

describe("gameStageMotion", () => {
  it("announces the moment a mobile rush wakes up", () => {
    const previous = createSummary({ profile: "mobile", rushTriggered: false });
    const next = createSummary({ profile: "mobile", rushTriggered: true });

    expect(getMotionFeedback(previous, next)).toMatchObject({
      stageCue: "rush-start",
      baggedBump: false,
      fairyBurst: false,
    });
  });

  it("prioritizes blink arming when desktop teleports unlock", () => {
    const previous = createSummary({ collected: 49, teleportsUnlocked: false, remaining: 51 });
    const next = createSummary({ collected: 50, teleportsUnlocked: true, remaining: 50 });

    expect(getMotionFeedback(previous, next)).toMatchObject({
      stageCue: "blink-armed",
      baggedBump: true,
      remainingDip: true,
    });
  });

  it("flags the final outlaw and fairy lift on the capture that triggers it", () => {
    const previous = createSummary({ collected: 98, remaining: 2, fairies: 98, finalWormActive: false });
    const next = createSummary({ collected: 99, remaining: 1, fairies: 99, finalWormActive: true });

    expect(getMotionFeedback(previous, next)).toMatchObject({
      stageCue: "final-outlaw",
      baggedBump: true,
      remainingDip: true,
      fairyBurst: true,
    });
  });

  it("switches into clock-critical feedback when the timer crosses the alert threshold", () => {
    const previous = createSummary({ timerMs: 15_100 });
    const next = createSummary({ timerMs: 15_000 });

    expect(getMotionFeedback(previous, next)).toMatchObject({
      stageCue: "clock-critical",
      timerAlert: true,
    });
  });
});