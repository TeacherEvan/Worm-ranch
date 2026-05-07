import type { DisplayProfile } from "./detection";
import {
  DESKTOP_RULES,
  MOBILE_RULES,
  getProfileRules,
  type DesktopRules,
  type MobileRules,
  type ProfileRules,
} from "./rules";

export type GameplayLevel = {
  number: number;
  label: string;
  themeIndex: number;
  rules: Partial<ProfileRules>;
};

export function normalizeGameplayLevel(level: number) {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.floor(level));
}

export function getNextGameplayLevel(level: number) {
  return normalizeGameplayLevel(level) + 1;
}

export function getGameplayLevel(profile: DisplayProfile, level: number): GameplayLevel {
  const number = normalizeGameplayLevel(level);

  return {
    number,
    label: `Level ${number}`,
    themeIndex: number - 1,
    rules: profile === "desktop" ? getDesktopLevelRules(number) : getMobileLevelRules(number),
  };
}

export function getGameplayLevelRules(profile: DisplayProfile, level: number): ProfileRules {
  const gameplayLevel = getGameplayLevel(profile, level);

  return {
    ...getProfileRules(profile),
    ...gameplayLevel.rules,
    profile,
  } as ProfileRules;
}

function getDesktopLevelRules(level: number): Partial<DesktopRules> {
  const depth = level - 1;
  const totalWorms = DESKTOP_RULES.totalWorms + depth * 8;

  return {
    totalWorms,
    timeLimitMs: Math.max(55_000, DESKTOP_RULES.timeLimitMs - depth * 3_500),
    baseMaxSpeed: clampNumber(DESKTOP_RULES.baseMaxSpeed + depth * 0.08, DESKTOP_RULES.baseMaxSpeed, 1.2),
    teleportUnlockCount: Math.min(totalWorms - 1, DESKTOP_RULES.teleportUnlockCount + depth * 5),
  };
}

function getMobileLevelRules(level: number): Partial<MobileRules> {
  const depth = level - 1;

  return {
    totalWorms: MOBILE_RULES.totalWorms + depth * 2,
    timeLimitMs: Math.max(40_000, MOBILE_RULES.timeLimitMs - depth * 4_000),
    baseMaxSpeed: clampNumber(MOBILE_RULES.baseMaxSpeed + depth * 0.1, MOBILE_RULES.baseMaxSpeed, 1.25),
    touchBurstsToCapture: depth >= 3 ? MOBILE_RULES.touchBurstsToCapture + 1 : MOBILE_RULES.touchBurstsToCapture,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}