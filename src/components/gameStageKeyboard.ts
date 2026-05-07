import { isWormActive, type GameSummary, type GameWorld } from "@/game/types";

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