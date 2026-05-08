import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameStage } from "./GameStage";
import { getStageActionEcho } from "./gameStageActionEcho";
import styles from "./GameStage.module.css";
import type { ActionResult } from "@/game/types";

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

type InteractionHarnessOptions = {
  keyboardTargetId?: string | null;
  pointerWormId?: string | null;
  pressResult?: ActionResult;
  pressResults?: ActionResult[];
};

type StageInteractionEvent = {
  clientX?: number;
  clientY?: number;
  key?: string;
  pointerId?: number;
  pointerType?: string;
  preventDefault?: () => void;
  repeat?: boolean;
};

function flattenElementText(node: unknown): string {
  if (Array.isArray(node)) {
    return node.map((child) => flattenElementText(child)).join("");
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!node || typeof node !== "object" || !("props" in node)) {
    return "";
  }

  return flattenElementText((node as { props: { children?: unknown } }).props.children);
}

function findElementTextByClassName(node: unknown, className: string): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementTextByClassName(child, className);
      if (match !== null) {
        return match;
      }
    }

    return null;
  }

  if (!node || typeof node !== "object" || !("props" in node)) {
    return null;
  }

  const element = node as {
    props: {
      children?: unknown;
      className?: string;
    };
  };

  if (element.props.className === className || element.props.className?.includes(className)) {
    return flattenElementText(element.props.children).trim();
  }

  return findElementTextByClassName(element.props.children, className);
}

function findStatusPill(node: unknown, label: string) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findStatusPill(child, label);
      if (match) {
        return match;
      }
    }

    return null;
  }

  if (!node || typeof node !== "object" || !("props" in node)) {
    return null;
  }

  const element = node as {
    props: {
      children?: unknown;
      className?: string;
    };
  };

  if (element.props.className?.includes(styles.statusPill)) {
    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const pillLabel = children.find((child) =>
      Boolean(
        child &&
          typeof child === "object" &&
          "props" in child &&
          (child as { props?: { className?: string } }).props?.className === styles.statusLabel,
      ),
    );
    const pillValue = children.find((child) =>
      Boolean(
        child &&
          typeof child === "object" &&
          "props" in child &&
          (child as { props?: { className?: string } }).props?.className === styles.statusValue,
      ),
    );

    if (pillLabel && flattenElementText(pillLabel) === label) {
      return {
        className: element.props.className,
        value: pillValue ? flattenElementText(pillValue).trim() : null,
      };
    }
  }

  return findStatusPill(element.props.children, label);
}

async function createInteractionHarness(options: InteractionHarnessOptions = {}) {
  const cleanupFns: Array<(() => void) | undefined> = [];
  const canvasListeners = new Map<string, (event: StageInteractionEvent) => void>();
  const windowListeners = new Map<string, EventListener[]>();
  const world = {
    worms: [{ id: "worm-1", x: 120, y: 90, radius: 18 }],
    fairies: [],
    roundResult: null,
  } as const;
  const applyMiss = vi.fn<ActionResult, [unknown]>(() => ({ kind: "miss" }));
  const queuedPressResults = [...(options.pressResults ?? [])];
  const applyAccuratePress = vi.fn<ActionResult, [unknown, string]>(() => {
    const nextResult = queuedPressResults.shift();
    return nextResult ?? options.pressResult ?? { kind: "tag", wormId: "worm-1", bursts: 1 };
  });
  const createWorld = vi.fn(() => world);
  const audioController = {
    getCycleStep: vi.fn(() => 0),
    play: vi.fn(() => ({ cue: "gunshot", nextCycleStep: 1 })),
    dispose: vi.fn(),
  };
  const createGameStageAudioController = vi.fn(() => audioController);
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
    let refCalls = 0;

    return {
      ...actual,
      useEffect: (effect: () => void | (() => void)) => {
        cleanupFns.push(effect() ?? undefined);
      },
      useEffectEvent: <T extends (...args: never[]) => unknown>(callback: T) => callback,
      useId: (() => {
        let id = 0;
        return () => `game-stage-${++id}`;
      })(),
      useMemo: <T,>(factory: () => T) => factory(),
      useRef: <T,>(initialValue: T) => {
        refCalls += 1;
        if (refCalls === 1) {
          return { current: canvas as T };
        }

        return { current: initialValue };
      },
      useState: <T,>(initialValue: T | (() => T)) => {
        let currentValue = typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;

        const setValue = (nextValue: T | ((value: T) => T)) => {
          currentValue = typeof nextValue === "function" ? (nextValue as (value: T) => T)(currentValue) : nextValue;
        };

        return [currentValue, setValue] as const;
      },
    };
  });

  vi.doMock("@/components/gameStageKeyboard", () => ({
    getKeyboardStatus: () => "status",
    getKeyboardTargetId: vi.fn(() => options.keyboardTargetId ?? "worm-1"),
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
    applyAccuratePress,
    applyMiss,
    createWorld,
    findWormIdAtPoint: vi.fn(() => options.pointerWormId ?? null),
    getSummary: vi.fn(() => ({
      profile: "desktop",
      phase: "activeChase",
      collected: 0,
      remaining: 1,
      fairies: 0,
      timerMs: 1000,
      speedBonus: 0,
      teleportsUnlocked: false,
      countdownMs: 0,
      finalWormActive: false,
      rushTriggered: false,
    })),
    resizeWorld: vi.fn(),
    setPointer: vi.fn(),
    stepWorld: vi.fn(),
    triggerTouchRush: vi.fn(),
  }));

  vi.doMock("@/components/gameStageAudio", () => ({
    createGameStageAudioController,
  }));

  vi.doMock("@/game/levels", () => ({
    getGameplayLevelRules: vi.fn(() => ({})),
  }));

  const windowMock = {
    addEventListener: vi.fn((name: string, listener: EventListener) => {
      const listeners = windowListeners.get(name) ?? [];
      listeners.push(listener);
      windowListeners.set(name, listeners);
    }),
    removeEventListener: vi.fn((name: string, listener: EventListener) => {
      const listeners = windowListeners.get(name) ?? [];
      windowListeners.set(
        name,
        listeners.filter((candidate) => candidate !== listener),
      );
    }),
    cancelAnimationFrame: vi.fn(),
    clearTimeout: vi.fn(),
    devicePixelRatio: 1,
    requestAnimationFrame: vi.fn(() => 1),
    setTimeout: vi.fn(() => 1),
  };

  vi.stubGlobal("window", windowMock);

  const { GameStage: InteractiveGameStage } = await import("./GameStage");
  InteractiveGameStage({
    level: 1,
    profile: "desktop",
    reducedMotion: false,
    onSummaryChange: vi.fn(),
    onRoundEnd: vi.fn(),
    onEvent: vi.fn(),
  });

  return {
    applyAccuratePress,
    applyMiss,
    audioController,
    canvasListeners,
    createGameStageAudioController,
    createWorld,
    cleanup() {
      for (const cleanup of cleanupFns.reverse()) {
        cleanup?.();
      }
    },
  };
}

describe("GameStage", () => {
  it("renders a dedicated phase chip so the current round state stays visible above the guidance copy", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "mobile",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain(styles.phaseBadge);
    expect(html).toContain(`class="${styles.phaseBadge} `);
    expect(html.indexOf(styles.phaseBadge)).toBeLessThan(html.indexOf("Round starts on zero."));
  });

  it("marks the phase chip as a full-motion idle badge when no gameplay cue is active", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "desktop",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-phase-cue="none"');
    expect(html).toContain('data-phase-motion="full"');
  });

  it("marks the phase chip as reduced-motion when motion is dialed down", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "desktop",
        reducedMotion: true,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-phase-cue="none"');
    expect(html).toContain('data-phase-motion="reduced"');
  });

  it("renders a keyboard-focusable canvas with hidden keyboard help and live status text", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 2,
        profile: "desktop",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Level 2");
    expect(html).toContain("Use arrow keys to move the target between worms.");
    expect(html).toContain('aria-live="polite"');
  });

  it("renders the provided gameplay backdrop behind the stage", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        backdropUrl: "/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif",
        level: 1,
        profile: "desktop",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('background-image:url(&quot;/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif&quot;)');
  });

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
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 0,
        finalWormActive: false,
        rushTriggered: true,
      })),
      resizeWorld: vi.fn(),
      setPointer: vi.fn(),
      stepWorld: vi.fn(),
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
    const props = {
      level: 1,
      profile: "mobile" as const,
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
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 0,
        finalWormActive: false,
        rushTriggered: false,
      })),
      resizeWorld: vi.fn(),
      setPointer: vi.fn(),
      stepWorld: vi.fn(),
      triggerTouchRush: vi.fn(),
    }));
    vi.doMock("@/game/levels", () => ({
      getGameplayLevelRules: vi.fn(() => ({})),
    }));

    const { GameStage: RerenderableGameStage } = await import("./GameStage");
    const props = {
      level: 1,
      profile: "desktop" as const,
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