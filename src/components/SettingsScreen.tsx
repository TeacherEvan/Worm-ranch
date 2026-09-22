import type { DisplayMode } from "@/game/detection";
import type { DisplayDensityPreference } from "@/lib/wormRanchSettings";
import styles from "./SettingsScreen.module.css";

type SettingsScreenProps = {
  displayMode: DisplayMode;
  reducedMotion: boolean;
  analyticsEnabled: boolean;
  crtOverlay?: boolean;
  displayDensity?: DisplayDensityPreference;
  onDisplayModeChange: (value: DisplayMode) => void;
  onReducedMotionChange: (value: boolean) => void;
  onAnalyticsEnabledChange: (value: boolean) => void;
  onCrtOverlayChange?: (value: boolean) => void;
  onDisplayDensityChange?: (value: DisplayDensityPreference) => void;
  onBack: () => void;
  onStart: () => void;
};

export function SettingsScreen({
  displayMode,
  reducedMotion,
  analyticsEnabled,
  crtOverlay = false,
  displayDensity = "auto",
  onDisplayModeChange,
  onReducedMotionChange,
  onAnalyticsEnabledChange,
  onCrtOverlayChange,
  onDisplayDensityChange,
  onBack,
  onStart,
}: SettingsScreenProps) {
  return (
    <section className={styles.shell} data-layout="compact-settings">
      <div className={styles.headlineRow}>
        <div className={styles.copyCluster}>
          <span className={styles.eyebrow}>Ranch settings</span>
          <h2 className={styles.title}>Rig the run before the gate swings.</h2>
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={onBack}>
            Back to yard
          </button>
          <button className={styles.secondary} onClick={onStart}>
            Ride this setup
          </button>
        </div>
      </div>

      <div className={styles.optionGroups} data-role="option-groups">
        <fieldset className={styles.optionCard}>
          <legend className={styles.optionTitle}>Display mode</legend>
          <label className={styles.optionRow}>
            <input
              autoFocus
              type="radio"
              name="displayMode"
              checked={displayMode === "auto"}
              onChange={() => onDisplayModeChange("auto")}
            />
            <span>Auto scout</span>
          </label>
          <label className={styles.optionRow}>
            <input
              type="radio"
              name="displayMode"
              checked={displayMode === "desktop"}
              onChange={() => onDisplayModeChange("desktop")}
            />
            <span>Force desktop corral</span>
          </label>
          <label className={styles.optionRow}>
            <input
              type="radio"
              name="displayMode"
              checked={displayMode === "mobile"}
              onChange={() => onDisplayModeChange("mobile")}
            />
            <span>Force pocket corral</span>
          </label>
        </fieldset>

        <fieldset className={styles.optionCard}>
          <legend className={styles.optionTitle}>Preferences</legend>
          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => onReducedMotionChange(event.target.checked)}
            />
            <span>Reduced motion</span>
          </label>
          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(event) => onAnalyticsEnabledChange(event.target.checked)}
            />
            <span>Silent analytics</span>
          </label>
          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={crtOverlay}
              onChange={(event) => onCrtOverlayChange?.(event.target.checked)}
            />
            <span>CRT scanline overlay</span>
          </label>
        </fieldset>

        <fieldset className={styles.optionCard}>
          <legend className={styles.optionTitle}>Stage density</legend>
          {(
            [
              ["auto", "Auto scout"],
              ["focused", "Focused corral"],
              ["cinematic", "Cinematic bars"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.optionRow}>
              <input
                type="radio"
                name="displayDensity"
                checked={displayDensity === value}
                onChange={() => onDisplayDensityChange?.(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}