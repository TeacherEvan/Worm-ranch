import { describe, expect, it } from "vitest";
import { GAMEPLAY_BACKDROP_URLS } from "./gameStageBackdropRotation";
import { getGameplayRunPlan, getInitialGameplayRunPlan } from "./wormRanchLevelFlow";

describe("wormRanchLevelFlow", () => {
  it("starts gameplay on level 1 with the opening gameplay backdrop", () => {
    expect(getInitialGameplayRunPlan()).toEqual({
      level: 1,
      backdropUrl: GAMEPLAY_BACKDROP_URLS[0],
    });
  });

  it("maps any requested gameplay level to the normalized backdrop plan", () => {
    expect(getGameplayRunPlan(2)).toEqual({
      level: 2,
      backdropUrl: GAMEPLAY_BACKDROP_URLS[1],
    });

    expect(getGameplayRunPlan(GAMEPLAY_BACKDROP_URLS.length + 1).backdropUrl).toBe(GAMEPLAY_BACKDROP_URLS[0]);
  });

  it("normalizes out-of-range gameplay levels before resolving the run plan", () => {
    expect(getGameplayRunPlan(0)).toEqual({
      level: 1,
      backdropUrl: GAMEPLAY_BACKDROP_URLS[0],
    });
  });
});
