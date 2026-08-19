// Static backdrop + corral + pointer-ring drawing — extracted from gameStagePresentation.ts.
// Imported by gameStagePresentation.ts; gameStageCanvas.ts imports drawStaticStageBackdrop from here.

import type { GameWorld } from "@/game/types";

export function drawStaticStageBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  drawStageBaseFill(context, width, height);
  drawCorralBackdrop(context, width, height);
}

export function drawPointerCorral(
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
