import { describe, expect, it } from "vitest";
import { GAMEPLAY_BACKDROP_URLS } from "./gameStageBackdropRotation";
import {
  getGameplayRoundTransition,
  getGameplayRunPlan,
  getInitialGameplayRunPlan,
  getNextGameplayRunPlan,
  getPlayedRoundLevelResult,
} from "./wormRanchLevelFlow";

describe("wormRanchLevelFlow", () => {
  it("starts gameplay on level 1 with the opening gameplay backdrop", () => {
    expect(getInitialGameplayRunPlan()).toEqual({
      level: 1,
      backdropUrl: GAMEPLAY_BACKDROP_URLS[0],
    });
  });

  it("advances the next run plan to the next deterministic level and backdrop", () => {
    expect(getNextGameplayRunPlan(1)).toEqual({
      level: 2,
      backdropUrl: GAMEPLAY_BACKDROP_URLS[1],
    });

    expect(getGameplayRunPlan(GAMEPLAY_BACKDROP_URLS.length + 1).backdropUrl).toBe(GAMEPLAY_BACKDROP_URLS[0]);
  });

  it("tags completed rounds with the level that was just played", () => {
    expect(
      getPlayedRoundLevelResult(2, {
        reason: "time",
        collected: 14,
        remaining: 4,
      }),
    ).toEqual({
      reason: "time",
      collected: 14,
      remaining: 4,
      level: 2,
      levelLabel: "Level 2",
    });
  });

  it("connects a finished round to the next level plan and backdrop the app should use next", () => {
    expect(
      getGameplayRoundTransition(1, {
        reason: "captured",
        collected: 10,
        remaining: 0,
      }),
    ).toEqual({
      playedRoundResult: {
        reason: "captured",
        collected: 10,
        remaining: 0,
        level: 1,
        levelLabel: "Level 1",
      },
      nextRunPlan: {
        level: 2,
        backdropUrl: GAMEPLAY_BACKDROP_URLS[1],
      },
    });
  });
});
