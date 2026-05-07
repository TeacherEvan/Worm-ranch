import { getNextGameplayLevel, normalizeGameplayLevel } from "@/game/levels";
import type { RoundResult } from "@/game/types";
import { getGameplayBackdropUrlForLevel } from "./gameStageBackdropRotation";

export type GameplayRunPlan = {
  level: number;
  backdropUrl: string;
};

export type PlayedRoundLevelResult = RoundResult & {
  level: number;
  levelLabel: string;
};

export type GameplayRoundTransition = {
  playedRoundResult: PlayedRoundLevelResult;
  nextRunPlan: GameplayRunPlan;
};

export function getGameplayRunPlan(level: number): GameplayRunPlan {
  const normalizedLevel = normalizeGameplayLevel(level);

  return {
    level: normalizedLevel,
    backdropUrl: getGameplayBackdropUrlForLevel(normalizedLevel),
  };
}

export function getInitialGameplayRunPlan(): GameplayRunPlan {
  return getGameplayRunPlan(1);
}

export function getNextGameplayRunPlan(currentLevel: number): GameplayRunPlan {
  return getGameplayRunPlan(getNextGameplayLevel(currentLevel));
}

export function getPlayedRoundLevelResult(level: number, roundResult: RoundResult): PlayedRoundLevelResult {
  const normalizedLevel = normalizeGameplayLevel(level);

  return {
    ...roundResult,
    level: normalizedLevel,
    levelLabel: `Level ${normalizedLevel}`,
  };
}

export function getGameplayRoundTransition(level: number, roundResult: RoundResult): GameplayRoundTransition {
  const normalizedLevel = normalizeGameplayLevel(level);

  return {
    playedRoundResult: getPlayedRoundLevelResult(normalizedLevel, roundResult),
    nextRunPlan: getNextGameplayRunPlan(normalizedLevel),
  };
}
