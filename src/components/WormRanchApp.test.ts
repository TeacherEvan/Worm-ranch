import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GameMode } from "@/game/gameModes";
import type { RoundResult } from "@/game/types";
import { getGameplayRunPlan } from "./wormRanchLevelFlow";

type AppScreen = "welcome" | "home" | "settings" | "modeMenu" | "transition" | "game";

type MockGameStageProps = {
  backdropUrl?: string | null;
  level: number;
  onRoundEnd: (result: RoundResult) => void;
};

type MockHomeScreenProps = {
  onBack: () => void;
  onOpenSettings: () => void;
  onStart: () => Promise<void> | void;
};

type MockSettingsScreenProps = {
  onBack: () => void;
  onStart: () => Promise<void> | void;
};

type MockGameModeScreenProps = {
  onBack: () => void;
  onSelectMode: (mode: GameMode) => void;
  onStart: () => Promise<void> | void;
  selectedMode: GameMode;
};

type MockScreenTransitionProps = {
  destinationLabel: string;
  onReady: () => void;
  reducedMotion: boolean;
};

type MockGameExitProps = {
  onLeave: () => void;
};

const SETTINGS_SNAPSHOT = {
  analyticsEnabled: true,
  reducedMotion: false,
  displayMode: "auto" as const,
};
const SELECTED_GAME_MODE_SLOT = 8;

function createReactStateMock(initialScreen: AppScreen) {
  const stateSlots: unknown[] = [];
  const setterCallCounts: number[] = [];
  let cursor = 0;

  return {
    beginRender() {
      cursor = 0;
    },
    getSetterCallCount(slot: number) {
      return setterCallCounts[slot] ?? 0;
    },
    async moduleFactory() {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const slot = cursor;
          cursor += 1;

          if (stateSlots.length <= slot) {
            const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;
            stateSlots[slot] = slot === 0 ? initialScreen : resolvedInitial;
          }

           const setState = (value: unknown) => {
             setterCallCounts[slot] = (setterCallCounts[slot] ?? 0) + 1;
             stateSlots[slot] = typeof value === "function" ? (value as (current: unknown) => unknown)(stateSlots[slot]) : value;
           };

          return [stateSlots[slot], setState];
        },
      };
    },
  };
}

async function setupApp(initialScreen: AppScreen) {
  let homeScreenProps: MockHomeScreenProps | null = null;
  let settingsScreenProps: MockSettingsScreenProps | null = null;
  let gameModeScreenProps: MockGameModeScreenProps | null = null;
  let screenTransitionProps: MockScreenTransitionProps | null = null;
  let gameStageProps: MockGameStageProps | null = null;
  let gameExitProps: MockGameExitProps | null = null;
  const reactStateMock = createReactStateMock(initialScreen);

  vi.doMock("react", () => reactStateMock.moduleFactory());
  vi.doMock("@/components/GameStage", () => ({
    GameStage: (props: MockGameStageProps) => {
      gameStageProps = props;
      return createElement("div", {
        "data-game-level": props.level,
        "data-game-backdrop": props.backdropUrl ?? "",
      });
    },
  }));
  vi.doMock("@/components/HomeScreen", () => ({
    HomeScreen: (props: MockHomeScreenProps) => {
      homeScreenProps = props;
      return createElement("div", null, "Home screen");
    },
  }));
  vi.doMock("@/components/SettingsScreen", () => ({
    SettingsScreen: (props: MockSettingsScreenProps) => {
      settingsScreenProps = props;
      return createElement("div", null, "Settings screen");
    },
  }));
  vi.doMock("@/components/GameModeScreen", () => ({
    GameModeScreen: (props: MockGameModeScreenProps) => {
      gameModeScreenProps = props;
      return createElement("section", { "data-layout": "compact-mode-menu" }, `Game mode screen: ${props.selectedMode}`);
    },
  }));
  vi.doMock("@/components/ScreenTransition", () => ({
    ScreenTransition: (props: MockScreenTransitionProps) => {
      screenTransitionProps = props;
      return createElement("section", { "data-layout": "screen-transition" }, `Transitioning to ${props.destinationLabel}`);
    },
  }));
  vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div", null, "Welcome screen") }));
  vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
  vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
  vi.doMock("@/components/WormRanchGameExit", () => ({
    WormRanchGameExit: (props: MockGameExitProps) => {
      gameExitProps = props;
      return createElement("div");
    },
  }));
  vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

  const { WormRanchApp } = await import("./WormRanchApp");

  const renderApp = () => {
    reactStateMock.beginRender();
    return renderToStaticMarkup(createElement(WormRanchApp));
  };

  return {
    renderApp,
    getGameExitProps: () => gameExitProps,
    getGameModeScreenProps: () => gameModeScreenProps,
    getGameStageProps: () => gameStageProps,
    getHomeScreenProps: () => homeScreenProps,
    getScreenTransitionProps: () => screenTransitionProps,
    getSettingsScreenProps: () => settingsScreenProps,
    getSetterCallCount: (slot: number) => reactStateMock.getSetterCallCount(slot),
  };
}

describe("WormRanchApp", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("routes start actions into the mode menu instead of gameplay immediately", async () => {
    const app = await setupApp("home");
    app.renderApp();

    const homeScreenProps = app.getHomeScreenProps();
    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props");
    }

    void homeScreenProps.onStart();
    const transitionHtml = app.renderApp();

    expect(transitionHtml).toContain("Transitioning to the game mode menu");
    expect(app.getGameStageProps()).toBeNull();

    const transitionProps = app.getScreenTransitionProps();
    if (!transitionProps) {
      throw new Error("expected ScreenTransition props");
    }

    transitionProps.onReady();
    const modeMenuHtml = app.renderApp();

    expect(modeMenuHtml).toContain("Game mode screen: standard");
  });

  it("shows the transition screen before gameplay and does not block on backdrop preload", async () => {
    class PendingImage {
      complete = false;
      decoding: "async" | "sync" | "auto" = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {}

      decode() {
        return new Promise<void>(() => undefined);
      }
    }

    vi.stubGlobal("Image", PendingImage);
    vi.stubGlobal("window", { Image: PendingImage });

    const app = await setupApp("modeMenu");
    app.renderApp();

    const modeMenuProps = app.getGameModeScreenProps();
    if (!modeMenuProps) {
      throw new Error("expected GameModeScreen props");
    }

    void modeMenuProps.onStart();
    const transitionHtml = app.renderApp();

    expect(transitionHtml).toContain("Transitioning to gameplay");
    expect(app.getGameStageProps()).toBeNull();

    const transitionProps = app.getScreenTransitionProps();
    if (!transitionProps) {
      throw new Error("expected ScreenTransition props");
    }

    transitionProps.onReady();
    app.renderApp();

    expect(app.getGameStageProps()?.level).toBe(1);
    expect(app.getGameStageProps()?.backdropUrl).toBe(getGameplayRunPlan(1).backdropUrl);
  });

  it("uses the screen component shells directly for mode menu and transition surfaces", async () => {
    const app = await setupApp("modeMenu");

    const modeMenuHtml = app.renderApp();
    expect(modeMenuHtml.match(/<section/g)?.length ?? 0).toBe(1);
    expect(modeMenuHtml).toContain('data-layout="compact-mode-menu"');

    const modeMenuProps = app.getGameModeScreenProps();
    if (!modeMenuProps) {
      throw new Error("expected GameModeScreen props");
    }

    void modeMenuProps.onStart();
    const transitionHtml = app.renderApp();

    expect(transitionHtml.match(/<section/g)?.length ?? 0).toBe(1);
    expect(transitionHtml).toContain('data-layout="screen-transition"');
  });

  it("preserves the endless selection when returning to the mode menu after a run", async () => {
    const app = await setupApp("modeMenu");
    app.renderApp();

    const initialModeMenuProps = app.getGameModeScreenProps();
    if (!initialModeMenuProps) {
      throw new Error("expected initial GameModeScreen props");
    }

    initialModeMenuProps.onSelectMode("targetEndless");
    app.renderApp();

    const updatedModeMenuProps = app.getGameModeScreenProps();
    if (!updatedModeMenuProps) {
      throw new Error("expected updated GameModeScreen props");
    }

    expect(updatedModeMenuProps.selectedMode).toBe("targetEndless");

    void updatedModeMenuProps.onStart();
    app.renderApp();
    app.getScreenTransitionProps()?.onReady();
    app.renderApp();

    const gameStageProps = app.getGameStageProps();
    if (!gameStageProps) {
      throw new Error("expected GameStage props");
    }

    gameStageProps.onRoundEnd({ reason: "wrongColor", collected: 3, remaining: 9 });
    app.renderApp();
    app.getScreenTransitionProps()?.onReady();
    app.renderApp();

    const homeScreenProps = app.getHomeScreenProps();
    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props after round end");
    }

    void homeScreenProps.onStart();
    app.renderApp();
    app.getScreenTransitionProps()?.onReady();
    app.renderApp();

    expect(app.getGameModeScreenProps()?.selectedMode).toBe("targetEndless");
  });

  it("does not rewrite the selected mode again while launching a chosen run", async () => {
    const app = await setupApp("modeMenu");
    app.renderApp();

    const initialModeMenuProps = app.getGameModeScreenProps();
    if (!initialModeMenuProps) {
      throw new Error("expected initial GameModeScreen props");
    }

    initialModeMenuProps.onSelectMode("targetEndless");
    app.renderApp();

    expect(app.getSetterCallCount(SELECTED_GAME_MODE_SLOT)).toBe(1);

    const updatedModeMenuProps = app.getGameModeScreenProps();
    if (!updatedModeMenuProps) {
      throw new Error("expected updated GameModeScreen props");
    }

    void updatedModeMenuProps.onStart();
    app.renderApp();
    app.getScreenTransitionProps()?.onReady();
    app.renderApp();

    expect(app.getSetterCallCount(SELECTED_GAME_MODE_SLOT)).toBe(1);
  });
});
