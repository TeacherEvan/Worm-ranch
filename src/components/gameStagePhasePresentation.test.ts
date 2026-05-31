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
    expect(presentation.copy.body).toBe("First touch starts the chase. 2 taps bag a worm.");
    expect(presentation.copy.hint).toBe("Stay on one worm until it bags.");
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
    expect(presentation.copy.body).toBe("Tagged worms need 3 taps.");
    expect(presentation.copy.hint).toBe("Stay on one worm until it bags.");
  });

  it("removes clock status while continuous mode is active", () => {
    const world = createWorld("desktop", 800, 540, {
      ...createDeterministicOptions(73),
      rules: getGameplayLevelRules("desktop", 1),
    });

    startRound(world);
    world.continuousMode = {
      active: true,
      elapsedMs: 0,
      speedMultiplier: 1,
      spawnTimerMs: 0,
      spawnIntervalMs: 1200,
    };
    world.targetColor = {
      colorId: "pond-blue",
      label: "Pond Blue",
      progress: 0,
      goal: 2,
      visibleUntilMs: world.runtime.now() + 2_000,
    };

    const presentation = getStagePresentation(getSummary(world), "desktop", 1);

    expect(presentation.statusItems.map((item) => item.id)).toEqual(["bagged", "mechanic"]);
    expect(presentation.copy.body).toContain("Remove 2 Pond Blue worms");
  });
});