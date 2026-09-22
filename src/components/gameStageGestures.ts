/* Touch gesture controls (spec section 6): swipe cycles the keyboard target,
   tap acts, 300ms hold triggers touch rush. Timing is injected so the
   classifier is unit-testable without a DOM. */

import { applyAccuratePress, applyMiss, findWormIdAtPoint, triggerTouchRush } from "@/game/engine";
import type { ActionResult, GameWorld } from "@/game/types";
import { triggerHaptic } from "@/lib/microInteractions";
import type { KeyboardTargetMode } from "@/components/gameStageKeyboard";

export type TapPoint = { x: number; y: number };

export type SwipeDirection = "next" | "previous";

export type GestureOutcome =
  | { gesture: "tap"; point: TapPoint }
  | { gesture: "swipe"; direction: SwipeDirection }
  | { gesture: "hold"; point: TapPoint }
  | { gesture: "none" };

const SWIPE_MIN_PX = 24;
const SWIPE_MAX_MS = 600;
const TAP_MAX_PX = 12;
const TAP_MAX_MS = 400;
const HOLD_MAX_PX = 10;

export const HOLD_MS = 300;

type TouchSnapshot = TapPoint & { time: number };

export class TouchGestureTracker {
  private start: TouchSnapshot | null = null;
  private latest: TouchSnapshot | null = null;
  private holdFired = false;

  onDown(point: TapPoint, now: number): void {
    this.start = { ...point, time: now };
    this.latest = { ...point, time: now };
    this.holdFired = false;
  }

  onMove(point: TapPoint, now: number): void {
    if (!this.start) {
      return;
    }

    this.latest = { ...point, time: now };
  }

  onUp(point: TapPoint, now: number): GestureOutcome {
    const start = this.start;

    if (!start || this.holdFired) {
      this.reset();
      return { gesture: "none" };
    }

    this.reset();
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const duration = now - start.time;

    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) && duration <= SWIPE_MAX_MS) {
      return { gesture: "swipe", direction: dx > 0 ? "next" : "previous" };
    }

    if (Math.hypot(dx, dy) <= TAP_MAX_PX && duration <= TAP_MAX_MS) {
      return { gesture: "tap", point };
    }

    return { gesture: "none" };
  }

  /* Called by the HOLD_MS timer: fires at most once per touch. */
  holdCandidate(): TapPoint | null {
    if (!this.start || !this.latest || this.holdFired) {
      return null;
    }

    const moved = Math.hypot(this.latest.x - this.start.x, this.latest.y - this.start.y);
    if (moved > HOLD_MAX_PX) {
      return null;
    }

    this.holdFired = true;
    return { x: this.start.x, y: this.start.y };
  }

  reset(): void {
    this.start = null;
    this.latest = null;
    this.holdFired = false;
  }

  get active(): boolean {
    return this.start !== null;
  }
}

export type TouchControlHandlers = {
  onTap: (point: TapPoint) => void;
  onSwipe: (direction: SwipeDirection) => void;
  onHold: (point: TapPoint) => void;
};

export type TouchHandlerDeps = {
  worldRef: { current: GameWorld };
  reducedMotionRef: { current: boolean };
  setKeyboardTargetId: (id: string) => void;
  moveKeyboardTarget: (mode: Exclude<KeyboardTargetMode, "preserve">) => void;
  handleAction: (result: ActionResult) => void;
};

/* Gesture → game wiring, kept out of GameStage.tsx (500-line rule). */
export function createTouchHandlers(deps: TouchHandlerDeps): TouchControlHandlers {
  return {
    onTap: (point) => {
      const wormId = findWormIdAtPoint(deps.worldRef.current, point);
      if (!wormId) {
        deps.handleAction(applyMiss(deps.worldRef.current));
        return;
      }
      deps.setKeyboardTargetId(wormId);
      deps.handleAction(applyAccuratePress(deps.worldRef.current, wormId));
    },
    onSwipe: (direction) => {
      deps.moveKeyboardTarget(direction);
      triggerHaptic(8, deps.reducedMotionRef.current);
    },
    onHold: (point) => {
      triggerTouchRush(deps.worldRef.current, point);
      triggerHaptic([8, 50, 24], deps.reducedMotionRef.current);
    },
  };
}

/* Binds pointer listeners for touch only; mouse/pen keep the direct path. */
export function attachTouchControls(
  canvas: HTMLCanvasElement,
  toLocalPoint: (clientX: number, clientY: number) => TapPoint,
  handlers: TouchControlHandlers,
): () => void {
  const tracker = new TouchGestureTracker();
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  const clearHoldTimer = () => {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      return;
    }

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; pointercancel covers the escape path.
    }

    tracker.onDown(toLocalPoint(event.clientX, event.clientY), event.timeStamp);
    clearHoldTimer();
    holdTimer = setTimeout(() => {
      holdTimer = null;
      const point = tracker.holdCandidate();
      if (point) {
        handlers.onHold(point);
      }
    }, HOLD_MS);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      return;
    }

    tracker.onMove(toLocalPoint(event.clientX, event.clientY), event.timeStamp);
  };

  const finish = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      return;
    }

    clearHoldTimer();
    const outcome = tracker.onUp(toLocalPoint(event.clientX, event.clientY), event.timeStamp);
    if (outcome.gesture === "tap") {
      handlers.onTap(outcome.point);
    } else if (outcome.gesture === "swipe") {
      handlers.onSwipe(outcome.direction);
    }
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      return;
    }

    clearHoldTimer();
    tracker.reset();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", onPointerCancel);

  return () => {
    clearHoldTimer();
    tracker.reset();
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", finish);
    canvas.removeEventListener("pointercancel", onPointerCancel);
  };
}
