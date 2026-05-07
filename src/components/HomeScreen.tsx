import type { ReactNode } from "react";
import styles from "./HomeScreen.module.css";

type HomeScanItem = {
  label: string;
  value: string;
};

type HomeScreenProps = {
  leadCopy: string;
  scanItems: HomeScanItem[];
  installPrompt?: ReactNode;
  onBack: () => void;
  onStart: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({ leadCopy, scanItems, installPrompt, onBack, onStart, onOpenSettings }: HomeScreenProps) {
  return (
    <section className={styles.shell} data-layout="compact-launch">
      <div className={styles.launchPanel}>
        <div className={styles.copyCluster}>
          <p className={styles.lead}>{leadCopy}</p>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={onBack}>
              Back to launch
            </button>
            <button className={styles.primary} onClick={onStart}>
              Start roundup
            </button>
            <button className={styles.secondary} onClick={onOpenSettings}>
              Ranch settings
            </button>
          </div>
          {installPrompt ? <div className={styles.inlineUtility}>{installPrompt}</div> : null}
        </div>
        <div className={styles.scanStrip} data-role="scan-strip">
          {scanItems.map((item) => (
            <div key={item.label} className={styles.scanItem}>
              <span className={styles.scanLabel}>{item.label}</span>
              <strong className={styles.scanValue}>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}