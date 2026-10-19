import type { ActionResult, GameWorld, Point } from "./types";
import type {
  BaseDefensePowerupId,
  BaseDefenseSummary,
  CrystalNode,
  MinerUnit,
} from "./baseDefenseTypes";
import {
  BASE_TENT_INITIAL_HP,
  CRYSTAL_SPAWN_COUNT,
  getBaseUpgradeCost,
  INITIAL_WORM_HP,
  POWERUP_COSTS,
  SHOTGUN_BASE_DAMAGE,
  SHOTGUN_BASE_RADIUS_PX,
  SHOTGUN_RADIUS_PER_UNIT_PX,
  TOWER_HP,
  TOWER_RANGE_PX,
  WALL_HP,
  WORM_DPS_STEP_AMOUNT,
  WORM_DPS_STEP_MS,
  WORM_HP_STEP_AMOUNT,
  WORM_HP_STEP_MS,
  WORM_SPAWN_STEP_MS,
} from "./baseDefenseConstants";
import {
  createMiner,
  generateRandomCrystal,
  initWormBaseDefenseState,
  stepArrows,
  stepBaseWormSpawning,
  stepMiners,
  stepTowers,
  stepWormCombat,
} from "./baseDefenseSimulation";
import { isWormActive } from "./types";

export function initBaseDefenseMode(world: GameWorld) {
  const tentX = world.width / 2;
  const tentY = world.height / 2;

  const crystals: CrystalNode[] = [];
  for (let i = 0; i < CRYSTAL_SPAWN_COUNT; i++) {
    crystals.push(generateRandomCrystal(world, tentX, tentY, `crystal-${i + 1}`));
  }

  const miners: MinerUnit[] = [
    createMiner("miner-1", tentX - 15, tentY),
    createMiner("miner-2", tentX + 15, tentY),
  ];

  world.baseDefense = {
    active: true,
    bankCredits: 0,
    tent: {
      x: tentX,
      y: tentY,
      hp: BASE_TENT_INITIAL_HP,
      maxHp: BASE_TENT_INITIAL_HP,
      level: 1,
      upgradeCount: 0,
      armor: 0,
    },
    miners,
    crystals,
    constructions: [],
    arrows: [],
    playerDamage: SHOTGUN_BASE_DAMAGE,
    minerSpeedMultiplier: 1,
    minerCarryBonus: 0,
    aoeUnits: 1,
    spawnTimerMs: 0,
    elapsedMs: 0,
  };

  // Base defense spawns worms dynamically from screen borders according to wave progression
  world.worms = [];
}

export function stepBaseDefenseMode(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense;
  if (!bd || !bd.active || world.roundResult) return;

  bd.elapsedMs += deltaMs;

  stepMiners(world, deltaMs);
  stepTowers(world, deltaMs);
  stepArrows(world, deltaMs);
  stepBaseWormSpawning(world, deltaMs);
  stepWormCombat(world, deltaMs);

  if (bd.tent.hp <= 0) {
    bd.tent.hp = 0;
    world.phase = "gameOver";
    world.roundResult = {
      reason: "baseDestroyed",
      collected: world.collected,
      remaining: world.worms.filter(isWormActive).length,
    };
  }
}

export function purchaseBaseDefenseItem(world: GameWorld, itemId: BaseDefensePowerupId): boolean {
  const bd = world.baseDefense;
  if (!bd || !bd.active) return false;

  if (itemId === "baseUpgrade") {
    const cost = getBaseUpgradeCost(bd.tent.upgradeCount);
    if (cost === null || bd.bankCredits < cost) return false;

    bd.bankCredits -= cost;
    bd.tent.upgradeCount += 1;
    bd.tent.level += 1;
    bd.tent.maxHp += 100;
    bd.tent.hp = Math.min(bd.tent.maxHp, bd.tent.hp + 100);

    const newMinerId = `miner-${bd.miners.length + 1}`;
    bd.miners.push(createMiner(newMinerId, bd.tent.x, bd.tent.y));
    return true;
  }

  const cost = POWERUP_COSTS[itemId];
  if (bd.bankCredits < cost) return false;

  bd.bankCredits -= cost;

  switch (itemId) {
    case "damage":
      bd.playerDamage += 5;
      break;
    case "minerSpeed":
      bd.minerSpeedMultiplier += 0.25;
      break;
    case "health":
      bd.tent.maxHp += 100;
      bd.tent.hp = Math.min(bd.tent.maxHp, bd.tent.hp + 150);
      break;
    case "armor":
      bd.tent.armor += 1;
      break;
    case "minerCarry":
      bd.minerCarryBonus += 5;
      break;
    case "extraMiner": {
      const newMinerId = `miner-${bd.miners.length + 1}`;
      bd.miners.push(createMiner(newMinerId, bd.tent.x, bd.tent.y));
      break;
    }
    case "aoeRadius":
      bd.aoeUnits += 1;
      break;
    case "tower": {
      const point = getRandomConstructionPoint(world);
      bd.constructions.push({
        id: `tower-${Date.now()}-${Math.random()}`,
        kind: "tower",
        x: point.x,
        y: point.y,
        hp: TOWER_HP,
        maxHp: TOWER_HP,
        attackCooldownMs: 0,
        rangePx: TOWER_RANGE_PX,
        targetWormId: null,
      });
      break;
    }
    case "wall": {
      const point = getRandomConstructionPoint(world);
      bd.constructions.push({
        id: `wall-${Date.now()}-${Math.random()}`,
        kind: "wall",
        x: point.x,
        y: point.y,
        hp: WALL_HP,
        maxHp: WALL_HP,
        attackCooldownMs: 0,
        rangePx: 0,
        targetWormId: null,
      });
      break;
    }
  }

  return true;
}

export function applyBaseDefensePress(world: GameWorld, point: Point): ActionResult {
  const bd = world.baseDefense;
  if (!bd || !bd.active || world.roundResult) return { kind: "ignored" };

  const radius = SHOTGUN_BASE_RADIUS_PX + (bd.aoeUnits - 1) * SHOTGUN_RADIUS_PER_UNIT_PX;
  let hitAny = false;

  for (const worm of world.worms) {
    if (!isWormActive(worm)) continue;
    const dist = Math.hypot(worm.x - point.x, worm.y - point.y);
    if (dist <= radius + worm.radius * 2) {
      hitAny = true;
      if (!worm.baseDefense) initWormBaseDefenseState(worm, bd.elapsedMs);
      worm.baseDefense!.hp -= bd.playerDamage;

      if (worm.baseDefense!.hp <= 0) {
        worm.state = "captured";
        world.collected += 1;
      }
    }
  }

  if (hitAny) {
    return { kind: "collect", wormId: "aoe-shotgun", collected: world.collected };
  }
  return { kind: "miss" };
}

export function getBaseDefenseSummary(world: GameWorld): BaseDefenseSummary | null {
  const bd = world.baseDefense;
  if (!bd || !bd.active) return null;

  const currentWormHp = INITIAL_WORM_HP + Math.floor(bd.elapsedMs / WORM_HP_STEP_MS) * WORM_HP_STEP_AMOUNT;
  const currentWormDps = 5 + Math.floor(bd.elapsedMs / WORM_DPS_STEP_MS) * WORM_DPS_STEP_AMOUNT;
  const currentSpawnRatePerSec = 1 + Math.floor(bd.elapsedMs / WORM_SPAWN_STEP_MS);

  return {
    active: true,
    bankCredits: bd.bankCredits,
    tentHp: bd.tent.hp,
    tentMaxHp: bd.tent.maxHp,
    tentLevel: bd.tent.level,
    tentUpgradeCount: bd.tent.upgradeCount,
    nextUpgradeCost: getBaseUpgradeCost(bd.tent.upgradeCount),
    minersCount: bd.miners.length,
    wallsCount: bd.constructions.filter((c) => c.kind === "wall").length,
    towersCount: bd.constructions.filter((c) => c.kind === "tower").length,
    aoeUnits: bd.aoeUnits,
    playerDamage: bd.playerDamage,
    armor: bd.tent.armor,
    currentWormHp,
    currentWormDps,
    currentSpawnRatePerSec,
  };
}

function getRandomConstructionPoint(world: GameWorld): Point {
  const margin = 80;
  const x = margin + world.runtime.random() * (world.width - margin * 2);
  const y = margin + world.runtime.random() * (world.height - margin * 2);
  return { x, y };
}
