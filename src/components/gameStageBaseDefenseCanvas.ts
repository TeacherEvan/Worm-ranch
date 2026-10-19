import type { GameWorld } from "@/game/types";
import type {
  ArrowProjectile,
  BaseTentState,
  ConstructionUnit,
  MinerUnit,
} from "@/game/baseDefenseTypes";
import { drawTacticalMapBackdrop } from "./gameStageTacticalMap";
import { drawSplatDecals } from "./gameStageSplats";
import {
  drawBaseShieldDeflect,
  drawCrystalDrops,
  drawFloatingCreditTexts,
  drawMiningImpactSparks,
  drawShotgunBlasts,
} from "./gameStageVisualEffects";

export function drawBaseDefenseLayer(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  reducedMotion: boolean,
  frameNow: number,
) {
  const bd = world.baseDefense;
  if (!bd || !bd.active) return;

  // 1. Drastic Tactical Map Revamp (hex grid, defense rings, radar sweep, power conduits)
  drawTacticalMapBackdrop(context, world, reducedMotion, frameNow);

  // 2. Visceral fluid ichor splat decals on the terrain
  drawSplatDecals(context, world, frameNow);

  // 3. Shimmering dropped crystals
  drawCrystalDrops(context, bd.crystals, reducedMotion, frameNow);

  // 4. Constructions (walls & towers)
  for (const construction of bd.constructions) {
    if (construction.kind === "wall") {
      drawWall(context, construction, reducedMotion, frameNow);
    } else {
      drawTower(context, construction, reducedMotion, frameNow);
    }
  }

  // 5. Center-locked Base Command Bunker & Deflection Shield
  drawBaseTent(context, bd.tent, reducedMotion, frameNow);
  if (bd.tent.hp < bd.tent.maxHp) {
    drawBaseShieldDeflect(context, bd.tent.x, bd.tent.y, reducedMotion, frameNow);
  }

  // 6. Miners with walking animation & mining impact sparks
  for (const miner of bd.miners) {
    drawMiner(context, miner, reducedMotion, frameNow);
    if (miner.state === "mining") {
      drawMiningImpactSparks(context, miner.x, miner.y, reducedMotion, frameNow);
    }
  }

  // 7. In-flight visible tower arrows
  for (const arrow of bd.arrows) {
    drawTowerArrow(context, arrow, reducedMotion);
  }

  // 8. Kinetic Shotgun AOE Shockwaves
  if (bd.blasts) {
    drawShotgunBlasts(context, bd.blasts, reducedMotion);
  }

  // 9. Floating credit ascent notifications
  if (bd.floatingTexts) {
    drawFloatingCreditTexts(context, bd.floatingTexts);
  }
}

function drawBaseTent(
  context: CanvasRenderingContext2D,
  tent: BaseTentState,
  reducedMotion: boolean,
  frameNow: number,
) {
  context.save();
  context.translate(tent.x, tent.y);

  const hpRatio = tent.hp / tent.maxHp;
  const isCritical = hpRatio < 0.3;

  // Emergency Red Warning Strobe if critical HP (< 30%)
  if (isCritical && !reducedMotion) {
    const strobe = (Math.sin(frameNow * 0.015) + 1) * 0.5;
    context.strokeStyle = `rgba(255, 51, 102, ${0.45 * strobe})`;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, 44, 0, Math.PI * 2);
    context.stroke();
  }

  // Upgrade glow / forcefield ring
  if (!reducedMotion) {
    const ringRadius = 38 + (Math.sin(frameNow * 0.004) + 1) * 2;
    context.strokeStyle = isCritical ? "rgba(255, 51, 102, 0.4)" : "rgba(199, 243, 107, 0.25)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();
  }

  // Command Bunker Complex Geometry (stepped hexagonal blast-doors)
  context.fillStyle = "rgba(10, 24, 38, 0.95)";
  context.strokeStyle = isCritical ? "rgba(255, 82, 82, 0.95)" : "rgba(199, 243, 107, 0.9)";
  context.lineWidth = 2.5;

  // Outer bunker platform
  context.beginPath();
  context.moveTo(0, -28);
  context.lineTo(30, 16);
  context.lineTo(-30, 16);
  context.closePath();
  context.fill();
  context.stroke();

  // Tiered armor blast plating
  context.fillStyle = "rgba(16, 36, 56, 0.9)";
  context.beginPath();
  context.moveTo(0, -18);
  context.lineTo(18, 12);
  context.lineTo(-18, 12);
  context.closePath();
  context.fill();

  // Communication beacon antenna mast
  context.strokeStyle = "rgba(0, 245, 255, 0.85)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -28);
  context.lineTo(0, -38);
  context.stroke();

  // Flashing antenna beacon light
  if (!reducedMotion) {
    const beaconAlpha = (Math.sin(frameNow * 0.008) + 1) * 0.45 + 0.1;
    context.fillStyle = isCritical ? `rgba(255, 51, 102, ${beaconAlpha})` : `rgba(0, 245, 255, ${beaconAlpha})`;
    context.beginPath();
    context.arc(0, -39, 3, 0, Math.PI * 2);
    context.fill();
  }

  // Bunker blast doorway / interior neon glow
  context.fillStyle = "rgba(0, 245, 255, 0.9)";
  context.beginPath();
  context.moveTo(0, -4);
  context.lineTo(10, 16);
  context.lineTo(-10, 16);
  context.closePath();
  context.fill();

  // Level & HP banner above Bunker
  drawEntityHpBar(context, 0, -46, tent.hp, tent.maxHp, `BUNKER T${tent.level}`);

  context.restore();
}

function drawMiner(
  context: CanvasRenderingContext2D,
  miner: MinerUnit,
  reducedMotion: boolean,
  _frameNow: number,
) {
  context.save();
  context.translate(miner.x, miner.y);

  // Leg walking swing
  const legSwing = reducedMotion ? 0 : Math.sin(miner.walkPhase) * 5;

  // Legs
  context.strokeStyle = "rgba(245, 244, 233, 0.8)";
  context.lineWidth = 2;

  // Left leg
  context.beginPath();
  context.moveTo(-3, 4);
  context.lineTo(-4, 10 + legSwing);
  context.stroke();

  // Right leg
  context.beginPath();
  context.moveTo(3, 4);
  context.lineTo(4, 10 - legSwing);
  context.stroke();

  // Torso / miner suit
  context.fillStyle = "rgba(240, 126, 67, 0.9)";
  context.beginPath();
  context.arc(0, 0, 7, 0, Math.PI * 2);
  context.fill();

  // Hard hat / visor
  context.fillStyle = "rgba(255, 212, 74, 0.95)";
  context.beginPath();
  context.arc(0, -4, 5, Math.PI, 0);
  context.fill();

  // Carried crystal in pack
  if (miner.carriedCredits > 0) {
    context.fillStyle = "rgba(0, 245, 255, 0.95)";
    context.beginPath();
    context.arc(0, -10, 4, 0, Math.PI * 2);
    context.fill();
  }

  // Miner HP bar if damaged
  if (miner.hp < miner.maxHp) {
    drawEntityHpBar(context, 0, -16, miner.hp, miner.maxHp, "");
  }

  context.restore();
}

function drawWall(
  context: CanvasRenderingContext2D,
  wall: ConstructionUnit,
  reducedMotion: boolean,
  frameNow: number,
) {
  context.save();
  context.translate(wall.x, wall.y);

  // Holographic Hex Shield Forcefield above wall
  if (!reducedMotion) {
    const shieldPulse = (Math.sin(frameNow * 0.005 + wall.x) + 1) * 0.25 + 0.15;
    context.strokeStyle = `rgba(0, 245, 255, ${shieldPulse})`;
    context.lineWidth = 1.2;
    context.strokeRect(-18, -12, 36, 24);
  }

  // Reinforced cyber-pylon bastion
  context.fillStyle = "rgba(255, 212, 74, 0.88)";
  context.strokeStyle = "rgba(255, 255, 255, 0.65)";
  context.lineWidth = 1.8;

  context.fillRect(-14, -8, 28, 16);
  context.strokeRect(-14, -8, 28, 16);

  // Core reinforcement chevron
  context.strokeStyle = "rgba(10, 18, 26, 0.85)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-6, -4);
  context.lineTo(0, 2);
  context.lineTo(6, -4);
  context.stroke();

  // Wall HP bar
  drawEntityHpBar(context, 0, -18, wall.hp, wall.maxHp, "WALL");

  context.restore();
}

function drawTower(
  context: CanvasRenderingContext2D,
  tower: ConstructionUnit,
  reducedMotion: boolean,
  frameNow: number,
) {
  context.save();
  context.translate(tower.x, tower.y);

  // Turret base ring
  context.fillStyle = "rgba(10, 18, 26, 0.92)";
  context.strokeStyle = "rgba(0, 245, 255, 0.85)";
  context.lineWidth = 2;

  context.beginPath();
  context.arc(0, 0, 14, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Glowing energy charging coils
  if (!reducedMotion) {
    const coilPulse = (Math.sin(frameNow * 0.008 + tower.x) + 1) * 0.35 + 0.2;
    context.strokeStyle = `rgba(199, 243, 107, ${coilPulse})`;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, 10, 0, Math.PI * 2);
    context.stroke();
  }

  // Rotating Turret Cannon Head (aligned to target worm or upright)
  const angle = (tower.turretAngle ?? -Math.PI / 2) + Math.PI / 2;
  const recoil = tower.recoilOffset ?? 0;

  context.save();
  context.rotate(angle);

  // Cannon barrel with recoil kickback
  context.fillStyle = "rgba(0, 245, 255, 0.95)";
  context.fillRect(-3, -16 + recoil, 6, 12);

  // Muzzle energy tip
  context.fillStyle = "rgba(199, 243, 107, 1)";
  context.fillRect(-2, -18 + recoil, 4, 3);
  context.restore();

  // Tower HP bar
  drawEntityHpBar(context, 0, -24, tower.hp, tower.maxHp, "TURRET");

  context.restore();
}

export function drawTowerArrow(
  context: CanvasRenderingContext2D,
  arrow: ArrowProjectile,
  _reducedMotion: boolean,
) {
  context.save();
  context.translate(arrow.x, arrow.y);
  const angle = Math.atan2(arrow.vy, arrow.vx);
  context.rotate(angle);

  // Arrow shaft
  context.strokeStyle = "rgba(0, 245, 255, 0.95)";
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(-10, 0);
  context.lineTo(10, 0);
  context.stroke();

  // Arrowhead
  context.fillStyle = "rgba(199, 243, 107, 1)";
  context.beginPath();
  context.moveTo(10, 0);
  context.lineTo(5, -4);
  context.lineTo(5, 4);
  context.closePath();
  context.fill();

  // Fletching
  context.strokeStyle = "rgba(255, 255, 255, 0.8)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-8, -3);
  context.lineTo(-10, 0);
  context.lineTo(-8, 3);
  context.stroke();

  context.restore();
}

function drawEntityHpBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  label: string,
) {
  const width = 36;
  const height = 4;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));

  context.save();
  context.translate(x, y);

  if (label) {
    context.fillStyle = "rgba(245, 244, 233, 0.9)";
    context.font = "700 8px var(--font-mono), monospace";
    context.textAlign = "center";
    context.fillText(label, 0, -4);
  }

  // Background
  context.fillStyle = "rgba(0, 0, 0, 0.65)";
  context.fillRect(-width / 2, 0, width, height);

  // Fill
  context.fillStyle = ratio > 0.4 ? "rgba(199, 243, 107, 0.95)" : "rgba(255, 51, 102, 0.95)";
  context.fillRect(-width / 2, 0, width * ratio, height);

  context.restore();
}
