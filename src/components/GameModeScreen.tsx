"use client";

import React from "react";
import styles from "./GameModeScreen.module.css";

export type GameModeScreenProps = {
  selectedMode: "standard" | "targetEndless";
  onModeChange: (mode: "standard" | "targetEndless") => void;
  onBack: () => void;
  onStart: () => void;
};

const MODES: ReadonlyArray<{
  id: "standard" | "targetEndless";
  title: string;
  description: string;
}> = [
  {
    id: "standard",
    title: "Standard Run",
    description: "Level-based rounds with increasing difficulty. Complete rounds to advance.",
  },
  {
    id: "targetEndless",
    title: "Endless Target Color",
    description: "Continuous play. Bag the target color twice, then a new target appears. Miss the target color and it's game over.",
  },
];

export function GameModeScreen({
  selectedMode,
  onModeChange,
  onBack,
  onStart,
}: GameModeScreenProps) {
  return (
    <section className={styles.screen} role="dialog" aria-modal="true" aria-labelledby="mode-title">
      <header className={styles.header}>
        <h1 id="mode-title" className={styles.title}>
          Choose Game Mode
        </h1>
        <button className={styles.back} onClick={onBack} aria-label="Back to yard">
          Back
        </button>
      </header>

      <div className={styles.options}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`${styles.option} ${selectedMode === mode.id ? styles.selected : ""}`}
            onClick={() => onModeChange(mode.id)}
            aria-pressed={selectedMode === mode.id}
          >
            <div className={styles.optionContent}>
              <h2 className={styles.optionTitle}>{mode.title}</h2>
              <p className={styles.optionDesc}>{mode.description}</p>
            </div>
            {selectedMode === mode.id && <span className={styles.check} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <footer className={styles.footer}>
        <button className={styles.start} onClick={onStart} disabled={!selectedMode}>
          Start Roundup
        </button>
      </footer>
    </section>
  );
}