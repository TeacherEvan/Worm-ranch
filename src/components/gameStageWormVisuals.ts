import type { Worm } from "@/game/types";
import type { WormColorId } from "@/game/wormColors";

export const PSYCHEDELIC_WORM_BLINK_PERIOD_MS = 4_200;

const BAND_BASE_OFFSETS = [-0.3, 0.04, 0.36] as const;
const BAND_HUE_OFFSETS = [18, 106, 178] as const;

export type PsychedelicWormVisualFrame = {
  auraFillAlpha: number;
  auraHue: number;
  auraRadiusScale: number;
  auraStrokeAlpha: number;
  bandAlpha: number;
  bandHues: number[];
  bandOffsets: number[];
  bandYOffsets: number[];
  shadowBlur: number;
};

export type StandardWormVisualFrame = {
  bodyStroke: string;
  headFill: string;
  headShadowFill: string;
  shadowBlur: number;
  shadowColor: string;
};

const STANDARD_WORM_VISUALS: Record<WormColorId, StandardWormVisualFrame> = {
  "sun-yellow": {
    bodyStroke: "hsl(48 96% 58%)",
    headFill: "hsl(47 100% 74%)",
    headShadowFill: "rgba(66, 52, 12, 0.62)",
    shadowBlur: 6,
    shadowColor: "rgba(255, 212, 74, 0.28)",
  },
  "fence-red": {
    bodyStroke: "hsl(8 88% 54%)",
    headFill: "hsl(10 100% 72%)",
    headShadowFill: "rgba(72, 18, 15, 0.62)",
    shadowBlur: 6,
    shadowColor: "rgba(255, 122, 101, 0.26)",
  },
  "pond-blue": {
    bodyStroke: "hsl(204 90% 54%)",
    headFill: "hsl(199 100% 74%)",
    headShadowFill: "rgba(11, 26, 54, 0.66)",
    shadowBlur: 7,
    shadowColor: "rgba(103, 195, 255, 0.28)",
  },
  "clover-green": {
    bodyStroke: "hsl(132 64% 42%)",
    headFill: "hsl(131 72% 62%)",
    headShadowFill: "rgba(12, 42, 24, 0.64)",
    shadowBlur: 6,
    shadowColor: "rgba(123, 221, 135, 0.24)",
  },
};

export function getStandardWormVisualFrame(worm: Worm): StandardWormVisualFrame | null {
  if (worm.visualVariant !== "standard" || !worm.colorId) {
    return null;
  }

  return STANDARD_WORM_VISUALS[worm.colorId];
}

export function getPsychedelicWormVisualFrame(
  worm: Worm,
  reducedMotion: boolean,
  frameNow: number,
): PsychedelicWormVisualFrame {
  if (reducedMotion) {
    return {
      auraFillAlpha: 0.18,
      auraHue: wrapHue(worm.hue + 84),
      auraRadiusScale: 2.16,
      auraStrokeAlpha: 0.44,
      bandAlpha: 0.34,
      bandHues: BAND_HUE_OFFSETS.map((offset) => wrapHue(worm.hue + offset)),
      bandOffsets: [...BAND_BASE_OFFSETS],
      bandYOffsets: [0, 0, 0],
      shadowBlur: 0,
    };
  }

  const blinkPhase = ((frameNow % PSYCHEDELIC_WORM_BLINK_PERIOD_MS) / PSYCHEDELIC_WORM_BLINK_PERIOD_MS) * Math.PI * 2;
  const blink = (Math.sin(blinkPhase + worm.wave) + 1) / 2;
  const drift = Math.sin(blinkPhase * 0.7 + worm.crawlPhase) * 0.12;

  return {
    auraFillAlpha: 0.14 + blink * 0.08,
    auraHue: wrapHue(worm.hue + 72 + blink * 24),
    auraRadiusScale: 2.08 + blink * 0.26,
    auraStrokeAlpha: 0.34 + blink * 0.24,
    bandAlpha: 0.3 + blink * 0.28,
    bandHues: BAND_HUE_OFFSETS.map((offset, index) => wrapHue(worm.hue + offset + blink * 22 + index * 6)),
    bandOffsets: [...BAND_BASE_OFFSETS],
    bandYOffsets: BAND_BASE_OFFSETS.map((_, index) => Math.sin(blinkPhase * 0.85 + worm.wave + index * 0.9) * 0.12 + drift),
    shadowBlur: 12 + blink * 4,
  };
}

function wrapHue(value: number) {
  return ((value % 360) + 360) % 360;
}