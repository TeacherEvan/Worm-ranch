import { describe, expect, it } from "vitest";
import { getStagePresentation } from "./gameStagePhasePresentation";
import { createWorld, getSummary, applyAccuratePress, startRound, triggerTouchRush } from "@/game/engine";
import type { CreateWorldOptions } from "@/game/engine";
import { getGameplayLevelRules } from "@/game/levels";

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
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(43),
      rules: getGameplayLevelRules("desktop", 3),
    });

    startRound(world);

    const presentation = getStagePresentation(getSummary(world), "desktop", 3);

    expect(presentation.statusItems.map((item) => item.id)).toEqual(["bagged", "clock", "mechanic"]);
    expect(presentation.statusItems[0]?.value).toBe("0/116");
    expect(presentation.statusItems[2]?.value).toBe("arming");
    expect(presentation.copy.title).toBe("Level 3 · Live chase");
  });

  it("explains the live tap count for the opening mobile level", () => {
    const world = createWorld("mobile", 800, 540, {
      ...createDeterministicOptions(57),
      rules: getGameplayLevelRules("mobile", 1),
    });

    startRound(world);

    const presentation = getStagePresentation(getSummary(world), "mobile", 1);

    expect(presentation.phaseChipLabel).toBe("Touch wakes rush");
    expect(presentation.overlayDensity).toBe("compact");
    expect(presentation.statusItems[1]).toMatchObject({
      id: "clock",
      label: "Beat bell",
      value: "70s left",
      active: true,
    });
    expect(presentation.copy.title).toBe("Level 1 · Live chase");
    expect(presentation.copy.body).toBe("First touch wakes the herd. Tagged worms need 2 clean taps total.");
    expect(presentation.copy.hint).toBe("Wake one worm, stay on it, and land all 2 taps.");
  });

  it("keeps the rush guidance aligned with higher-level mobile tap counts", () => {
    const world = createWorld("mobile", 800, 540, {
      ...createDeterministicOptions(61),
      rules: getGameplayLevelRules("mobile", 4),
    });
    const worm = world.worms[0];

    if (!worm) {
      throw new Error("expected a worm");
    }

    startRound(world);
    triggerTouchRush(world, { x: 180, y: 210 });
    applyAccuratePress(world, worm.id);

    const presentation = getStagePresentation(getSummary(world), "mobile", 4);

    expect(presentation.phaseChipLabel).toBe("Rush live");
    expect(presentation.statusItems[2]?.value).toBe("3 taps live");
    expect(presentation.copy.body).toBe("Tagged worms now need 3 clean taps total.");
    expect(presentation.copy.hint).toBe("Stay on that same worm until all 3 taps land.");
  });
});