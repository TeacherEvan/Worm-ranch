"use client";

import { useEffect } from "react";

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
    <section aria-busy="true" aria-live="polite" data-layout="screen-transition" data-motion={reducedMotion ? "reduced" : "full"}>
      <span>Loading screen</span>
      <h2>Heading to {destinationLabel}</h2>
      <p>Settling the dust between screens.</p>
    </section>
  );
}
