/* Micro-interaction helpers (visual-redesign-spec Phase 1).
   Pure, reduced-motion aware; never touch gameplay state. */

export type PressFeedback = {
  scale: number;
  durationMs: number;
};

export function getPressFeedback(reducedMotion: boolean): PressFeedback {
  if (reducedMotion) {
    return { scale: 1, durationMs: 0 };
  }

  return { scale: 0.96, durationMs: 120 };
}

export type PulseTone = "collect" | "warn" | "critical";

const PULSE_COLORS: Record<PulseTone, string> = {
  collect: "var(--neon-lime)",
  warn: "var(--neon-amber)",
  critical: "var(--neon-pink)",
};

export function getPulseColor(tone: PulseTone): string {
  return PULSE_COLORS[tone];
}

export function getCountdownSlam(reducedMotion: boolean): string | null {
  if (reducedMotion) {
    return null;
  }

  return "worm-ranch-slam 320ms cubic-bezier(0.2, 1.4, 0.4, 1)";
}

/* Best-effort haptics: no-op where unsupported or reduced motion is on. */
export function triggerHaptic(pattern: number | number[], reducedMotion: boolean): void {
  if (reducedMotion) {
    return;
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silent: haptics must never break gameplay.
  }
}

export type ActionKind = "collect" | "teleport" | "tag";

const ACTION_HAPTICS: Record<ActionKind, number | number[]> = {
  collect: 12,
  teleport: [8, 40, 8],
  tag: 6,
};

export function getActionHaptic(kind: ActionKind): number | number[] {
  return ACTION_HAPTICS[kind];
}

/* Web-Animations micro primitives (spec section 7). Elements without
   .animate (older browsers, test DOM) get null: callers treat as no-op. */

type AnimatableElement = {
  animate?: (keyframes: unknown, options?: unknown) => unknown;
};

function playAnimation(
  element: AnimatableElement | null | undefined,
  reducedMotion: boolean,
  keyframes: unknown,
  options: unknown,
): unknown {
  if (!element || reducedMotion || typeof element.animate !== "function") {
    return null;
  }

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SPRING = "cubic-bezier(0.68, -0.55, 0.27, 1.55)";

export function microPress(element: AnimatableElement | null | undefined, reducedMotion: boolean, scale = 0.96) {
  return playAnimation(element, reducedMotion, { transform: ["scale(1)", `scale(${scale})`, "scale(1)"] }, { duration: 100, easing: EASE_OUT });
}

export function microSucceed(element: AnimatableElement | null | undefined, reducedMotion: boolean, color = "var(--neon-lime)") {
  return playAnimation(
    element,
    reducedMotion,
    { boxShadow: [`0 0 0 0 ${color}00`, `0 0 0 12px ${color}44`, `0 0 0 0 ${color}00`] },
    { duration: 320, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  );
}

export function microFail(element: AnimatableElement | null | undefined, reducedMotion: boolean) {
  return playAnimation(
    element,
    reducedMotion,
    { transform: ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-4px)", "translateX(0)"] },
    { duration: 280, easing: EASE_SPRING },
  );
}

export function microTransition(element: AnimatableElement | null | undefined, reducedMotion: boolean) {
  return playAnimation(
    element,
    reducedMotion,
    { opacity: [0.6, 1], filter: ["blur(2px)", "blur(0)"] },
    { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
}

export function microGlowPulse(element: AnimatableElement | null | undefined, reducedMotion: boolean, color = "var(--neon-lime)") {
  return playAnimation(
    element,
    reducedMotion,
    { boxShadow: [`0 0 0 0 ${color}00`, `0 0 16px 4px ${color}66`, `0 0 0 0 ${color}00`] },
    { duration: 1000, iterations: Infinity, easing: "ease-in-out" },
  );
}
