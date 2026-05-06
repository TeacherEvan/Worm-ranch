import type { DisplayProfile } from "./detection";
import { getProfileRules, type ProfileRules } from "./rules";
import { isFairyVisible, isWormActive, type ActionResult, type EngineRuntime, type Fairy, type GameSummary, type GameWorld, type Point, type RoundResult, type Worm } from "./types";

const BLINK_RECOVER_MS = 220;

export { PROFILE_RULES } from "./rules";
export type {
  ActionResult,
  EngineRuntime,
  Fairy,
  FairyState,
  GameSummary,
  GameWorld,
  MobileWormState,
  Point,
  RoundPhase,
  RoundResult,
  Worm,
  WormState,
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
    worms: Array.from({ length: rules.totalWorms }, (_, index) => createWorm(index, rules, width, height, runtime)),
    fairies: [],
    pointer: null,
    collected: 0,
    elapsedMs: 0,
    timerMs: rules.timeLimitMs,
    countdownMs: rules.introCountdownMs,
    rushTriggered: false,
    pendingRushTrigger: false,
    teleportsUnlocked: false,
    finaleStartedAt: null,
    roundResult: null,
    runtime,
  };
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
  setPointer(world, point);

  if (world.profile !== "mobile" || world.roundResult || world.countdownMs > 0 || world.rushTriggered) {
    return;
  }

  world.pendingRushTrigger = true;
}

export function stepWorld(world: GameWorld, deltaMs: number) {
  if (world.roundResult) {
    return;
  }

  world.elapsedMs += deltaMs;
  advanceWormTimers(world, deltaMs);

  if (world.countdownMs > 0) {
    world.countdownMs = Math.max(0, world.countdownMs - deltaMs);
    updateRoundPhase(world);
    return;
  }

  if (world.profile === "mobile" && world.pendingRushTrigger) {
    world.rushTriggered = true;
    world.pendingRushTrigger = false;
  }

  world.timerMs = Math.max(0, world.timerMs - deltaMs);

  if (world.timerMs === 0) {
    finishWorld(world, "time");
    return;
  }

  for (const worm of world.worms) {
    if (!isWormActive(worm)) {
      continue;
    }

    const maxSpeed = getWormSpeed(world);
    const pointerForce = getPointerForce(world, worm);
    const phase = world.elapsedMs * 0.0012 + worm.wave;
    const wanderX = Math.cos(phase * 0.9 + worm.hue);
    const wanderY = Math.sin(phase * 1.1 + worm.hue);
    const accelerationX = wanderX * 0.03 + pointerForce.x * 0.15;
    const accelerationY = wanderY * 0.03 + pointerForce.y * 0.15;

    worm.vx = clamp(worm.vx + accelerationX, -maxSpeed, maxSpeed);
    worm.vy = clamp(worm.vy + accelerationY, -maxSpeed, maxSpeed);

    const speed = Math.hypot(worm.vx, worm.vy) || 1;
    const targetSpeed =
      world.profile === "mobile" && world.rushTriggered ? world.rules.rushSpeed : maxSpeed;

    if (speed > targetSpeed) {
      const scale = targetSpeed / speed;
      worm.vx *= scale;
      worm.vy *= scale;
    }

    worm.x += worm.vx * deltaMs * 0.05;
    worm.y += worm.vy * deltaMs * 0.05;

    if (worm.x < worm.radius || worm.x > world.width - worm.radius) {
      worm.vx *= -1;
      worm.x = clamp(worm.x, worm.radius, world.width - worm.radius);
    }

    if (worm.y < worm.radius || worm.y > world.height - worm.radius) {
      worm.vy *= -1;
      worm.y = clamp(worm.y, worm.radius, world.height - worm.radius);
    }
  }

  advanceFairies(world, deltaMs);
  syncWormStates(world);

  const remaining = getRemainingWorms(world);

  if (world.profile === "desktop" && remaining.length === 1) {
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

  if (world.profile === "mobile" && remaining.length === 0) {
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
    if (distance <= worm.radius + hitPadding) {
      return worm.id;
    }
  }

  return null;
}

export function applyAccuratePress(world: GameWorld, wormId: string): ActionResult {
  if (world.roundResult || world.countdownMs > 0) {
    return { kind: "ignored" };
  }

  const worm = world.worms.find((candidate) => candidate.id === wormId && isWormActive(candidate));

  if (!worm) {
    return { kind: "miss" };
  }

  const rules = world.rules;
  const remaining = getRemainingWorms(world);
  const isFinalWorm = world.profile === "desktop" && remaining.length === 1 && remaining[0]?.id === worm.id;

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

  captureWorm(world, worm);

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
    speedBonus: world.collected * rules.speedBonusPerCollect,
    teleportsUnlocked: world.teleportsUnlocked,
    countdownMs: world.countdownMs,
    finalWormActive: world.profile === "desktop" && remaining === 1,
    rushTriggered: world.rushTriggered,
  };
}

function createWorm(
  index: number,
  rules: ReturnType<typeof getProfileRules>,
  width: number,
  height: number,
  runtime: EngineRuntime,
): Worm {
  const hue = (index * 17) % 360;

  return {
    id: `worm-${index + 1}`,
    x: randomBetween(runtime, rules.baseRadius + 20, width - rules.baseRadius - 20),
    y: randomBetween(runtime, rules.baseRadius + 20, height - rules.baseRadius - 20),
    vx: randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed),
    vy: randomBetween(runtime, -rules.baseMaxSpeed, rules.baseMaxSpeed),
    radius: rules.baseRadius + (index % 3),
    hue,
    wave: randomBetween(runtime, 0, Math.PI * 2),
    teleportsRemaining: 0,
    touchBursts: 0,
    state: "roaming",
    stateTimerMs: 0,
  };
}

function createFairy(world: GameWorld, worm: Worm): Fairy {
  const rules = world.rules;
  return {
    id: `fairy-${worm.id}-${world.runtime.now()}`,
    x: worm.x,
    y: worm.y,
    vx: randomBetween(world.runtime, -0.9, 0.9),
    vy: randomBetween(world.runtime, -2.3, -1.4),
    lifeMs: 0,
    ttlMs: rules.fairyTtlMs,
    hue: (worm.hue + 120) % 360,
    state: "rising",
  };
}

function advanceFairies(world: GameWorld, deltaMs: number) {
  const rules = world.rules;

  world.fairies = world.fairies.filter((fairy) => {
    fairy.lifeMs += deltaMs;
    fairy.x += fairy.vx * deltaMs * 0.05;
    fairy.y += fairy.vy * deltaMs * 0.05;
    fairy.vy -= 0.0009 * deltaMs;

    if (fairy.lifeMs >= rules.fairyFadeAtMs) {
      fairy.state = "fading";
    }

    if (fairy.lifeMs >= fairy.ttlMs || fairy.y <= -80) {
      fairy.state = "gone";
    }

    return isFairyVisible(fairy);
  });
}

function getPointerForce(world: GameWorld, worm: Worm) {
  if (!world.pointer?.active) {
    return { x: 0, y: 0 };
  }

  const dx = worm.x - world.pointer.x;
  const dy = worm.y - world.pointer.y;
  const distance = Math.hypot(dx, dy) || 1;
  const influenceRadius = world.rules.influenceRadius;

  if (distance > influenceRadius) {
    return { x: 0, y: 0 };
  }

  const force = 1 - distance / influenceRadius;
  return {
    x: (dx / distance) * force,
    y: (dy / distance) * force,
  };
}

function getRemainingWorms(world: GameWorld) {
  return world.worms.filter(isWormActive);
}

function getWormSpeed(world: GameWorld) {
  const rules = world.rules;
  const base = rules.baseMaxSpeed + world.collected * rules.speedBonusPerCollect;
  return clamp(base, 0, rules.rushSpeed);
}

function teleportWorm(world: GameWorld, worm: Worm, immortal: boolean) {
  const distance = world.rules.teleportDistance;
  const angle = randomBetween(world.runtime, 0, Math.PI * 2);
  const step = immortal ? distance * 1.15 : distance;
  worm.x = clamp(worm.x + Math.cos(angle) * step, worm.radius, world.width - worm.radius);
  worm.y = clamp(worm.y + Math.sin(angle) * step, worm.radius, world.height - worm.radius);
  worm.vx += Math.cos(angle) * 1.4;
  worm.vy += Math.sin(angle) * 1.4;
}

function captureWorm(world: GameWorld, worm: Worm) {
  worm.state = "captured";
  worm.stateTimerMs = 0;
  world.collected += 1;
  world.fairies.push(createFairy(world, worm));
}

function advanceWormTimers(world: GameWorld, deltaMs: number) {
  for (const worm of world.worms) {
    if (!isWormActive(worm) || worm.stateTimerMs <= 0) {
      continue;
    }

    worm.stateTimerMs = Math.max(0, worm.stateTimerMs - deltaMs);
  }
}

function syncWormStates(world: GameWorld) {
  const remaining = getRemainingWorms(world);
  const finalWormId = world.profile === "desktop" && remaining.length === 1 ? remaining[0]?.id ?? null : null;

  for (const worm of world.worms) {
    if (!isWormActive(worm)) {
      continue;
    }

    if (world.profile === "desktop") {
      if (worm.id === finalWormId) {
        worm.state = "ghost";
        worm.stateTimerMs = 0;
        continue;
      }

      if (worm.state === "blinkRecover" && worm.stateTimerMs > 0) {
        continue;
      }

      worm.state = worm.teleportsRemaining > 0 ? "blinkCharged" : "roaming";
      worm.stateTimerMs = 0;
      continue;
    }

    worm.state = worm.touchBursts > 0 ? "tagged" : "roaming";
    worm.stateTimerMs = 0;
  }
}

function updateRoundPhase(world: GameWorld) {
  if (world.roundResult) {
    world.phase = "resolved";
    return;
  }

  if (world.countdownMs > 0) {
    world.phase = "introCountdown";
    return;
  }

  if (world.profile === "desktop") {
    const remaining = getRemainingWorms(world).length;
    if (remaining === 1) {
      world.phase = "ghostFinale";
      return;
    }

    world.phase = world.teleportsUnlocked ? "blinkBand" : "activeChase";
    return;
  }

  world.phase = "activeChase";
}

function createProfileRules(profile: DisplayProfile, overrides: Partial<ProfileRules> = {}): ProfileRules {
  return {
    ...getProfileRules(profile),
    ...overrides,
    profile,
  } as ProfileRules;
}

function finishWorld(world: GameWorld, reason: RoundResult["reason"]) {
  world.roundResult = {
    reason,
    collected: world.collected,
    remaining: getRemainingWorms(world).length,
  };
  world.phase = "resolved";

  for (const worm of world.worms) {
    if (isWormActive(worm)) {
      worm.state = "escaped";
      worm.stateTimerMs = 0;
    }
  }
}

function randomBetween(runtime: EngineRuntime, min: number, max: number) {
  return min + runtime.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
