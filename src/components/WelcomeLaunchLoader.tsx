import { useEffect, useState, type CSSProperties } from "react";

import styles from "./WelcomeLaunchLoader.module.css";
import {
  getWelcomeLaunchLoaderPhase,
  getWelcomeLaunchLoaderProgress,
  getNextWelcomeLaunchLoaderDisplayProgress,
  shouldShowWelcomeLaunchLoader,
  type WelcomeLaunchLoaderSnapshot,
} from "./welcomeLaunchLoader";

type WelcomeLaunchLoaderProps = {
  snapshot: WelcomeLaunchLoaderSnapshot;
};

export function WelcomeLaunchLoader({ snapshot }: WelcomeLaunchLoaderProps) {
  const targetProgress = getWelcomeLaunchLoaderProgress(snapshot);
  const [displayProgress, setDisplayProgress] = useState(targetProgress);
  const phase = getWelcomeLaunchLoaderPhase(snapshot);
  const progress = displayProgress;

  useEffect(() => {
    if (displayProgress === targetProgress) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDisplayProgress((currentProgress) =>
        getNextWelcomeLaunchLoaderDisplayProgress({
          current: currentProgress,
          target: targetProgress,
          reducedMotion: snapshot.reducedMotion,
        }),
      );
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [displayProgress, snapshot.reducedMotion, targetProgress]);

  if (!shouldShowWelcomeLaunchLoader(snapshot) && progress >= 100) {
    return null;
  }

  const checkpoints = [
    {
      label: "Pasture glass",
      value: snapshot.posterLoaded ? "locked" : "warming",
      ready: snapshot.posterLoaded,
    },
    {
      label: snapshot.introVideoExpected ? "Intro reel" : "Motion reel",
      value: snapshot.introVideoExpected ? (snapshot.introVideoCanPlay ? "charged" : snapshot.introVideoMetadataLoaded ? "indexed" : "spooling") : "skipped",
      ready: !snapshot.introVideoExpected || snapshot.introVideoCanPlay,
    },
    {
      label: "Gate line",
      value: progress >= 100 ? "armed" : targetProgress >= 100 ? "dropping" : "holding",
      ready: progress >= 100,
    },
  ];

  return (
    <div className={styles.loader} data-launch-loader-state="loading" aria-live="polite">
      <div className={styles.loaderPlate}>
        <div className={styles.loaderHeader}>
          <span className={styles.kicker}>Launch loadout</span>
          <strong className={styles.percent}>{progress}%</strong>
        </div>
        <div className={styles.phaseBlock}>
          <strong className={styles.title}>{phase.title}</strong>
          <p className={styles.detail}>{phase.detail}</p>
        </div>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ "--launch-progress": `${progress}%` } as CSSProperties} />
        </div>
        <div className={styles.checkpointGrid}>
          {checkpoints.map((checkpoint) => (
            <div key={checkpoint.label} className={styles.checkpoint} data-ready={checkpoint.ready ? "true" : "false"}>
              <span className={styles.checkpointLabel}>{checkpoint.label}</span>
              <strong className={styles.checkpointValue}>{checkpoint.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}