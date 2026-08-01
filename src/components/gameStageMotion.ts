import type { GameSummary } from "@/game/types";

/* ============================================================================
   MOTION FEEDBACK SYSTEM — maps game events to visual cues
   Provides: stageCue, baggedBump, remainingDip, fairyBurst, timerAlert
   All cues are reduced-motion aware (handled downstream)
============================================================================= */

export type StageMotionCue =
  | "none"
  | "round-live"
  | "rush-start"
  | "blink-armed"
  | "final-outlaw"
  | "clock-critical";

export type MotionFeedback = {
  stageCue: StageMotionCue;
  baggedBump: boolean;
  remainingDip: boolean;
  fairyBurst: boolean;
  timerAlert: boolean;
};

const CRITICAL_TIMER_MS = 15_000;

export function getMotionFeedback(
  previous: GameSummary | null,
  next: GameSummary
): MotionFeedback {
  if (!previous) {
    return {
      stageCue: "none",
      baggedBump: false,
      remainingDip: false,
      fairyBurst: false,
      timerAlert: false,
    };
  }

  let stageCue: StageMotionCue = "none";

  if (previous.countdownMs > 0 && next.countdownMs === 0) {
    stageCue = "round-live";
  } else if (!previous.rushTriggered && next.rushTriggered) {
    stageCue = "rush-start";
  } else if (!previous.teleportsUnlocked && next.teleportsUnlocked) {
    stageCue = "blink-armed";
  } else if (!previous.finalWormActive && next.finalWormActive) {
    stageCue = "final-outlaw";
  } else if (
    previous.timerMs > CRITICAL_TIMER_MS &&
    next.timerMs <= CRITICAL_TIMER_MS &&
    next.phase !== "resolved"
  ) {
    stageCue = "clock-critical";
  }

  return {
    stageCue,
    baggedBump: next.collected > previous.collected,
    remainingDip: next.remaining < previous.remaining,
    fairyBurst: next.fairies > previous.fairies,
    timerAlert:
      previous.timerMs > CRITICAL_TIMER_MS &&
      next.timerMs <= CRITICAL_TIMER_MS &&
      next.phase !== "resolved",
  };
}

/* ============================================================================
   CUE → VISUAL EFFECT MAPPING
   Returns the visual effect parameters for each cue type
============================================================================= */

export type CueEffect = {
  screenShake: { intensity: number; durationMs: number; frequency: number } | null;
  timeDilation: { factor: number; durationMs: number; ease: "in" | "out" | "inout" } | null;
  retroOverlay: { type: "scanline" | "vignette" | "chromatic"; intensity: number; durationMs: number } | null;
  particleTone: import("./gameStageParticles").ParticleTone | null;
  particleCount: number;
  flashColor: string | null;
};

export function getCueEffect(cue: StageMotionCue, reducedMotion: boolean): CueEffect {
  const full: CueEffect = (() => {
    switch (cue) {
      case "round-live":
        return {
          screenShake: { intensity: 1.5, durationMs: 180, frequency: 25 },
          timeDilation: { factor: 0.85, durationMs: 220, ease: "out" },
          retroOverlay: { type: "scanline", intensity: 0.15, durationMs: 400 },
          particleTone: "rush",
          particleCount: 12,
          flashColor: "#F07E43",
        };

      case "rush-start":
        return {
          screenShake: { intensity: 3, durationMs: 300, frequency: 30 },
          timeDilation: { factor: 0.7, durationMs: 400, ease: "inout" },
          retroOverlay: { type: "chromatic", intensity: 0.3, durationMs: 500 },
          particleTone: "rush",
          particleCount: 18,
          flashColor: "#F07E43",
        };

      case "blink-armed":
        return {
          screenShake: { intensity: 1, durationMs: 150, frequency: 40 },
          timeDilation: { factor: 0.9, durationMs: 200, ease: "out" },
          retroOverlay: { type: "vignette", intensity: 0.25, durationMs: 350 },
          particleTone: "teleport",
          particleCount: 15,
          flashColor: "#00F5FF",
        };

      case "final-outlaw":
        return {
          screenShake: { intensity: 4, durationMs: 400, frequency: 20 },
          timeDilation: { factor: 0.5, durationMs: 600, ease: "in" },
          retroOverlay: { type: "chromatic", intensity: 0.5, durationMs: 800 },
          particleTone: "outlaw",
          particleCount: 20,
          flashColor: "#FF3366",
        };

      case "clock-critical":
        return {
          screenShake: { intensity: 0.8, durationMs: 1000, frequency: 15 },
          timeDilation: null,
          retroOverlay: { type: "scanline", intensity: 0.2, durationMs: 1000 },
          particleTone: "countdown",
          particleCount: 8,
          flashColor: "#00F5FF",
        };

      default:
        return {
          screenShake: null,
          timeDilation: null,
          retroOverlay: null,
          particleTone: null,
          particleCount: 0,
          flashColor: null,
        };
    }
  })();

  if (reducedMotion) {
    // Preserve the per-cue flash color for color-coded legibility, but
    // suppress shake/dilation/overlay/particle feedback.
    return {
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: full.flashColor,
    };
  }

  return full;
}

export function getBaggedBumpEffect(reducedMotion: boolean): CueEffect {
  if (reducedMotion) {
    return {
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: "#C7F36B",
    };
  }

  return {
    screenShake: { intensity: 0.8, durationMs: 100, frequency: 30 },
    timeDilation: { factor: 0.92, durationMs: 120, ease: "out" },
    retroOverlay: null,
    particleTone: "collect",
    particleCount: 14,
    flashColor: "#C7F36B",
  };
}

export function getRemainingDipEffect(reducedMotion: boolean): CueEffect {
  if (reducedMotion) {
    return {
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: "#FF3366",
    };
  }

  return {
    screenShake: { intensity: 2, durationMs: 200, frequency: 22 },
    timeDilation: { factor: 0.85, durationMs: 180, ease: "out" },
    retroOverlay: { type: "vignette", intensity: 0.3, durationMs: 300 },
    particleTone: "tag",
    particleCount: 10,
    flashColor: "#FF3366",
  };
}

export function getFairyBurstEffect(reducedMotion: boolean): CueEffect {
  if (reducedMotion) {
    return {
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: "#BC9FFF",
    };
  }

  return {
    screenShake: { intensity: 1.2, durationMs: 250, frequency: 18 },
    timeDilation: { factor: 0.88, durationMs: 300, ease: "inout" },
    retroOverlay: { type: "chromatic", intensity: 0.2, durationMs: 450 },
    particleTone: "fairy",
    particleCount: 16,
    flashColor: "#BC9FFF",
  };
}

export function getTimerAlertEffect(reducedMotion: boolean): CueEffect {
  if (reducedMotion) {
    return {
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: "#00F5FF",
    };
  }

  return {
    screenShake: { intensity: 0.6, durationMs: 2000, frequency: 12 },
    timeDilation: null,
    retroOverlay: { type: "scanline", intensity: 0.15, durationMs: 2000 },
    particleTone: "countdown",
    particleCount: 6,
    flashColor: "#00F5FF",
  };
}