import { useState, useSyncExternalStore } from "react";
import Image from "next/image";

import styles from "./WelcomeScreen.module.css";
import { WelcomeLaunchLoader } from "./WelcomeLaunchLoader";
import {
  MOBILE_LAYOUT_MAX_WIDTH,
  getWelcomeHeroPresentation,
  getWelcomeHeroVariant,
} from "./welcomeHeroPresentation";
import {
  shouldShowWelcomeLaunchLoader,
  type WelcomeLaunchLoaderSnapshot,
} from "./welcomeLaunchLoader";
import {
  getInitialWelcomeLaunchMediaState,
  getNextWelcomeLaunchMediaState,
} from "./welcomeLaunchMedia";

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
  const launchMediaKey = `${heroVariant.layout}:${reducedMotion ? "reduced" : "full"}`;

  return (
    <section className={styles.welcomeScreen} data-layout="full-bleed-hero">
      <div className={styles.heroStage} data-hero-stage="full-bleed">
        <WelcomeHeroMedia
          key={launchMediaKey}
          ambientMotionEnabled={presentation.ambientMotionLayersEnabled}
          heroVariant={heroVariant}
          reducedMotion={reducedMotion}
        />
        <div className={styles.heroCopyLayer} data-hero-copy-layer="overlay" data-safe-zone={heroVariant.textSafeZone}>
          <div className={styles.heroCopy}>
            <p className={styles.heroDeck}>Open the gate, or rig the tack first.</p>
            <div className={styles.actions}>
              <button autoFocus className={`${styles.actionButton} ${styles.primaryButton}`} onClick={onOpenGate}>
                Open the gate
              </button>
              <button className={`${styles.actionButton} ${styles.secondaryButton}`} onClick={onRigTack}>
                Rig the tack
              </button>
            </div>
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

type WelcomeHeroMediaProps = {
  ambientMotionEnabled: boolean;
  heroVariant: ReturnType<typeof getWelcomeHeroVariant>;
  reducedMotion: boolean;
};

function WelcomeHeroMedia({ ambientMotionEnabled, heroVariant, reducedMotion }: WelcomeHeroMediaProps) {
  const [launchMediaState, setLaunchMediaState] = useState(() =>
    getInitialWelcomeLaunchMediaState({ reducedMotion, introVideoSrc: heroVariant.introVideoSrc }),
  );
  const [posterLoaded, setPosterLoaded] = useState(true);
  const [introVideoMetadataLoaded, setIntroVideoMetadataLoaded] = useState(false);
  const [introVideoCanPlay, setIntroVideoCanPlay] = useState(false);
  const videoAllowed = Boolean(heroVariant.introVideoSrc) && !reducedMotion;
  const showIntroVideo = videoAllowed;
  const loaderSnapshot: WelcomeLaunchLoaderSnapshot = {
    reducedMotion,
    posterLoaded,
    introVideoExpected: videoAllowed && launchMediaState !== "image",
    introVideoMetadataLoaded,
    introVideoCanPlay,
    launchMediaState,
  };
  const showLaunchLoader = shouldShowWelcomeLaunchLoader(loaderSnapshot);

  const handleIntroVideoCanPlay = () => {
    setIntroVideoCanPlay(true);
    setLaunchMediaState((currentState) => getNextWelcomeLaunchMediaState(currentState, "video-ready"));
  };

  return (
    <div
      className={styles.welcomeVisual}
      data-ambient-motion={ambientMotionEnabled ? "enabled" : "disabled"}
      data-crop-intent={heroVariant.cropIntent}
      data-hero-media-surface="full-bleed"
      data-launch-media={launchMediaState}
      data-launch-loader-state={showLaunchLoader ? "loading" : "ready"}
      data-overlay-strength={heroVariant.overlayStrength}
      data-safe-zone={heroVariant.textSafeZone}
    >
      <div className={styles.heroImageLayer}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroImage}
          fill
          onLoad={() => setPosterLoaded(true)}
          preload
          sizes={HERO_IMAGE_SIZES}
          style={{ objectPosition: heroVariant.imageObjectPosition }}
          src={heroVariant.src}
        />
      </div>
      <WelcomeLaunchLoader snapshot={loaderSnapshot} />
      {showIntroVideo && heroVariant.introVideoSrc ? (
        <div
          className={styles.heroVideoLayer}
          data-launch-state={launchMediaState}
          onAnimationEnd={() => {
            if (launchMediaState === "handoff") {
              setLaunchMediaState((currentState) => getNextWelcomeLaunchMediaState(currentState, "handoff-finished"));
            }
          }}
        >
          <video
            aria-hidden="true"
            autoPlay
            className={styles.heroVideo}
            muted
            onCanPlay={handleIntroVideoCanPlay}
            onEnded={() => setLaunchMediaState((currentState) => getNextWelcomeLaunchMediaState(currentState, "video-ended"))}
            onError={() => setLaunchMediaState((currentState) => getNextWelcomeLaunchMediaState(currentState, "video-error"))}
            onLoadedMetadata={() => setIntroVideoMetadataLoaded(true)}
            playsInline
            preload="metadata"
            src={heroVariant.introVideoSrc}
            style={{ objectPosition: heroVariant.videoObjectPosition }}
          />
        </div>
      ) : null}
    </div>
  );
}