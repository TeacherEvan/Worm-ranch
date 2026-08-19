import { vi } from "vitest";
import styles from "./GameStage.module.css";
import type { ActionResult } from "@/game/types";


export type InteractionHarnessOptions = {
  keyboardTargetId?: string | null;
  pointerWormId?: string | null;
  pressResult?: ActionResult;
  pressResults?: ActionResult[];
};

export type StageInteractionEvent = {
  clientX?: number;
  clientY?: number;
  key?: string;
  pointerId?: number;
  pointerType?: string;
  preventDefault?: () => void;
  repeat?: boolean;
};

export function flattenElementText(node: unknown): string {
  if (Array.isArray(node)) {
    return node.map((child) => flattenElementText(child)).join("");
  }

  node = resolveFunctionComponent(node);

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!node || typeof node !== "object" || !("props" in node)) {
    return "";
  }

  return flattenElementText((node as { props: { children?: unknown } }).props.children);
}

export function findElementTextByClassName(node: unknown, className: string): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementTextByClassName(child, className);
      if (match !== null) {
        return match;
      }
    }

    return null;
  }

  node = resolveFunctionComponent(node);

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

export function findStatusPill(node: unknown, label: string): { className: string; value: string | null } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findStatusPill(child, label);
      if (match) {
        return match;
      }
    }

    return null;
  }

  node = resolveFunctionComponent(node);

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

export function resolveFunctionComponent(node: unknown) {
  if (!node || typeof node !== "object" || !("props" in node) || !("type" in node)) {
    return node;
  }

  const element = node as {
    props: Record<string, unknown>;
    type: unknown;
  };

  if (typeof element.type !== "function") {
    return node;
  }

  return (element.type as (props: Record<string, unknown>) => unknown)(element.props);
}

export async function createInteractionHarness(options: InteractionHarnessOptions = {}) {
  const cleanupFns: Array<(() => void) | undefined> = [];
  const canvasListeners = new Map<string, (event: StageInteractionEvent) => void>();
  const windowListeners = new Map<string, EventListener[]>();
  const world = {
    worms: [{ id: "worm-1", x: 120, y: 90, radius: 18 }],
    fairies: [],
    roundResult: null,
  } as const;
  const applyMiss = vi.fn(() => ({ kind: "miss" }) as ActionResult);
  const queuedPressResults = [...(options.pressResults ?? [])];
  const applyAccuratePress = vi.fn((_world: unknown, _wormId: string) => {
    const nextResult = queuedPressResults.shift();
    return (nextResult ?? options.pressResult ?? { kind: "tag", wormId: "worm-1", bursts: 1 }) as ActionResult;
  });

  // Define all engine mock functions first
  const createWorld = vi.fn(() => world);
  const findWormIdAtPoint = vi.fn(() => options.pointerWormId ?? null);
  const getSummary = vi.fn(() => ({
    profile: "desktop",
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
    rushTriggered: false,
  }));
  const resizeWorld = vi.fn();
  const setPointer = vi.fn();
  const startContinuousMode = vi.fn();
  const startRound = vi.fn();
  const stepWorld = vi.fn();
  const stopContinuousMode = vi.fn();
  const triggerTouchRush = vi.fn(() => undefined);

  const engineMocks = {
    applyAccuratePress,
    applyMiss,
    createWorld,
    findWormIdAtPoint,
    getSummary,
    resizeWorld,
    setPointer,
    startContinuousMode,
    startRound,
    stepWorld,
    stopContinuousMode,
    triggerTouchRush,
  };

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

  vi.doMock("@/game/engine", () => engineMocks);

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
    mode: "standard",
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
    startContinuousMode,
    startRound,
    cleanup() {
      for (const cleanup of cleanupFns.reverse()) {
        cleanup?.();
      }
    },
  };
}
