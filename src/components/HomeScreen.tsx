import type { ReactNode } from "react";
import styles from "./HomeScreen.module.css";

type HomeScreenProps = {
  installPrompt?: ReactNode;
  onBack: () => void;
  onStart: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({ installPrompt, onBack, onStart, onOpenSettings }: HomeScreenProps) {
  return (
    <section className={styles.shell} data-layout="compact-launch">
      <div className={styles.launchPanel}>
        <div className={styles.copyCluster}>
          <span className={styles.kicker}>Quick ride</span>
          <h2 className={styles.title}>Moonlit roundup</h2>
          <div className={styles.actions}>
            <button autoFocus className={styles.primary} onClick={onStart}>
              Start roundup
            </button>
            <button className={styles.secondary} onClick={onOpenSettings}>
              Ranch settings
            </button>
            <button className={styles.secondary} onClick={onBack}>
              Back to launch
            </button>
          </div>
          {installPrompt ? <div className={styles.inlineUtility}>{installPrompt}</div> : null}
        </div>
      </div>
    </section>
  );
}