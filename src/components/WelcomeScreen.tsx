import { useSyncExternalStore } from "react";
import Image from "next/image";

import styles from "./WelcomeScreen.module.css";
import {
  MOBILE_LAYOUT_MAX_WIDTH,
  getWelcomeHeroPresentation,
  getWelcomeHeroVariant,
} from "./welcomeHeroPresentation";

type WelcomeMetric = {
  label: string;
  value: string;
};

type WelcomeScreenProps = {
  metrics: WelcomeMetric[];
  onOpenGate: () => void;
  onRigTack: () => void;
  reducedMotion: boolean;
};

const HERO_IMAGE_SIZES = "(max-width: 46rem) 100vw, (max-width: 72rem) 88vw, 92vw";
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

const subscribeToViewport = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
};

const getViewportWidthSnapshot = () => {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

  return mediaQuery.matches ? MOBILE_LAYOUT_MAX_WIDTH : MOBILE_LAYOUT_MAX_WIDTH + 1;
};

export function WelcomeScreen({ metrics, onOpenGate, onRigTack, reducedMotion }: WelcomeScreenProps) {
  const presentation = getWelcomeHeroPresentation({ reducedMotion });
  const viewportWidth = useSyncExternalStore(subscribeToViewport, getViewportWidthSnapshot, () => undefined);
  const heroVariant = getWelcomeHeroVariant(viewportWidth);

  return (
    <section className={styles.welcomeScreen}>
      <div
        className={styles.heroCard}
        data-ambient-motion={presentation.ambientMotionLayersEnabled ? "enabled" : "disabled"}
        data-crop-intent={heroVariant.cropIntent}
        data-safe-zone={heroVariant.textSafeZone}
        data-overlay-strength={heroVariant.overlayStrength}
      >
        <div className={styles.welcomeVisual} aria-hidden="true">
          <div className={styles.heroImageLayer}>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.heroImage}
              fill
              preload
              sizes={HERO_IMAGE_SIZES}
              src={heroVariant.src}
            />
          </div>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.heroDeck}>
            Cold light, loose dust, and one bad rider cutting across the pasture. Open the gate to step into it, or
            rig the tack first and set the ride your way.
          </p>
          <div className={styles.actions}>
            <button className={`${styles.actionButton} ${styles.primaryButton}`} onClick={onOpenGate}>
              Open the gate
            </button>
            <button className={`${styles.actionButton} ${styles.secondaryButton}`} onClick={onRigTack}>
              Rig the tack
            </button>
          </div>
        </div>
      </div>
      <div className={styles.metricsGrid}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.metricCard}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong className={styles.metricValue}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}