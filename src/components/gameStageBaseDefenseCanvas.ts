import type { GameWorld } from "@/game/types";
import type {
  ArrowProjectile,
  BaseTentState,
  ConstructionUnit,
  CrystalNode,
  MinerUnit,
} from "@/game/baseDefenseTypes";

export function drawBaseDefenseLayer(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  reducedMotion: boolean,
  frameNow: number,
) {
  const bd = world.baseDefense;
  if (!bd || !bd.active) return;

  // 1. Draw crystals
  for (const crystal of bd.crystals) {
    drawCrystal(context, crystal, reducedMotion, frameNow);
  }

  // 2. Draw constructions (walls & towers)
  for (const construction of bd.constructions) {
    if (construction.kind === "wall") {
      drawWall(context, construction);
    } else {
      drawTower(context, construction, reducedMotion, frameNow);
    }
  }

  // 3. Draw central Base Tent
  drawBaseTent(context, bd.tent, reducedMotion, frameNow);

  // 4. Draw miners with walking animation
  for (const miner of bd.miners) {
    drawMiner(context, miner, reducedMotion, frameNow);
  }

  // 5. Draw in-flight visible tower arrows
  for (const arrow of bd.arrows) {
    drawTowerArrow(context, arrow, reducedMotion);
  }
}

function drawCrystal(
  context: CanvasRenderingContext2D,
  crystal: CrystalNode,
  reducedMotion: boolean,
  frameNow: number,
) {
  const pulse = reducedMotion ? 1 : 0.85 + Math.sin(frameNow * 0.005 + crystal.x) * 0.15;
  context.save();
  context.translate(crystal.x, crystal.y);

  // Glow halo
  context.fillStyle = `rgba(0, 245, 255, ${0.15 * pulse})`;
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill();

  // Crystal facets
  context.fillStyle = "rgba(0, 245, 255, 0.9)";
  context.strokeStyle = "rgba(188, 159, 255, 0.9)";
  context.lineWidth = 1.5;

  context.beginPath();
  context.moveTo(0, -12);
  context.lineTo(7, -3);
  context.lineTo(4, 9);
  context.lineTo(-4, 9);
  context.lineTo(-7, -3);
  context.closePath();
  context.fill();
  context.stroke();

  // Inner highlight facet
  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.beginPath();
  context.moveTo(0, -10);
  context.lineTo(3, -2);
  context.lineTo(0, 6);
  context.closePath();
  context.fill();

  context.restore();
}

function drawBaseTent(
  context: CanvasRenderingContext2D,
  tent: BaseTentState,
  reducedMotion: boolean,
  frameNow: number,
) {
  context.save();
  context.translate(tent.x, tent.y);

  // Upgrade glow / forcefield ring
  if (!reducedMotion) {
    const ringRadius = 38 + (Math.sin(frameNow * 0.004) + 1) * 2;
    context.strokeStyle = "rgba(199, 243, 107, 0.25)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();
  }

  // Base command tent geometry
  context.fillStyle = "rgba(10, 24, 38, 0.92)";
  context.strokeStyle = "rgba(199, 243, 107, 0.9)";
  context.lineWidth = 2.5;

  context.beginPath();
  context.moveTo(0, -26);
  context.lineTo(28, 16);
  context.lineTo(-28, 16);
  context.closePath();
  context.fill();
  context.stroke();

  // Tent doorway / interior neon glow
  context.fillStyle = "rgba(0, 245, 255, 0.85)";
  context.beginPath();
  context.moveTo(0, -6);
  context.lineTo(10, 16);
  context.lineTo(-10, 16);
  context.closePath();
  context.fill();

  // Level & HP banner above Tent
  drawEntityHpBar(context, 0, -34, tent.hp, tent.maxHp, `LVL ${tent.level}`);

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

function drawWall(context: CanvasRenderingContext2D, wall: ConstructionUnit) {
  context.save();
  context.translate(wall.x, wall.y);

  // Reinforced barrier bastion
  context.fillStyle = "rgba(255, 212, 74, 0.85)";
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 1.5;

  context.fillRect(-14, -8, 28, 16);
  context.strokeRect(-14, -8, 28, 16);

  // Wall HP bar
  drawEntityHpBar(context, 0, -16, wall.hp, wall.maxHp, "WALL");

  context.restore();
}

function drawTower(
  context: CanvasRenderingContext2D,
  tower: ConstructionUnit,
  _reducedMotion: boolean,
  _frameNow: number,
) {
  context.save();
  context.translate(tower.x, tower.y);

  // Turret base
  context.fillStyle = "rgba(10, 18, 26, 0.9)";
  context.strokeStyle = "rgba(0, 245, 255, 0.85)";
  context.lineWidth = 2;

  context.beginPath();
  context.arc(0, 0, 14, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Arrow launcher emitter
  context.fillStyle = "rgba(0, 245, 255, 0.95)";
  context.fillRect(-3, -16, 6, 12);

  // Tower HP bar
  drawEntityHpBar(context, 0, -22, tower.hp, tower.maxHp, "TOWER");

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
