import type { CrystalNode } from "@/game/baseDefenseTypes";

export function drawCrystalDrops(
  context: CanvasRenderingContext2D,
  crystals: CrystalNode[],
  reducedMotion: boolean,
  frameNow: number,
) {
  for (const crystal of crystals) {
    drawSingleCrystalGem(context, crystal, reducedMotion, frameNow);
  }
}

function drawSingleCrystalGem(
  context: CanvasRenderingContext2D,
  crystal: CrystalNode,
  reducedMotion: boolean,
  frameNow: number,
) {
  // Shimmering hover & bounce
  const bounce = reducedMotion ? 0 : Math.sin(frameNow * 0.007 + crystal.x * 0.1) * 3.5;
  const pulse = reducedMotion ? 1 : 0.85 + Math.sin(frameNow * 0.009 + crystal.y) * 0.15;

  context.save();
  context.translate(crystal.x, crystal.y + bounce);

  // Outer glowing aura
  context.fillStyle = `rgba(0, 245, 255, ${0.28 * pulse})`;
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill();

  // Prismatic multi-faceted diamond geometry
  // Crown top
  context.fillStyle = "rgba(0, 245, 255, 0.95)";
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.lineWidth = 1.5;

  context.beginPath();
  context.moveTo(-8, -4);
  context.lineTo(-4, -12);
  context.lineTo(4, -12);
  context.lineTo(8, -4);
  context.lineTo(0, 11);
  context.closePath();
  context.fill();
  context.stroke();

  // Left refractive facet
  context.fillStyle = "rgba(100, 240, 160, 0.65)";
  context.beginPath();
  context.moveTo(-8, -4);
  context.lineTo(-4, -12);
  context.lineTo(0, -4);
  context.lineTo(0, 11);
  context.closePath();
  context.fill();

  // Right refractive facet
  context.fillStyle = "rgba(188, 159, 255, 0.65)";
  context.beginPath();
  context.moveTo(8, -4);
  context.lineTo(4, -12);
  context.lineTo(0, -4);
  context.lineTo(0, 11);
  context.closePath();
  context.fill();

  // Center table facet
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.moveTo(-4, -12);
  context.lineTo(4, -12);
  context.lineTo(0, -4);
  context.closePath();
  context.fill();

  // Prismatic sparkle glint
  if (!reducedMotion) {
    const glintAlpha = (Math.sin(frameNow * 0.014 + crystal.x) + 1) * 0.5;
    context.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`;
    context.beginPath();
    context.arc(-2, -8, 2, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

export function drawMiningImpactSparks(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  reducedMotion: boolean,
  frameNow: number,
) {
  if (reducedMotion) return;

  context.save();
  context.translate(x, y);

  const sparkCount = 4;
  context.fillStyle = "rgba(0, 245, 255, 0.9)";
  for (let i = 0; i < sparkCount; i++) {
    const angle = (frameNow * 0.02 + i * (Math.PI / 2)) % (Math.PI * 2);
    const dist = 5 + (Math.sin(frameNow * 0.03 + i) + 1) * 4;
    context.beginPath();
    context.arc(Math.cos(angle) * dist, Math.sin(angle) * dist - 5, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

export function drawBaseShieldDeflect(
  context: CanvasRenderingContext2D,
  tentX: number,
  tentY: number,
  reducedMotion: boolean,
  frameNow: number,
) {
  if (reducedMotion) return;

  context.save();
  context.translate(tentX, tentY);
  context.strokeStyle = "rgba(0, 245, 255, 0.4)";
  context.lineWidth = 2;

  const arcPhase = (frameNow * 0.005) % (Math.PI * 2);
  context.beginPath();
  context.arc(0, 0, 36, arcPhase, arcPhase + Math.PI * 0.5);
  context.stroke();

  context.restore();
}

export function drawShotgunBlasts(
  context: CanvasRenderingContext2D,
  blasts: Array<{ x: number; y: number; radius: number; lifeMs: number; ttlMs: number }>,
  reducedMotion: boolean,
) {
  if (!blasts || blasts.length === 0) return;

  context.save();
  for (const b of blasts) {
    const progress = Math.min(1, b.lifeMs / b.ttlMs);
    const alpha = Math.max(0, 1 - progress);
    const currentRadius = b.radius * (reducedMotion ? 1 : 0.4 + 0.6 * progress);

    // Shockwave expansion ring
    context.strokeStyle = `rgba(0, 245, 255, ${alpha * 0.85})`;
    context.lineWidth = Math.max(1, 3.5 * (1 - progress));
    context.beginPath();
    context.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
    context.stroke();

    // Inner bright core flash
    if (!reducedMotion && progress < 0.4) {
      const flashAlpha = (1 - progress / 0.4) * 0.5;
      context.fillStyle = `rgba(199, 243, 107, ${flashAlpha})`;
      context.beginPath();
      context.arc(b.x, b.y, currentRadius * 0.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

export function drawFloatingCreditTexts(
  context: CanvasRenderingContext2D,
  texts: Array<{ x: number; y: number; text: string; color: string; lifeMs: number; ttlMs: number }>,
) {
  if (!texts || texts.length === 0) return;

  context.save();
  context.font = "bold 13px var(--font-mono), monospace";
  context.textAlign = "center";

  for (const t of texts) {
    const progress = Math.min(1, t.lifeMs / t.ttlMs);
    const alpha = Math.max(0, 1 - progress);

    context.fillStyle = `rgba(10, 18, 26, ${alpha * 0.7})`;
    context.fillText(t.text, t.x + 1, t.y + 1);

    context.fillStyle = t.color === "#ffd166" ? `rgba(255, 209, 102, ${alpha})` : `rgba(0, 245, 255, ${alpha})`;
    context.fillText(t.text, t.x, t.y);
  }
  context.restore();
}
