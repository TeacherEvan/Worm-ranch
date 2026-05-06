import type { DisplayProfile } from "./detection";

type BaseRules = {
  totalWorms: number;
  baseRadius: number;
  baseMaxSpeed: number;
  rushSpeed: number;
  timeLimitMs: number;
  influenceRadius: number;
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
  baseMaxSpeed: 0.95,
  rushSpeed: 4.4,
  timeLimitMs: 95_000,
  influenceRadius: 180,
  teleportDistance: 110,
  mobileTapForgiveness: 0,
  introCountdownMs: 2_400,
  ghostFinaleDurationMs: 9_000,
  teleportUnlockCount: 50,
  touchBurstsToCapture: 1,
  speedBonusPerCollect: 0.1,
  fairyTtlMs: 1_500,
  fairyFadeAtMs: 900,
};

export const MOBILE_RULES: MobileRules = {
  profile: "mobile",
  totalWorms: 10,
  baseRadius: 18,
  baseMaxSpeed: 1.15,
  rushSpeed: 5.4,
  timeLimitMs: 70_000,
  influenceRadius: 220,
  teleportDistance: 0,
  mobileTapForgiveness: 12,
  introCountdownMs: 2_400,
  ghostFinaleDurationMs: 0,
  teleportUnlockCount: 0,
  touchBurstsToCapture: 2,
  speedBonusPerCollect: 0.1,
  fairyTtlMs: 1_500,
  fairyFadeAtMs: 900,
};

export const PROFILE_RULES: Record<DisplayProfile, ProfileRules> = {
  desktop: DESKTOP_RULES,
  mobile: MOBILE_RULES,
};

export function getProfileRules(profile: DisplayProfile) {
  return PROFILE_RULES[profile];
}