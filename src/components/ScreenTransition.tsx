"use client";

import { useEffect } from "react";
import styles from "./ScreenTransition.module.css";

type ScreenTransitionProps = {
  destinationLabel: string;
  onReady: () => void;
  reducedMotion: boolean;
};

const TRANSITION_DELAY_MS = 160;

export function ScreenTransition({ destinationLabel, onReady, reducedMotion }: ScreenTransitionProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onReady, reducedMotion ? 0 : TRANSITION_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onReady, reducedMotion]);

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={styles.shell}
      data-layout="screen-transition"
      data-motion={reducedMotion ? "reduced" : "full"}
    >
      <span className={styles.eyebrow}>Loading screen</span>
      <h2 className={styles.title}>Heading to {destinationLabel}</h2>
      <p className={styles.note}>Settling the dust between screens.</p>
    </section>
  );
}
