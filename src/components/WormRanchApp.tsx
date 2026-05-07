"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./WormRanchApp.module.css";
import { GameStage } from "@/components/GameStage";
import { HomeScreen } from "@/components/HomeScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { WormRanchInstallPrompt } from "@/components/WormRanchInstallPrompt";
import { WormRanchGameExit } from "@/components/WormRanchGameExit";
import { SettingsScreen } from "@/components/SettingsScreen";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WormRanchShellHeader } from "@/components/WormRanchShellHeader";
import {
  getGameplayRunPlan,
  getInitialGameplayRunPlan,
  getGameplayRoundTransition,
  getPlayedRoundLevelResult,
} from "@/components/wormRanchLevelFlow";
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
import type { RoundResult } from "@/game/types";
import { createSilentLogger, type EventName } from "@/lib/logger";

type AppScreen = "welcome" | "home" | "settings" | "game" | "results";
type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type PlayedRoundResult = ReturnType<typeof getPlayedRoundLevelResult>;

const FAIRY_LIFT_COPY = "Clean catches still lift into fairies and drift out of the ranch glow.";

export function WormRanchApp() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [detectedDisplay, setDetectedDisplay] = useState<DisplaySnapshot | null>(null);
  const [runProfile, setRunProfile] = useState<DisplayProfile | null>(null);
  const [result, setResult] = useState<PlayedRoundResult | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(getInitialGameplayRunPlan().level);
  const [nextRunPlan, setNextRunPlan] = useState(getInitialGameplayRunPlan);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
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

  const handleRoundEnd = useCallback((roundResult: RoundResult) => {
    const roundTransition = getGameplayRoundTransition(currentLevelRef.current, roundResult);
    setResult(roundTransition.playedRoundResult);
    setNextRunPlan(roundTransition.nextRunPlan);
    setScreen("results");
  }, []);

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
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isDeferredInstallPromptEvent(event)) {
        return;
      }

      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallPromptDismissed(false);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallPromptDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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
      activeScreen === "game" || activeScreen === "results"
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
    const profile =
      screen === "game" || screen === "results"
        ? runProfileRef.current ?? effectiveProfileRef.current
        : effectiveProfileRef.current;

    logEvent("screen_viewed", undefined, screen, settingsRef.current.analyticsEnabled, profile);
  }, [logEvent, screen]);

  const handleInstallRequest = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    const pendingPrompt = installPromptEvent;
    await pendingPrompt.prompt();
    await pendingPrompt.userChoice;
    setInstallPromptEvent(null);
    setInstallPromptDismissed(true);
  }, [installPromptEvent]);

  const beginRun = async () => {
    const nextRunProfile = effectiveProfile;
    const runPlan = screenRef.current === "results" ? nextRunPlan : getInitialGameplayRunPlan();
    const nextRunLevel = runPlan.level;
    const nextSessionId = crypto.randomUUID();
    const nextBackdropUrl = runPlan.backdropUrl;

    await preloadGameplayBackdrop(nextBackdropUrl);

    sessionIdRef.current = nextSessionId;
    runProfileRef.current = nextRunProfile;
    currentLevelRef.current = nextRunLevel;

    setCurrentLevel(nextRunLevel);
    setNextRunPlan(runPlan);
    setSessionId(nextSessionId);
    setRunProfile(nextRunProfile);
    setResult(null);
    setScreen("game");
  };

  const returnHome = () => {
    const initialRunPlan = getInitialGameplayRunPlan();

    currentLevelRef.current = initialRunPlan.level;
    setCurrentLevel(initialRunPlan.level);
    setNextRunPlan(initialRunPlan);
    setResult(null);
    setScreen("home");
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    writeStoredSettings({ ...settings, [key]: value });
  };

  const shellProfile = screen === "game" || screen === "results" ? runProfile ?? effectiveProfile : effectiveProfile;
  const shellScanProfile: DisplayProfile | "scanning" =
    screen === "game" || screen === "results" ? shellProfile : detectedDisplay?.profile ?? "scanning";
  const activeShellLevel = screen === "results" && result ? result.level : currentLevel;
  const profileRules =
    screen === "game" || screen === "results"
      ? getGameplayLevelRules(shellProfile, activeShellLevel)
      : PROFILE_RULES[shellProfile];
  const installPromptVisible = installPromptEvent !== null && !installPromptDismissed;
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
      {screen !== "game" &&
        (screen === "welcome" ? (
          <WormRanchShellHeader density="welcome" shellProfile={shellProfile} shellScanProfile={shellScanProfile} />
        ) : (
          <WormRanchShellHeader
            shellProfile={shellProfile}
            shellScanProfile={shellScanProfile}
            totalWorms={profileRules.totalWorms}
          />
        ))}
      {screen === "welcome" && (
        <WelcomeScreen
          metrics={welcomeMetrics}
          onOpenGate={() => setScreen("home")}
          onRigTack={() => setScreen("settings")}
          reducedMotion={settings.reducedMotion}
        />
      )}

      {screen === "home" && (
        <HomeScreen
          installPrompt={
            <WormRanchInstallPrompt
              visible={installPromptVisible}
              placement="inline"
              onInstall={handleInstallRequest}
              onDismiss={() => setInstallPromptDismissed(true)}
            />
          }
          onBack={() => setScreen("welcome")}
          onOpenSettings={() => setScreen("settings")}
          onStart={beginRun}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          analyticsEnabled={settings.analyticsEnabled}
          displayMode={settings.displayMode}
          onAnalyticsEnabledChange={(value) => updateSetting("analyticsEnabled", value)}
          onBack={() => setScreen("home")}
          onDisplayModeChange={(value) => updateSetting("displayMode", value)}
          onReducedMotionChange={(value) => updateSetting("reducedMotion", value)}
          onStart={beginRun}
          reducedMotion={settings.reducedMotion}
        />
      )}

      {screen === "game" && (
        <section className={`${styles.screen} ${styles.gameScreen}`}>
          <GameStage
            backdropUrl={getGameplayRunPlan(currentLevel).backdropUrl}
            key={sessionId}
            level={currentLevel}
            profile={runProfile ?? effectiveProfile}
            reducedMotion={settings.reducedMotion}
            onSummaryChange={() => undefined}
            onEvent={handleStageEvent}
            onRoundEnd={handleRoundEnd}
          />
          <WormRanchGameExit profile={runProfile ?? effectiveProfile} onLeave={returnHome} />
        </section>
      )}

      {screen === "results" && result && (
        <ResultsScreen
          outcome={formatReason(result.reason)}
          bagged={result.collected}
          level={result.level}
          leftLoose={result.remaining}
          note={getResultsNote(result.level)}
          onReplay={beginRun}
          onReturnHome={returnHome}
        />
      )}
    </main>
  );
}

function preloadGameplayBackdrop(backdropUrl: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new window.Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    image.src = backdropUrl;

    if (image.complete) {
      finish();
      return;
    }

    image.decode?.().then(finish, finish);
  });
}

function formatReason(reason: RoundResult["reason"]) {
  if (reason === "captured") {
    return "Corral cleared";
  }

  if (reason === "ghostEscape") {
    return "Outlaw escaped";
  }

  return "Clock ran dry";
}

function getResultsNote(level: number) {
  const mobileRules = getGameplayLevelRules("mobile", level);
  const tapLabel = mobileRules.touchBurstsToCapture === 1 ? "tap" : "taps";

  return `${FAIRY_LIFT_COPY} On desktop, the last outlaw is designed to escape. On mobile, the first touch wakes the herd. Tagged worms need ${mobileRules.touchBurstsToCapture} clean ${tapLabel} total.`;
}

function isDeferredInstallPromptEvent(event: Event): event is DeferredInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}
