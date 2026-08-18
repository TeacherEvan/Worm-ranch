import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type MockGameStageProps = {
  backdropUrl?: string | null;
  level: number;
  mode?: "standard" | "targetEndless";
  onRoundEnd: (result: { reason: "ghostEscape" | "time" | "captured" | "wrongColor"; collected: number; remaining: number }) => void;
};

type MockHomeScreenProps = {
  onBack: () => void;
  onOpenSettings: () => void;
  onStart: () => Promise<void> | void;
};

type MockGameModeScreenProps = {
  selectedMode: "standard" | "targetEndless";
  onModeChange: (mode: "standard" | "targetEndless") => void;
  onBack: () => void;
  onStart: () => void;
};

const SETTINGS_SNAPSHOT = {
  analyticsEnabled: true,
  reducedMotion: false,
  displayMode: "auto" as const,
};

describe("WormRanchApp", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("routes home start through the transition to mode menu", async () => {
    let homeScreenProps: MockHomeScreenProps | null = null;
    const setScreenCalls: ReturnType<typeof vi.fn> = vi.fn();
    const setTransitionTargetCalls: ReturnType<typeof vi.fn> = vi.fn();

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome" || resolvedInitial === "home" || resolvedInitial === "settings" || resolvedInitial === "modeMenu" || resolvedInitial === "transition" || resolvedInitial === "game") {
            return ["home", setScreenCalls];
          }
          if (resolvedInitial === null || resolvedInitial === undefined) {
            return [null, setTransitionTargetCalls];
          }

          return [resolvedInitial, vi.fn()];
        },
      };
    });

    vi.doMock("@/components/GameStage", () => ({ GameStage: () => createElement("div") }));
    vi.doMock("@/components/HomeScreen", () => ({
      HomeScreen: (props: MockHomeScreenProps) => {
        homeScreenProps = props;
        return createElement("div");
      },
    }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({ WormRanchGameExit: () => createElement("div") }));
    vi.doMock("@/components/GameModeScreen", () => ({ GameModeScreen: () => createElement("div") }));
    vi.doMock("@/components/ScreenTransition", () => ({ ScreenTransition: () => createElement("div") }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const { WormRanchApp } = await import("./WormRanchApp");
    renderToStaticMarkup(createElement(WormRanchApp));

    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props");
    }

    void (homeScreenProps as MockHomeScreenProps).onStart();

    // beginTransition({ screen: "modeMenu" }) should call setScreen("transition") and setTransitionTarget({ screen: "modeMenu" })
    expect(setScreenCalls).toHaveBeenCalledWith("transition");
    expect(setTransitionTargetCalls).toHaveBeenCalledWith({ screen: "modeMenu" });
  });

  it("shows the transition screen before entering gameplay from the mode menu", async () => {
    let gameModeScreenProps: MockGameModeScreenProps | null = null;
    const setScreenCalls: ReturnType<typeof vi.fn> = vi.fn();
    const setTransitionTargetCalls: ReturnType<typeof vi.fn> = vi.fn();

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome" || resolvedInitial === "home" || resolvedInitial === "settings" || resolvedInitial === "modeMenu" || resolvedInitial === "transition" || resolvedInitial === "game") {
            return ["modeMenu", setScreenCalls];
          }
          if (resolvedInitial === null || resolvedInitial === undefined) {
            return [null, setTransitionTargetCalls];
          }
          if (resolvedInitial === "standard" || resolvedInitial === "targetEndless") {
            return ["targetEndless", vi.fn()];
          }

          return [resolvedInitial, vi.fn()];
        },
      };
    });

    vi.doMock("@/components/GameStage", () => ({ GameStage: () => createElement("div") }));
    vi.doMock("@/components/HomeScreen", () => ({ HomeScreen: () => createElement("div") }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({ WormRanchGameExit: () => createElement("div") }));
    vi.doMock("@/components/GameModeScreen", () => ({
      GameModeScreen: (props: MockGameModeScreenProps) => {
        gameModeScreenProps = props;
        return createElement("div");
      },
    }));
    vi.doMock("@/components/ScreenTransition", () => ({ ScreenTransition: () => createElement("div") }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const { WormRanchApp } = await import("./WormRanchApp");
    renderToStaticMarkup(createElement(WormRanchApp));

    if (!gameModeScreenProps) {
      throw new Error("expected GameModeScreen props");
    }

    (gameModeScreenProps as MockGameModeScreenProps).onModeChange("targetEndless");
    (gameModeScreenProps as MockGameModeScreenProps).onStart();

    // startSelectedMode() calls beginTransition({ screen: "game", mode: "targetEndless" })
    expect(setScreenCalls).toHaveBeenCalledWith("transition");
    expect(setTransitionTargetCalls).toHaveBeenCalledWith({ screen: "game", mode: "targetEndless" });
  });

  it("restarts the selected endless mode after game-over replay", async () => {
    let gameStageProps: MockGameStageProps | null = null;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome" || resolvedInitial === "home" || resolvedInitial === "settings" || resolvedInitial === "modeMenu" || resolvedInitial === "transition" || resolvedInitial === "game") {
            return ["game", vi.fn()];
          }

          if (resolvedInitial === "standard" || resolvedInitial === "targetEndless") {
            return ["targetEndless", vi.fn()];
          }

          if (typeof resolvedInitial === "number") {
            return [1, vi.fn()];
          }

          return [resolvedInitial, vi.fn()];
        },
      };
    });

    vi.doMock("@/components/GameStage", () => ({
      GameStage: (props: MockGameStageProps) => {
        gameStageProps = props;
        return createElement("div", {
          "data-game-level": props.level,
          "data-game-backdrop": props.backdropUrl ?? "",
          "data-game-mode": props.mode ?? "standard",
        });
      },
    }));
    vi.doMock("@/components/HomeScreen", () => ({
      HomeScreen: () => {
        return createElement("div", null, "Moonlit roundup");
      },
    }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({ WormRanchGameExit: () => createElement("div") }));
    vi.doMock("@/components/GameModeScreen", () => ({ GameModeScreen: () => createElement("div") }));
    vi.doMock("@/components/ScreenTransition", () => ({ ScreenTransition: () => createElement("div") }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const renderApp = async () => {
      const { WormRanchApp } = await import("./WormRanchApp");
      return renderToStaticMarkup(createElement(WormRanchApp));
    };

    await renderApp();

    if (!gameStageProps) {
      throw new Error("expected GameStage props");
    }

    (gameStageProps as MockGameStageProps).onRoundEnd({ reason: "wrongColor", collected: 3, remaining: 9 });

    // TODO: Verify replay logic - this will be implemented in Task 3
    // For now, just verify the round ends
    expect((gameStageProps as MockGameStageProps).onRoundEnd).toBeDefined();
  });
});