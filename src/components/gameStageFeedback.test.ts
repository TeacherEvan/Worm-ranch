import { describe, expect, it } from "vitest";
import { createStageFeedbackItem, getActionParticleBurst } from "./gameStageFeedback";
import type { Worm } from "@/game/types";

const stubWorm: Worm = {
  id: "worm-test",
  x: 100,
  y: 150,
  radius: 20,
  vx: 0,
  vy: 0,
  wave: 0,
  direction: 0,
  hue: 120,
  crawlPhase: 0,
  colorId: "clover-green",
  visualVariant: "standard",
  touchBursts: 0,
  teleportsRemaining: 2,
  state: "roaming",
  stateTimerMs: 0,
};

describe("gameStageFeedback", () => {
  describe("createStageFeedbackItem", () => {
    it("creates BAGGED feedback for collect results", () => {
      const item = createStageFeedbackItem({ kind: "collect", wormId: "worm-test", collected: 5 }, stubWorm, 1);
      expect(item.id).toBe(1);
      expect(item.label).toBe("BAGGED");
      expect(item.tone).toBe("collect");
      expect(item.ttlMs).toBe(920);
      expect(item.y).toBe(150 - 20 * 1.8);
    });

    it("creates TAGGED feedback for tag results", () => {
      const item = createStageFeedbackItem({ kind: "tag", wormId: "worm-test", bursts: 1 }, stubWorm, 2);
      expect(item.id).toBe(2);
      expect(item.label).toBe("TAGGED");
      expect(item.tone).toBe("tag");
      expect(item.ttlMs).toBe(840);
    });

    it("creates BLINK feedback for non-immortal teleport results", () => {
      const item = createStageFeedbackItem({ kind: "teleport", wormId: "worm-test", immortal: false }, stubWorm, 3);
      expect(item.label).toBe("BLINK");
      expect(item.tone).toBe("teleport");
      expect(item.ttlMs).toBe(880);
    });

    it("creates OUTLAW feedback for immortal teleport results", () => {
      const item = createStageFeedbackItem({ kind: "teleport", wormId: "worm-test", immortal: true }, stubWorm, 4);
      expect(item.label).toBe("OUTLAW");
      expect(item.tone).toBe("final");
      expect(item.ttlMs).toBe(880);
    });
  });

  describe("getActionParticleBurst", () => {
    it("emits collect tone particles for collect action", () => {
      const particles = getActionParticleBurst({ kind: "collect", wormId: "worm-test", collected: 1 }, stubWorm);
      expect(particles.length).toBeGreaterThan(0);
      expect(particles[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("emits tag tone particles for tag action", () => {
      const particles = getActionParticleBurst({ kind: "tag", wormId: "worm-test", bursts: 1 }, stubWorm);
      expect(particles.length).toBeGreaterThan(0);
    });

    it("emits teleport tone for standard teleport and outlaw tone for immortal teleport", () => {
      const teleport = getActionParticleBurst({ kind: "teleport", wormId: "worm-test", immortal: false }, stubWorm);
      const outlaw = getActionParticleBurst({ kind: "teleport", wormId: "worm-test", immortal: true }, stubWorm);
      expect(teleport.length).toBeGreaterThan(0);
      expect(outlaw.length).toBeGreaterThan(0);
    });

    it("returns empty array for miss and ignored", () => {
      expect(getActionParticleBurst({ kind: "miss" }, stubWorm)).toEqual([]);
      expect(getActionParticleBurst({ kind: "ignored" }, stubWorm)).toEqual([]);
    });
  });
});
