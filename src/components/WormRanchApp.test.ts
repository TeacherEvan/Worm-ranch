import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getGameplayRunPlan } from "./wormRanchLevelFlow";

type MockGameStageProps = {
  backdropUrl?: string | null;
  level: number;
  onRoundEnd: (result: { reason: "ghostEscape" | "time" | "captured"; collected: number; remaining: number }) => void;
};

type MockResultsScreenProps = {
  level: number;
  note: string;
  onReplay: () => Promise<void> | void;
  onReturnHome: () => void;
};

type MockHomeScreenProps = {
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

const INITIAL_STATE_SLOTS = [
  "game",
  {
    profile: "desktop" as const,
    pointer: "fine" as const,
    width: 1440,
    height: 900,
    orientation: "landscape" as const,
    dpr: 1,
  },
  "desktop",
  null,
  null,
  false,
  1,
  getGameplayRunPlan(1),
  "session-1",
  { log: vi.fn(), dispose: vi.fn() },
] as const;

describe("WormRanchApp", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("advances the next run to the next gameplay level and backdrop after a round ends", async () => {
    const stateSlots = [...INITIAL_STATE_SLOTS];
    let stateIndex = 0;
    let gameStageProps: MockGameStageProps | null = null;
    let resultsScreenProps: MockResultsScreenProps | null = null;
    let homeScreenProps: MockHomeScreenProps | null = null;
    let gameExitProps: MockGameExitProps | null = null;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const slot = stateIndex;
          stateIndex += 1;

          if (stateSlots[slot] === undefined) {
            stateSlots[slot] = typeof initial === "function" ? (initial as () => unknown)() : initial;
          }

          const setState = (value: unknown) => {
            stateSlots[slot] = typeof value === "function" ? (value as (current: unknown) => unknown)(stateSlots[slot]) : value;
          };

          return [stateSlots[slot], setState];
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

    vi.doMock("@/components/ResultsScreen", () => ({
      ResultsScreen: (props: MockResultsScreenProps) => {
        resultsScreenProps = props;
        return createElement("div", null, `Level ${props.level}`);
      },
    }));

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
    vi.doMock("@/components/WormRanchGameExit", () => ({
      WormRanchGameExit: (props: MockGameExitProps) => {
        gameExitProps = props;
        return createElement("div");
      },
    }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    const renderApp = async () => {
      stateIndex = 0;
      const { WormRanchApp } = await import("./WormRanchApp");
      return renderToStaticMarkup(createElement(WormRanchApp));
    };

    await renderApp();

    if (!gameStageProps) {
      throw new Error("expected GameStage props");
    }

    gameStageProps.onRoundEnd({ reason: "time", collected: 12, remaining: 88 });
    const resultsHtml = await renderApp();

    expect(resultsHtml).toContain("Level 1");
    expect(resultsScreenProps?.level).toBe(1);

    await resultsScreenProps?.onReplay();
    await renderApp();

    expect(gameStageProps?.level).toBe(2);
    expect(gameStageProps?.backdropUrl).toBe(getGameplayRunPlan(2).backdropUrl);

    resultsScreenProps?.onReturnHome();
    await renderApp();
    await homeScreenProps?.onStart();
    await renderApp();

    expect(gameStageProps?.level).toBe(1);
    expect(gameStageProps?.backdropUrl).toBe(getGameplayRunPlan(1).backdropUrl);

    gameExitProps?.onLeave();
    await renderApp();
    await homeScreenProps?.onStart();
    await renderApp();

    expect(gameStageProps?.level).toBe(1);
    expect(gameStageProps?.backdropUrl).toBe(getGameplayRunPlan(1).backdropUrl);
  });

  it("updates the mobile results note when higher levels require more taps", async () => {
    const stateSlots = [
      "results",
      {
        profile: "mobile" as const,
        pointer: "coarse" as const,
        width: 390,
        height: 844,
        orientation: "portrait" as const,
        dpr: 3,
      },
      "mobile",
      { reason: "time" as const, collected: 6, remaining: 34, level: 4 },
      null,
      false,
      4,
      getGameplayRunPlan(4),
      "session-2",
      { log: vi.fn(), dispose: vi.fn() },
    ];
    let stateIndex = 0;
    let resultsScreenProps: MockResultsScreenProps | null = null;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useEffect: () => undefined,
        useSyncExternalStore: () => SETTINGS_SNAPSHOT,
        useState: (initial: unknown) => {
          const slot = stateIndex;
          stateIndex += 1;

          if (stateSlots[slot] === undefined) {
            stateSlots[slot] = typeof initial === "function" ? (initial as () => unknown)() : initial;
          }

          const setState = (value: unknown) => {
            stateSlots[slot] = typeof value === "function" ? (value as (current: unknown) => unknown)(stateSlots[slot]) : value;
          };

          return [stateSlots[slot], setState];
        },
      };
    });

    vi.doMock("@/components/GameStage", () => ({ GameStage: () => createElement("div") }));
    vi.doMock("@/components/ResultsScreen", () => ({
      ResultsScreen: (props: MockResultsScreenProps) => {
        resultsScreenProps = props;
        return createElement("div", null, props.note);
      },
    }));
    vi.doMock("@/components/HomeScreen", () => ({ HomeScreen: () => createElement("div") }));
    vi.doMock("@/components/SettingsScreen", () => ({ SettingsScreen: () => createElement("div") }));
    vi.doMock("@/components/WelcomeScreen", () => ({ WelcomeScreen: () => createElement("div") }));
    vi.doMock("@/components/WormRanchShellHeader", () => ({ WormRanchShellHeader: () => createElement("div") }));
    vi.doMock("@/components/WormRanchInstallPrompt", () => ({ WormRanchInstallPrompt: () => createElement("div") }));
    vi.doMock("@/components/WormRanchGameExit", () => ({ WormRanchGameExit: () => createElement("div") }));
    vi.doMock("@/lib/logger", () => ({ createSilentLogger: () => ({ log: vi.fn(), dispose: vi.fn() }) }));

    stateIndex = 0;
    const { WormRanchApp } = await import("./WormRanchApp");
    renderToStaticMarkup(createElement(WormRanchApp));

    expect(resultsScreenProps?.level).toBe(4);
    expect(resultsScreenProps?.note).toContain("3 clean taps total");
  });
});
