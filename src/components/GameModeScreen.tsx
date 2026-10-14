import { GAME_MODES, type GameMode } from "@/game/gameModes";
import styles from "./GameModeScreen.module.css";

type GameModeScreenProps = {
  onBack: () => void;
  onSelectMode: (mode: GameMode) => void;
  onStart: () => void;
  selectedMode: GameMode;
};

export function GameModeScreen({ onBack, onSelectMode, onStart, selectedMode }: GameModeScreenProps) {
  return (
    <section className={styles.shell} data-layout="compact-mode-menu" aria-labelledby="game-mode-title">
      <header className={styles.headlineRow}>
        <div className={styles.copyCluster}>
          <span className={styles.eyebrow}>Game mode</span>
          <h2 className={styles.title} id="game-mode-title">
            Pick the next roundup.
          </h2>
        </div>
        <p>Choose the ride before the gate opens.</p>
      </header>

      <fieldset className={styles.optionCard}>
        <legend className={styles.optionTitle}>Available rides</legend>
        {GAME_MODES.map((mode) => (
          <label key={mode.id} className={styles.optionRow}>
            <input
              checked={selectedMode === mode.id}
              name="game-mode"
              onChange={() => onSelectMode(mode.id)}
              type="radio"
            />
            <span className={styles.modeCopy}>
              <span className={styles.modeTitle}>{mode.title}</span>
              <small className={styles.modeDescription}>{mode.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onBack}>
          Back
        </button>
        <button className={styles.primary} onClick={onStart}>
          Ride this mode
        </button>
      </div>
    </section>
  );
}
