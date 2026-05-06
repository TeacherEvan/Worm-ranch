import { describe, expect, it } from "vitest";
import { areDisplaySnapshotsEqual, getFairyLifecycleEvents } from "@/lib/analytics";
import type { DisplaySnapshot } from "@/game/detection";
import type { Fairy } from "@/game/types";

function createSnapshot(overrides: Partial<DisplaySnapshot> = {}): DisplaySnapshot {
  return {
    profile: "desktop",
    pointer: "fine",
    width: 1280,
    height: 720,
    orientation: "landscape",
    dpr: 1,
    ...overrides,
  };
}

function createFairy(overrides: Partial<Fairy> = {}): Fairy {
  return {
    id: "fairy-1",
    wormId: "worm-1",
    x: 120,
    y: 180,
    targetX: 200,
    targetY: -100,
    controlX: 160,
    controlY: 90,
    createdAt: 1_700_000_000_000,
    lifeMs: 0,
    ttlMs: 7_000,
    morphDurationMs: 2_000,
    flyDurationMs: 1_500,
    trailFadeDurationMs: 3_500,
    hue: 140,
    state: "morphing",
    ...overrides,
  };
}

describe("analytics", () => {
  it("treats viewport size changes as a distinct detected display snapshot", () => {
    expect(areDisplaySnapshotsEqual(createSnapshot(), createSnapshot({ width: 1024 }))).toBe(false);
    expect(areDisplaySnapshotsEqual(createSnapshot(), createSnapshot({ height: 640 }))).toBe(false);
  });

  it("emits worm_morphed when a fairy leaves the morphing state", () => {
    const fairy = createFairy({ state: "flying" });
    const result = getFairyLifecycleEvents(new Map([[fairy.id, "morphing"]]), [fairy]);

    expect(result.events).toEqual([
      {
        name: "worm_morphed",
        details: {
          wormId: "worm-1",
          fairies: 1,
        },
      },
    ]);
    expect(result.nextStates.get(fairy.id)).toBe("flying");
  });

  it("flushes unfinished morph events when the round ends before the fairy advances", () => {
    const fairy = createFairy();
    const result = getFairyLifecycleEvents(new Map(), [fairy], { flushMorphing: true });

    expect(result.events).toEqual([
      {
        name: "worm_morphed",
        details: {
          wormId: "worm-1",
          fairies: 1,
        },
      },
    ]);
    expect(result.nextStates.get(fairy.id)).toBe("morphing");
  });
});