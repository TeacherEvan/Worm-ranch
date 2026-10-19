import type { Point } from "./types";

export type BaseDefensePowerupId =
  | "damage"
  | "minerSpeed"
  | "health"
  | "armor"
  | "minerCarry"
  | "extraMiner"
  | "aoeRadius"
  | "tower"
  | "wall"
  | "baseUpgrade";

export type CrystalNode = Point & {
  id: string;
  remainingCredits: number;
  createdAtMs?: number;
  isDrop?: boolean;
};

export type SplatDecal = Point & {
  id: string;
  radius: number;
  color: string;
  alpha: number;
  rotation: number;
  droplets: Array<{ dx: number; dy: number; r: number }>;
  createdAtMs: number;
};

export type MinerUnit = Point & {
  id: string;
  hp: number;
  maxHp: number;
  targetCrystalId: string | null;
  state: "movingToCrystal" | "mining" | "returningToBase";
  stateTimerMs: number;
  walkPhase: number;
  carriedCredits: number;
  direction: number;
};

export type ShotgunBlastVisual = Point & {
  id: string;
  radius: number;
  lifeMs: number;
  ttlMs: number;
};

export type FloatingCreditText = Point & {
  id: string;
  text: string;
  color: string;
  lifeMs: number;
  ttlMs: number;
};

export type ConstructionUnit = Point & {
  id: string;
  kind: "tower" | "wall";
  hp: number;
  maxHp: number;
  attackCooldownMs: number;
  rangePx: number;
  targetWormId: string | null;
  turretAngle?: number;
  recoilOffset?: number;
};

export type ArrowProjectile = Point & {
  id: string;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  damage: number;
  lifeMs: number;
  ttlMs: number;
};

export type BaseTentState = Point & {
  hp: number;
  maxHp: number;
  level: number;
  upgradeCount: number; // 0 to 10
  armor: number;
};

export type BaseDefenseWormState = {
  hp: number;
  maxHp: number;
  dps: number;
  targetKind: "construction" | "tent" | "roam";
  targetId: string | null;
};

export type BaseDefenseWorldState = {
  active: boolean;
  bankCredits: number;
  tent: BaseTentState;
  miners: MinerUnit[];
  crystals: CrystalNode[];
  constructions: ConstructionUnit[];
  arrows: ArrowProjectile[];
  splats: SplatDecal[];
  blasts?: ShotgunBlastVisual[];
  floatingTexts?: FloatingCreditText[];
  playerDamage: number;
  minerSpeedMultiplier: number;
  minerCarryBonus: number;
  aoeUnits: number; // starts at 1, +1 per aoe purchase
  spawnTimerMs: number;
  elapsedMs: number;
};

export type BaseDefenseSummary = {
  active: boolean;
  bankCredits: number;
  tentHp: number;
  tentMaxHp: number;
  tentLevel: number;
  tentUpgradeCount: number;
  nextUpgradeCost: number | null;
  minersCount: number;
  wallsCount: number;
  towersCount: number;
  aoeUnits: number;
  playerDamage: number;
  armor: number;
  currentWormHp: number;
  currentWormDps: number;
  currentSpawnRatePerSec: number;
};
