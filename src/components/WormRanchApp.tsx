"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./WormRanchApp.module.css";
import { GameStage } from "@/components/GameStage";
import { detectDisplayProfile, type DisplayMode, type DisplayProfile, type DisplaySnapshot } from "@/game/detection";
import { PROFILE_RULES, type GameSummary, type RoundResult } from "@/game/engine";
import { createSilentLogger, type EventName } from "@/lib/logger";

type Screen = "welcome" | "home" | "settings" | "game" | "results";

type SettingsState = {
  analyticsEnabled: boolean;
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  displayMode: DisplayMode;
};

const SETTINGS_KEY = "worm-ranch-settings";
const SETTINGS_EVENT = "worm-ranch-settings-change";

const defaultSettings: SettingsState = {
  analyticsEnabled: true,
  reducedMotion: false,
  hapticsEnabled: true,
  displayMode: "auto",
};

const emptySummary: GameSummary = {
  profile: "desktop",
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
  const [screen, setScreen] = useState<Screen>("welcome");
  const [detectedDisplay, setDetectedDisplay] = useState<DisplaySnapshot | null>(null);
  const [summary, setSummary] = useState<GameSummary>(emptySummary);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const loggerRef = useRef(createSilentLogger("/api/events"));
  const settings = useSyncExternalStore(subscribeToSettings, getStoredSettingsSnapshot, getStoredSettingsSnapshot);

  const effectiveProfile = useMemo<DisplayProfile>(() => {
    if (settings.displayMode !== "auto") {
      return settings.displayMode;
    }

    return detectedDisplay?.profile ?? "desktop";
  }, [detectedDisplay?.profile, settings.displayMode]);

  const logEvent = useCallback(
    (name: EventName, details: Record<string, unknown> | undefined, activeScreen: string, enabled: boolean) => {
      if (!enabled) {
        return;
      }

      loggerRef.current.log({
        name,
        details,
        sessionId,
        profile: effectiveProfile,
        screen: activeScreen,
      });
    },
    [effectiveProfile, sessionId],
  );

  useEffect(() => {
    const logger = loggerRef.current;

    const updateProfile = () => setDetectedDisplay(detectDisplayProfile(window));

    updateProfile();
    window.addEventListener("resize", updateProfile);
    logEvent("app_opened", { firstScreen: screen }, "welcome", settings.analyticsEnabled);

    return () => {
      window.removeEventListener("resize", updateProfile);
      logger.dispose();
    };
  }, [logEvent, screen, settings.analyticsEnabled]);

  useEffect(() => {
    if (!detectedDisplay) {
      return;
    }

    logEvent("settings_changed", settings, screen, settings.analyticsEnabled);
  }, [detectedDisplay, logEvent, screen, settings]);

  useEffect(() => {
    if (!detectedDisplay) {
      return;
    }

    logEvent("screen_viewed", { screen, effectiveProfile }, screen, settings.analyticsEnabled);
  }, [detectedDisplay, effectiveProfile, logEvent, screen, settings.analyticsEnabled]);

  const beginRun = () => {
    setSessionId(crypto.randomUUID());
    setResult(null);
    setSummary({
      ...emptySummary,
      profile: effectiveProfile,
      remaining: PROFILE_RULES[effectiveProfile].totalWorms,
      timerMs: PROFILE_RULES[effectiveProfile].timeLimitMs,
    });
    setScreen("game");
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    writeStoredSettings({ ...settings, [key]: value });
  };

  const profileRules = PROFILE_RULES[effectiveProfile];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.eyebrow}>Display-aware chase toy</span>
          <h1 className={styles.title}>Worm Ranch</h1>
          <p className={styles.subtle}>
            A cursor panic toy with escalating speed, one-shot teleports, and a final worm that was never built
            to lose.
          </p>
        </div>
        <div className={styles.chips}>
          <span className={styles.chip}>Auto display: {detectedDisplay?.profile ?? "scanning"}</span>
          <span className={styles.chip}>Active rules: {effectiveProfile}</span>
          <span className={styles.chip}>Target count: {profileRules.totalWorms}</span>
        </div>
      </header>

      {screen === "welcome" && (
        <section className={styles.screen}>
          <div className={styles.hero}>
            <div className={styles.welcomeVisual} aria-hidden="true">
              <div className={styles.wormTrail} />
              <div className={styles.wormTrailAlt} />
              <div className={styles.fairyGlow} />
            </div>
            <div>
              <div className={styles.actions}>
                <button className={styles.primary} onClick={() => setScreen("home")}>
                  Enter the ranch
                </button>
                <button className={styles.secondary} onClick={() => setScreen("settings")}>
                  Tune settings
                </button>
              </div>
            </div>
          </div>
          <div className={styles.dashboard}>
            <Metric label="Desktop rule" value="100 worms" />
            <Metric label="Mobile rule" value="10 worms" />
            <Metric label="Fairy morph" value="enabled" />
            <Metric label="Telemetry" value={settings.analyticsEnabled ? "silent" : "off"} />
          </div>
        </section>
      )}

      {screen === "home" && (
        <section className={styles.screen}>
          <div className={styles.hero}>
            <p className={styles.subtle}>
              Desktop starts with 100 worms and every catch makes the rest faster by 0.1. Mobile starts with 10
              worms and each one needs two double-taps. From catch 50 onward, desktop worms blink away once when you
              line up a perfect hit.
            </p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={beginRun}>
                Start hunt
              </button>
              <button className={styles.secondary} onClick={() => setScreen("settings")}>
                Settings
              </button>
            </div>
          </div>
          <div className={styles.dashboard}>
            <Metric label="Display mode" value={settings.displayMode} />
            <Metric label="Pointer" value={detectedDisplay?.pointer ?? "unknown"} />
            <Metric label="Orientation" value={detectedDisplay?.orientation ?? "unknown"} />
            <Metric label="Viewport" value={`${detectedDisplay?.width ?? 0} x ${detectedDisplay?.height ?? 0}`} />
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className={styles.panel}>
          <h2>Settings</h2>
          <div className={styles.settingsGrid}>
            <div className={styles.toggleRow}>
              <strong>Display profile</strong>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "auto"}
                  onChange={() => updateSetting("displayMode", "auto")}
                />
                Auto detect
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "desktop"}
                  onChange={() => updateSetting("displayMode", "desktop")}
                />
                Force desktop
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  checked={settings.displayMode === "mobile"}
                  onChange={() => updateSetting("displayMode", "mobile")}
                />
                Force mobile
              </label>
            </div>

            <div className={styles.toggleRow}>
              <strong>Comfort and logging</strong>
              <label>
                <input
                  type="checkbox"
                  checked={settings.analyticsEnabled}
                  onChange={(event) => updateSetting("analyticsEnabled", event.target.checked)}
                />
                Silent analytics
              </label>
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
                  checked={settings.hapticsEnabled}
                  onChange={(event) => updateSetting("hapticsEnabled", event.target.checked)}
                />
                Haptics ready
              </label>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => setScreen("home")}>
              Back home
            </button>
            <button className={styles.secondary} onClick={beginRun}>
              Start with these rules
            </button>
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className={styles.screen}>
          <div className={styles.hud}>
            <Metric label="Collected worms" value={String(summary.collected)} />
            <Metric label="Remaining" value={String(summary.remaining)} />
            <Metric label="Speed bonus" value={`+${summary.speedBonus.toFixed(1)}`} />
            <Metric label="Fairies drifting" value={String(summary.fairies)} />
          </div>
          <GameStage
            key={sessionId}
            profile={effectiveProfile}
            reducedMotion={settings.reducedMotion}
            sessionId={sessionId}
            onSummaryChange={setSummary}
            onEvent={(name, details) => logEvent(name, details, "game", settings.analyticsEnabled)}
            onRoundEnd={(roundResult) => {
              setResult(roundResult);
              setScreen("results");
            }}
          />
          <div className={styles.dashboard}>
            <Metric label="Countdown" value={summary.countdownMs > 0 ? `${Math.ceil(summary.countdownMs / 1000)}` : "live"} />
            <Metric label="Timer" value={`${Math.ceil(summary.timerMs / 1000)}s`} />
            <Metric label="Teleport band" value={summary.teleportsUnlocked ? "armed" : "locked"} />
            <Metric label="Rush status" value={summary.rushTriggered ? "full panic" : "steady"} />
          </div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => setScreen("home")}>
              Leave round
            </button>
          </div>
        </section>
      )}

      {screen === "results" && result && (
        <section className={styles.results}>
          <h2>Round results</h2>
          <div className={styles.resultsGrid}>
            <Metric label="Outcome" value={formatReason(result.reason)} />
            <Metric label="Collected" value={String(result.collected)} />
            <Metric label="Left alive" value={String(result.remaining)} />
          </div>
          <p className={styles.note}>
            Successful catches morph into fairies and float away. On desktop, the last worm is designed to escape.
            On mobile, each worm still expects two deliberate double-taps.
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={beginRun}>
              Run it again
            </button>
            <button className={styles.secondary} onClick={() => setScreen("home")}>
              Home
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
    </div>
  );
}

function formatReason(reason: RoundResult["reason"]) {
  if (reason === "captured") {
    return "Field cleared";
  }

  if (reason === "escaped") {
    return "Final worm escaped";
  }

  return "Timer expired";
}

function subscribeToSettings(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(SETTINGS_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SETTINGS_EVENT, handleChange);
  };
}

function getStoredSettingsSnapshot() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  return readStoredSettings(window.localStorage.getItem(SETTINGS_KEY));
}

function readStoredSettings(rawSettings: string | null): SettingsState {
  if (!rawSettings) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...(JSON.parse(rawSettings) as Partial<SettingsState>) };
  } catch {
    return defaultSettings;
  }
}

function writeStoredSettings(settings: SettingsState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}
