import styles from "./WelcomeScreen.module.css";

type WelcomeMetric = {
  label: string;
  value: string;
};

type WelcomeScreenProps = {
  metrics: WelcomeMetric[];
  onOpenGate: () => void;
  onRigTack: () => void;
};

export function WelcomeScreen({ metrics, onOpenGate, onRigTack }: WelcomeScreenProps) {
  return (
    <section className={styles.welcomeScreen}>
      <div className={styles.heroCard}>
        <div className={styles.welcomeVisual} aria-hidden="true">
          <div className={styles.orbitMoon} />
          <div className={styles.wormTrail} />
          <div className={styles.wormTrailAlt} />
          <div className={styles.corralFence} />
          <div className={styles.signalDish} />
          <div className={styles.fairyGlow} />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.heroDeck}>
            Big-screen runs open the whole pasture. Touch runs compress the chase into thumb reach without easing the
            panic.
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