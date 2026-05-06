import { describe, expect, it } from "vitest";
import { getStagePresentation } from "./gameStagePhasePresentation";
import { createWorld, getSummary, applyAccuratePress, startRound, triggerTouchRush } from "@/game/engine";
import type { CreateWorldOptions } from "@/game/engine";

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

describe("gameStagePhasePresentation", () => {
  it("explains that the first touch wakes the herd immediately and that accurate taps tag worms", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(57));

    startRound(world);

    const presentation = getStagePresentation(getSummary(world));

    expect(presentation.phaseChipLabel).toBe("Touch wakes rush");
    expect(presentation.copy.body).toContain("first touch wakes the herd immediately, even on a miss");
    expect(presentation.copy.body).toContain("Accurate taps add the visible 1/2 marker");
    expect(presentation.copy.hint).toContain("first touch to wake the herd");
    expect(presentation.copy.hint).toContain("tag that worm");
  });

  it("explains that a tagged worm needs the next clean tap once rush is live", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(61));
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);
    triggerTouchRush(world, { x: 180, y: 210 });
    applyAccuratePress(world, worm.id);

    const presentation = getStagePresentation(getSummary(world));

    expect(presentation.phaseChipLabel).toBe("Rush live");
    expect(presentation.copy.body).toContain("next clean tap bags it");
    expect(presentation.copy.hint).toContain("finish it with the next tap");
  });
});