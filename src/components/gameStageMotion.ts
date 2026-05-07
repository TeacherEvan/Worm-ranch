import type { GameSummary } from "@/game/types";

export type StageMotionCue =
  | "none"
  | "round-live"
  | "rush-start"
  | "blink-armed"
  | "final-outlaw"
  | "clock-critical";

export type MotionFeedback = {
  stageCue: StageMotionCue;
  baggedBump: boolean;
  remainingDip: boolean;
  fairyBurst: boolean;
  timerAlert: boolean;
};

const CRITICAL_TIMER_MS = 15_000;

export function getMotionFeedback(previous: GameSummary | null, next: GameSummary): MotionFeedback {
  if (!previous) {
    return {
      stageCue: "none",
      baggedBump: false,
      remainingDip: false,
      fairyBurst: false,
      timerAlert: false,
    };
  }

  return {
    stageCue: getStageCue(previous, next),
    baggedBump: next.collected > previous.collected,
    remainingDip: next.remaining < previous.remaining,
    fairyBurst: next.fairies > previous.fairies,
    timerAlert:
      previous.timerMs > CRITICAL_TIMER_MS &&
      next.timerMs <= CRITICAL_TIMER_MS &&
      next.phase !== "resolved",
  };
}

function getStageCue(previous: GameSummary, next: GameSummary): StageMotionCue {
  if (previous.countdownMs > 0 && next.countdownMs === 0) {
    return "round-live";
  }

  if (!previous.rushTriggered && next.rushTriggered) {
    return "rush-start";
  }

  if (!previous.teleportsUnlocked && next.teleportsUnlocked) {
    return "blink-armed";
  }

  if (!previous.finalWormActive && next.finalWormActive) {
    return "final-outlaw";
  }

  if (previous.timerMs > CRITICAL_TIMER_MS && next.timerMs <= CRITICAL_TIMER_MS && next.phase !== "resolved") {
    return "clock-critical";
  }

  return "none";
}