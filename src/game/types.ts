import type { DisplayProfile } from "./detection";
import type { ProfileRules } from "./rules";
import type { WormColorId } from "./wormColors";

export type RoundPhase =
  | "introCountdown"
  | "activeChase"
  | "blinkBand"
  | "ghostFinale"
  | "gameOver"
  | "resolved";

export type DesktopWormState = "roaming" | "blinkCharged" | "blinkRecover" | "ghost" | "captured" | "escaped";

export type MobileWormState = "roaming" | "tagged" | "captured" | "escaped";

export type WormState = DesktopWormState | MobileWormState;

export type FairyState = "morphing" | "flying" | "trailFading" | "gone";

export type Point = {
  x: number;
  y: number;
};

type WormBase = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: number;
  crawlPhase: number;
  radius: number;
  hue: number;
  wave: number;
  teleportsRemaining: number;
  touchBursts: number;
  state: WormState;
  stateTimerMs: number;
};

export type StandardWorm = WormBase & {
  visualVariant: "standard";
  colorId: WormColorId;
};

export type PsychedelicWorm = WormBase & {
  visualVariant: "psychedelic";
  colorId: null;
};

export type Worm = StandardWorm | PsychedelicWorm;

export type WormVisualVariant = Worm["visualVariant"];

export type Fairy = {
  id: string;
  wormId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  createdAt: number;
  lifeMs: number;
  ttlMs: number;
  morphDurationMs: number;
  flyDurationMs: number;
  trailFadeDurationMs: number;
  hue: number;
  state: FairyState;
};

export type ContinuousColorTargetState = {
  colorId: WormColorId;
  label: string;
  progress: number;
  goal: number;
  visibleUntilMs: number;
};

export type GameSummaryTargetColor = {
  colorId: WormColorId;
  label: string;
  progress: number;
  goal: number;
  visible: boolean;
};

export type GameSummary = {
  profile: DisplayProfile;
  phase: RoundPhase;
  collected: number;
  remaining: number;
  fairies: number;
  timerMs: number;
  continuousActive: boolean;
  speedBonus: number;
  teleportsUnlocked: boolean;
  countdownMs: number;
  finalWormActive: boolean;
  rushTriggered: boolean;
  targetColor: GameSummaryTargetColor | null;
};

export type RoundResult = {
  reason: "ghostEscape" | "time" | "captured" | "wrongColor";
  collected: number;
  remaining: number;
  wrongColorId?: WormColorId;
  targetColorId?: WormColorId;
};

export type ActionResult =
  | { kind: "ignored" }
  | { kind: "miss" }
  | { kind: "tag"; wormId: string; bursts: number }
  | { kind: "teleport"; wormId: string; immortal: boolean }
  | { kind: "collect"; wormId: string; collected: number };

export type EngineRuntime = {
  random: () => number;
  now: () => number;
};

export type GameWorld = {
  profile: DisplayProfile;
  rules: ProfileRules;
  phase: RoundPhase;
  width: number;
  height: number;
  worms: Worm[];
  fairies: Fairy[];
  pointer: (Point & { active: boolean }) | null;
  collected: number;
  elapsedMs: number;
  timerMs: number;
  countdownMs: number;
  missStreak: number;
  rushTriggered: boolean;
  teleportsUnlocked: boolean;
  psychedelicWormSpawned: boolean;
  finaleStartedAt: number | null;
  roundResult: RoundResult | null;
  runtime: EngineRuntime;
  targetColor: ContinuousColorTargetState | null;
  continuousMode?: {
    active: boolean;
    // elapsed ms since continuous mode started (for deterministic tests)
    elapsedMs: number;
    // current speed multiplier applied to worm base speed
    speedMultiplier: number;
    // accumulated spawn timer (ms)
    spawnTimerMs: number;
    // desired spawn interval in ms
    spawnIntervalMs: number;
  };
};

export function isWormActive(worm: Worm) {
  return worm.state !== "captured" && worm.state !== "escaped";
}

export function isFairyVisible(fairy: Fairy) {
  return fairy.state !== "gone";
}