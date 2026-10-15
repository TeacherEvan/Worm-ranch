import { afterEach, describe, expect, it, vi } from "vitest";
import { getStageActionEcho } from "./gameStageActionEcho";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("gameStageActionEcho", () => {
  it("maps a desktop blink into a short follow-up hint", () => {
    expect(getStageActionEcho({ kind: "teleport", wormId: "worm-1", immortal: false }, "desktop")).toEqual({
      key: "teleport",
      phaseChipLabel: "Slipped",
      mechanicValue: "Reset",
      mechanicActive: true,
      body: "Blink burned.",
      hint: "Wait for the flash, then click again.",
      ttlMs: 1200,
    });
  });
});
