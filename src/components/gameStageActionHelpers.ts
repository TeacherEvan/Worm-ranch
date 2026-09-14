// Action-kind helpers extracted from GameStage.tsx.
// Eliminates the repeated `result.kind === "tag" || result.kind === "teleport" || result.kind === "collect"`
// compound literal (OBJ-001 of the GameStage refactor plan).

import type { ActionResult } from "@/game/types";

export type ActionableResult = Exclude<
  ActionResult,
  { kind: "ignored" } | { kind: "miss" }
>;

export function isActionableResult(result: ActionResult): result is ActionableResult {
  return (
    result.kind === "tag" ||
    result.kind === "teleport" ||
    result.kind === "collect"
  );
}
