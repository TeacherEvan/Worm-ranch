import type { Worm } from "@/game/types";

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