import type { GameSummary } from "@/game/types";

export type StageTargetCallout = {
  colorId: string | null;
  goal: number;
  label: string;
  progress: number;
  visible: boolean;
  textColor: string;
  gameOver: boolean;
};

const HIDDEN_CALLOUT: StageTargetCallout = {
  colorId: null,
  goal: 0,
  label: "",
  progress: 0,
  visible: false,
  textColor: "#000000",
  gameOver: false,
};

export function getTargetCallout(summary: GameSummary): StageTargetCallout {
  if (!summary.continuousActive || !summary.targetColor) {
    return HIDDEN_CALLOUT;
  }

  return {
    colorId: summary.targetColor.colorId,
    goal: summary.targetColor.goal,
    label: summary.targetColor.label,
    progress: summary.targetColor.progress,
    visible: summary.targetColor.visible || summary.phase === "gameOver",
    textColor: "#000000",
    gameOver: summary.phase === "gameOver",
  };
}
