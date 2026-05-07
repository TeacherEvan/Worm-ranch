import type { DisplayProfile } from "./detection";

type BaseRules = {
  totalWorms: number;
  baseRadius: number;
  baseMaxSpeed: number;
  rushSpeed: number;
  crawlAmplitude: number;
  directionChangeRate: number;
  crawlPhaseIncrement: number;
  timeLimitMs: number;
  cursorThreatRadius: number;
  cursorEscapeMultiplier: number;
  teleportDistance: number;
  mobileTapForgiveness: number;
  introCountdownMs: number;
  ghostFinaleDurationMs: number;
  teleportUnlockCount: number;
  touchBurstsToCapture: number;
  speedBonusPerCollect: number;
  fairyTtlMs: number;
  fairyFadeAtMs: number;
};

export type DesktopRules = BaseRules & {
  profile: "desktop";
};

export type MobileRules = BaseRules & {
  profile: "mobile";
};

export type ProfileRules = DesktopRules | MobileRules;

export const DESKTOP_RULES: DesktopRules = {
  profile: "desktop",
  totalWorms: 100,
  baseRadius: 10,
  baseMaxSpeed: 0.5,
  rushSpeed: 4.4,
  crawlAmplitude: 0.5,
  directionChangeRate: 0.1,
  crawlPhaseIncrement: 0.05,
  timeLimitMs: 95_000,
  cursorThreatRadius: 140,
  cursorEscapeMultiplier: 2.2,
  teleportDistance: 110,
  mobileTapForgiveness: 0,
  introCountdownMs: 2_400,
  ghostFinaleDurationMs: 9_000,
  teleportUnlockCount: 50,
  touchBurstsToCapture: 1,
  speedBonusPerCollect: 0.1,
  fairyTtlMs: 7_000,
  fairyFadeAtMs: 3_500,
};

export const MOBILE_RULES: MobileRules = {
  profile: "mobile",
  totalWorms: 10,
  baseRadius: 18,
  baseMaxSpeed: 0.5,
  rushSpeed: 5.4,
  crawlAmplitude: 0.5,
  directionChangeRate: 0.1,
  crawlPhaseIncrement: 0.05,
  timeLimitMs: 70_000,
  cursorThreatRadius: 140,
  cursorEscapeMultiplier: 2.2,
  teleportDistance: 0,
  mobileTapForgiveness: 12,
  introCountdownMs: 2_400,
  ghostFinaleDurationMs: 0,
  teleportUnlockCount: 0,
  touchBurstsToCapture: 2,
  speedBonusPerCollect: 0.1,
  fairyTtlMs: 7_000,
  fairyFadeAtMs: 3_500,
};

export const PROFILE_RULES: Record<DisplayProfile, ProfileRules> = {
  desktop: DESKTOP_RULES,
  mobile: MOBILE_RULES,
};

export function getProfileRules(profile: DisplayProfile) {
  return PROFILE_RULES[profile];
}