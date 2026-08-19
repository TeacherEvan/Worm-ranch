import type { DisplayProfile } from "./detection";
import {
  createContinuousColorTargetState,
  registerContinuousColorRemoval,
  resetContinuousColorTargetVisibility,
} from "./continuousColorTargets";
import { stepWormMovement } from "./movement";
import { getProfileRules, type ProfileRules } from "./rules";
import { createPsychedelicWorm, createStandardWorm, shouldSpawnPsychedelicWorm } from "./specialWorms";
import {
  isFairyVisible,
  isWormActive,
  type ActionResult,
  type EngineRuntime,
  type GameSummary,
  type GameWorld,
  type Point,
  type RoundResult,
  type Worm,
} from "./types";
import {
  BLINK_RECOVER_MS,
  CONTINUOUS_SPAWN_INTERVAL_MS,
  DIRECTION_EPSILON,
  SPEED_MULTIPLIER_CAP,
  SPEED_RAMP_PER_SECOND,
  WORM_HIT_RADIUS_FACTOR,
} from "./constants";
import { createFairy, advanceFairies } from "./engineFairies";
import { spawnContinuousWorm, refillContinuousWorms, getTargetColorSummary } from "./engineContinuous";
import { advanceWormTimers, syncWormStates, updateRoundPhase } from "./enginePhase";
import { randomBetween, clamp, getWormSpeed } from "./engineUtils";

export { PROFILE_RULES } from "./rules";
export type {
  ActionResult,
  EngineRuntime,
  Fairy,
  FairyState,
  GameSummary,
  GameSummaryTargetColor,
  GameWorld,
  MobileWormState,
  Point,
  RoundPhase,
  RoundResult,
  Worm,
  WormState,
  WormVisualVariant,
} from "./types";

export type CreateWorldOptions = {
  runtime?: Partial<EngineRuntime>;
  rules?: Partial<ProfileRules>;
};

export function createEngineRuntime(overrides: Partial<EngineRuntime> = {}): EngineRuntime {
  return {
    random: Math.random,
    now: Date.now,
    ...overrides,
  };
}

export function createWorld(
  profile: DisplayProfile,
  width: number,
  height: number,
  options: CreateWorldOptions = {},
): GameWorld {
  const rules = createProfileRules(profile, options.rules);
  const runtime = createEngineRuntime(options.runtime);

  return {
    profile,
    rules,
    phase: "introCountdown",
    width,
    height,
    worms: Array.from({ length: rules.totalWorms }, (_, index) => createStandardWorm(index, rules, width, height, runtime)),
    fairies: [],
    pointer: null,
    collected: 0,
    elapsedMs: 0,
    timerMs: rules.timeLimitMs,
    countdownMs: rules.introCountdownMs,
    missStreak: 0,
    rushTriggered: false,
    teleportsUnlocked: false,
    psychedelicWormSpawned: false,
    finaleStartedAt: null,
    roundResult: null,
    runtime,
    targetColor: null,
    continuousMode: {
      active: false,
      elapsedMs: 0,
      speedMultiplier: 1,
      spawnTimerMs: 0,
      spawnIntervalMs: CONTINUOUS_SPAWN_INTERVAL_MS,
    },
  };
}

export function startContinuousMode(world: GameWorld) {
  world.continuousMode ??= {
    active: false,
    elapsedMs: 0,
    speedMultiplier: 1,
    spawnTimerMs: 0,
    spawnIntervalMs: CONTINUOUS_SPAWN_INTERVAL_MS,
  };
  world.continuousMode.active = true;
  world.continuousMode.elapsedMs = 0;
  world.continuousMode.spawnTimerMs = 0;
  world.continuousMode.speedMultiplier = 1;
  world.finaleStartedAt = null;
  refillContinuousWorms(world);
  syncWormStates(world);
  updateRoundPhase(world);
  world.targetColor = createContinuousColorTargetState(world.worms, world.runtime);
}

export function stopContinuousMode(world: GameWorld) {
  if (!world.continuousMode) return;
  world.continuousMode.active = false;
  world.continuousMode.elapsedMs = 0;
  world.continuousMode.spawnTimerMs = 0;
  world.continuousMode.speedMultiplier = 1;
  world.targetColor = null;
  syncWormStates(world);
  updateRoundPhase(world);
}

export function startRound(world: GameWorld) {
  if (world.roundResult || world.countdownMs <= 0) {
    return;
  }

  stepWorld(world, world.countdownMs);
}

export function resizeWorld(world: GameWorld, width: number, height: number) {
  world.width = width;
  world.height = height;
}

export function setPointer(world: GameWorld, point: Point | null) {
  world.pointer = point ? { ...point, active: true } : null;
}

export function triggerTouchRush(world: GameWorld, point: Point) {
  if (world.profile !== "mobile" || world.roundResult || world.countdownMs > 0) {
    return;
  }

  setPointer(world, point);

  if (world.rushTriggered) {
    return;
  }

  world.rushTriggered = true;
}

export function stepWorld(world: GameWorld, deltaMs: number) {
  if (world.roundResult) {
    return;
  }

  world.elapsedMs += deltaMs;
  advanceWormTimers(world, deltaMs);

  // Continuous mode: ramp speed and spawn worms up to cap
  if (world.continuousMode?.active) {
    world.targetColor ??= createContinuousColorTargetState(world.worms, world.runtime);
    world.continuousMode.elapsedMs += deltaMs;
    // ramp speed multiplier gradually
    const inc = (SPEED_RAMP_PER_SECOND * deltaMs) / 1000;
    world.continuousMode.speedMultiplier = Math.min(
      SPEED_MULTIPLIER_CAP,
      (world.continuousMode.speedMultiplier || 1) + inc,
    );

    // spawn timer
    world.continuousMode.spawnTimerMs += deltaMs;
    while (world.continuousMode.spawnTimerMs >= (world.continuousMode.spawnIntervalMs || CONTINUOUS_SPAWN_INTERVAL_MS)) {
      world.continuousMode.spawnTimerMs -= world.continuousMode.spawnIntervalMs || CONTINUOUS_SPAWN_INTERVAL_MS;
      const activeCount = world.worms.filter(isWormActive).length;
      if (activeCount < world.rules.totalWorms) {
        spawnContinuousWorm(world);
        syncWormStates(world);
        updateRoundPhase(world);
      }
    }
  }

  if (world.countdownMs > 0) {
    const previousCountdownMs = world.countdownMs;
    world.countdownMs = Math.max(0, world.countdownMs - deltaMs);

    if (previousCountdownMs > 0 && world.countdownMs === 0 && world.continuousMode?.active && world.targetColor) {
      world.targetColor = resetContinuousColorTargetVisibility(world.targetColor, world.runtime);
    }

    updateRoundPhase(world);
    return;
  }

  if (!world.continuousMode?.active) {
    world.timerMs = Math.max(0, world.timerMs - deltaMs);

    if (world.timerMs === 0) {
      finishWorld(world, "time");
      return;
    }
  }

  for (const worm of world.worms) {
    if (!isWormActive(worm)) {
      continue;
    }

    const roamSpeed = getWormSpeed(world);
    const activeSpeed = world.profile === "mobile" && world.rushTriggered ? world.rules.rushSpeed : roamSpeed;
    stepWormMovement(world, worm, deltaMs, activeSpeed);
  }

  advanceFairies(world, deltaMs);
  syncWormStates(world);

  const remaining = getRemainingWorms(world);

  if (!world.continuousMode?.active && world.profile === "desktop" && remaining.length === 1) {
    if (world.finaleStartedAt === null) {
      world.finaleStartedAt = world.elapsedMs;
    }

    if (world.elapsedMs - world.finaleStartedAt >= world.rules.ghostFinaleDurationMs) {
      finishWorld(world, "ghostEscape");
      return;
    }
  } else {
    world.finaleStartedAt = null;
  }

  if (!world.continuousMode?.active && world.profile === "mobile" && remaining.length === 0) {
    finishWorld(world, "captured");
    return;
  }

  updateRoundPhase(world);
}

export function findWormIdAtPoint(world: GameWorld, point: Point): string | null {
  const hitPadding = world.profile === "mobile" ? world.rules.mobileTapForgiveness : 0;

  for (let index = world.worms.length - 1; index >= 0; index -= 1) {
    const worm = world.worms[index];

    if (!worm || !isWormActive(worm)) {
      continue;
    }

    const distance = Math.hypot(worm.x - point.x, worm.y - point.y);
    if (distance <= worm.radius * WORM_HIT_RADIUS_FACTOR + hitPadding) {
      return worm.id;
    }
  }

  return null;
}

export function applyMiss(world: GameWorld): ActionResult {
  if (world.roundResult || world.countdownMs > 0) {
    return { kind: "ignored" };
  }

  world.missStreak += 1;

  if (shouldSpawnPsychedelicWorm(world)) {
    world.psychedelicWormSpawned = true;
    world.worms.push(createPsychedelicWorm(world));
    syncWormStates(world);
    updateRoundPhase(world);
  }

  return { kind: "miss" };
}

export function applyAccuratePress(world: GameWorld, wormId: string): ActionResult {
  if (world.roundResult || world.countdownMs > 0) {
    return { kind: "ignored" };
  }

  const worm = world.worms.find((candidate) => candidate.id === wormId && isWormActive(candidate));

  if (!worm) {
    return { kind: "miss" };
  }

  world.missStreak = 0;

  const rules = world.rules;
  const remaining = getRemainingWorms(world);
  const isFinalWorm =
    !world.continuousMode?.active &&
    world.profile === "desktop" &&
    remaining.length === 1 &&
    remaining[0]?.id === worm.id;

  if (isFinalWorm) {
    worm.state = "ghost";
    teleportWorm(world, worm, true);
    world.finaleStartedAt ??= world.elapsedMs;
    updateRoundPhase(world);
    return { kind: "teleport", wormId, immortal: true };
  }

  if (world.profile === "desktop" && worm.teleportsRemaining > 0) {
    worm.teleportsRemaining -= 1;
    worm.state = "blinkRecover";
    worm.stateTimerMs = BLINK_RECOVER_MS;
    teleportWorm(world, worm, false);
    updateRoundPhase(world);
    return { kind: "teleport", wormId, immortal: false };
  }

  if (world.profile === "mobile") {
    worm.touchBursts += 1;
    if (worm.touchBursts < rules.touchBurstsToCapture) {
      worm.state = "tagged";
      updateRoundPhase(world);
      return { kind: "tag", wormId, bursts: worm.touchBursts };
    }
  }

  if (
    world.continuousMode?.active &&
    worm.visualVariant === "standard" &&
    world.targetColor &&
    worm.colorId !== world.targetColor.colorId
  ) {
    finishWorld(world, "wrongColor", {
      wrongColorId: worm.colorId,
      targetColorId: world.targetColor.colorId,
    });
    return { kind: "collect", wormId, collected: world.collected };
  }

  captureWorm(world, worm);

  if (world.continuousMode?.active) {
    refillContinuousWorms(world);
    world.targetColor = registerContinuousColorRemoval(world.targetColor, worm.colorId, world.worms, world.runtime);
  }

  if (world.profile === "desktop" && !world.teleportsUnlocked && world.collected >= rules.teleportUnlockCount) {
    world.teleportsUnlocked = true;
    for (const survivor of world.worms) {
      if (isWormActive(survivor)) {
        survivor.teleportsRemaining = Math.max(survivor.teleportsRemaining, 1);
      }
    }
  }

  syncWormStates(world);
  updateRoundPhase(world);
  return { kind: "collect", wormId, collected: world.collected };
}

export function getSummary(world: GameWorld): GameSummary {
  const rules = world.rules;
  const remaining = getRemainingWorms(world).length;

  return {
    profile: world.profile,
    phase: world.phase,
    collected: world.collected,
    remaining,
    fairies: world.fairies.filter(isFairyVisible).length,
    timerMs: world.timerMs,
    continuousActive: world.continuousMode?.active ?? false,
    speedBonus: world.collected * rules.speedBonusPerCollect,
    teleportsUnlocked: world.teleportsUnlocked,
    countdownMs: world.countdownMs,
    finalWormActive: world.profile === "desktop" && !world.continuousMode?.active && remaining === 1,
    rushTriggered: world.rushTriggered,
    targetColor: getTargetColorSummary(world.targetColor, world.continuousMode?.active ?? false, world.runtime.now()),
  };
}

function getRemainingWorms(world: GameWorld) {
  return world.worms.filter(isWormActive);
}

function teleportWorm(world: GameWorld, worm: Worm, immortal: boolean) {
  const distance = world.rules.teleportDistance;
  const angle = randomBetween(world.runtime, 0, Math.PI * 2);
  const step = immortal ? distance * 1.15 : distance;
  worm.x = clamp(worm.x + Math.cos(angle) * step, worm.radius, world.width - worm.radius);
  worm.y = clamp(worm.y + Math.sin(angle) * step, worm.radius, world.height - worm.radius);
  worm.vx += Math.cos(angle) * 1.4;
  worm.vy += Math.sin(angle) * 1.4;
  worm.direction = Math.atan2(worm.vy, worm.vx || DIRECTION_EPSILON);
}

function captureWorm(world: GameWorld, worm: Worm) {
  worm.state = "captured";
  worm.stateTimerMs = 0;
  world.collected += 1;
  world.fairies.push(createFairy(world, worm));
}

function createProfileRules(profile: DisplayProfile, overrides: Partial<ProfileRules> = {}): ProfileRules {
  return {
    ...getProfileRules(profile),
    ...overrides,
    profile,
  } as ProfileRules;
}

function finishWorld(
  world: GameWorld,
  reason: RoundResult["reason"],
  extras: Pick<RoundResult, "wrongColorId" | "targetColorId"> = {},
) {
  world.roundResult = {
    reason,
    collected: world.collected,
    remaining: getRemainingWorms(world).length,
    ...extras,
  };
  world.phase = reason === "wrongColor" ? "gameOver" : "resolved";

  for (const worm of world.worms) {
    if (isWormActive(worm)) {
      worm.state = "escaped";
      worm.stateTimerMs = 0;
    }
  }
}
