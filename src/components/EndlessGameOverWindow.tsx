"use client";

import styles from "./EndlessGameOverWindow.module.css";
import { type RoundResult } from "@/game/types";

export type EndlessGameOverWindowProps = {
  result: RoundResult;
  onReplay: () => void;
  onReturnHome: () => void;
};

export function EndlessGameOverWindow({ result, onReplay, onReturnHome }: EndlessGameOverWindowProps) {
  const targetColor = result.targetColorId || "unknown";

  return (
    <section className={styles.overWindow} role="dialog" aria-modal="true" aria-labelledby="over-title">
      <header>
        <h2 id="over-title">Game Over</h2>
      </header>
      <p>Wrong color bagged. Target was {targetColor.toUpperCase()}.</p>
      <p>{result.collected} worms secured before the miss.</p>
      <div className={styles.overActions}>
        <button className={styles.replay} onClick={onReplay} autoFocus>
          Ride Again
        </button>
        <button className={styles.yard} onClick={onReturnHome}>
          Yard
        </button>
      </div>
    </section>
  );
}
