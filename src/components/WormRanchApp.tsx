"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./WormRanchApp.module.css";
import { GameStage } from "@/components/GameStage";
import { HomeScreen } from "@/components/HomeScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { WormRanchInstallPrompt } from "@/components/WormRanchInstallPrompt";
import { WormRanchGameExit } from "@/components/WormRanchGameExit";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WormRanchShellHeader } from "@/components/WormRanchShellHeader";
import { areDisplaySnapshotsEqual, getProfileDetectedDetails } from "@/lib/analytics";
import { detectDisplayProfile, type DisplayProfile, type DisplaySnapshot } from "@/game/detection";
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

const MOBILE_ROUNDUP_COPY = "The first touch wakes the herd. Land one clean tap to tag a worm, then another on that same worm to bag it.";
const FAIRY_LIFT_COPY = "Clean catches still lift into fairies and drift out of the ranch glow.";

export function WormRanchApp() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [detectedDisplay, setDetectedDisplay] = useState<DisplaySnapshot | null>(null);
  const [runProfile, setRunProfile] = useState<DisplayProfile | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);
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
    setResult(roundResult);
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

  const beginRun = () => {
    const nextRunProfile = effectiveProfile;
    const nextSessionId = crypto.randomUUID();

    sessionIdRef.current = nextSessionId;
    runProfileRef.current = nextRunProfile;

    setSessionId(nextSessionId);
    setRunProfile(nextRunProfile);
    setResult(null);
    setScreen("game");
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    writeStoredSettings({ ...settings, [key]: value });
  };

  const shellProfile = screen === "game" || screen === "results" ? runProfile ?? effectiveProfile : effectiveProfile;
  const shellScanProfile: DisplayProfile | "scanning" =
    screen === "game" || screen === "results" ? shellProfile : detectedDisplay?.profile ?? "scanning";
  const profileRules = PROFILE_RULES[shellProfile];
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
          leadCopy={
            "Desktop opens a full pasture of 100 worms and every bagged one whips 0.1 more speed into the herd. " +
            `Mobile opens with 10 worms: ${MOBILE_ROUNDUP_COPY} ` +
            "After catch 50, desktop worms get one blink through the fence before they can be penned."
          }
          scanItems={[
            { label: "Tack mode", value: settings.displayMode },
            { label: "Reins", value: detectedDisplay?.pointer ?? "unknown" },
            { label: "Horizon", value: detectedDisplay?.orientation ?? "unknown" },
            { label: "Pasture glass", value: `${detectedDisplay?.width ?? 0} x ${detectedDisplay?.height ?? 0}` },
          ]}
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
        <section className={styles.panel}>
          <h2>Ranch settings</h2>
          <div className={styles.settingsGrid}>
            <div className={styles.toggleRow}>
              <strong>Display mode</strong>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "auto"}
                  onChange={() => updateSetting("displayMode", "auto")}
                />
                Auto scout
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "desktop"}
                  onChange={() => updateSetting("displayMode", "desktop")}
                />
                Force desktop corral
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "mobile"}
                  onChange={() => updateSetting("displayMode", "mobile")}
                />
                Force pocket corral
              </label>
            </div>

            <div className={styles.toggleRow}>
              <strong>Preferences</strong>
              <label>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(event) => updateSetting("reducedMotion", event.target.checked)}
                />
                Reduced motion
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.analyticsEnabled}
                  onChange={(event) => updateSetting("analyticsEnabled", event.target.checked)}
                />
                Silent analytics
              </label>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => setScreen("home")}>
              Back to yard
            </button>
            <button className={styles.secondary} onClick={beginRun}>
              Ride this setup
            </button>
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className={`${styles.screen} ${styles.gameScreen}`}>
          <GameStage
            key={sessionId}
            profile={runProfile ?? effectiveProfile}
            reducedMotion={settings.reducedMotion}
            onSummaryChange={() => undefined}
            onEvent={handleStageEvent}
            onRoundEnd={handleRoundEnd}
          />
          <WormRanchGameExit profile={runProfile ?? effectiveProfile} onLeave={() => setScreen("home")} />
        </section>
      )}

      {screen === "results" && result && (
        <ResultsScreen
          outcome={formatReason(result.reason)}
          bagged={result.collected}
          leftLoose={result.remaining}
          note={`${FAIRY_LIFT_COPY} On desktop, the last outlaw is designed to escape. On mobile, ${MOBILE_ROUNDUP_COPY.toLowerCase()}`}
          onReplay={beginRun}
          onReturnHome={() => setScreen("home")}
        />
      )}
    </main>
  );
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

function isDeferredInstallPromptEvent(event: Event): event is DeferredInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}
