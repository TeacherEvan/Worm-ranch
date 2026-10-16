import { describe, expect, it, vi } from "vitest";
import type { GameWorld } from "@/game/types";
import { handleStageKeyDown, type StageKeyDeps } from "./gameStageKeyboard";

function createWorldStub(worms: { id: string }[] = [{ id: "worm-1" }, { id: "worm-2" }]): GameWorld {
  return { worms } as unknown as GameWorld;
}

function createKeyEvent(key: string, overrides: Partial<KeyboardEvent> = {}) {
  const preventDefault = vi.fn();
  return {
    event: { key, repeat: false, preventDefault, ...overrides } as unknown as KeyboardEvent,
    preventDefault,
  };
}

describe("handleStageKeyDown", () => {
  it("moves the keyboard target for arrow keys and consumes them", () => {
    const moveKeyboardTarget = vi.fn<(mode: "next" | "previous" | "first" | "last") => void>();
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub() },
      keyboardTargetRef: { current: "worm-1" },
      moveKeyboardTarget,
      selectKeyboardTarget: vi.fn(),
      applyToTarget: vi.fn(),
    };

    expect(handleStageKeyDown(createKeyEvent("ArrowRight").event, deps)).toBe(true);
    expect(handleStageKeyDown(createKeyEvent("ArrowDown").event, deps)).toBe(true);
    expect(handleStageKeyDown(createKeyEvent("ArrowLeft").event, deps)).toBe(true);
    expect(handleStageKeyDown(createKeyEvent("ArrowUp").event, deps)).toBe(true);

    expect(moveKeyboardTarget.mock.calls).toEqual([["next"], ["next"], ["previous"], ["previous"]]);
  });

  it("jumps to the first and last worm for Home and End", () => {
    const moveKeyboardTarget = vi.fn<(mode: "next" | "previous" | "first" | "last") => void>();
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub() },
      keyboardTargetRef: { current: "worm-1" },
      moveKeyboardTarget,
      selectKeyboardTarget: vi.fn(),
      applyToTarget: vi.fn(),
    };

    expect(handleStageKeyDown(createKeyEvent("Home").event, deps)).toBe(true);
    expect(handleStageKeyDown(createKeyEvent("End").event, deps)).toBe(true);

    expect(moveKeyboardTarget.mock.calls).toEqual([["first"], ["last"]]);
  });

  it("acts on the preserved keyboard target for Enter and Space", () => {
    const selectKeyboardTarget = vi.fn<(id: string | null) => void>();
    const applyToTarget = vi.fn<(id: string) => void>();
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub() },
      keyboardTargetRef: { current: "worm-2" },
      moveKeyboardTarget: vi.fn(),
      selectKeyboardTarget,
      applyToTarget,
    };

    expect(handleStageKeyDown(createKeyEvent("Enter").event, deps)).toBe(true);
    expect(handleStageKeyDown(createKeyEvent(" ").event, deps)).toBe(true);

    expect(selectKeyboardTarget.mock.calls).toEqual([["worm-2"], ["worm-2"]]);
    expect(applyToTarget.mock.calls).toEqual([["worm-2"], ["worm-2"]]);
  });

  it("ignores repeated activation keys", () => {
    const applyToTarget = vi.fn<(id: string) => void>();
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub() },
      keyboardTargetRef: { current: "worm-1" },
      moveKeyboardTarget: vi.fn(),
      selectKeyboardTarget: vi.fn(),
      applyToTarget,
    };

    expect(handleStageKeyDown(createKeyEvent("Enter", { repeat: true }).event, deps)).toBe(false);

    expect(applyToTarget).not.toHaveBeenCalled();
  });

  it("consumes Enter without acting when no worm is targeted", () => {
    const applyToTarget = vi.fn<(id: string) => void>();
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub([]) },
      keyboardTargetRef: { current: "worm-1" },
      moveKeyboardTarget: vi.fn(),
      selectKeyboardTarget: vi.fn(),
      applyToTarget,
    };

    expect(handleStageKeyDown(createKeyEvent(" ").event, deps)).toBe(true);

    expect(applyToTarget).not.toHaveBeenCalled();
  });

  it("prevents default scroll behavior for consumed keys only", () => {
    const deps: StageKeyDeps = {
      worldRef: { current: createWorldStub() },
      keyboardTargetRef: { current: "worm-1" },
      moveKeyboardTarget: vi.fn(),
      selectKeyboardTarget: vi.fn(),
      applyToTarget: vi.fn(),
    };

    const arrow = createKeyEvent("ArrowRight");
    handleStageKeyDown(arrow.event, deps);
    expect(arrow.preventDefault).toHaveBeenCalledTimes(1);

    const enter = createKeyEvent("Enter");
    handleStageKeyDown(enter.event, deps);
    expect(enter.preventDefault).toHaveBeenCalledTimes(1);

    const ignored = createKeyEvent("Tab");
    expect(handleStageKeyDown(ignored.event, deps)).toBe(false);
    expect(ignored.preventDefault).not.toHaveBeenCalled();
  });
});
