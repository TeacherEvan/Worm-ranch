import { describe, expect, it } from "vitest";
import { DESKTOP_RULES, MOBILE_RULES } from "./rules";
import { STANDARD_WORM_COLORS } from "./wormColors";
import {
  applyAccuratePress,
  createWorld,
  findWormIdAtPoint,
  getSummary,
  setPointer,
  startContinuousMode,
  startRound,
  stopContinuousMode,
  stepWorld,
  triggerTouchRush,
} from "./engine";
import {
  createDeterministicOptions,
  createFixedRuntime,
  getSnapshot,
  createActiveDesktopWorld,
  createContinuousActiveWorld,
  getActiveWormCount,
  getActiveStandardWormIdByColor,
  captureDesktopWorms,
} from "./engineTestHelpers";

describe("engine.world", () => {
  it("createWorld initializes desktop runs with 100 roaming worms", () => {
    const snapshot = getSnapshot("desktop", 17);

    expect(snapshot.profile).toBe("desktop");
    expect(snapshot.phase).toBe("introCountdown");
    expect(snapshot.totalWorms).toBe(DESKTOP_RULES.totalWorms);
    expect(snapshot.firstThree.every((worm) => worm.state === "roaming")).toBe(true);
    expect(snapshot).toEqual(getSnapshot("desktop", 17));
  });

  it("createWorld initializes mobile runs with 10 roaming worms", () => {
    const snapshot = getSnapshot("mobile", 29);

    expect(snapshot.profile).toBe("mobile");
    expect(snapshot.phase).toBe("introCountdown");
    expect(snapshot.totalWorms).toBe(MOBILE_RULES.totalWorms);
    expect(snapshot.firstThree.every((worm) => worm.state === "roaming")).toBe(true);
    expect(snapshot).toEqual(getSnapshot("mobile", 29));
  });

  it("mobile first touch anywhere starts rush immediately", () => {
    const world = createWorld("mobile", 800, 540, createDeterministicOptions(41));
    startRound(world);

    triggerTouchRush(world, { x: 120, y: 140 });

    expect(world.rushTriggered).toBe(true);
  });
});
