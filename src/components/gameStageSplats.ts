import type { GameWorld } from "@/game/types";
import type { SplatDecal } from "@/game/baseDefenseTypes";

export function drawSplatDecals(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  _frameNow: number,
) {
  const bd = world.baseDefense;
  if (!bd || !bd.splats || bd.splats.length === 0) return;

  context.save();
  for (const splat of bd.splats) {
    drawSingleSplat(context, splat);
  }
  context.restore();
}

function drawSingleSplat(context: CanvasRenderingContext2D, splat: SplatDecal) {
  context.save();
  context.translate(splat.x, splat.y);
  context.rotate(splat.rotation);

  const baseAlpha = splat.alpha;

  // Outer fluid stain & impact halo
  context.fillStyle = `rgba(100, 240, 160, ${0.18 * baseAlpha})`;
  context.beginPath();
  context.ellipse(0, 0, splat.radius * 1.35, splat.radius * 0.95, 0, 0, Math.PI * 2);
  context.fill();

  // Core visceral puddle with jagged border
  context.fillStyle = `rgba(199, 243, 107, ${0.48 * baseAlpha})`;
  context.beginPath();
  context.ellipse(0, 0, splat.radius * 0.88, splat.radius * 0.65, 0.4, 0, Math.PI * 2);
  context.fill();

  // Inner glossy droplet highlight
  context.fillStyle = `rgba(255, 255, 255, ${0.4 * baseAlpha})`;
  context.beginPath();
  context.arc(-splat.radius * 0.25, -splat.radius * 0.2, splat.radius * 0.22, 0, Math.PI * 2);
  context.fill();

  // Surrounding directional splatter droplets
  context.fillStyle = `rgba(100, 240, 160, ${0.6 * baseAlpha})`;
  for (const d of splat.droplets) {
    context.beginPath();
    context.arc(d.dx, d.dy, d.r, 0, Math.PI * 2);
    context.fill();
  }

  // Effervescent dissolving sizzle foam when fading
  if (baseAlpha < 0.65) {
    const foamAlpha = (1 - baseAlpha) * 0.5;
    context.fillStyle = `rgba(0, 245, 255, ${foamAlpha})`;
    for (let f = 0; f < 4; f++) {
      const fx = Math.sin(splat.rotation + f) * splat.radius * 0.6;
      const fy = Math.cos(splat.rotation + f) * splat.radius * 0.5;
      context.beginPath();
      context.arc(fx, fy, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}
