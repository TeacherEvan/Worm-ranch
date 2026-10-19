import type { GameWorld, Worm } from "./types";
import type { ConstructionUnit, CrystalNode, MinerUnit } from "./baseDefenseTypes";
import {
  ARROW_SPEED_PX,
  ARROW_TTL_MS,
  BASE_MINER_HP,
  BASE_MINER_SPEED_PX,
  BASE_WORM_DPS,
  CRYSTAL_MARGIN_PX,
  CRYSTAL_MIN_DIST_FROM_BASE_PX,
  CRYSTAL_DROP_CREDITS,
  MAX_DROPPED_CRYSTALS,
  MAX_ACTIVE_SPLATS,
  MINER_CARRY_BASE,
  MINER_MINE_DURATION_MS,
  SPLAT_LIFETIME_MS,
  TOWER_COOLDOWN_MS,
  TOWER_DAMAGE,
  WORM_DPS_STEP_AMOUNT,
  WORM_DPS_STEP_MS,
  WORM_HP_STEP_AMOUNT,
  WORM_HP_STEP_MS,
  WORM_SPAWN_STEP_MS,
} from "./baseDefenseConstants";
import { isWormActive } from "./types";
import { createStandardWorm } from "./specialWorms";

export function createMiner(id: string, x: number, y: number): MinerUnit {
  return {
    id,
    x,
    y,
    hp: BASE_MINER_HP,
    maxHp: BASE_MINER_HP,
    targetCrystalId: null,
    state: "movingToCrystal",
    stateTimerMs: 0,
    walkPhase: 0,
    carriedCredits: 0,
    direction: 0,
  };
}

export function generateRandomCrystal(world: GameWorld, tentX: number, tentY: number, id: string): CrystalNode {
  let x = 0;
  let y = 0;
  let dist = 0;
  let attempts = 0;

  do {
    x = CRYSTAL_MARGIN_PX + world.runtime.random() * (world.width - CRYSTAL_MARGIN_PX * 2);
    y = CRYSTAL_MARGIN_PX + world.runtime.random() * (world.height - CRYSTAL_MARGIN_PX * 2);
    dist = Math.hypot(x - tentX, y - tentY);
    attempts++;
  } while (dist < CRYSTAL_MIN_DIST_FROM_BASE_PX && attempts < 30);

  return { id, x, y, remainingCredits: 999999 };
}

export function initWormBaseDefenseState(worm: Worm, elapsedMs: number) {
  const hp = 10 + Math.floor(elapsedMs / WORM_HP_STEP_MS) * WORM_HP_STEP_AMOUNT;
  const dps = BASE_WORM_DPS + Math.floor(elapsedMs / WORM_DPS_STEP_MS) * WORM_DPS_STEP_AMOUNT;
  worm.baseDefense = {
    hp,
    maxHp: hp,
    dps,
    targetKind: "roam",
    targetId: null,
  };
}

export function stepMiners(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense!;
  const speed = BASE_MINER_SPEED_PX * bd.minerSpeedMultiplier * (deltaMs / 1000);

  for (const miner of bd.miners) {
    miner.walkPhase += deltaMs * 0.008;

    if (miner.state === "movingToCrystal") {
      let target = bd.crystals.find((c) => c.id === miner.targetCrystalId);
      if (!target && bd.crystals.length > 0) {
        let nearestDist = Infinity;
        for (const c of bd.crystals) {
          const d = Math.hypot(c.x - miner.x, c.y - miner.y);
          if (d < nearestDist) {
            nearestDist = d;
            target = c;
          }
        }
        miner.targetCrystalId = target?.id ?? null;
      }

      if (target) {
        const dx = target.x - miner.x;
        const dy = target.y - miner.y;
        const dist = Math.hypot(dx, dy);
        miner.direction = Math.atan2(dy, dx);

        if (dist <= Math.max(12, speed)) {
          miner.x = target.x;
          miner.y = target.y;
          miner.state = "mining";
          miner.stateTimerMs = 0;
        } else if (dist > 1e-4) {
          miner.x += (dx / dist) * speed;
          miner.y += (dy / dist) * speed;
        }
      } else {
        miner.targetCrystalId = null;
      }
    } else if (miner.state === "mining") {
      miner.stateTimerMs += deltaMs;
      if (miner.stateTimerMs >= MINER_MINE_DURATION_MS) {
        miner.carriedCredits = MINER_CARRY_BASE + bd.minerCarryBonus;
        miner.state = "returningToBase";
        miner.stateTimerMs = 0;
        // Consume dropped crystal if mined
        const crystalIdx = bd.crystals.findIndex((c) => c.id === miner.targetCrystalId);
        if (crystalIdx >= 0) {
          bd.crystals.splice(crystalIdx, 1);
        }
        miner.targetCrystalId = null;
      }
    } else if (miner.state === "returningToBase") {
      const dx = bd.tent.x - miner.x;
      const dy = bd.tent.y - miner.y;
      const dist = Math.hypot(dx, dy);
      miner.direction = Math.atan2(dy, dx);

      if (dist <= Math.max(24, speed * 1.5)) {
        miner.x = bd.tent.x;
        miner.y = bd.tent.y;
        bd.bankCredits += miner.carriedCredits;
        if (!bd.floatingTexts) bd.floatingTexts = [];
        bd.floatingTexts.push({
          id: `ft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x: bd.tent.x + (Math.random() - 0.5) * 20,
          y: bd.tent.y - 20,
          text: `+${miner.carriedCredits} CR`,
          color: "#ffd166",
          lifeMs: 0,
          ttlMs: 900,
        });
        miner.carriedCredits = 0;
        miner.state = "movingToCrystal";
        miner.stateTimerMs = 0;
      } else if (dist > 1e-4) {
        miner.x += (dx / dist) * speed;
        miner.y += (dy / dist) * speed;
      }
    }
  }
}

export function handleWormDeath(world: GameWorld, worm: Worm) {
  const bd = world.baseDefense;
  if (!bd) return;

  worm.state = "captured";
  world.collected += 1;

  // Drop crystal for miners
  if (bd.crystals.length < MAX_DROPPED_CRYSTALS) {
    bd.crystals.push({
      id: `crystal-drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: worm.x,
      y: worm.y,
      remainingCredits: CRYSTAL_DROP_CREDITS,
      createdAtMs: bd.elapsedMs,
      isDrop: true,
    });
  }

  // Splat decal
  if (!bd.splats) bd.splats = [];
  if (bd.splats.length >= MAX_ACTIVE_SPLATS) {
    bd.splats.shift();
  }
  const droplets: Array<{ dx: number; dy: number; r: number }> = [];
  for (let d = 0; d < 5; d++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 15;
    droplets.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      r: 1.5 + Math.random() * 2,
    });
  }

  bd.splats.push({
    id: `splat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x: worm.x,
    y: worm.y,
    radius: 12 + Math.random() * 6,
    color: "#c7f36b",
    alpha: 0.95,
    rotation: Math.random() * Math.PI * 2,
    droplets,
    createdAtMs: bd.elapsedMs,
  });
}

export function stepSplats(world: GameWorld) {
  const bd = world.baseDefense;
  if (!bd || !bd.splats) return;

  for (let i = bd.splats.length - 1; i >= 0; i--) {
    const age = bd.elapsedMs - bd.splats[i].createdAtMs;
    if (age >= SPLAT_LIFETIME_MS) {
      bd.splats.splice(i, 1);
    } else {
      bd.splats[i].alpha = Math.max(0, 1 - age / SPLAT_LIFETIME_MS);
    }
  }
}

export function stepBlastsAndTexts(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense;
  if (!bd) return;

  if (bd.blasts) {
    for (let i = bd.blasts.length - 1; i >= 0; i--) {
      bd.blasts[i].lifeMs += deltaMs;
      if (bd.blasts[i].lifeMs >= bd.blasts[i].ttlMs) {
        bd.blasts.splice(i, 1);
      }
    }
  }

  if (bd.floatingTexts) {
    for (let i = bd.floatingTexts.length - 1; i >= 0; i--) {
      bd.floatingTexts[i].lifeMs += deltaMs;
      bd.floatingTexts[i].y -= (25 * deltaMs) / 1000;
      if (bd.floatingTexts[i].lifeMs >= bd.floatingTexts[i].ttlMs) {
        bd.floatingTexts.splice(i, 1);
      }
    }
  }
}

export function stepTowers(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense!;
  const activeWorms = world.worms.filter(isWormActive);

  for (const construction of bd.constructions) {
    if (construction.kind !== "tower" || construction.hp <= 0) continue;

    // Decay recoil offset
    if (construction.recoilOffset && construction.recoilOffset > 0) {
      construction.recoilOffset = Math.max(0, construction.recoilOffset - (deltaMs * 0.02));
    }

    // Orient towards nearest worm
    let nearestWorm: Worm | null = null;
    let nearestDist = Infinity;

    for (const worm of activeWorms) {
      const dist = Math.hypot(worm.x - construction.x, worm.y - construction.y);
      if (dist <= construction.rangePx && dist < nearestDist) {
        nearestDist = dist;
        nearestWorm = worm;
      }
    }

    if (nearestWorm) {
      construction.turretAngle = Math.atan2(nearestWorm.y - construction.y, nearestWorm.x - construction.x);
    }

    construction.attackCooldownMs = Math.max(0, construction.attackCooldownMs - deltaMs);
    if (construction.attackCooldownMs <= 0 && nearestWorm) {
      construction.attackCooldownMs = TOWER_COOLDOWN_MS;
      construction.recoilOffset = 4;
      const angle = construction.turretAngle ?? Math.atan2(nearestWorm.y - construction.y, nearestWorm.x - construction.x);
      bd.arrows.push({
        id: `arrow-${Date.now()}-${Math.random()}`,
        x: construction.x,
        y: construction.y,
        targetX: nearestWorm.x,
        targetY: nearestWorm.y,
        vx: Math.cos(angle) * ARROW_SPEED_PX,
        vy: Math.sin(angle) * ARROW_SPEED_PX,
        damage: TOWER_DAMAGE,
        lifeMs: 0,
        ttlMs: ARROW_TTL_MS,
      });
    }
  }
}

export function stepArrows(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense!;
  const frameSec = deltaMs / 1000;
  const activeWorms = world.worms.filter(isWormActive);

  for (let i = bd.arrows.length - 1; i >= 0; i--) {
    const arrow = bd.arrows[i];
    arrow.lifeMs += deltaMs;
    arrow.x += arrow.vx * frameSec;
    arrow.y += arrow.vy * frameSec;

    let hit = false;
    for (const worm of activeWorms) {
      const dist = Math.hypot(worm.x - arrow.x, worm.y - arrow.y);
      if (dist <= worm.radius * 2) {
        hit = true;
        if (!worm.baseDefense) initWormBaseDefenseState(worm, bd.elapsedMs);
        worm.baseDefense!.hp -= arrow.damage;
        if (worm.baseDefense!.hp <= 0) {
          handleWormDeath(world, worm);
        }
        break;
      }
    }

    if (hit || arrow.lifeMs >= arrow.ttlMs) {
      bd.arrows.splice(i, 1);
    }
  }
}

export function stepBaseWormSpawning(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense!;
  const spawnRatePerSec = 1 + Math.floor(bd.elapsedMs / WORM_SPAWN_STEP_MS);
  const intervalMs = 1000 / spawnRatePerSec;

  bd.spawnTimerMs += deltaMs;
  while (bd.spawnTimerMs >= intervalMs) {
    bd.spawnTimerMs -= intervalMs;
    spawnDefenseWorm(world);
  }
}

function spawnDefenseWorm(world: GameWorld) {
  const edge = Math.floor(world.runtime.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = world.runtime.random() * world.width;
    y = -10;
  } else if (edge === 1) {
    x = world.width + 10;
    y = world.runtime.random() * world.height;
  } else if (edge === 2) {
    x = world.runtime.random() * world.width;
    y = world.height + 10;
  } else {
    x = -10;
    y = world.runtime.random() * world.height;
  }

  const inactiveWorm = world.worms.find((w) => !isWormActive(w));
  if (inactiveWorm) {
    inactiveWorm.x = x;
    inactiveWorm.y = y;
    inactiveWorm.state = "roaming";
    inactiveWorm.stateTimerMs = 0;
    initWormBaseDefenseState(inactiveWorm, world.baseDefense!.elapsedMs);
  } else {
    const newWorm = createStandardWorm(world.worms.length, world.rules, world.width, world.height, world.runtime);
    newWorm.x = x;
    newWorm.y = y;
    newWorm.state = "roaming";
    newWorm.stateTimerMs = 0;
    initWormBaseDefenseState(newWorm, world.baseDefense!.elapsedMs);
    world.worms.push(newWorm);
  }
}

export function stepWormCombat(world: GameWorld, deltaMs: number) {
  const bd = world.baseDefense!;
  const dps = BASE_WORM_DPS + Math.floor(bd.elapsedMs / WORM_DPS_STEP_MS) * WORM_DPS_STEP_AMOUNT;
  const dmgPerFrame = (dps * deltaMs) / 1000;
  const frameSec = deltaMs / 1000;

  const validConstructions = bd.constructions.filter((c) => c.hp > 0);

  for (const worm of world.worms) {
    if (!isWormActive(worm)) continue;
    if (!worm.baseDefense) initWormBaseDefenseState(worm, bd.elapsedMs);

    let targetX = bd.tent.x;
    let targetY = bd.tent.y;
    let targetUnit: ConstructionUnit | null = null;

    if (validConstructions.length > 0) {
      let nearestDist = Infinity;
      for (const c of validConstructions) {
        const d = Math.hypot(c.x - worm.x, c.y - worm.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetUnit = c;
          targetX = c.x;
          targetY = c.y;
        }
      }
    }

    const dx = targetX - worm.x;
    const dy = targetY - worm.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 24) {
      const netDamage = Math.max(1, dmgPerFrame - (bd.tent.armor * deltaMs) / 1000);
      if (targetUnit) {
        targetUnit.hp -= netDamage;
        if (targetUnit.hp <= 0) targetUnit.hp = 0;
      } else {
        bd.tent.hp -= netDamage;
      }
    } else {
      const speed = 65 * frameSec;
      worm.x += (dx / dist) * speed;
      worm.y += (dy / dist) * speed;
      worm.direction = Math.atan2(dy, dx);
    }
  }

  bd.constructions = bd.constructions.filter((c) => c.hp > 0);
}
