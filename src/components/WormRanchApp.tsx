"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./WormRanchApp.module.css";
import motionStyles from "./WormRanchAppMotion.module.css";
import { GameStage } from "@/components/GameStage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WormRanchShellHeader } from "@/components/WormRanchShellHeader";
import { getMotionFeedback } from "@/components/gameStageMotion";
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
import type { GameSummary, RoundResult } from "@/game/types";
import { createSilentLogger, type EventName } from "@/lib/logger";

type AppScreen = "welcome" | "home" | "settings" | "game" | "results";
type MetricImpact = "idle" | "bagged" | "remaining" | "fairies" | "critical";
type MetricKey = "bagged" | "remaining" | "fairies" | "time";

const MOBILE_ROUNDUP_COPY = "The first touch wakes the herd. Land one clean tap to tag a worm, then another on that same worm to bag it.";
const FAIRY_LIFT_COPY = "Clean catches still lift into fairies and drift out of the ranch glow.";
const METRIC_IMPACT_MS: Record<Exclude<MetricImpact, "idle">, number> = {
  bagged: 360,
  remaining: 320,
  fairies: 520,
  critical: 820,
};

const emptySummary: GameSummary = {
  profile: "desktop",
  phase: "introCountdown",
  collected: 0,
  remaining: 100,
  fairies: 0,
  timerMs: PROFILE_RULES.desktop.timeLimitMs,
  speedBonus: 0,
  teleportsUnlocked: false,
  countdownMs: 0,
  finalWormActive: false,
  rushTriggered: false,
};

export function WormRanchApp() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [detectedDisplay, setDetectedDisplay] = useState<DisplaySnapshot | null>(null);
  const [runProfile, setRunProfile] = useState<DisplayProfile | null>(null);
  const [summary, setSummary] = useState<GameSummary>(emptySummary);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [metricImpacts, setMetricImpacts] = useState<Record<MetricKey, MetricImpact>>({
    bagged: "idle",
    remaining: "idle",
    fairies: "idle",
    time: "idle",
  });
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
  const previousSummaryRef = useRef<GameSummary | null>(null);
  const metricTimerRef = useRef<Record<MetricKey, number | null>>({
    bagged: null,
    remaining: null,
    fairies: null,
    time: null,
  });

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
    const metricTimers = metricTimerRef.current;

    return () => {
      for (const key of Object.keys(metricTimers) as MetricKey[]) {
        const timerId = metricTimers[key];
        if (timerId !== null) {
          window.clearTimeout(timerId);
        }
      }
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

  const triggerMetricImpact = useCallback((key: MetricKey, impact: Exclude<MetricImpact, "idle">) => {
    const activeTimer = metricTimerRef.current[key];
    if (activeTimer !== null) {
      window.clearTimeout(activeTimer);
    }

    setMetricImpacts((current) => ({ ...current, [key]: "idle" }));

    window.requestAnimationFrame(() => {
      setMetricImpacts((current) => ({ ...current, [key]: impact }));
      metricTimerRef.current[key] = window.setTimeout(() => {
        setMetricImpacts((current) => ({ ...current, [key]: "idle" }));
        metricTimerRef.current[key] = null;
      }, METRIC_IMPACT_MS[impact]);
    });
  }, []);

  const handleSummaryChange = useCallback(
    (nextSummary: GameSummary) => {
      const motionFeedback = getMotionFeedback(previousSummaryRef.current, nextSummary);

      previousSummaryRef.current = nextSummary;
      setSummary(nextSummary);

      if (motionFeedback.baggedBump) {
        triggerMetricImpact("bagged", "bagged");
      }

      if (motionFeedback.remainingDip) {
        triggerMetricImpact("remaining", "remaining");
      }

      if (motionFeedback.fairyBurst) {
        triggerMetricImpact("fairies", "fairies");
      }

      if (motionFeedback.timerAlert) {
        triggerMetricImpact("time", "critical");
      }
    },
    [triggerMetricImpact],
  );

  const beginRun = () => {
    const nextRunProfile = effectiveProfile;
    const nextSessionId = crypto.randomUUID();
    const nextRules = PROFILE_RULES[nextRunProfile];

    sessionIdRef.current = nextSessionId;
    runProfileRef.current = nextRunProfile;
    previousSummaryRef.current = null;
    setMetricImpacts({
      bagged: "idle",
      remaining: "idle",
      fairies: "idle",
      time: "idle",
    });

    setSessionId(nextSessionId);
    setRunProfile(nextRunProfile);
    setResult(null);
    setSummary({
      ...emptySummary,
      profile: nextRunProfile,
      remaining: nextRules.totalWorms,
      timerMs: nextRules.timeLimitMs,
      countdownMs: nextRules.introCountdownMs,
    });
    setScreen("game");
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    writeStoredSettings({ ...settings, [key]: value });
  };

  const shellProfile = screen === "game" || screen === "results" ? runProfile ?? effectiveProfile : effectiveProfile;
  const shellScanProfile: DisplayProfile | "scanning" =
    screen === "game" || screen === "results" ? shellProfile : detectedDisplay?.profile ?? "scanning";
  const profileRules = PROFILE_RULES[shellProfile];
  const welcomeMetrics = [
    { label: "Big corral", value: "100 worms" },
    { label: "Pocket corral", value: "10 worms" },
    { label: "Fairy lift", value: "enabled" },
    { label: "Trail log", value: settings.analyticsEnabled ? "silent" : "off" },
  ];

  return (
    <main
      className={styles.page}
      data-motion={settings.reducedMotion ? "reduced" : "full"}
      data-screen={screen}
    >
      {screen === "welcome" ? (
        <WormRanchShellHeader density="welcome" shellProfile={shellProfile} shellScanProfile={shellScanProfile} />
      ) : (
        <WormRanchShellHeader
          shellProfile={shellProfile}
          shellScanProfile={shellScanProfile}
          totalWorms={profileRules.totalWorms}
        />
      )}

      {screen === "welcome" && (
        <WelcomeScreen
          metrics={welcomeMetrics}
          onOpenGate={() => setScreen("home")}
          onRigTack={() => setScreen("settings")}
        />
      )}

      {screen === "home" && (
        <section className={`${styles.screen} ${styles.homeScreen}`}>
          <div className={`${styles.hero} ${styles.heroHome}`}>
            <div className={styles.heroCopy}>
              <p className={`${styles.subtle} ${styles.heroLead}`}>
                Desktop opens a full pasture of 100 worms and every bagged one whips 0.1 more speed into the herd.
                {" "}Mobile opens with 10 worms: {MOBILE_ROUNDUP_COPY}{" "}
                After catch 50, desktop worms get one blink through the fence before they can be penned.
              </p>
              <div className={styles.actions}>
                <button className={styles.primary} onClick={beginRun}>
                  Start roundup
                </button>
                <button className={styles.secondary} onClick={() => setScreen("settings")}>
                  Ranch settings
                </button>
              </div>
            </div>
          </div>
          <div className={styles.dashboard}>
            <Metric label="Tack mode" value={settings.displayMode} />
            <Metric label="Reins" value={detectedDisplay?.pointer ?? "unknown"} />
            <Metric label="Horizon" value={detectedDisplay?.orientation ?? "unknown"} />
            <Metric label="Pasture glass" value={`${detectedDisplay?.width ?? 0} x ${detectedDisplay?.height ?? 0}`} />
          </div>
        </section>
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
        <section className={styles.screen}>
          <div className={styles.hud}>
            <Metric label="Bagged" value={String(summary.collected)} impact={metricImpacts.bagged} />
            <Metric label="Remaining" value={String(summary.remaining)} impact={metricImpacts.remaining} />
            <Metric
              label="Time"
              value={`${Math.ceil(summary.timerMs / 1000)}s`}
              impact={summary.timerMs <= 15_000 ? metricImpacts.time : "idle"}
              urgent={summary.timerMs <= 15_000}
            />
            <Metric label="Fairies" value={String(summary.fairies)} impact={metricImpacts.fairies} />
          </div>
          <GameStage
            key={sessionId}
            profile={runProfile ?? effectiveProfile}
            reducedMotion={settings.reducedMotion}
            onSummaryChange={handleSummaryChange}
            onEvent={handleStageEvent}
            onRoundEnd={handleRoundEnd}
          />
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => setScreen("home")}>
              Leave corral
            </button>
          </div>
        </section>
      )}

      {screen === "results" && result && (
        <section className={styles.results}>
          <h2>Round tally</h2>
          <div className={styles.resultsGrid}>
            <Metric label="Outcome" value={formatReason(result.reason)} />
            <Metric label="Bagged" value={String(result.collected)} />
            <Metric label="Left loose" value={String(result.remaining)} />
          </div>
          <p className={styles.note}>
            {FAIRY_LIFT_COPY} On desktop, the last outlaw is designed to escape. On mobile, {MOBILE_ROUNDUP_COPY.toLowerCase()}
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={beginRun}>
              Ride again
            </button>
            <button className={styles.secondary} onClick={() => setScreen("home")}>
              Yard
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  impact = "idle",
  urgent = false,
}: {
  label: string;
  value: string;
  impact?: MetricImpact;
  urgent?: boolean;
}) {
  return (
    <div
      className={`${styles.metric} ${motionStyles.metricShell}`}
      data-impact={impact}
      data-urgent={urgent ? "true" : "false"}
    >
      <span className={styles.metricLabel}>{label}</span>
      <strong className={`${styles.metricValue} ${motionStyles.metricValue}`} data-impact={impact}>
        {value}
      </strong>
    </div>
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
