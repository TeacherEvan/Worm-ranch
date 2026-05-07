import type { Fairy } from "@/game/types";

const ORBIT_SPARKLE_COUNT = 8;

export type FairyMorphFrame = {
  fairyOpacity: number;
  fairyPosition: { x: number; y: number };
  fairyFadeIn: number;
  glowIntensity: number;
  morphScale: number;
  morphProgress: number;
  orbitSparkleCount: number;
  trailFadeProgress: number;
  trailSparkleCount: number;
  wormOpacity: number;
};

export function drawFairyMorph(context: CanvasRenderingContext2D, fairy: Fairy, reducedMotion: boolean) {
  const frame = getFairyMorphFrame(fairy, reducedMotion);

  if (fairy.state !== "morphing") {
    drawTrailSparkles(context, fairy, reducedMotion, frame.flyProgress, frame.trailFadeProgress);
  }

  if (frame.fairyOpacity <= 0) {
    return;
  }

  context.save();
  context.translate(frame.fairyPosition.x, frame.fairyPosition.y);
  context.globalAlpha = frame.fairyOpacity;
  context.scale(frame.morphScale, frame.morphScale);
  context.shadowBlur = reducedMotion ? 0 : frame.glowIntensity;
  context.shadowColor = `hsla(${fairy.hue}, 95%, 74%, 0.55)`;

  if (frame.wormOpacity > 0) {
    context.save();
    context.globalAlpha = frame.wormOpacity;
    context.rotate(Math.sin(fairy.lifeMs * 0.006) * 0.2);
    context.lineCap = "round";
    context.lineWidth = 4;
    context.strokeStyle = `hsla(${fairy.hue}, 76%, 62%, 0.9)`;
    context.beginPath();
    context.moveTo(-12, 0);
    context.quadraticCurveTo(-2, Math.sin(fairy.lifeMs * 0.01) * 4, 10, 0);
    context.stroke();
    context.restore();
  }

  if (frame.fairyFadeIn > 0) {
    const wingPulse = reducedMotion ? 1 : 0.92 + Math.sin(fairy.lifeMs * 0.018 + fairy.hue) * 0.08;
    context.save();
    context.globalAlpha = frame.fairyFadeIn;
    context.fillStyle = `hsla(${fairy.hue}, 96%, 80%, 0.86)`;
    context.beginPath();
    context.ellipse(-8, 0, 7.5 * wingPulse, 4.5, -0.45, 0, Math.PI * 2);
    context.ellipse(8, 0, 7.5 * wingPulse, 4.5, 0.45, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 252, 240, 0.96)";
    context.beginPath();
    context.arc(0, 0, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = `hsla(${fairy.hue}, 96%, 86%, 0.5)`;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(0, 2);
    context.quadraticCurveTo(-2, 9, 0, 15);
    context.stroke();
    context.restore();
  }

  if (!reducedMotion) {
    drawOrbitSparkles(context, fairy, frame.fairyPosition, fairy.lifeMs);
  }

  context.restore();
}

export function getFairyMorphFrame(fairy: Fairy, reducedMotion: boolean): FairyMorphFrame & { flyProgress: number } {
  const morphProgress = clamp01(fairy.lifeMs / Math.max(1, fairy.morphDurationMs));
  const flyProgress = clamp01((fairy.lifeMs - fairy.morphDurationMs) / Math.max(1, fairy.flyDurationMs));
  const trailFadeProgress = clamp01(
    (fairy.lifeMs - fairy.morphDurationMs - fairy.flyDurationMs) / Math.max(1, fairy.trailFadeDurationMs),
  );
  const fairyPosition = getFairyPosition(fairy, flyProgress);

  return {
    fairyOpacity: fairy.state === "trailFading" ? 1 - trailFadeProgress : 1,
    fairyPosition,
    fairyFadeIn: Math.min(1, morphProgress * 2 - 0.5),
    flyProgress,
    glowIntensity: 10 + Math.sin(fairy.lifeMs / 100) * 5,
    morphScale: 0.5 + morphProgress * 0.7 + Math.sin(morphProgress * Math.PI * 4) * 0.1,
    morphProgress,
    orbitSparkleCount: reducedMotion ? 0 : ORBIT_SPARKLE_COUNT,
    trailFadeProgress,
    trailSparkleCount: fairy.state === "morphing" ? 0 : reducedMotion ? 4 : 9,
    wormOpacity: Math.max(0, 1 - morphProgress * 2),
  };
}

function drawOrbitSparkles(
  context: CanvasRenderingContext2D,
  fairy: Fairy,
  fairyPosition: { x: number; y: number },
  age: number,
) {
  for (let index = 0; index < ORBIT_SPARKLE_COUNT; index += 1) {
    const angle = (index / ORBIT_SPARKLE_COUNT) * Math.PI * 2 + (age / 1000) * (0.8 + index * 0.05) * Math.PI * 2;
    const distance = 10 + (index % 3) * 4;
    const sparkleX = fairyPosition.x + Math.cos(angle) * distance;
    const sparkleY = fairyPosition.y + Math.sin(angle) * distance;
    const alpha = 0.4 + Math.sin(age / 100 + index) * 0.18;

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = `hsla(${(fairy.hue + index * 14) % 360}, 98%, 82%, 0.95)`;
    context.beginPath();
    context.arc(sparkleX - fairyPosition.x, sparkleY - fairyPosition.y, 1.8 + (index % 2), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawTrailSparkles(
  context: CanvasRenderingContext2D,
  fairy: Fairy,
  reducedMotion: boolean,
  flyProgress: number,
  trailFadeProgress: number,
) {
  const trailCount = reducedMotion ? 4 : 9;
  const maxProgress = clamp01(flyProgress);
  const fade = fairy.state === "trailFading" ? 1 - trailFadeProgress : 1;

  for (let index = 0; index < trailCount; index += 1) {
    const backtrack = ((index + 1) / (trailCount + 1)) * 0.32;
    const sampleProgress = clamp01(maxProgress - backtrack);
    const sample = getFairyPosition(fairy, sampleProgress);
    const alpha = fade * (1 - index / trailCount) * (fairy.state === "trailFading" ? 0.75 : 0.45);

    if (alpha <= 0) {
      continue;
    }

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = `hsla(${(fairy.hue + index * 10) % 360}, 98%, 82%, 0.95)`;
    context.beginPath();
    context.arc(sample.x, sample.y, reducedMotion ? 1.8 : 2.4 + ((trailCount - index) % 2), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function getFairyPosition(fairy: Fairy, flyProgress: number) {
  if (fairy.state === "morphing") {
    return { x: fairy.x, y: fairy.y };
  }

  const easedProgress = easeOutCubic(clamp01(flyProgress));
  return {
    x: quadraticBezier(easedProgress, fairy.x, fairy.controlX, fairy.targetX),
    y: quadraticBezier(easedProgress, fairy.y, fairy.controlY, fairy.targetY),
  };
}

function quadraticBezier(t: number, p0: number, p1: number, p2: number) {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}