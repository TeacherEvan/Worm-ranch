import type { DisplaySnapshot } from "@/game/detection";
import type { GameSummary, RoundResult } from "@/game/types";
import type { AnalyticsEvent, EventName } from "@/lib/logger";

export type PendingAnalyticsEvent = {
  name: EventName;
  details?: AnalyticsEvent["details"];
};

export function areDisplaySnapshotsEqual(left: DisplaySnapshot | null, right: DisplaySnapshot | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.profile === right.profile &&
    left.pointer === right.pointer &&
    left.orientation === right.orientation &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function getProfileDetectedDetails(snapshot: DisplaySnapshot): AnalyticsEvent["details"] {
  return {
    detectedProfile: snapshot.profile,
    pointer: snapshot.pointer,
    orientation: snapshot.orientation,
    width: snapshot.width,
    height: snapshot.height,
  };
}

export function getRoundTransitionEvents(previous: GameSummary | null, next: GameSummary): PendingAnalyticsEvent[] {
  if (!previous) {
    return [];
  }

  const events: PendingAnalyticsEvent[] = [];

  if (previous.phase === "introCountdown" && next.phase !== "introCountdown") {
    events.push({
      name: "round_started",
      details: {
        totalWorms: next.collected + next.remaining,
        remaining: next.remaining,
      },
    });
  }

  if (!previous.rushTriggered && next.rushTriggered) {
    events.push({
      name: "first_touch_rush_triggered",
      details: {
        remaining: next.remaining,
      },
    });
  }

  if (previous.phase !== "ghostFinale" && next.phase === "ghostFinale") {
    events.push({
      name: "ghost_finale_started",
      details: {
        collected: next.collected,
        remaining: next.remaining,
      },
    });
  }

  return events;
}

export function getRoundEndedDetails(result: RoundResult): AnalyticsEvent["details"] {
  return {
    reason: result.reason,
    collected: result.collected,
    remaining: result.remaining,
  };
}