import { describe, expect, it, vi } from "vitest";
import { FAIRY_MORPH_EMOJI, drawFairyMorph, getFairyMorphFrame } from "./gameStageFairyPresentation";
import type { Fairy } from "@/game/types";

function createFairy(overrides: Partial<Fairy> = {}): Fairy {
  return {
    id: "fairy-1",
    x: 100,
    y: 120,
    targetX: 180,
    targetY: -80,
    controlX: 150,
    controlY: 40,
    createdAt: 1_700_000_000_000,
    lifeMs: 0,
    ttlMs: 7_000,
    morphDurationMs: 2_000,
    flyDurationMs: 1_500,
    trailFadeDurationMs: 3_500,
    hue: 120,
    state: "morphing",
    ...overrides,
  };
}

describe("gameStageFairyPresentation", () => {
  it("uses the standard fairy emoji as the final morph glyph", () => {
    expect(FAIRY_MORPH_EMOJI).toBe("🧚");
  });

  it("keeps morphing fairies anchored at the capture point", () => {
    const frame = getFairyMorphFrame(createFairy({ lifeMs: 600, state: "morphing" }), false);

    expect(frame.fairyPosition).toEqual({ x: 100, y: 120 });
    expect(frame.wormOpacity).toBeGreaterThan(0);
    expect(frame.trailSparkleCount).toBe(0);
  });

  it("moves flying fairies along the bezier path", () => {
    const frame = getFairyMorphFrame(createFairy({ lifeMs: 2_750, state: "flying" }), false);

    expect(frame.fairyPosition.x).toBeGreaterThan(100);
    expect(frame.fairyPosition.x).toBeLessThan(180);
    expect(frame.fairyPosition.y).toBeLessThan(120);
    expect(frame.trailSparkleCount).toBe(9);
    expect(frame.orbitSparkleCount).toBe(8);
  });

  it("disables orbit sparkles and reduces trail count in reduced motion", () => {
    const frame = getFairyMorphFrame(createFairy({ lifeMs: 4_000, state: "trailFading" }), true);

    expect(frame.orbitSparkleCount).toBe(0);
    expect(frame.trailSparkleCount).toBe(4);
    expect(frame.fairyOpacity).toBeLessThan(1);
  });

  it("draws the fairy emoji once the morph reveal is visible", () => {
    const fillText = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      fillText,
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: "",
      lineCap: "round",
      lineWidth: 0,
      strokeStyle: "",
      fillStyle: "",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
    } as unknown as CanvasRenderingContext2D;

    drawFairyMorph(context, createFairy({ lifeMs: 1_500, state: "morphing" }), false);

    expect(fillText).toHaveBeenCalledWith(FAIRY_MORPH_EMOJI, 0, 0);
  });
});