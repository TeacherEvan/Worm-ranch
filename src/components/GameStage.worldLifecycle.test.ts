import { afterEach, describe, expect, it, vi } from "vitest";
import { createInteractionHarness, createKeyboardModuleMock } from "./gameStageTestHelpers";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("GameStage.worldLifecycle", () => {
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
    vi.doMock("@/components/gameStageKeyboard", () => createKeyboardModuleMock(() => null));
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
