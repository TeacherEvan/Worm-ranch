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
  it("keeps the in-round desktop status strip compact around progress, clock, and the live mechanic", () => {
    const world = createWorld("desktop", 800, 540, createDeterministicOptions(43));

    startRound(world);

    const presentation = getStagePresentation(getSummary(world));

    expect(presentation.statusItems.map((item) => item.id)).toEqual(["bagged", "clock", "mechanic"]);
    expect(presentation.statusItems[0]?.value).toBe("0/100");
    expect(presentation.statusItems[2]?.value).toBe("arming");
  });

  it("explains that the first touch wakes the herd immediately and that accurate taps tag worms", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(57));

    startRound(world);

    const presentation = getStagePresentation(getSummary(world));

    expect(presentation.phaseChipLabel).toBe("Touch wakes rush");
    expect(presentation.overlayDensity).toBe("compact");
    expect(presentation.copy.body).toBe("First touch wakes the herd. Tap once to brand, again to bag.");
    expect(presentation.copy.hint).toBe("Wake one worm, stay on it, and finish fast.");
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
    expect(presentation.copy.body).toContain("one more clean tap");
    expect(presentation.copy.hint).toContain("Stay on that same worm");
  });
});