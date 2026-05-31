import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getGameplayRunPlan } from "./wormRanchLevelFlow";

type MockGameStageProps = {
  backdropUrl?: string | null;
  level: number;
  onRoundEnd: (result: { reason: "ghostEscape" | "time" | "captured"; collected: number; remaining: number }) => void;
};

type MockHomeScreenProps = {
  onBack: () => void;
  onOpenSettings: () => void;
  onStart: () => Promise<void> | void;
};

type MockGameExitProps = {
  onLeave: () => void;
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

  it("enters gameplay without blocking on backdrop preload", async () => {
    let homeScreenProps: MockHomeScreenProps | null = null;
    const setScreen = vi.fn();
    const setCurrentLevel = vi.fn();

    const isGameplayRunPlanState = (
      value: unknown,
    ): value is ReturnType<typeof getGameplayRunPlan> => {
      return (
        typeof value === "object" &&
        value !== null &&
        "level" in value &&
        "backdropUrl" in value
      );
    };

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

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome") {
            return ["home", setScreen];
          }

          if (resolvedInitial === getGameplayRunPlan(1).level) {
            return [resolvedInitial, setCurrentLevel];
          }

          if (isGameplayRunPlanState(resolvedInitial)) {
            return [resolvedInitial, vi.fn()];
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
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const { WormRanchApp } = await import("./WormRanchApp");
    renderToStaticMarkup(createElement(WormRanchApp));

    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props");
    }

    void homeScreenProps.onStart();

    expect(setCurrentLevel).toHaveBeenCalledWith(1);
    expect(setScreen).toHaveBeenCalledWith("game");
  });

  it("returns directly to home when the player quits from gameplay", async () => {
    let screenState: "welcome" | "home" | "settings" | "game" = "game";
    let currentLevelState = 1;
    let gameStageProps: MockGameStageProps | null = null;
    let homeScreenProps: MockHomeScreenProps | null = null;
    let gameExitProps: MockGameExitProps | null = null;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome") {
            return [screenState, (value: typeof screenState | ((current: typeof screenState) => typeof screenState)) => {
              screenState = typeof value === "function" ? value(screenState) : value;
            }];
          }

          if (resolvedInitial === getGameplayRunPlan(1).level) {
            return [currentLevelState, (value: number | ((current: number) => number)) => {
              currentLevelState = typeof value === "function" ? value(currentLevelState) : value;
            }];
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
        });
      },
    }));

    vi.doMock("@/components/HomeScreen", () => ({
      HomeScreen: (props: MockHomeScreenProps) => {
        homeScreenProps = props;
        return createElement("div", null, "Moonlit roundup");
      },
    }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({
      WormRanchGameExit: (props: MockGameExitProps) => {
        gameExitProps = props;
        return createElement("div");
      },
    }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const renderApp = async () => {
      const { WormRanchApp } = await import("./WormRanchApp");
      return renderToStaticMarkup(createElement(WormRanchApp));
    };

    await renderApp();

    if (!gameExitProps) {
      throw new Error("expected WormRanchGameExit props");
    }

    gameExitProps.onLeave();
    const homeHtml = await renderApp();

    expect(homeHtml).toContain("Moonlit roundup");

    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props after quitting");
    }

    await homeScreenProps.onStart();
    await renderApp();

    expect(gameStageProps?.level).toBe(1);
    expect(gameStageProps?.backdropUrl).toBe(getGameplayRunPlan(1).backdropUrl);
  });

  it("returns to home after a round ends and starts the next run from level 1", async () => {
    let screenState: "welcome" | "home" | "settings" | "game" = "game";
    let currentLevelState = 1;
    let gameStageProps: MockGameStageProps | null = null;
    let homeScreenProps: MockHomeScreenProps | null = null;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const resolvedInitial = typeof initial === "function" ? (initial as () => unknown)() : initial;

          if (resolvedInitial === "welcome") {
            return [screenState, (value: typeof screenState | ((current: typeof screenState) => typeof screenState)) => {
              screenState = typeof value === "function" ? value(screenState) : value;
            }];
          }

          if (resolvedInitial === getGameplayRunPlan(1).level) {
            return [currentLevelState, (value: number | ((current: number) => number)) => {
              currentLevelState = typeof value === "function" ? value(currentLevelState) : value;
            }];
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
        });
      },
    }));

    vi.doMock("@/components/HomeScreen", () => ({
      HomeScreen: (props: MockHomeScreenProps) => {
        homeScreenProps = props;
        return createElement("div", null, "Moonlit roundup");
      },
    }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({ WormRanchGameExit: () => createElement("div") }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const renderApp = async () => {
      const { WormRanchApp } = await import("./WormRanchApp");
      return renderToStaticMarkup(createElement(WormRanchApp));
    };

    await renderApp();

    if (!gameStageProps) {
      throw new Error("expected GameStage props");
    }

    gameStageProps.onRoundEnd({ reason: "time", collected: 12, remaining: 88 });
    const postRoundHtml = await renderApp();

    expect(postRoundHtml).toContain("Moonlit roundup");

    if (!homeScreenProps) {
      throw new Error("expected HomeScreen props after the round ends");
    }

    await homeScreenProps.onStart();
    await renderApp();

    expect(gameStageProps?.level).toBe(1);
    expect(gameStageProps?.backdropUrl).toBe(getGameplayRunPlan(1).backdropUrl);
  });
});
