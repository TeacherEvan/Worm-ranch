import type { DisplayProfile } from "@/game/detection";

export type Point = {
  x: number;
  y: number;
};

export type Worm = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  wave: number;
  teleportsRemaining: number;
  touchBursts: number;
  active: boolean;
  escaped: boolean;
};

export type Fairy = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  ttlMs: number;
  hue: number;
};

export type GameSummary = {
  profile: DisplayProfile;
  collected: number;
  remaining: number;
  fairies: number;
  timerMs: number;
  speedBonus: number;
  teleportsUnlocked: boolean;
  countdownMs: number;
  finalWormActive: boolean;
  rushTriggered: boolean;
};

export type RoundResult = {
  reason: "escaped" | "time" | "captured";
  collected: number;
  remaining: number;
};

export type ActionResult =
  | { kind: "ignored" }
  | { kind: "miss" }
  | { kind: "tag"; wormId: string; bursts: number }
  | { kind: "teleport"; wormId: string; immortal: boolean }
  | { kind: "collect"; wormId: string; collected: number };

export type GameWorld = {
  profile: DisplayProfile;
  width: number;
  height: number;
  worms: Worm[];
  fairies: Fairy[];
  pointer: (Point & { active: boolean }) | null;
  collected: number;
  elapsedMs: number;
  timerMs: number;
  countdownMs: number;
  rushTriggered: boolean;
  teleportsUnlocked: boolean;
  finaleStartedAt: number | null;
  roundResult: RoundResult | null;
};

type ProfileRules = {
  totalWorms: number;
  baseRadius: number;
  baseMaxSpeed: number;
  rushSpeed: number;
  timeLimitMs: number;
  influenceRadius: number;
  teleportDistance: number;
  mobileTapForgiveness: number;
  finaleDurationMs: number;
};

export const PROFILE_RULES: Record<DisplayProfile, ProfileRules> = {
  desktop: {
    totalWorms: 100,
    baseRadius: 10,
    baseMaxSpeed: 0.95,
    rushSpeed: 4.4,
    timeLimitMs: 95_000,
    influenceRadius: 180,
    teleportDistance: 110,
    mobileTapForgiveness: 0,
    finaleDurationMs: 9_000,
  },
  mobile: {
    totalWorms: 10,
    baseRadius: 18,
    baseMaxSpeed: 1.15,
    rushSpeed: 5.4,
    timeLimitMs: 70_000,
    influenceRadius: 220,
    teleportDistance: 0,
    mobileTapForgiveness: 12,
    finaleDurationMs: 0,
  },
};

export function createWorld(
  profile: DisplayProfile,
  width: number,
  height: number,
): GameWorld {
  const rules = PROFILE_RULES[profile];

  return {
    profile,
    width,
    height,
    worms: Array.from({ length: rules.totalWorms }, (_, index) => createWorm(index, rules, width, height)),
    fairies: [],
    pointer: null,
    collected: 0,
    elapsedMs: 0,
    timerMs: rules.timeLimitMs,
    countdownMs: 2_400,
    rushTriggered: false,
    teleportsUnlocked: false,
    finaleStartedAt: null,
    roundResult: null,
  };
}

export function resizeWorld(world: GameWorld, width: number, height: number) {
  world.width = width;
  world.height = height;
}

export function setPointer(world: GameWorld, point: Point | null) {
  world.pointer = point ? { ...point, active: true } : null;
}

export function triggerTouchRush(world: GameWorld, point: Point) {
  world.rushTriggered = true;
  setPointer(world, point);
}

export function stepWorld(world: GameWorld, deltaMs: number) {
  if (world.roundResult) {
    return;
  }

  world.elapsedMs += deltaMs;

  if (world.countdownMs > 0) {
    world.countdownMs = Math.max(0, world.countdownMs - deltaMs);
    return;
  }

  world.timerMs = Math.max(0, world.timerMs - deltaMs);

  if (world.timerMs === 0) {
    finishWorld(world, "time");
    return;
  }

  for (const worm of world.worms) {
    if (!worm.active) {
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
      world.profile === "mobile" && world.rushTriggered ? PROFILE_RULES.mobile.rushSpeed : maxSpeed;

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

  world.fairies = world.fairies.filter((fairy) => {
    fairy.lifeMs += deltaMs;
    fairy.x += fairy.vx * deltaMs * 0.05;
    fairy.y += fairy.vy * deltaMs * 0.05;
    fairy.vy -= 0.0009 * deltaMs;

    return fairy.lifeMs < fairy.ttlMs && fairy.y > -80;
  });

  const remaining = getRemainingWorms(world).length;

  if (world.profile === "desktop" && remaining === 1) {
    if (world.finaleStartedAt === null) {
      world.finaleStartedAt = world.elapsedMs;
    }

    if (world.elapsedMs - world.finaleStartedAt >= PROFILE_RULES.desktop.finaleDurationMs) {
      finishWorld(world, "escaped");
    }
  }

  if (world.profile === "mobile" && remaining === 0) {
    finishWorld(world, "captured");
  }
}

export function findWormIdAtPoint(world: GameWorld, point: Point): string | null {
  const hitPadding = world.profile === "mobile" ? PROFILE_RULES.mobile.mobileTapForgiveness : 0;

  for (let index = world.worms.length - 1; index >= 0; index -= 1) {
    const worm = world.worms[index];

    if (!worm.active) {
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

  const worm = world.worms.find((candidate) => candidate.id === wormId && candidate.active);

  if (!worm) {
    return { kind: "miss" };
  }

  const remaining = getRemainingWorms(world);
  const isFinalWorm = world.profile === "desktop" && remaining.length === 1 && remaining[0]?.id === worm.id;

  if (isFinalWorm) {
    teleportWorm(world, worm, true);
    return { kind: "teleport", wormId, immortal: true };
  }

  if (world.profile === "desktop" && worm.teleportsRemaining > 0) {
    worm.teleportsRemaining -= 1;
    teleportWorm(world, worm, false);
    return { kind: "teleport", wormId, immortal: false };
  }

  if (world.profile === "mobile") {
    worm.touchBursts += 1;
    if (worm.touchBursts < 2) {
      return { kind: "tag", wormId, bursts: worm.touchBursts };
    }
  }

  worm.active = false;
  world.collected += 1;
  world.fairies.push(createFairy(worm));

  if (world.profile === "desktop" && !world.teleportsUnlocked && world.collected >= 50) {
    world.teleportsUnlocked = true;
    for (const survivor of world.worms) {
      if (survivor.active) {
        survivor.teleportsRemaining = Math.max(survivor.teleportsRemaining, 1);
      }
    }
  }

  return { kind: "collect", wormId, collected: world.collected };
}

export function getSummary(world: GameWorld): GameSummary {
  return {
    profile: world.profile,
    collected: world.collected,
    remaining: getRemainingWorms(world).length,
    fairies: world.fairies.length,
    timerMs: world.timerMs,
    speedBonus: world.collected * 0.1,
    teleportsUnlocked: world.teleportsUnlocked,
    countdownMs: world.countdownMs,
    finalWormActive: world.profile === "desktop" && getRemainingWorms(world).length === 1,
    rushTriggered: world.rushTriggered,
  };
}

function createWorm(index: number, rules: ProfileRules, width: number, height: number): Worm {
  const hue = (index * 17) % 360;

  return {
    id: `worm-${index + 1}`,
    x: randomBetween(rules.baseRadius + 20, width - rules.baseRadius - 20),
    y: randomBetween(rules.baseRadius + 20, height - rules.baseRadius - 20),
    vx: randomBetween(-rules.baseMaxSpeed, rules.baseMaxSpeed),
    vy: randomBetween(-rules.baseMaxSpeed, rules.baseMaxSpeed),
    radius: rules.baseRadius + (index % 3),
    hue,
    wave: randomBetween(0, Math.PI * 2),
    teleportsRemaining: 0,
    touchBursts: 0,
    active: true,
    escaped: false,
  };
}

function createFairy(worm: Worm): Fairy {
  return {
    id: `fairy-${worm.id}-${Date.now()}`,
    x: worm.x,
    y: worm.y,
    vx: randomBetween(-0.9, 0.9),
    vy: randomBetween(-2.3, -1.4),
    lifeMs: 0,
    ttlMs: 1_500,
    hue: (worm.hue + 120) % 360,
  };
}

function getPointerForce(world: GameWorld, worm: Worm) {
  if (!world.pointer?.active) {
    return { x: 0, y: 0 };
  }

  const dx = worm.x - world.pointer.x;
  const dy = worm.y - world.pointer.y;
  const distance = Math.hypot(dx, dy) || 1;
  const influenceRadius = PROFILE_RULES[world.profile].influenceRadius;

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
  return world.worms.filter((worm) => worm.active);
}

function getWormSpeed(world: GameWorld) {
  const base = PROFILE_RULES[world.profile].baseMaxSpeed + world.collected * 0.1;
  return clamp(base, 0, PROFILE_RULES[world.profile].rushSpeed);
}

function teleportWorm(world: GameWorld, worm: Worm, immortal: boolean) {
  const distance = PROFILE_RULES.desktop.teleportDistance;
  const angle = randomBetween(0, Math.PI * 2);
  const step = immortal ? distance * 1.15 : distance;
  worm.x = clamp(worm.x + Math.cos(angle) * step, worm.radius, world.width - worm.radius);
  worm.y = clamp(worm.y + Math.sin(angle) * step, worm.radius, world.height - worm.radius);
  worm.vx += Math.cos(angle) * 1.4;
  worm.vy += Math.sin(angle) * 1.4;
}

function finishWorld(world: GameWorld, reason: RoundResult["reason"]) {
  world.roundResult = {
    reason,
    collected: world.collected,
    remaining: getRemainingWorms(world).length,
  };

  for (const worm of world.worms) {
    if (worm.active) {
      worm.escaped = true;
    }
  }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
