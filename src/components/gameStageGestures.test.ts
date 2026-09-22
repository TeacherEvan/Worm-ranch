import { describe, expect, it } from "vitest";
import { HOLD_MS, TouchGestureTracker } from "./gameStageGestures";

describe("TouchGestureTracker", () => {
  it("classifies a quick stationary touch as a tap", () => {
    const tracker = new TouchGestureTracker();
    tracker.onDown({ x: 100, y: 100 }, 1000);

    expect(tracker.onUp({ x: 102, y: 101 }, 1200)).toEqual({
      gesture: "tap",
      point: { x: 102, y: 101 },
    });
  });

  it("classifies fast horizontal motion as a swipe with direction", () => {
    const right = new TouchGestureTracker();
    right.onDown({ x: 100, y: 100 }, 1000);
    expect(right.onUp({ x: 140, y: 104 }, 1300)).toEqual({ gesture: "swipe", direction: "next" });

    const left = new TouchGestureTracker();
    left.onDown({ x: 100, y: 100 }, 1000);
    expect(left.onUp({ x: 60, y: 104 }, 1300)).toEqual({ gesture: "swipe", direction: "previous" });
  });

  it("ignores vertical-dominant motion and slow drags", () => {
    const vertical = new TouchGestureTracker();
    vertical.onDown({ x: 100, y: 100 }, 1000);
    expect(vertical.onUp({ x: 104, y: 160 }, 1300).gesture).toBe("none");

    const slow = new TouchGestureTracker();
    slow.onDown({ x: 100, y: 100 }, 1000);
    expect(slow.onUp({ x: 160, y: 100 }, 2000).gesture).toBe("none");
  });

  it("offers a hold candidate once while the touch stays put", () => {
    const tracker = new TouchGestureTracker();
    tracker.onDown({ x: 50, y: 50 }, 1000);

    expect(tracker.holdCandidate()).toEqual({ x: 50, y: 50 });
    expect(tracker.holdCandidate()).toBeNull();
    expect(tracker.onUp({ x: 50, y: 50 }, 1000 + HOLD_MS + 50).gesture).toBe("none");
  });

  it("withholds the hold when the touch wanders", () => {
    const tracker = new TouchGestureTracker();
    tracker.onDown({ x: 50, y: 50 }, 1000);
    tracker.onMove({ x: 90, y: 50 }, 1100);

    expect(tracker.holdCandidate()).toBeNull();
  });

  it("resets cleanly", () => {
    const tracker = new TouchGestureTracker();
    tracker.onDown({ x: 50, y: 50 }, 1000);
    tracker.reset();

    expect(tracker.active).toBe(false);
    expect(tracker.onUp({ x: 50, y: 50 }, 1100).gesture).toBe("none");
  });
});
