// Round-phase + worm-timer sync helpers — extracted from engine.ts.
// Internal to src/game: imported only by engine.ts.

import type { GameWorld } from "./types";
import { isWormActive } from "./types";

export function advanceWormTimers(world: GameWorld, deltaMs: number) {
  for (const worm of world.worms) {
    if (!isWormActive(worm) || worm.stateTimerMs <= 0) {
      continue;
    }

    worm.stateTimerMs = Math.max(0, worm.stateTimerMs - deltaMs);
  }
}

export function syncWormStates(world: GameWorld) {
  const remaining = world.worms.filter(isWormActive);
  const finalWormId =
    world.profile === "desktop" && !world.continuousMode?.active && remaining.length === 1
      ? remaining[0]?.id ?? null
      : null;

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

export function updateRoundPhase(world: GameWorld) {
  if (world.roundResult) {
    world.phase = world.roundResult.reason === "wrongColor" ? "gameOver" : "resolved";
    return;
  }

  if (world.countdownMs > 0) {
    world.phase = "introCountdown";
    return;
  }

  if (world.profile === "desktop") {
    const remaining = world.worms.filter(isWormActive).length;
    if (!world.continuousMode?.active && remaining === 1) {
      world.phase = "ghostFinale";
      return;
    }

    world.phase = world.teleportsUnlocked ? "blinkBand" : "activeChase";
    return;
  }

  world.phase = "activeChase";
}
