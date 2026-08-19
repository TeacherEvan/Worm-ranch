import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameStage, getCappedCanvasDpr, getVisibleSummary } from "./GameStage";
import styles from "./GameStage.module.css";
import type { ActionResult } from "@/game/types";
import { createInteractionHarness } from "./gameStageTestHelpers";
import { findElementTextByClassName, findStatusPill } from "./gameStageTestHelpers";
import type { StageInteractionEvent } from "./gameStageTestHelpers";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("GameStage.interaction", () => {
  it("routes pointer misses through applyMiss without triggering stage audio", async () => {
    const harness = await createInteractionHarness({ pointerWormId: null });

    const pointerDown = harness.canvasListeners.get("pointerdown");
    if (!pointerDown) {
      throw new Error("expected pointerdown listener");
    }

    pointerDown({
      clientX: 32,
      clientY: 48,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(harness.applyMiss).toHaveBeenCalledTimes(1);
    expect(harness.applyAccuratePress).not.toHaveBeenCalled();
    expect(harness.audioController.play).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it("replaces the visible hint with a follow-up cue after a successful action", async () => {
    vi.resetModules();

    const canvasListeners = new Map<string, (event: StageInteractionEvent) => void>();
    const hookSlots: unknown[] = [];
    const effectSlots: Array<{ deps?: unknown[]; cleanup?: (() => void) | undefined }> = [];
    let hookIndex = 0;
    let refCalls = 0;

    const resetHookIndex = () => {
      hookIndex = 0;
      refCalls = 0;
    };

    const haveSameDeps = (left?: unknown[], right?: unknown[]) => {
      if (!left || !right || left.length !== right.length) {
        return false;
      }

      return left.every((value, index) => Object.is(value, right[index]));
    };

    const canvas = {
      addEventListener: vi.fn((name: string, listener: (event: StageInteractionEvent) => void) => {
        canvasListeners.set(name, listener);
      }),
      removeEventListener: vi.fn((name: string) => {
        canvasListeners.delete(name);
      }),
      focus: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 540 })),
      getContext: vi.fn(() => ({ setTransform: vi.fn() })),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
      width: 0,
      height: 0,
    };

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
          const slotIndex = hookIndex++;
          const currentEffect = effectSlots[slotIndex];
          if (currentEffect && haveSameDeps(deps, currentEffect.deps)) {
            return;
          }

          currentEffect?.cleanup?.();
          effectSlots[slotIndex] = {
            deps,
            cleanup: effect() ?? undefined,
          };
        },
        useEffectEvent: <T extends (...args: never[]) => unknown>(callback: T) => callback,
        useId: () => {
          const slotIndex = hookIndex++;
          hookSlots[slotIndex] ??= `game-stage-${slotIndex}`;
          return hookSlots[slotIndex] as string;
        },
        useMemo: <T,>(factory: () => T) => {
          const slotIndex = hookIndex++;
          const value = factory();
          hookSlots[slotIndex] = value;
          return value;
        },
        useRef: <T,>(initialValue: T) => {
          const slotIndex = hookIndex++;
          refCalls += 1;

          if (!(slotIndex in hookSlots)) {
            hookSlots[slotIndex] = {
              current: refCalls === 1 ? (canvas as T) : initialValue,
            };
          }

          return hookSlots[slotIndex] as { current: T };
        },
        useState: <T,>(initialValue: T | (() => T)) => {
          const slotIndex = hookIndex++;
          if (!(slotIndex in hookSlots)) {
            hookSlots[slotIndex] =
              typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
          }

          const setValue = (nextValue: T | ((value: T) => T)) => {
            const currentValue = hookSlots[slotIndex] as T;
            hookSlots[slotIndex] =
              typeof nextValue === "function" ? (nextValue as (value: T) => T)(currentValue) : nextValue;
          };

          return [hookSlots[slotIndex] as T, setValue] as const;
        },
      };
    });

    vi.doMock("@/components/gameStageKeyboard", () => ({
      getKeyboardStatus: () => "status",
      getKeyboardTargetId: vi.fn(() => "worm-1"),
    }));
    vi.doMock("@/components/gameStagePresentation", () => ({
      areSummariesEqual: () => true,
      renderStage: vi.fn(),
      stepFeedback: vi.fn(),
    }));
    vi.doMock("@/components/gameStageMotion", () => ({
      getMotionFeedback: () => ({ stageCue: "none" }),
    }));
    vi.doMock("@/components/gameStagePhasePresentation", () => ({
      getStagePresentation: () => ({
        overlayKey: "overlay",
        overlayDensity: "standard",
        phaseChipLabel: "Blinks arm in 5",
        copy: {
          title: "Level 1 · Live chase",
          body: "Roundup is live.",
          hint: "Click once to brand, again to bag.",
        },
        statusItems: [
          { id: "bagged", label: "Bagged", value: "0/12", active: false },
          { id: "clock", label: "Clock", value: "18s", active: false },
          { id: "mechanic", label: "Rush", value: "2 taps live", active: false },
        ],
      }),
    }));
    vi.doMock("@/lib/analytics", () => ({
      getFairyLifecycleEvents: () => ({ events: [], nextStates: new Map() }),
      getRoundEndedDetails: vi.fn(),
      getRoundTransitionEvents: () => [],
    }));
    vi.doMock("@/game/engine", () => ({
      applyAccuratePress: vi.fn(() => ({ kind: "tag", wormId: "worm-1", bursts: 1 })),
      applyMiss: vi.fn(() => ({ kind: "miss" })),
      createWorld: vi.fn(() => ({
        worms: [{ id: "worm-1", x: 120, y: 90, radius: 18 }],
        fairies: [],
        roundResult: null,
      })),
      findWormIdAtPoint: vi.fn(() => "worm-1"),
      getSummary: vi.fn(() => ({
        profile: "mobile",
        phase: "activeChase",
        collected: 0,
        remaining: 1,
        fairies: 0,
        timerMs: 1000,
        continuousActive: false,
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 0,
        finalWormActive: false,
        rushTriggered: true,
      })),
      resizeWorld: vi.fn(),
      setPointer: vi.fn(),
      startContinuousMode: vi.fn(),
      startRound: vi.fn(),
      stepWorld: vi.fn(),
      stopContinuousMode: vi.fn(),
      triggerTouchRush: vi.fn(),
    }));
    vi.doMock("@/components/gameStageAudio", () => ({
      createGameStageAudioController: vi.fn(() => ({
        dispose: vi.fn(),
        play: vi.fn(),
      })),
    }));
    vi.doMock("@/game/levels", () => ({
      getGameplayLevelRules: vi.fn(() => ({ touchBurstsToCapture: 2 })),
    }));

    const windowMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      clearTimeout: vi.fn(),
      devicePixelRatio: 1,
      requestAnimationFrame: vi.fn(() => 1),
      setTimeout: vi.fn(() => 1),
    };

    vi.stubGlobal("window", windowMock);

    const { GameStage: InteractiveGameStage } = await import("./GameStage");
    const props: Parameters<typeof InteractiveGameStage>[0] = {
      level: 1,
      profile: "mobile" as const,
      mode: "standard",
      reducedMotion: false,
      onSummaryChange: vi.fn(),
      onRoundEnd: vi.fn(),
      onEvent: vi.fn(),
    };

    resetHookIndex();
    InteractiveGameStage(props);

    const pointerDown = canvasListeners.get("pointerdown");
    if (!pointerDown) {
      throw new Error("expected pointerdown listener");
    }

    pointerDown({
      clientX: 32,
      clientY: 48,
      pointerId: 1,
      pointerType: "mouse",
    });

    resetHookIndex();
    const rerenderedTree = InteractiveGameStage(props);

    expect(findElementTextByClassName(rerenderedTree, styles.hint)).toBe("Stay on this worm until it bags.");
    expect(findElementTextByClassName(rerenderedTree, styles.phaseBadge)).toBe("Tagged");

    const mechanicPill = findStatusPill(rerenderedTree, "Rush");
    expect(mechanicPill?.value).toBe("Hold");
    expect(mechanicPill?.className).toContain(styles.statusPillActive);
  });

  it("plays stage audio exactly once for each successful pointer and keyboard action", async () => {
    const harness = await createInteractionHarness({
      keyboardTargetId: "worm-1",
      pointerWormId: "worm-1",
      pressResults: [
        { kind: "collect", wormId: "worm-1", collected: 1 },
        { kind: "teleport", wormId: "worm-1", immortal: false },
      ],
    });

    const pointerDown = harness.canvasListeners.get("pointerdown");
    const keyDown = harness.canvasListeners.get("keydown");
    if (!pointerDown || !keyDown) {
      throw new Error("expected stage interaction listeners");
    }

    pointerDown({
      clientX: 32,
      clientY: 48,
      pointerId: 1,
      pointerType: "mouse",
    });
    keyDown({
      key: "Enter",
      preventDefault: vi.fn(),
      repeat: false,
    });

    expect(harness.applyMiss).not.toHaveBeenCalled();
    expect(harness.applyAccuratePress).toHaveBeenCalledTimes(2);
    expect(harness.audioController.play).toHaveBeenCalledTimes(2);
    expect(harness.audioController.play).toHaveBeenNthCalledWith(1, {
      kind: "collect",
      wormId: "worm-1",
      collected: 1,
    });
    expect(harness.audioController.play).toHaveBeenNthCalledWith(2, {
      kind: "teleport",
      wormId: "worm-1",
      immortal: false,
    });

    harness.cleanup();
  });

  it("creates a fresh audio controller for each stage instance and disposes it on cleanup", async () => {
    const firstHarness = await createInteractionHarness();

    expect(firstHarness.createGameStageAudioController).toHaveBeenCalledTimes(1);

    firstHarness.cleanup();

    expect(firstHarness.audioController.dispose).toHaveBeenCalledTimes(1);

    vi.resetModules();

    const secondHarness = await createInteractionHarness();

    expect(secondHarness.createGameStageAudioController).toHaveBeenCalledTimes(1);
    expect(secondHarness.audioController).not.toBe(firstHarness.audioController);

    secondHarness.cleanup();
  });

  it("reuses the lazily created world on initial mount", async () => {
    const harness = await createInteractionHarness();

    expect(harness.createWorld).toHaveBeenCalledTimes(1);
    expect(harness.startRound).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it("does not recreate an unused initial world during rerenders", async () => {
    vi.resetModules();

    const hookSlots: unknown[] = [];
    let hookIndex = 0;
    const resetHookIndex = () => {
      hookIndex = 0;
    };
    const createWorld = vi.fn(() => ({
      worms: [],
      fairies: [],
      roundResult: null,
    }));

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useEffectEvent: <T extends (...args: never[]) => unknown>(callback: T) => callback,
        useId: () => "game-stage-stable-id",
        useMemo: <T,>(factory: () => T) => factory(),
        useRef: <T,>(initialValue: T) => {
          const slotIndex = hookIndex++;
          const existingRef = hookSlots[slotIndex] as { current: T } | undefined;
          if (existingRef) {
            return existingRef;
          }

          const ref = { current: initialValue };
          hookSlots[slotIndex] = ref;
          return ref;
        },
        useState: <T,>(initialValue: T | (() => T)) => {
          const slotIndex = hookIndex++;
          if (!(slotIndex in hookSlots)) {
            hookSlots[slotIndex] =
              typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
          }

          const setValue = (nextValue: T | ((value: T) => T)) => {
            const currentValue = hookSlots[slotIndex] as T;
            hookSlots[slotIndex] =
              typeof nextValue === "function" ? (nextValue as (value: T) => T)(currentValue) : nextValue;
          };

          return [hookSlots[slotIndex] as T, setValue] as const;
        },
      };
    });

    vi.doMock("@/components/gameStageAudio", () => ({
      createGameStageAudioController: vi.fn(() => ({
        dispose: vi.fn(),
        play: vi.fn(),
      })),
    }));
    vi.doMock("@/components/gameStageKeyboard", () => ({
      getKeyboardStatus: () => "status",
      getKeyboardTargetId: () => null,
    }));
    vi.doMock("@/components/gameStagePresentation", () => ({
      areSummariesEqual: () => true,
      renderStage: vi.fn(),
      stepFeedback: vi.fn(),
    }));
    vi.doMock("@/components/gameStageMotion", () => ({
      getMotionFeedback: () => ({ stageCue: "none" }),
    }));
    vi.doMock("@/components/gameStagePhasePresentation", () => ({
      getStagePresentation: () => ({
        overlayKey: "overlay",
        overlayDensity: "balanced",
        phaseChipLabel: "Level 1",
        copy: {
          title: "Round starts on zero.",
          body: "Body",
          hint: "Hint",
        },
        statusItems: [],
      }),
    }));
    vi.doMock("@/lib/analytics", () => ({
      getFairyLifecycleEvents: () => ({ events: [], nextStates: new Map() }),
      getRoundEndedDetails: vi.fn(),
      getRoundTransitionEvents: () => [],
    }));
    vi.doMock("@/game/engine", () => ({
      applyAccuratePress: vi.fn(),
      applyMiss: vi.fn(),
      createWorld,
      findWormIdAtPoint: vi.fn(),
      getSummary: vi.fn(() => ({
        profile: "desktop",
        phase: "activeChase",
        collected: 0,
        remaining: 0,
        fairies: 0,
        timerMs: 1000,
        continuousActive: false,
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 0,
        finalWormActive: false,
        rushTriggered: false,
      })),
      resizeWorld: vi.fn(),
      setPointer: vi.fn(),
      startContinuousMode: vi.fn(),
      startRound: vi.fn(),
      stepWorld: vi.fn(),
      stopContinuousMode: vi.fn(),
      triggerTouchRush: vi.fn(),
    }));
    vi.doMock("@/game/levels", () => ({
      getGameplayLevelRules: vi.fn(() => ({})),
    }));

    const { GameStage: RerenderableGameStage } = await import("./GameStage");
    const props: Parameters<typeof RerenderableGameStage>[0] = {
      level: 1,
      profile: "desktop" as const,
      mode: "standard",
      reducedMotion: false,
      onSummaryChange: vi.fn(),
      onRoundEnd: vi.fn(),
      onEvent: vi.fn(),
    };

    resetHookIndex();
    RerenderableGameStage(props);

    expect(createWorld).toHaveBeenCalledTimes(1);

    resetHookIndex();
    RerenderableGameStage(props);

    expect(createWorld).toHaveBeenCalledTimes(1);
  });
});
