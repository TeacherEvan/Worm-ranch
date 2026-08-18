"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./WormRanchApp.module.css";
import { GameStage } from "@/components/GameStage";
import { HomeScreen } from "@/components/HomeScreen";
import { WormRanchInstallPrompt } from "@/components/WormRanchInstallPrompt";
import { WormRanchGameExit } from "@/components/WormRanchGameExit";
import { SettingsScreen } from "@/components/SettingsScreen";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WormRanchShellHeader } from "@/components/WormRanchShellHeader";
import { GameModeScreen } from "@/components/GameModeScreen";
import { ScreenTransition } from "@/components/ScreenTransition";
import { getGameplayRunPlan, getInitialGameplayRunPlan } from "@/components/wormRanchLevelFlow";
import { areDisplaySnapshotsEqual, getProfileDetectedDetails } from "@/lib/analytics";
import { detectDisplayProfile, type DisplayProfile, type DisplaySnapshot } from "@/game/detection";
import { getGameplayLevelRules } from "@/game/levels";
import { PROFILE_RULES } from "@/game/rules";
import {
  areSettingsEqual,
  getSettingsDetails,
  getStoredSettingsSnapshot,
  getStoredSettingsServerSnapshot,
  subscribeToSettings,
  type SettingsState,
  writeStoredSettings,
} from "@/lib/wormRanchSettings";
import { createSilentLogger, type EventName } from "@/lib/logger";
import { DEFAULT_GAMEPLAY_MODE, type GameplayMode } from "@/game/gameModes";
import { type RoundResult } from "@/game/types";
import { EndlessGameOverWindow } from "@/components/EndlessGameOverWindow";
import { useInstallPrompt } from "@/components/useInstallPrompt";
import { preloadGameplayBackdrop } from "@/lib/backdropPreload";

type AppScreen = "welcome" | "home" | "settings" | "modeMenu" | "transition" | "game";

type TransitionTarget =
  | { screen: "home" }
  | { screen: "welcome" }
  | { screen: "settings" }
  | { screen: "modeMenu" }
  | { screen: "game"; mode: GameplayMode };

type PendingRoundResult = RoundResult | null;

export function WormRanchApp() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [detectedDisplay, setDetectedDisplay] = useState<DisplaySnapshot | null>(null);
  const [runProfile, setRunProfile] = useState<DisplayProfile | null>(null);
  const [currentLevel, setCurrentLevel] = useState(getInitialGameplayRunPlan().level);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [selectedMode, setSelectedMode] = useState<GameplayMode>(DEFAULT_GAMEPLAY_MODE);
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);
  const [pendingRoundResult, setPendingRoundResult] = useState<PendingRoundResult>(null);
  const [logger] = useState(() => createSilentLogger("/api/events"));
  const hasLoggedOpenRef = useRef(false);
  const settings = useSyncExternalStore(
    subscribeToSettings,
    getStoredSettingsSnapshot,
    getStoredSettingsServerSnapshot,
  );
  const settingsBaselineRef = useRef<SettingsState | null>(settings);

  const effectiveProfile = useMemo<DisplayProfile>(() => {
    if (settings.displayMode !== "auto") {
      return settings.displayMode;
    }

    return detectedDisplay?.profile ?? "desktop";
  }, [detectedDisplay?.profile, settings.displayMode]);

  const sessionIdRef = useRef(sessionId);
  const screenRef = useRef<AppScreen>(screen);
  const settingsRef = useRef(settings);
  const effectiveProfileRef = useRef<DisplayProfile>(effectiveProfile);
  const runProfileRef = useRef<DisplayProfile | null>(runProfile);
  const currentLevelRef = useRef(currentLevel);
  const detectedDisplayRef = useRef<DisplaySnapshot | null>(null);
  const selectedModeRef = useRef(selectedMode);
  const transitionTargetRef = useRef<TransitionTarget | null>(transitionTarget);
  const pendingRoundResultRef = useRef<PendingRoundResult>(pendingRoundResult);

  const logEvent = useCallback(
    (
      name: EventName,
      details: Record<string, unknown> | undefined,
      activeScreen: string,
      enabled: boolean,
      profile: DisplayProfile,
    ) => {
      if (!enabled) {
        return;
      }

      logger.log({
        name,
        details,
        sessionId: sessionIdRef.current,
        profile,
        screen: activeScreen,
      });
    },
    [logger],
  );

  const handleStageEvent = useCallback(
    (name: EventName, details?: Record<string, unknown>) => {
      logEvent(
        name,
        details,
        "game",
        settingsRef.current.analyticsEnabled,
        runProfileRef.current ?? effectiveProfileRef.current,
      );
    },
    [logEvent],
  );

  const beginTransition = useCallback((target: TransitionTarget) => {
    setTransitionTarget(target);
    setScreen("transition");
  }, []);

  const returnHome = useCallback(() => {
    const initialRunPlan = getInitialGameplayRunPlan();

    currentLevelRef.current = initialRunPlan.level;
    setCurrentLevel(initialRunPlan.level);
    setRunProfile(null);
    setPendingRoundResult(null);
    beginTransition({ screen: "home" });
  }, [beginTransition]);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      if (selectedModeRef.current === "targetEndless" && result.reason === "wrongColor") {
        setPendingRoundResult(result);
        return;
      }

      beginTransition({ screen: "home" });
    },
    [beginTransition],
  );

  const startSelectedMode = useCallback(() => {
    beginTransition({ screen: "game", mode: selectedModeRef.current });
  }, [beginTransition]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    effectiveProfileRef.current = effectiveProfile;
  }, [effectiveProfile]);

  useEffect(() => {
    runProfileRef.current = runProfile;
  }, [runProfile]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    transitionTargetRef.current = transitionTarget;
  }, [transitionTarget]);

  useEffect(() => {
    pendingRoundResultRef.current = pendingRoundResult;
  }, [pendingRoundResult]);

  const install = useInstallPrompt();

  useEffect(() => {
    const updateProfile = () => setDetectedDisplay(detectDisplayProfile(window));

    updateProfile();
    window.addEventListener("resize", updateProfile);

    return () => {
      window.removeEventListener("resize", updateProfile);
      logger.dispose();
    };
  }, [logger]);

  useEffect(() => {
    if (hasLoggedOpenRef.current) {
      return;
    }

    hasLoggedOpenRef.current = true;
    logEvent(
      "app_opened",
      { firstScreen: "welcome" },
      "welcome",
      settingsRef.current.analyticsEnabled,
      effectiveProfileRef.current,
    );
  }, [logEvent]);

  useEffect(() => {
    const previousSettings = settingsBaselineRef.current;
    settingsBaselineRef.current = settings;

    if (!previousSettings || areSettingsEqual(previousSettings, settings)) {
      return;
    }

    const activeScreen = screenRef.current;
    const profile =
      activeScreen === "game"
        ? runProfileRef.current ?? effectiveProfileRef.current
        : effectiveProfileRef.current;

    logEvent("settings_changed", getSettingsDetails(settings), activeScreen, settings.analyticsEnabled, profile);
  }, [logEvent, settings]);

  useEffect(() => {
    if (!detectedDisplay) {
      return;
    }

    if (areDisplaySnapshotsEqual(detectedDisplayRef.current, detectedDisplay)) {
      return;
    }

    detectedDisplayRef.current = detectedDisplay;
    logEvent(
      "profile_detected",
      getProfileDetectedDetails(detectedDisplay),
      screenRef.current,
      settingsRef.current.analyticsEnabled,
      detectedDisplay.profile,
    );
  }, [detectedDisplay, logEvent]);

  useEffect(() => {
    const profile = screen === "game" ? runProfileRef.current ?? effectiveProfileRef.current : effectiveProfileRef.current;

    logEvent("screen_viewed", undefined, screen, settingsRef.current.analyticsEnabled, profile);
  }, [logEvent, screen]);

  // Handle transition screen navigation
  useEffect(() => {
    if (screen !== "transition" || !transitionTarget) {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = transitionTargetRef.current;
      if (!target) return;

      if (target.screen === "game") {
        const nextRunProfile = effectiveProfileRef.current;
        const runPlan = getInitialGameplayRunPlan();
        const nextRunLevel = runPlan.level;
        const nextSessionId = crypto.randomUUID();

        sessionIdRef.current = nextSessionId;
        runProfileRef.current = nextRunProfile;
        currentLevelRef.current = nextRunLevel;

        setCurrentLevel(nextRunLevel);
        setSessionId(nextSessionId);
        setRunProfile(nextRunProfile);
        setScreen("game");

        void preloadGameplayBackdrop(runPlan.backdropUrl);
        return;
      }

      setScreen(target.screen);
    }, settings.reducedMotion ? 0 : 220);

    return () => window.clearTimeout(timer);
  }, [screen, transitionTarget, settings.reducedMotion]);

  const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    writeStoredSettings({ ...settings, [key]: value });
  }, [settings]);

  const shellProfile = screen === "game" ? runProfile ?? effectiveProfile : effectiveProfile;
  const shellScanProfile: DisplayProfile | "scanning" = screen === "game" ? shellProfile : detectedDisplay?.profile ?? "scanning";
  const profileRules = screen === "game" ? getGameplayLevelRules(shellProfile, currentLevel) : PROFILE_RULES[shellProfile];
  const installPromptVisible = install.installPromptEvent !== null && !install.installPromptDismissed;
  const welcomeMetrics = [
    { label: "Pasture", value: "moonlit" },
    { label: "Tack", value: "ready" },
    { label: "Trail log", value: settings.analyticsEnabled ? "silent" : "off" },
    { label: "Orbit", value: "steady" },
  ];

  return (
    <main
      className={styles.page}
      data-motion={settings.reducedMotion ? "reduced" : "full"}
      data-screen={screen}
    >
      {screen !== "game" && screen !== "modeMenu" && screen !== "transition" && (
        screen === "welcome" ? (
          <WormRanchShellHeader density="welcome" shellProfile={shellProfile} shellScanProfile={shellScanProfile} />
        ) : (
          <WormRanchShellHeader
            shellProfile={shellProfile}
            shellScanProfile={shellScanProfile}
            totalWorms={profileRules.totalWorms}
          />
        )
      )}

      {screen === "welcome" && (
        <WelcomeScreen
          metrics={welcomeMetrics}
          onOpenGate={() => beginTransition({ screen: "home" })}
          onRigTack={() => beginTransition({ screen: "settings" })}
          reducedMotion={settings.reducedMotion}
        />
      )}

      {screen === "home" && (
        <HomeScreen
          installPrompt={
            <WormRanchInstallPrompt
              visible={installPromptVisible}
              placement="inline"
              onInstall={install.onInstall}
              onDismiss={() => install.setInstallPromptDismissed(true)}
            />
          }
          onBack={() => beginTransition({ screen: "welcome" })}
          onOpenSettings={() => beginTransition({ screen: "settings" })}
          onStart={() => beginTransition({ screen: "modeMenu" })}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          analyticsEnabled={settings.analyticsEnabled}
          displayMode={settings.displayMode}
          onAnalyticsEnabledChange={(value) => updateSetting("analyticsEnabled", value)}
          onBack={() => beginTransition({ screen: "home" })}
          onDisplayModeChange={(value) => updateSetting("displayMode", value)}
          onReducedMotionChange={(value) => updateSetting("reducedMotion", value)}
          onStart={() => beginTransition({ screen: "modeMenu" })}
          reducedMotion={settings.reducedMotion}
        />
      )}

      {screen === "modeMenu" && (
        <GameModeScreen
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          onBack={() => beginTransition({ screen: "home" })}
          onStart={startSelectedMode}
        />
      )}

      {screen === "transition" && (
        <ScreenTransition
          title="Switching displays"
          detail="Rolling the next ranch surface into place."
          reducedMotion={settings.reducedMotion}
        />
      )}

      {screen === "game" && (
        <section className={`${styles.screen} ${styles.gameScreen}`}>
          <GameStage
            backdropUrl={getGameplayRunPlan(currentLevel).backdropUrl}
            key={sessionId}
            level={currentLevel}
            mode={selectedMode}
            profile={runProfile ?? effectiveProfile}
            reducedMotion={settings.reducedMotion}
            onSummaryChange={() => undefined}
            onEvent={handleStageEvent}
            onRoundEnd={handleRoundEnd}
          />
          {pendingRoundResult && (
            <EndlessGameOverWindow
              result={pendingRoundResult}
              onReplay={() => {
                setPendingRoundResult(null);
                beginTransition({ screen: "game", mode: selectedMode });
              }}
              onReturnHome={() => {
                setPendingRoundResult(null);
                beginTransition({ screen: "home" });
              }}
            />
          )}
          <WormRanchGameExit profile={runProfile ?? effectiveProfile} onLeave={returnHome} />
        </section>
      )}
    </main>
  );
}

