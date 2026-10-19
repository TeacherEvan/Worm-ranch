import type { GameWorld } from "@/game/types";

export function drawTacticalMapBackdrop(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  reducedMotion: boolean,
  frameNow: number,
) {
  const width = world.width;
  const height = world.height;
  const bd = world.baseDefense;

  context.save();

  // 1. Deep Cybernetic Vignette Gradient
  const grad = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.15,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  grad.addColorStop(0, "rgba(8, 16, 24, 0.95)");
  grad.addColorStop(0.65, "rgba(5, 10, 16, 0.98)");
  grad.addColorStop(1, "rgba(2, 4, 8, 1)");
  context.fillStyle = grad;
  context.fillRect(0, 0, width, height);

  // 2. Tactical Hex / Grid Matrix
  drawTacticalGrid(context, width, height, reducedMotion, frameNow);

  // 3. Central Base Perimeter & Radar Sweep (only in Base Defense mode)
  if (bd && bd.active) {
    drawBasePerimeterAndRadar(context, world, bd.tent.x, bd.tent.y, reducedMotion, frameNow);
    drawPowerConduits(context, bd, reducedMotion, frameNow);
  }

  // 4. Ambient Floating Biospores / Atmospheric Dust
  if (!reducedMotion) {
    drawAmbientAtmosphere(context, width, height, frameNow);
  }

  context.restore();
}

function drawTacticalGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  reducedMotion: boolean,
  frameNow: number,
) {
  const cellSize = 48;
  const pulse = reducedMotion ? 0.04 : 0.035 + Math.sin(frameNow * 0.002) * 0.015;

  context.strokeStyle = `rgba(0, 245, 255, ${pulse})`;
  context.lineWidth = 1;

  context.beginPath();
  for (let x = 0; x <= width; x += cellSize) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += cellSize) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();

  // Subtle crosshair ticks at major intersections
  const tickStep = cellSize * 3;
  context.strokeStyle = "rgba(199, 243, 107, 0.12)";
  context.beginPath();
  for (let x = tickStep; x < width; x += tickStep) {
    for (let y = tickStep; y < height; y += tickStep) {
      context.moveTo(x - 5, y);
      context.lineTo(x + 5, y);
      context.moveTo(x, y - 5);
      context.lineTo(x, y + 5);
    }
  }
  context.stroke();
}

function drawBasePerimeterAndRadar(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  centerX: number,
  centerY: number,
  reducedMotion: boolean,
  frameNow: number,
) {
  context.save();
  context.translate(centerX, centerY);

  // Check if any active enemy worm has breached outer defense ring (210px)
  let sectorBreached = false;
  if (world.worms) {
    for (const w of world.worms) {
      if (w.state !== "captured" && Math.hypot(w.x - centerX, w.y - centerY) < 210) {
        sectorBreached = true;
        break;
      }
    }
  }

  // Concentric defense range rings
  const rings = [65, 130, 210];
  context.lineWidth = 1.2;

  rings.forEach((r, idx) => {
    if (idx === 2 && sectorBreached && !reducedMotion) {
      const alertPulse = (Math.sin(frameNow * 0.012) + 1) * 0.35 + 0.2;
      context.strokeStyle = `rgba(255, 51, 102, ${alertPulse})`;
      context.lineWidth = 2;
    } else {
      context.strokeStyle = idx === 0 ? "rgba(199, 243, 107, 0.22)" : "rgba(0, 245, 255, 0.12)";
      context.lineWidth = 1.2;
    }
    context.setLineDash(idx === 1 ? [6, 6] : []);
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.stroke();
  });
  context.setLineDash([]);

  // Cardinal tick marks on the outer defense ring
  const outerR = rings[2];
  context.strokeStyle = "rgba(0, 245, 255, 0.28)";
  context.lineWidth = 1.5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const x1 = Math.cos(a) * (outerR - 6);
    const y1 = Math.sin(a) * (outerR - 6);
    const x2 = Math.cos(a) * (outerR + 6);
    const y2 = Math.sin(a) * (outerR + 6);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  // Sweeping Radar Beam (rotates continuously)
  if (!reducedMotion) {
    const radarAngle = (frameNow * 0.0016) % (Math.PI * 2);
    const sweepGradient = context.createRadialGradient(0, 0, 10, 0, 0, outerR);
    sweepGradient.addColorStop(0, "rgba(0, 245, 255, 0.2)");
    sweepGradient.addColorStop(1, "rgba(0, 245, 255, 0)");

    context.save();
    context.rotate(radarAngle);

    // Radar cone arc
    context.fillStyle = sweepGradient;
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, outerR, 0, 0.45);
    context.closePath();
    context.fill();

    // Leading scanning needle
    context.strokeStyle = "rgba(0, 245, 255, 0.45)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(outerR, 0);
    context.stroke();

    context.restore();
  }

  context.restore();
}

function drawPowerConduits(
  context: CanvasRenderingContext2D,
  bd: NonNullable<GameWorld["baseDefense"]>,
  reducedMotion: boolean,
  frameNow: number,
) {
  if (bd.constructions.length === 0) return;

  const tentX = bd.tent.x;
  const tentY = bd.tent.y;
  const sparkOffset = reducedMotion ? 0 : (frameNow * 0.04) % 1;

  context.save();
  for (const c of bd.constructions) {
    if (c.hp <= 0) continue;

    // Glowing base-to-construction power trace
    context.strokeStyle = c.kind === "tower" ? "rgba(0, 245, 255, 0.22)" : "rgba(255, 212, 74, 0.22)";
    context.lineWidth = 1.5;
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(tentX, tentY);
    context.lineTo(c.x, c.y);
    context.stroke();

    // Moving power spark along conduit
    if (!reducedMotion) {
      const sparkX = tentX + (c.x - tentX) * sparkOffset;
      const sparkY = tentY + (c.y - tentY) * sparkOffset;
      context.fillStyle = c.kind === "tower" ? "rgba(0, 245, 255, 0.85)" : "rgba(255, 212, 74, 0.85)";
      context.beginPath();
      context.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawAmbientAtmosphere(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameNow: number,
) {
  const moteCount = 14;
  context.save();
  context.fillStyle = "rgba(100, 240, 160, 0.16)";

  for (let i = 0; i < moteCount; i++) {
    const seed = i * 133.7;
    const x = (seed + frameNow * 0.015) % width;
    const y = ((seed * 1.5) + Math.sin(frameNow * 0.001 + i) * 30 + seed) % height;
    const r = 1 + (i % 3) * 0.8;

    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}
