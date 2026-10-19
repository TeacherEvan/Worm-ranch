// Stage feedback item & action particle burst helpers — extracted from GameStage.tsx.
// Keeps GameStage.tsx well within the 500-line budget.

import type { ActionResult, Worm } from "@/game/types";
import type { StageFeedback } from "@/components/gameStagePresentation";
import { createBurstFromTone, type Particle, type ParticleTone } from "@/components/gameStageParticles";

export function createStageFeedbackItem(
  result: Exclude<ActionResult, { kind: "ignored" } | { kind: "miss" }>,
  worm: Worm | { x: number; y: number; radius: number },
  id: number,
): StageFeedback {
  const isShotgun = result.wormId === "aoe-shotgun";
  return {
    id,
    x: worm.x,
    y: worm.y - worm.radius * 1.8,
    lifeMs: 0,
    ttlMs: result.kind === "collect" ? 920 : result.kind === "tag" ? 840 : 880,
    label: isShotgun
      ? "BLAST"
      : result.kind === "collect"
        ? "BAGGED"
        : result.kind === "tag"
          ? "TAGGED"
          : result.immortal
            ? "OUTLAW"
            : "BLINK",
    tone:
      result.kind === "collect"
        ? "collect"
        : result.kind === "tag"
          ? "tag"
          : result.immortal
            ? "final"
            : "teleport",
  };
}

export function getActionParticleBurst(
  result: ActionResult,
  worm: Worm | { x: number; y: number; radius: number },
): Particle[] {
  if (result.kind === "collect") {
    const tone: ParticleTone = result.wormId === "aoe-shotgun" ? "shotgun" : "collect";
    return createBurstFromTone(tone, worm.x, worm.y - worm.radius * 1.8);
  }
  if (result.kind === "tag") {
    return createBurstFromTone("tag", worm.x, worm.y);
  }
  if (result.kind === "teleport") {
    const tone: ParticleTone = result.immortal ? "outlaw" : "teleport";
    return createBurstFromTone(tone, worm.x, worm.y);
  }
  return [];
}
