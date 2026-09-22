import { describe, expect, it } from "vitest";
import {
  getActionHaptic,
  getCountdownSlam,
  getPressFeedback,
  getPulseColor,
  microFail,
  microGlowPulse,
  microPress,
  microSucceed,
  microTransition,
  triggerHaptic,
} from "@/lib/microInteractions";

describe("microInteractions", () => {
  it("suppresses press feedback under reduced motion", () => {
    expect(getPressFeedback(true)).toEqual({ scale: 1, durationMs: 0 });
    expect(getPressFeedback(false).scale).toBeLessThan(1);
  });

  it("maps pulse tones to neon tokens", () => {
    expect(getPulseColor("collect")).toContain("--neon-lime");
    expect(getPulseColor("critical")).toContain("--neon-pink");
  });

  it("disables countdown slam under reduced motion", () => {
    expect(getCountdownSlam(true)).toBeNull();
    expect(getCountdownSlam(false)).toContain("worm-ranch-slam");
  });

  it("never throws when haptics are unavailable", () => {
    expect(() => triggerHaptic(10, false)).not.toThrow();
    expect(() => triggerHaptic(10, true)).not.toThrow();
  });

  it("maps action kinds to spec haptic patterns", () => {
    expect(getActionHaptic("collect")).toBe(12);
    expect(getActionHaptic("teleport")).toEqual([8, 40, 8]);
    expect(getActionHaptic("tag")).toBe(6);
  });

  it("no-ops WAAPI primitives under reduced motion or without .animate", () => {
    const bare = {};
    for (const run of [microPress, microSucceed, microFail, microTransition, microGlowPulse]) {
      expect(run(bare, false)).toBeNull();
      expect(run(null, false)).toBeNull();
      expect(run({ animate: () => "played" }, true)).toBeNull();
    }
    expect(microPress({ animate: () => "played" }, false)).toBe("played");
  });
});
