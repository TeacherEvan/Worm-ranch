// Worm body drawing — extracted from gameStagePresentation.ts.
// Imported by gameStagePresentation.ts. Holds worm-path helpers, state chips, and psychedelic accents.

import { getPsychedelicWormVisualFrame, getStandardWormVisualFrame } from "@/components/gameStageWormVisuals";
import type { GameWorld, Worm } from "@/game/types";

export function drawWorm(
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
  const standardFrame = worm.visualVariant === "standard" ? getStandardWormVisualFrame(worm) : null;

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
    : (standardFrame?.bodyStroke ?? `hsl(${worm.hue}, 72%, 56%)`);
  context.shadowBlur = isGhostWorm ? (!reducedMotion && world.profile !== "mobile" ? 18 : 0) : (standardFrame?.shadowBlur ?? 0);
  context.shadowColor = isGhostWorm ? "rgba(245, 206, 166, 0.58)" : (standardFrame?.shadowColor ?? "transparent");
  traceWormBody(context, worm, bodyLength, squirm);
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = isGhostWorm ? "rgba(8, 13, 18, 0.48)" : (standardFrame?.headShadowFill ?? "rgba(8, 13, 18, 0.56)");
  context.beginPath();
  context.ellipse(bodyLength * 0.48, 0, worm.radius * 1.04, worm.radius * 0.94, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = isGhostWorm
    ? `hsla(${worm.hue}, 80%, 84%, ${0.74 + pulse * 0.08})`
    : (standardFrame?.headFill ?? `hsl(${worm.hue}, 76%, 64%)`);
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

export function traceWormBody(
  context: CanvasRenderingContext2D,
  worm: Worm,
  bodyLength: number,
  squirm: number,
) {
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

export function getWormStateChip(
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
