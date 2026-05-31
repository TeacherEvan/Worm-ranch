import { normalizeGameplayLevel } from "@/game/levels";
import { getGameplayBackdropUrlForLevel } from "./gameStageBackdropRotation";

export type GameplayRunPlan = {
  level: number;
  backdropUrl: string;
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
