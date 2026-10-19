import { isWormActive, type GameSummary, type GameWorld } from "@/game/types";
import type { BaseDefensePowerupId } from "@/game/baseDefenseTypes";

export type KeyboardTargetMode = "first" | "last" | "next" | "previous" | "preserve";

export function getKeyboardTargetId(world: GameWorld, currentTargetId: string | null, mode: KeyboardTargetMode) {
  const activeWorms = world.worms.filter(isWormActive);
  if (activeWorms.length === 0) {
    return null;
  }

  const currentIndex = currentTargetId ? activeWorms.findIndex((worm) => worm.id === currentTargetId) : -1;

  if (mode === "preserve") {
    return currentIndex >= 0 ? currentTargetId : activeWorms[0]?.id ?? null;
  }

  if (mode === "first") {
    return activeWorms[0]?.id ?? null;
  }

  if (mode === "last") {
    return activeWorms.at(-1)?.id ?? null;
  }

  if (currentIndex === -1) {
    return activeWorms[0]?.id ?? null;
  }

  if (mode === "next") {
    return activeWorms[(currentIndex + 1) % activeWorms.length]?.id ?? null;
  }

  return activeWorms[(currentIndex - 1 + activeWorms.length) % activeWorms.length]?.id ?? null;
}

export function getKeyboardStatus(phaseTitle: string, summary: GameSummary, keyboardTargetId: string | null) {
  const targetLabel = keyboardTargetId ? `Target ${keyboardTargetId.replace("worm-", "worm ")}.` : "No worm targeted.";
  return `${phaseTitle}. ${summary.collected} bagged. ${summary.remaining} loose. ${targetLabel}`;
}

export type StageKeyDeps = {
  worldRef: { current: GameWorld };
  keyboardTargetRef: { current: string | null };
  moveKeyboardTarget: (mode: Exclude<KeyboardTargetMode, "preserve">) => void;
  selectKeyboardTarget: (id: string | null) => void;
  applyToTarget: (targetId: string) => void;
  onBaseDefensePurchase?: (type: BaseDefensePowerupId) => void;
};

const ARROW_DIRECTIONS: Record<string, "next" | "previous"> = {
  ArrowRight: "next",
  ArrowDown: "next",
  ArrowLeft: "previous",
  ArrowUp: "previous",
};

const POWERUP_SHORTCUTS: Record<string, BaseDefensePowerupId> = {
  "1": "damage",
  "2": "minerSpeed",
  "3": "health",
  "4": "armor",
  "5": "minerCarry",
  "6": "extraMiner",
  "7": "aoeRadius",
  "8": "tower",
  "9": "wall",
  "0": "baseUpgrade",
};

/* Canvas keyboard controls, kept out of GameStage.tsx (500-line rule). Returns
   true when the key was consumed; unhandled keys fall through untouched. */
export function handleStageKeyDown(event: KeyboardEvent, deps: StageKeyDeps): boolean {
  // Handle Base Defense upgrade hotkeys (1-9, 0)
  if (deps.worldRef.current.baseDefense?.active && deps.onBaseDefensePurchase) {
    const powerupId = POWERUP_SHORTCUTS[event.key];
    if (powerupId) {
      event.preventDefault();
      deps.onBaseDefensePurchase(powerupId);
      return true;
    }
  }

  const direction = ARROW_DIRECTIONS[event.key];
  if (direction) {
    event.preventDefault();
    deps.moveKeyboardTarget(direction);
    return true;
  }

  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    deps.moveKeyboardTarget(event.key === "Home" ? "first" : "last");
    return true;
  }

  if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
    event.preventDefault();
    const targetId = getKeyboardTargetId(deps.worldRef.current, deps.keyboardTargetRef.current, "preserve");
    if (!targetId) return true;
    deps.selectKeyboardTarget(targetId);
    deps.applyToTarget(targetId);
    return true;
  }

  return false;
}
