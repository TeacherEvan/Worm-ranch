import { describe, expect, it, vi } from "vitest";
import { bindPointerControls, HOLD_MS, TouchGestureTracker } from "./gameStageGestures";

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

type FakePointerEvent = {
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
  timeStamp: number;
};

type FakeCanvas = {
  addEventListener: (name: string, listener: (event: FakePointerEvent) => void) => void;
  removeEventListener: (name: string, listener: (event: FakePointerEvent) => void) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
  setPointerCapture: (pointerId: number) => void;
};

function createFakeCanvas(): FakeCanvas & { counts: () => Record<string, number>; dispatch: (name: string, event: FakePointerEvent) => void } {
  const listeners = new Map<string, Array<(event: FakePointerEvent) => void>>();

  return {
    addEventListener: (name, listener) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
    },
    removeEventListener: (name, listener) => {
      const remaining = (listeners.get(name) ?? []).filter((candidate) => candidate !== listener);
      if (remaining.length > 0) {
        listeners.set(name, remaining);
      } else {
        listeners.delete(name);
      }
    },
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
    dispatch: (name, event) => {
      for (const listener of [...(listeners.get(name) ?? [])]) {
        listener(event);
      }
    },
    counts: () =>
      Object.fromEntries([...listeners.entries()].map(([name, handlers]) => [name, handlers.length])),
  };
}

describe("bindPointerControls", () => {
  const TOUCH_EVENT: FakePointerEvent = {
    clientX: 32,
    clientY: 48,
    pointerId: 1,
    pointerType: "touch",
    timeStamp: 1000,
  };

  const noop = () => {};

  function createDeps(overrides: Partial<Parameters<typeof bindPointerControls>[1]> = {}) {
    return {
      toLocalPoint: ({ clientX, clientY }: FakePointerEvent) => ({ x: clientX, y: clientY }),
      handlers: { onTap: noop, onSwipe: noop, onHold: noop },
      onHover: noop,
      onHoverEnd: noop,
      onDirectPress: noop,
      onGestureEnd: noop,
      ...overrides,
    } as unknown as Parameters<typeof bindPointerControls>[1];
  }

  it("registers exactly one canvas listener per pointer event", async () => {
    const { bindPointerControls } = await import("./gameStageGestures");
    const canvas = createFakeCanvas();

    const dispose = bindPointerControls(canvas as unknown as HTMLCanvasElement, createDeps());

    expect(canvas.counts()).toEqual({
      pointerdown: 1,
      pointermove: 1,
      pointerup: 1,
      pointercancel: 1,
      pointerleave: 1,
    });

    dispose();

    expect(canvas.counts()).toEqual({});
  });

  it("routes touch to the gesture tracker and mouse to the direct press", async () => {
    const { bindPointerControls } = await import("./gameStageGestures");
    const canvas = createFakeCanvas();
    const onDirectPress = vi.fn();
    const onTap = vi.fn();
    const onGestureEnd = vi.fn();
    const onHover = vi.fn();

    bindPointerControls(
      canvas as unknown as HTMLCanvasElement,
      createDeps({
        onDirectPress,
        onGestureEnd,
        onHover,
        handlers: { onTap, onSwipe: vi.fn(), onHold: vi.fn() },
      }),
    );

    canvas.dispatch("pointerdown", TOUCH_EVENT);
    canvas.dispatch("pointermove", { ...TOUCH_EVENT, timeStamp: 1050 });
    canvas.dispatch("pointerup", { ...TOUCH_EVENT, timeStamp: 1200 });

    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith({ x: 32, y: 48 });
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
    expect(onDirectPress).not.toHaveBeenCalled();

    canvas.dispatch("pointerdown", { ...TOUCH_EVENT, pointerId: 2, pointerType: "mouse" });

    expect(onDirectPress).toHaveBeenCalledTimes(1);
  });

  it("classifies a touch drag as a swipe instead of a tap", async () => {
    const { bindPointerControls } = await import("./gameStageGestures");
    const canvas = createFakeCanvas();
    const onTap = vi.fn();
    const onSwipe = vi.fn();

    bindPointerControls(
      canvas as unknown as HTMLCanvasElement,
      createDeps({ handlers: { onTap, onSwipe, onHold: vi.fn() } }),
    );

    canvas.dispatch("pointerdown", TOUCH_EVENT);
    canvas.dispatch("pointermove", { ...TOUCH_EVENT, clientX: 140, timeStamp: 1150 });
    canvas.dispatch("pointerup", { ...TOUCH_EVENT, clientX: 160, timeStamp: 1300 });

    expect(onTap).not.toHaveBeenCalled();
    expect(onSwipe).toHaveBeenCalledWith("next");
  });

  it("clears gesture state on touch cancel without acting", async () => {
    const { bindPointerControls } = await import("./gameStageGestures");
    const canvas = createFakeCanvas();
    const handlers = { onTap: vi.fn(), onSwipe: vi.fn(), onHold: vi.fn() };
    const onGestureEnd = vi.fn();

    bindPointerControls(
      canvas as unknown as HTMLCanvasElement,
      createDeps({ handlers, onGestureEnd }),
    );

    canvas.dispatch("pointerdown", TOUCH_EVENT);
    canvas.dispatch("pointercancel", TOUCH_EVENT);
    canvas.dispatch("pointerup", TOUCH_EVENT);

    expect(handlers.onTap).not.toHaveBeenCalled();
    expect(handlers.onSwipe).not.toHaveBeenCalled();
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it("fires a hold once the touch stays still for HOLD_MS", async () => {
    vi.useFakeTimers();

    const { bindPointerControls, HOLD_MS } = await import("./gameStageGestures");
    const canvas = createFakeCanvas();
    const onHold = vi.fn();

    bindPointerControls(
      canvas as unknown as HTMLCanvasElement,
      createDeps({ handlers: { onTap: vi.fn(), onSwipe: vi.fn(), onHold } }),
    );

    canvas.dispatch("pointerdown", TOUCH_EVENT);
    vi.advanceTimersByTime(HOLD_MS);

    expect(onHold).toHaveBeenCalledWith({ x: 32, y: 48 });

    vi.useRealTimers();
  });
});
