import type { GameWorld, Worm } from "./types";

const REFERENCE_FRAME_MS = 16;

export function stepWormMovement(world: GameWorld, worm: Worm, deltaMs: number, baseSpeed: number) {
  const frameScale = deltaMs / REFERENCE_FRAME_MS;
  const escapeVector = getPointerEscapeVector(world, worm);

  if (escapeVector) {
    const escapeSpeed = Math.min(world.rules.rushSpeed, baseSpeed * world.rules.cursorEscapeMultiplier);
    worm.vx = escapeVector.x * escapeSpeed;
    worm.vy = escapeVector.y * escapeSpeed;
    worm.direction = Math.atan2(worm.vy, worm.vx);
    worm.x += worm.vx * frameScale;
    worm.y += worm.vy * frameScale;
    constrainWormToBounds(world, worm);
    return;
  }

  const directionChangeChance = 1 - Math.pow(1 - world.rules.directionChangeRate, frameScale);
  if (world.runtime.random() < directionChangeChance) {
    worm.direction += ((world.runtime.random() - 0.5) * Math.PI) / 4;
  }

  const crawlOffset = Math.sin(worm.crawlPhase) * world.rules.crawlAmplitude;
  worm.vx = Math.cos(worm.direction) * baseSpeed + Math.cos(worm.direction + Math.PI / 2) * crawlOffset;
  worm.vy = Math.sin(worm.direction) * baseSpeed + Math.sin(worm.direction + Math.PI / 2) * crawlOffset;
  worm.x += worm.vx * frameScale;
  worm.y += worm.vy * frameScale;
  worm.crawlPhase = normalizeAngle(worm.crawlPhase + world.rules.crawlPhaseIncrement * frameScale);
  constrainWormToBounds(world, worm);
}

function getPointerEscapeVector(world: GameWorld, worm: Worm) {
  if (!world.pointer?.active) {
    return null;
  }

  if (world.profile === "mobile" && !world.rushTriggered) {
    return null;
  }

  const dx = worm.x - world.pointer.x;
  const dy = worm.y - world.pointer.y;
  const distance = Math.hypot(dx, dy);

  if (!Number.isFinite(distance) || distance > world.rules.cursorThreatRadius) {
    return null;
  }

  if (distance < 0.0001) {
    return {
      x: Math.cos(worm.direction),
      y: Math.sin(worm.direction),
    };
  }

  return {
    x: dx / distance,
    y: dy / distance,
  };
}

function constrainWormToBounds(world: GameWorld, worm: Worm) {
  const minX = worm.radius;
  const maxX = world.width - worm.radius;
  const minY = worm.radius;
  const maxY = world.height - worm.radius;

  if (worm.x < minX || worm.x > maxX) {
    worm.x = clamp(worm.x, minX, maxX);
    worm.vx *= -1;
    worm.direction = Math.PI - worm.direction;
  }

  if (worm.y < minY || worm.y > maxY) {
    worm.y = clamp(worm.y, minY, maxY);
    worm.vy *= -1;
    worm.direction = -worm.direction;
  }

  worm.direction = normalizeAngle(worm.direction);
}

function normalizeAngle(value: number) {
  const fullTurn = Math.PI * 2;
  return ((value % fullTurn) + fullTurn) % fullTurn;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}