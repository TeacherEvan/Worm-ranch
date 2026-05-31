import { STANDARD_WORM_COLORS } from "./wormColors";
import { isWormActive, type ContinuousColorTargetState, type EngineRuntime, type Worm } from "./types";

export const CONTINUOUS_COLOR_TARGET_GOAL = 2;
export const CONTINUOUS_COLOR_TARGET_FLASH_MS = 2_000;

export function createContinuousColorTargetState(
  worms: Worm[],
  runtime: EngineRuntime,
): ContinuousColorTargetState | null {
  const nextColorId = pickContinuousTargetColorId(worms, runtime.random());

  if (!nextColorId) {
    return null;
  }

  return createTargetState(nextColorId, runtime.now());
}

export function registerContinuousColorRemoval(
  state: ContinuousColorTargetState | null,
  removedColorId: Worm["colorId"],
  worms: Worm[],
  runtime: EngineRuntime,
): ContinuousColorTargetState | null {
  if (!state) {
    return createContinuousColorTargetState(worms, runtime);
  }

  if (!removedColorId || removedColorId !== state.colorId) {
    return state;
  }

  const nextProgress = state.progress + 1;

  if (nextProgress < state.goal) {
    return {
      ...state,
      progress: nextProgress,
    };
  }

  const nextColorId = pickContinuousTargetColorId(worms, runtime.random(), state.colorId);

  if (!nextColorId) {
    return {
      ...state,
      progress: state.goal,
    };
  }

  return createTargetState(nextColorId, runtime.now());
}

export function resetContinuousColorTargetVisibility(
  state: ContinuousColorTargetState,
  runtime: EngineRuntime,
): ContinuousColorTargetState {
  return {
    ...state,
    visibleUntilMs: runtime.now() + CONTINUOUS_COLOR_TARGET_FLASH_MS,
  };
}

export function isContinuousColorTargetVisible(state: ContinuousColorTargetState | null, now: number) {
  return Boolean(state && now < state.visibleUntilMs);
}

function createTargetState(colorId: ContinuousColorTargetState["colorId"], now: number): ContinuousColorTargetState {
  const color = STANDARD_WORM_COLORS.find((candidate) => candidate.id === colorId);

  if (!color) {
    throw new Error(`unknown continuous target color: ${colorId}`);
  }

  return {
    colorId: color.id,
    label: color.label,
    progress: 0,
    goal: CONTINUOUS_COLOR_TARGET_GOAL,
    visibleUntilMs: now + CONTINUOUS_COLOR_TARGET_FLASH_MS,
  };
}

function pickContinuousTargetColorId(
  worms: Worm[],
  randomValue: number,
  excludeColorId?: ContinuousColorTargetState["colorId"],
) {
  const activeColorIds = Array.from(
    new Set(
      worms
        .filter((worm) => isWormActive(worm) && worm.visualVariant === "standard")
        .map((worm) => worm.colorId),
    ),
  );

  if (activeColorIds.length === 0) {
    return null;
  }

  const preferredColorIds =
    excludeColorId && activeColorIds.length > 1
      ? activeColorIds.filter((colorId) => colorId !== excludeColorId)
      : activeColorIds;
  const colorIds = preferredColorIds.length > 0 ? preferredColorIds : activeColorIds;
  const index = Math.min(colorIds.length - 1, Math.floor(randomValue * colorIds.length));

  return colorIds[index] ?? null;
}