export const BASE_TENT_INITIAL_HP = 500;
export const MAX_BASE_UPGRADES = 10;

export const BASE_MINER_HP = 500;
export const BASE_MINER_SPEED_PX = 90;
export const MINER_CARRY_BASE = 10;
export const MINER_MINE_DURATION_MS = 600;

export const CRYSTAL_SPAWN_COUNT = 6;
export const CRYSTAL_MARGIN_PX = 60;
export const CRYSTAL_MIN_DIST_FROM_BASE_PX = 130;

export const WALL_HP = 200;

export const TOWER_HP = 200;
export const TOWER_DAMAGE = 10;
export const TOWER_RANGE_PX = 220;
export const TOWER_COOLDOWN_MS = 1000;
export const ARROW_SPEED_PX = 320;
export const ARROW_TTL_MS = 1200;

export const INITIAL_WORM_HP = 10;
export const WORM_HP_STEP_MS = 20_000;
export const WORM_HP_STEP_AMOUNT = 10;

export const BASE_WORM_DPS = 5;
export const WORM_DPS_STEP_MS = 60_000;
export const WORM_DPS_STEP_AMOUNT = 5;

export const WORM_SPAWN_STEP_MS = 10_000;

export const SHOTGUN_BASE_DAMAGE = 10;
export const SHOTGUN_BASE_RADIUS_PX = 28;
export const SHOTGUN_RADIUS_PER_UNIT_PX = 28;

export const POWERUP_COSTS = {
  damage: 50,
  minerSpeed: 50,
  health: 50,
  armor: 75,
  minerCarry: 75,
  extraMiner: 100,
  aoeRadius: 75,
  tower: 100,
  wall: 10,
} as const;

export function getBaseUpgradeCost(currentUpgradeCount: number): number | null {
  if (currentUpgradeCount >= MAX_BASE_UPGRADES) {
    return null;
  }
  return (currentUpgradeCount + 1) * 100;
}
