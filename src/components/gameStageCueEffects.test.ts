import { describe, expect, it } from "vitest";
import {
  getCueEffect,
  getBaggedBumpEffect,
  getRemainingDipEffect,
  getFairyBurstEffect,
  getTimerAlertEffect,
} from "./gameStageMotion";
import {
  createBurst,
  createBurstFromTone,
  stepParticles,
  createReducedFlash,
  stepReducedFlash,
  drawReducedFlash,
} from "./gameStageParticles";

describe("cue → effect mapping", () => {
  it("returns a full non-null effect for each stage cue at full motion (clock-critical has no dilation)", () => {
    const cues = [
      "round-live",
      "rush-start",
      "blink-armed",
      "final-outlaw",
      "clock-critical",
    ] as const;

    for (const cue of cues) {
      const effect = getCueEffect(cue, false);
      expect(effect.screenShake).not.toBeNull();
      expect(effect.retroOverlay).not.toBeNull();
      expect(effect.particleTone).not.toBeNull();
      expect(effect.particleCount).toBeGreaterThan(0);
      expect(effect.flashColor).toMatch(/^#/);
    }

    // clock-critical intentionally omits time dilation.
    expect(getCueEffect("clock-critical", false).timeDilation).toBeNull();
    // The others keep dilation.
    for (const cue of ["round-live", "rush-start", "blink-armed", "final-outlaw"] as const) {
      expect(getCueEffect(cue, false).timeDilation).not.toBeNull();
    }
  });

  it("returns the none cue with no effects", () => {
    const effect = getCueEffect("none", false);
    expect(effect).toEqual({
      screenShake: null,
      timeDilation: null,
      retroOverlay: null,
      particleTone: null,
      particleCount: 0,
      flashColor: null,
    });
  });

  it("collapses every effect under reduced motion", () => {
    const effect = getCueEffect("final-outlaw", true);
    expect(effect.screenShake).toBeNull();
    expect(effect.timeDilation).toBeNull();
    expect(effect.retroOverlay).toBeNull();
    expect(effect.particleTone).toBeNull();
    expect(effect.particleCount).toBe(0);
    expect(effect.flashColor).toMatch(/^#/);
  });

  it("derives the single flash color from the cue family", () => {
    expect(getCueEffect("rush-start", true).flashColor).toBe("#F07E43");
    expect(getBaggedBumpEffect(true).flashColor).toBe("#C7F36B");
    expect(getRemainingDipEffect(true).flashColor).toBe("#FF3366");
    expect(getFairyBurstEffect(true).flashColor).toBe("#BC9FFF");
    expect(getTimerAlertEffect(true).flashColor).toBe("#00F5FF");
  });

  it("matches particle tone to the event family", () => {
    expect(getCueEffect("blink-armed", false).particleTone).toBe("teleport");
    expect(getCueEffect("clock-critical", false).particleTone).toBe("countdown");
    expect(getBaggedBumpEffect(false).particleTone).toBe("collect");
    expect(getFairyBurstEffect(false).particleTone).toBe("fairy");
  });
});

describe("particle burst system", () => {
  it("spawns exactly the requested count", () => {
    const burst = createBurst({
      count: 15,
      x: 100,
      y: 100,
      baseColor: "#C7F36B",
      colorVariance: 0.15,
      speedRange: [0.1, 0.3],
      sizeRange: [2, 4],
      lifeRange: [200, 300],
      gravity: 0.0001,
      spread: Math.PI,
      direction: 0,
      shapes: ["square", "circle"],
    });
    expect(burst).toHaveLength(15);
  });

  it("clamps all particles within the configured size band", () => {
    const burst = createBurstFromTone("collect", 50, 50);
    for (const p of burst) {
      expect(p.size).toBeGreaterThanOrEqual(2);
      expect(p.size).toBeLessThanOrEqual(4);
    }
  });

  it("colors every particle as a valid hex string", () => {
    const burst = createBurstFromTone("outlaw", 0, 0);
    for (const p of burst) {
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("steps particles forward without resurrecting expired ones", () => {
    const burst = createBurstFromTone("rush", 10, 10);
    // Advance well past the longest lifetime.
    const alive = stepParticles(burst, 10_000);
    expect(alive).toHaveLength(0);
  });

  it("keeps live particles moving and aging", () => {
    const burst = createBurstFromTone("collect", 0, 0);
    const before = burst.map((p) => ({ x: p.x, life: p.life }));
    const alive = stepParticles(burst, 16);
    expect(alive.length).toBeGreaterThan(0);
    for (let i = 0; i < alive.length; i++) {
      expect(alive[i].life).toBeGreaterThan(before[i].life);
      expect(alive[i].x).not.toBe(before[i].x);
    }
  });

  it("applies per-tone gravity — fairy particles drift upward, teleport particles have zero drift", () => {
    // fairy tone: gravity -0.00008 (upward) — vy should decrease (more negative) after step
    const fairy = createBurstFromTone("fairy", 200, 200);
    const fairyInitialVy = fairy.map((p) => p.vy);
    const fairyAfter = stepParticles(fairy, 100);
    for (let i = 0; i < fairyAfter.length; i++) {
      expect(fairyAfter[i].vy).toBeLessThanOrEqual(fairyInitialVy[i]);
    }

    // teleport tone: gravity 0 — vy unchanged after step
    const teleport = createBurstFromTone("teleport", 200, 200);
    const teleportInitialVy = teleport.map((p) => p.vy);
    const teleportAfter = stepParticles(teleport, 100);
    for (let i = 0; i < teleportAfter.length; i++) {
      expect(teleportAfter[i].vy).toBeCloseTo(teleportInitialVy[i], 5);
    }
  });
});

describe("reduced-motion flash", () => {
  it("advances and expires", () => {
    const flash = createReducedFlash(5, 5, "#00F5FF");
    expect(stepReducedFlash(flash, 50)).toBe(flash);
    // Past maxLife (180ms) → null.
    expect(stepReducedFlash(flash, 200)).toBeNull();
  });

  it("draws without throwing on a stub context", () => {
    const ctx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      globalAlpha: 1,
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const flash = createReducedFlash(0, 0, "#FF3366");
    expect(() => drawReducedFlash(ctx, flash)).not.toThrow();
  });
});
