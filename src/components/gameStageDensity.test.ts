import { describe, expect, it } from "vitest";
import { getStagePresentation } from "./gameStagePhasePresentation";
import { createWorld, getSummary, startRound } from "@/game/engine";
import { getGameplayLevelRules } from "@/game/levels";

describe("stage density preference", () => {
  it("keeps the profile default when preference is auto", () => {
    const mobile = createWorld("mobile", 800, 540, { rules: getGameplayLevelRules("mobile", 1) });
    startRound(mobile);
    expect(getStagePresentation(getSummary(mobile), "mobile", 1, "auto").overlayDensity).toBe("compact");

    const desktop = createWorld("desktop", 800, 540, { rules: getGameplayLevelRules("desktop", 1) });
    startRound(desktop);
    expect(getStagePresentation(getSummary(desktop), "desktop", 1, "auto").overlayDensity).toBe("standard");
  });

  it("honors explicit focused/cinematic overrides on any profile", () => {
    const world = createWorld("desktop", 800, 540, { rules: getGameplayLevelRules("desktop", 1) });
    startRound(world);

    expect(getStagePresentation(getSummary(world), "desktop", 1, "focused").overlayDensity).toBe("focused");
    expect(getStagePresentation(getSummary(world), "desktop", 1, "cinematic").overlayDensity).toBe("cinematic");
  });

  it("adapts auto density to phase intensity", () => {
    const world = createWorld("desktop", 800, 540, { rules: getGameplayLevelRules("desktop", 1) });
    const base = getSummary(world);

    expect(getStagePresentation({ ...base, phase: "blinkBand" }, "desktop", 1, "auto").overlayDensity).toBe("focused");
    expect(getStagePresentation({ ...base, phase: "ghostFinale" }, "desktop", 1, "auto").overlayDensity).toBe("focused");
    expect(getStagePresentation({ ...base, phase: "gameOver" }, "desktop", 1, "auto").overlayDensity).toBe("cinematic");
    expect(getStagePresentation({ ...base, phase: "resolved" }, "desktop", 1, "auto").overlayDensity).toBe("cinematic");
  });

  it("exposes the within-second tick for the countdown slam", () => {
    // Fresh world: still in introCountdown (startRound fast-forwards past it).
    const world = createWorld("desktop", 800, 540, { rules: getGameplayLevelRules("desktop", 1) });

    const overlay = getStagePresentation(getSummary(world), "desktop", 1).countdownOverlay;
    expect(overlay).not.toBeNull();
    expect(overlay?.value).toMatch(/^\d+$/);
    expect(overlay?.tickMs).toBeGreaterThanOrEqual(0);
    expect(overlay?.tickMs).toBeLessThanOrEqual(999);
  });
});
