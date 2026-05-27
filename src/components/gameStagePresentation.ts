import type { DisplayProfile } from "@/game/detection";
import { drawFairyMorph } from "@/components/gameStageFairyPresentation";
import { getStagePresentation } from "@/components/gameStagePhasePresentation";
import { getPsychedelicWormVisualFrame } from "@/components/gameStageWormVisuals";
import { createWorld, getSummary } from "@/game/engine";
import { getGameplayLevelRules } from "@/game/levels";
import { isWormActive, type GameSummary, type GameWorld, type Worm } from "@/game/types";

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

export function drawStaticStageBackdrop(context: CanvasRenderingContext2D, width: number, height: number) {
  drawStageBaseFill(context, width, height);
  drawCorralBackdrop(context, width, height);
}

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
    left.rushTriggered === right.rushTriggered
  );
}

export function createInitialSummary(profile: DisplayProfile, level = 1) {
  return getSummary(createWorld(profile, 800, 540, { rules: getGameplayLevelRules(profile, level) }));
}

export function buildStatusItems(profile: DisplayProfile, summary: GameSummary, level = 1): StatusItem[] {
  return getStagePresentation(summary, profile, level).statusItems;
}

export function getStageCopy(profile: DisplayProfile, summary: GameSummary, level = 1): StageCopy {
  return getStagePresentation(summary, profile, level).copy;
}

function drawCorralBackdrop(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.fillStyle = "rgba(199, 243, 107, 0.04)";
  for (let row = 0; row < height; row += 72) {
    context.fillRect(0, row, width, 18);
  }

  context.strokeStyle = "rgba(208, 164, 107, 0.18)";
  context.lineWidth = 2;
  for (let rail = 0; rail < 3; rail += 1) {
    const y = height - 34 - rail * 16;
    context.beginPath();
    context.moveTo(22, y);
    context.lineTo(width - 22, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(208, 164, 107, 0.22)";
  for (let x = 26; x < width; x += 96) {
    context.beginPath();
    context.moveTo(x, height - 68);
    context.lineTo(x, height - 6);
    context.stroke();
  }

  context.strokeStyle = "rgba(103, 197, 150, 0.12)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(width * 0.18, height * 0.24, 82, 48, -0.28, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(width * 0.82, height * 0.18, 118, 68, 0.22, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawStageBaseFill(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(7, 18, 26, 0.38)");
  gradient.addColorStop(0.62, "rgba(17, 31, 33, 0.44)");
  gradient.addColorStop(1, "rgba(36, 28, 23, 0.54)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawPointerCorral(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  reducedMotion: boolean,
  frameNow: number,
) {
  if (!world.pointer?.active) {
    return;
  }

  const ringRadius = world.profile === "mobile" ? 58 : 44;
  const pulse = reducedMotion ? 1 : 0.88 + (Math.sin(frameNow * 0.009) + 1) * 0.08;
  const color = world.profile === "mobile" && world.rushTriggered ? "240, 126, 67" : "199, 243, 107";

  context.save();
  context.translate(world.pointer.x, world.pointer.y);
  context.strokeStyle = `rgba(${color}, 0.78)`;
  context.fillStyle = `rgba(${color}, 0.08)`;
  context.lineWidth = 2;
  context.setLineDash([10, 7]);
  context.beginPath();
  context.arc(0, 0, ringRadius * pulse, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(-ringRadius * 0.55, 0);
  context.lineTo(ringRadius * 0.55, 0);
  context.moveTo(0, -ringRadius * 0.55);
  context.lineTo(0, ringRadius * 0.55);
  context.stroke();
  context.restore();
}

function drawWorm(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  worm: Worm,
  reducedMotion: boolean,
  isGhostWorm: boolean,
  isSelected: boolean,
  frameNow: number,
) {
  const direction = Math.atan2(worm.vy, worm.vx || 0.0001);
  const bodyLength = worm.radius * 2.8;
  const squirm = reducedMotion ? 0 : Math.sin(frameNow * 0.012 + worm.wave) * 3.2;
  const pulse = reducedMotion ? 1 : 0.72 + (Math.sin(frameNow * 0.01 + worm.wave) + 1) * 0.14;
  const isBlinkCharged = world.profile === "desktop" && worm.state === "blinkCharged";
  const isTagged = world.profile === "mobile" && worm.state === "tagged";
  const psychedelicFrame =
    worm.visualVariant === "psychedelic" ? getPsychedelicWormVisualFrame(worm, reducedMotion, frameNow) : null;

  context.save();
  context.translate(worm.x, worm.y);
  context.rotate(direction);

  if (isSelected) {
    context.save();
    context.strokeStyle = isGhostWorm ? "rgba(240, 126, 67, 0.88)" : "rgba(245, 244, 233, 0.88)";
    context.lineWidth = 2.5;
    context.setLineDash([6, 5]);
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.55, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }

  if (isGhostWorm) {
    context.setLineDash([8, 6]);
    context.strokeStyle = `rgba(240, 126, 67, ${0.52 * pulse})`;
    context.fillStyle = `rgba(240, 126, 67, ${0.08 * pulse})`;
    context.lineWidth = 3.5;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.35, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.setLineDash([]);
  } else if (isBlinkCharged) {
    context.setLineDash([5, 5]);
    context.strokeStyle = `rgba(199, 243, 107, ${0.5 * pulse})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.05, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = `rgba(247, 255, 198, ${0.88 * pulse})`;
    context.beginPath();
    context.arc(
      Math.cos(frameNow * 0.006 + worm.wave) * worm.radius * 2.2,
      Math.sin(frameNow * 0.006 + worm.wave) * worm.radius * 2.2,
      2.8,
      0,
      Math.PI * 2,
    );
    context.fill();
  } else if (isTagged) {
    const totalBursts = Math.max(1, world.rules.touchBurstsToCapture);
    const progress = clamp01(worm.touchBursts / totalBursts);
    const startAngle = -Math.PI * 0.82;
    const endAngle = Math.PI * 0.82;

    context.strokeStyle = "rgba(255, 228, 164, 0.26)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.02, startAngle, endAngle);
    context.stroke();
    context.strokeStyle = `rgba(255, 228, 164, ${0.68 * pulse})`;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.02, startAngle, startAngle + (endAngle - startAngle) * progress);
    context.stroke();
  }

  if (psychedelicFrame) {
    drawPsychedelicWormAccent(context, worm, bodyLength, squirm, psychedelicFrame, reducedMotion);
  }

  drawWormSilhouette(context, worm, bodyLength, squirm, isGhostWorm);

  context.lineCap = "round";
  context.lineWidth = isGhostWorm ? worm.radius * 1.7 : worm.radius * 1.5;
  context.strokeStyle = isGhostWorm
    ? `hsla(${worm.hue}, 84%, 78%, ${0.72 + pulse * 0.08})`
    : `hsl(${worm.hue}, 72%, 56%)`;
  context.shadowBlur = isGhostWorm && !reducedMotion && world.profile !== "mobile" ? 18 : 0;
  context.shadowColor = isGhostWorm ? "rgba(245, 206, 166, 0.58)" : "transparent";
  traceWormBody(context, worm, bodyLength, squirm);
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = isGhostWorm ? "rgba(8, 13, 18, 0.48)" : "rgba(8, 13, 18, 0.56)";
  context.beginPath();
  context.ellipse(bodyLength * 0.48, 0, worm.radius * 1.04, worm.radius * 0.94, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = isGhostWorm
    ? `hsla(${worm.hue}, 80%, 84%, ${0.74 + pulse * 0.08})`
    : `hsl(${worm.hue}, 76%, 64%)`;
  context.beginPath();
  context.ellipse(bodyLength * 0.48, 0, worm.radius * 0.92, worm.radius * 0.82, 0, 0, Math.PI * 2);
  context.fill();

  if (psychedelicFrame) {
    drawPsychedelicWormBands(context, worm, bodyLength, squirm, psychedelicFrame);
  }

  context.fillStyle = "rgba(16, 17, 20, 0.82)";
  context.beginPath();
  context.arc(bodyLength * 0.72, -worm.radius * 0.16, worm.radius * 0.12, 0, Math.PI * 2);
  context.arc(bodyLength * 0.72, worm.radius * 0.16, worm.radius * 0.12, 0, Math.PI * 2);
  context.fill();

  drawWormStateChip(
    context,
    direction,
    worm,
    getWormStateChip(world, worm, isGhostWorm, isBlinkCharged, isTagged),
  );

  context.restore();
}

function traceWormBody(context: CanvasRenderingContext2D, worm: Worm, bodyLength: number, squirm: number) {
  context.beginPath();
  context.moveTo(-bodyLength * 0.55, 0);
  context.quadraticCurveTo(-worm.radius * 0.2, squirm, bodyLength * 0.45, 0);
}

function drawWormSilhouette(
  context: CanvasRenderingContext2D,
  worm: Worm,
  bodyLength: number,
  squirm: number,
  isGhostWorm: boolean,
) {
  context.save();
  context.lineCap = "round";
  context.lineWidth = isGhostWorm ? worm.radius * 2.12 : worm.radius * 1.9;
  context.strokeStyle = isGhostWorm ? "rgba(9, 12, 15, 0.54)" : "rgba(8, 12, 16, 0.72)";
  traceWormBody(context, worm, bodyLength, squirm);
  context.stroke();
  context.restore();
}

type WormStateChip = {
  label: string;
  stripeColor: string;
  textColor: string;
};

function getWormStateChip(
  world: GameWorld,
  worm: Worm,
  isGhostWorm: boolean,
  isBlinkCharged: boolean,
  isTagged: boolean,
): WormStateChip | null {
  if (isGhostWorm) {
    return {
      label: "OUTLAW",
      stripeColor: "rgba(240, 126, 67, 0.96)",
      textColor: "rgba(255, 237, 214, 0.98)",
    };
  }

  if (isBlinkCharged) {
    return {
      label: "BLINK",
      stripeColor: "rgba(199, 243, 107, 0.96)",
      textColor: "rgba(246, 251, 216, 0.98)",
    };
  }

  if (isTagged) {
    const totalBursts = Math.max(1, world.rules.touchBurstsToCapture);
    return {
      label: `TAG ${Math.min(worm.touchBursts, totalBursts)}/${totalBursts}`,
      stripeColor: "rgba(255, 228, 164, 0.96)",
      textColor: "rgba(255, 242, 212, 0.98)",
    };
  }

  if (worm.visualVariant === "psychedelic") {
    return {
      label: "WILD",
      stripeColor: "rgba(154, 225, 255, 0.96)",
      textColor: "rgba(228, 250, 255, 0.98)",
    };
  }

  return null;
}

function drawWormStateChip(
  context: CanvasRenderingContext2D,
  direction: number,
  worm: Worm,
  chip: WormStateChip | null,
) {
  if (!chip) {
    return;
  }

  const width = Math.max(42, chip.label.length * 7.1);
  const height = 16;
  const x = -width / 2;
  const y = -worm.radius * 3.5;

  context.save();
  context.rotate(-direction);
  context.fillStyle = "rgba(8, 15, 24, 0.8)";
  context.fillRect(x, y, width, height);
  context.fillStyle = chip.stripeColor;
  context.fillRect(x, y, width, 2.5);
  context.fillStyle = chip.textColor;
  context.font = "700 10px var(--font-mono)";
  context.textAlign = "center";
  context.fillText(chip.label, 0, y + 11.25);
  context.restore();
}

function drawPsychedelicWormAccent(
  context: CanvasRenderingContext2D,
  worm: Worm,
  bodyLength: number,
  squirm: number,
  frame: ReturnType<typeof getPsychedelicWormVisualFrame>,
  reducedMotion: boolean,
) {
  context.save();
  context.shadowBlur = frame.shadowBlur;
  context.shadowColor = `hsla(${frame.auraHue}, 95%, 72%, ${Math.min(frame.auraStrokeAlpha, 0.42)})`;
  context.fillStyle = `hsla(${frame.auraHue}, 96%, ${reducedMotion ? 74 : 78}%, ${frame.auraFillAlpha})`;
  context.strokeStyle = `hsla(${frame.auraHue}, 100%, 84%, ${frame.auraStrokeAlpha})`;
  context.lineWidth = reducedMotion ? 2 : 2.4;
  context.beginPath();
  context.ellipse(0, squirm * 0.05, bodyLength * 0.46, worm.radius * frame.auraRadiusScale, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawPsychedelicWormBands(
  context: CanvasRenderingContext2D,
  worm: Worm,
  bodyLength: number,
  squirm: number,
  frame: ReturnType<typeof getPsychedelicWormVisualFrame>,
) {
  for (const [index, hue] of frame.bandHues.entries()) {
    const offset = frame.bandOffsets[index] ?? 0;
    const bandYOffset = frame.bandYOffsets[index] ?? 0;
    const x = bodyLength * offset;
    const y = bandYOffset * worm.radius + squirm * 0.08;
    const alpha = frame.bandAlpha * (0.94 - index * 0.12);

    context.save();
    context.fillStyle = `hsla(${hue}, 98%, ${70 + index * 3}%, ${alpha})`;
    context.beginPath();
    context.ellipse(x, y, worm.radius * (0.3 + index * 0.04), worm.radius * 0.88, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
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
