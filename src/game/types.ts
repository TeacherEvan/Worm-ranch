import type { DisplayProfile } from "./detection";
import type { ProfileRules } from "./rules";

export type RoundPhase =
  | "introCountdown"
  | "activeChase"
  | "blinkBand"
  | "ghostFinale"
  | "resolved";

export type DesktopWormState = "roaming" | "blinkCharged" | "blinkRecover" | "ghost" | "captured" | "escaped";

export type MobileWormState = "roaming" | "tagged" | "captured" | "escaped";

export type WormState = DesktopWormState | MobileWormState;

export type FairyState = "morphing" | "flying" | "trailFading" | "gone";

export type Point = {
  x: number;
  y: number;
};

export type WormVisualVariant = "standard" | "psychedelic";

export type Worm = {
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
  visualVariant: WormVisualVariant;
  teleportsRemaining: number;
  touchBursts: number;
  state: WormState;
  stateTimerMs: number;
};

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

export type GameSummary = {
  profile: DisplayProfile;
  phase: RoundPhase;
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
  reason: "ghostEscape" | "time" | "captured";
  collected: number;
  remaining: number;
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
  activeRoundMisses: number;
  rushTriggered: boolean;
  teleportsUnlocked: boolean;
  psychedelicWormSpawned: boolean;
  finaleStartedAt: number | null;
  roundResult: RoundResult | null;
  runtime: EngineRuntime;
};

export function isWormActive(worm: Worm) {
  return worm.state !== "captured" && worm.state !== "escaped";
}

export function isFairyVisible(fairy: Fairy) {
  return fairy.state !== "gone";
}