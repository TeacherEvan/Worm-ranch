import type { DisplayProfile } from "@/game/detection";
import { drawFairyMorph } from "@/components/gameStageFairyPresentation";
import { getStagePresentation } from "@/components/gameStagePhasePresentation";
import { drawWorm } from "@/components/gameStageWormCanvas";
import { drawStaticStageBackdrop, drawPointerCorral } from "@/components/gameStageBackdropCanvas";
import { createWorld, getSummary } from "@/game/engine";
import { getGameplayLevelRules } from "@/game/levels";
import { isWormActive, type GameSummary, type GameWorld } from "@/game/types";

export type StageFeedback = {
  id: number;
  x: number;
  y: number;
  lifeMs: number;
  ttlMs: number;
  label: string;
  tone: "tag" | "teleport" | "collect" | "final";
};

export type StatusItem = {
  id: string;
  label: string;
  value: string;
  active: boolean;
};

export type StageStaticBackdrop = CanvasImageSource;

export type StageCopy = {
  title: string;
  body: string;
  hint: string;
};

export function renderStage(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  reducedMotion: boolean,
  feedback: StageFeedback[],
  selectedWormId: string | null,
  level = 1,
  staticBackdrop: StageStaticBackdrop | null = null,
) {
  context.clearRect(0, 0, world.width, world.height);
  const frameNow = performance.now();

  if (staticBackdrop) {
    context.drawImage(staticBackdrop, 0, 0, world.width, world.height);
  } else {
    drawStaticStageBackdrop(context, world.width, world.height);
  }

  drawPointerCorral(context, world, reducedMotion, frameNow);

  if (world.phase === "ghostFinale") {
    context.save();
    context.fillStyle = reducedMotion ? "rgba(7, 10, 14, 0.22)" : "rgba(7, 10, 14, 0.28)";
    context.fillRect(0, 0, world.width, world.height);
    context.restore();
  }

  const summary = getSummary(world);
  const stagePresentation = getStagePresentation(summary, world.profile, level);
  const activeWorms = world.worms.filter(isWormActive);
  const ghostWormId = activeWorms.find((worm) => worm.state === "ghost")?.id ?? null;

  for (const fairy of world.fairies) {
    drawFairyMorph(context, fairy, reducedMotion);
  }

  for (const worm of activeWorms) {
    drawWorm(context, world, worm, reducedMotion, worm.id === ghostWormId, worm.id === selectedWormId, frameNow);
  }

  if (stagePresentation.countdownOverlay) {
    context.save();
    context.fillStyle = `rgba(5, 10, 15, ${0.2 + stagePresentation.countdownOverlay.progress * 0.42})`;
    context.fillRect(0, 0, world.width, world.height);
    context.globalAlpha = reducedMotion ? 1 : 0.92 + (Math.sin(frameNow * 0.014) + 1) * 0.04;
    context.fillStyle = "#f5f4e9";
    context.font = "600 60px var(--font-sans)";
    context.textAlign = "center";
    context.fillText(stagePresentation.countdownOverlay.value, world.width / 2, world.height / 2);
    context.restore();
  }

  if (stagePresentation.fieldBanner) {
    context.save();
    context.fillStyle = "rgba(240, 126, 67, 0.95)";
    context.font = "500 18px var(--font-mono)";
    context.textAlign = "center";
    context.fillText(stagePresentation.fieldBanner, world.width / 2, 42);
    context.restore();
  }

  drawFeedback(context, feedback, reducedMotion);
}

export { drawStaticStageBackdrop } from "@/components/gameStageBackdropCanvas";

export function stepFeedback(feedback: StageFeedback[], deltaMs: number) {
  for (const item of feedback) {
    item.lifeMs += deltaMs;
    item.y -= deltaMs * 0.028;
  }

  let index = feedback.length - 1;
  while (index >= 0) {
    if (feedback[index] && feedback[index].lifeMs >= feedback[index].ttlMs) {
      feedback.splice(index, 1);
    }
    index -= 1;
  }
}

export function areSummariesEqual(left: GameSummary, right: GameSummary) {
  return (
    left.profile === right.profile &&
    left.phase === right.phase &&
    left.collected === right.collected &&
    left.remaining === right.remaining &&
    left.fairies === right.fairies &&
    left.timerMs === right.timerMs &&
    left.continuousActive === right.continuousActive &&
    left.speedBonus === right.speedBonus &&
    left.teleportsUnlocked === right.teleportsUnlocked &&
    left.countdownMs === right.countdownMs &&
    left.finalWormActive === right.finalWormActive &&
    left.rushTriggered === right.rushTriggered &&
    areTargetColorsEqual(left.targetColor, right.targetColor)
  );
}

export function buildStatusItems(profile: DisplayProfile, summary: GameSummary, level = 1): StatusItem[] {
  return getStagePresentation(summary, profile, level).statusItems;
}

export function getStageCopy(profile: DisplayProfile, summary: GameSummary, level = 1): StageCopy {
  return getStagePresentation(summary, profile, level).copy;
}


function areTargetColorsEqual(left: GameSummary["targetColor"], right: GameSummary["targetColor"]) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.colorId === right.colorId &&
    left.label === right.label &&
    left.progress === right.progress &&
    left.goal === right.goal &&
    left.visible === right.visible
  );
}

function drawFeedback(context: CanvasRenderingContext2D, feedback: StageFeedback[], reducedMotion: boolean) {
  for (const item of feedback) {
    const progress = item.lifeMs / item.ttlMs;
    const alpha = 1 - progress;
    if (alpha <= 0) {
      continue;
    }

    const color =
      item.tone === "collect"
        ? "199, 243, 107"
        : item.tone === "tag"
          ? "255, 228, 164"
          : item.tone === "final"
            ? "240, 126, 67"
            : "154, 225, 255";

    context.save();
    context.globalAlpha = alpha;
    context.translate(item.x, item.y - (reducedMotion ? progress * 12 : (1 - Math.pow(1 - progress, 4)) * 18));
    context.scale(reducedMotion ? 1 : 0.9 + alpha * 0.18, reducedMotion ? 1 : 0.9 + alpha * 0.18);

    const burstProgress = reducedMotion ? progress : 1 - Math.pow(1 - progress, 3);
    const burstRadius =
      item.tone === "collect"
        ? 30 + burstProgress * 34
        : item.tone === "tag"
          ? 22 + burstProgress * 22
          : 26 + burstProgress * 28;

    context.fillStyle = `rgba(${color}, ${alpha * 0.12})`;
    context.beginPath();
    context.arc(0, 0, Math.max(10, burstRadius * 0.42), 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(${color}, ${alpha * 0.9})`;
    context.lineWidth = item.tone === "collect" ? 4 : 3;
    context.beginPath();
    context.arc(0, 0, burstRadius, 0, Math.PI * 2);
    context.stroke();

    if (!reducedMotion && item.tone === "collect") {
      context.strokeStyle = `rgba(${color}, ${alpha * 0.48})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, burstRadius * 1.18, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = `rgba(${color}, 0.96)`;
    context.shadowBlur = reducedMotion ? 0 : 20 * alpha;
    context.shadowColor = `rgba(${color}, ${alpha})`;
    context.font = item.tone === "collect" ? "700 16px var(--font-mono)" : "700 14px var(--font-mono)";
    context.textAlign = "center";
    context.fillText(item.label, 0, 0);
    context.restore();
  }
}
