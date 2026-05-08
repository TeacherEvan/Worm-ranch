import { describe, expect, it, vi } from "vitest";
import {
  PSYCHEDELIC_WORM_BLINK_PERIOD_MS,
  getPsychedelicWormVisualFrame,
} from "./gameStageWormVisuals";
import { renderStage } from "./gameStagePresentation";
import { createWorld } from "@/game/engine";
import type { Worm } from "@/game/types";

function createWorm(overrides: Partial<Worm> = {}): Worm {
  return {
    id: "worm-psychedelic-1",
    x: 240,
    y: 180,
    vx: 1.2,
    vy: 0.8,
    direction: 0,
    crawlPhase: Math.PI / 3,
    radius: 10,
    hue: 168,
    wave: Math.PI / 5,
    visualVariant: "psychedelic",
    teleportsRemaining: 0,
    touchBursts: 0,
    state: "roaming",
    stateTimerMs: 0,
    ...overrides,
  };
}

type FakeGradient = {
  addColorStop: (offset: number, color: string) => void;
};

type FakeContext = Pick<
  CanvasRenderingContext2D,
  | "arc"
  | "beginPath"
  | "clearRect"
  | "createLinearGradient"
  | "ellipse"
  | "fill"
  | "fillRect"
  | "fillText"
  | "lineTo"
  | "moveTo"
  | "quadraticCurveTo"
  | "restore"
  | "rotate"
  | "save"
  | "scale"
  | "setLineDash"
  | "stroke"
  | "translate"
> & {
  fillStyle: CanvasFillStrokeStyles["fillStyle"];
  font: string;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineWidth: number;
  shadowBlur: number;
  shadowColor: string;
  strokeStyle: CanvasFillStrokeStyles["strokeStyle"];
  textAlign: CanvasTextAlign;
};

function createFakeContext() {
  const gradientStops: Array<{ offset: number; color: string }> = [];
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn<FakeGradient, [number, number, number, number]>(() => ({
      addColorStop: (offset, color) => {
        gradientStops.push({ offset, color });
      },
    })),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "#000",
    fillText: vi.fn(),
    font: "",
    globalAlpha: 1,
    lineCap: "butt" as CanvasLineCap,
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    shadowBlur: 0,
    shadowColor: "transparent",
    stroke: vi.fn(),
    strokeStyle: "#000",
    textAlign: "start" as CanvasTextAlign,
    translate: vi.fn(),
  } satisfies FakeContext;

  return { context, gradientStops };
}

function createRenderWorld(visualVariant: Worm["visualVariant"]) {
  const world = createWorld("desktop", 800, 540, {
    runtime: {
      random: () => 0.5,
      now: () => 1_700_000_000_000,
    },
  });

  world.countdownMs = 0;
  world.phase = "active";
  world.worms = [
    createWorm({
      visualVariant,
      x: 260,
      y: 220,
      state: "roaming",
    }),
  ];
  world.fairies = [];

  return world;
}

function renderAndCountEllipses(visualVariant: Worm["visualVariant"], reducedMotion: boolean) {
  const { context, gradientStops } = createFakeContext();

  renderStage(context, createRenderWorld(visualVariant), reducedMotion, [], null);

  return {
    ellipseCalls: context.ellipse.mock.calls.length,
    gradientStops,
  };
}

describe("gameStageWormVisuals", () => {
  it("routes psychedelic decoration draws through renderStage in both motion modes", () => {
    const performanceNowSpy = vi.spyOn(performance, "now").mockReturnValue(1_200);

    try {
      const standardFullMotion = renderAndCountEllipses("standard", false);
      const psychedelicFullMotion = renderAndCountEllipses("psychedelic", false);
      const standardReducedMotion = renderAndCountEllipses("standard", true);
      const psychedelicReducedMotion = renderAndCountEllipses("psychedelic", true);

      expect(standardFullMotion.gradientStops).toHaveLength(3);
      expect(psychedelicFullMotion.ellipseCalls - standardFullMotion.ellipseCalls).toBe(4);
      expect(psychedelicReducedMotion.ellipseCalls - standardReducedMotion.ellipseCalls).toBe(4);
    } finally {
      performanceNowSpy.mockRestore();
    }
  });

  it("caps full-motion psychedelic blinking to a slow localized glow", () => {
    const worm = createWorm();
    const frame = getPsychedelicWormVisualFrame(worm, false, 1_200);

    expect(PSYCHEDELIC_WORM_BLINK_PERIOD_MS).toBeGreaterThanOrEqual(4_000);
    expect(frame.auraStrokeAlpha).toBeGreaterThanOrEqual(0.34);
    expect(frame.auraStrokeAlpha).toBeLessThanOrEqual(0.58);
    expect(frame.auraFillAlpha).toBeLessThan(frame.auraStrokeAlpha);
    expect(frame.bandAlpha).toBeLessThanOrEqual(0.58);
    expect(frame.bandOffsets).toHaveLength(3);
    expect(frame.shadowBlur).toBeGreaterThan(0);
  });

  it("switches reduced motion to a stable neon frame with no blinking drift", () => {
    const worm = createWorm();
    const earlyFrame = getPsychedelicWormVisualFrame(worm, true, 500);
    const lateFrame = getPsychedelicWormVisualFrame(worm, true, 5_000);

    expect(lateFrame).toEqual(earlyFrame);
    expect(earlyFrame.shadowBlur).toBe(0);
    expect(earlyFrame.auraStrokeAlpha).toBeLessThanOrEqual(0.48);
    expect(earlyFrame.bandAlpha).toBeLessThanOrEqual(0.38);
  });
});