import type { DisplayMode } from "@/game/detection";
import type { AnalyticsEvent } from "@/lib/logger";

export type SettingsState = {
  analyticsEnabled: boolean;
  reducedMotion: boolean;
  displayMode: DisplayMode;
};

const SETTINGS_KEY = "worm-ranch-settings";
const SETTINGS_EVENT = "worm-ranch-settings-change";

export const defaultSettings: SettingsState = {
  analyticsEnabled: true,
  reducedMotion: false,
  displayMode: "auto",
};

export function subscribeToSettings(onStoreChange: () => void) {
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

export function getStoredSettingsSnapshot() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  return readStoredSettings(window.localStorage.getItem(SETTINGS_KEY));
}

export function writeStoredSettings(settings: SettingsState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function areSettingsEqual(left: SettingsState, right: SettingsState) {
  return (
    left.analyticsEnabled === right.analyticsEnabled &&
    left.reducedMotion === right.reducedMotion &&
    left.displayMode === right.displayMode
  );
}

export function getSettingsDetails(settings: SettingsState): AnalyticsEvent["details"] {
  return {
    analyticsEnabled: settings.analyticsEnabled,
    reducedMotion: settings.reducedMotion,
    displayMode: settings.displayMode,
  };
}

function readStoredSettings(rawSettings: string | null): SettingsState {
  if (!rawSettings) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<Record<keyof SettingsState, unknown>>;

    return {
      analyticsEnabled:
        typeof parsed.analyticsEnabled === "boolean" ? parsed.analyticsEnabled : defaultSettings.analyticsEnabled,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : defaultSettings.reducedMotion,
      displayMode:
        parsed.displayMode === "auto" || parsed.displayMode === "desktop" || parsed.displayMode === "mobile"
          ? parsed.displayMode
          : defaultSettings.displayMode,
    };
  } catch {
    return defaultSettings;
  }
}