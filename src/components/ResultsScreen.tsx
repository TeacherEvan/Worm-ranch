import styles from "./ResultsScreen.module.css";

type ResultsScreenProps = {
  outcome: string;
  bagged: number;
  level: number;
  leftLoose: number;
  note: string;
  onReplay: () => void;
  onReturnHome: () => void;
};

export function ResultsScreen({ outcome, bagged, level, leftLoose, note, onReplay, onReturnHome }: ResultsScreenProps) {
  return (
    <section className={styles.shell} data-layout="compact-replay">
      <div className={styles.headlineRow}>
        <div className={styles.copyCluster}>
          <span className={styles.eyebrow}>Round tally</span>
          <h2 className={styles.title}>{outcome}</h2>
        </div>
        <div className={styles.actions}>
          <button autoFocus className={styles.primary} onClick={onReplay}>
            Ride again
          </button>
          <button className={styles.secondary} onClick={onReturnHome}>
            Yard
          </button>
        </div>
      </div>
      <div className={styles.tallyStrip} data-role="tally-strip">
        <div className={styles.tallyItem}>
          <span className={styles.tallyLabel}>Outcome</span>
          <strong className={styles.tallyValue}>{outcome}</strong>
        </div>
        <div className={styles.tallyItem}>
          <span className={styles.tallyLabel}>Level</span>
          <strong className={styles.tallyValue}>{`Level ${level}`}</strong>
        </div>
        <div className={styles.tallyItem}>
          <span className={styles.tallyLabel}>Bagged</span>
          <strong className={styles.tallyValue}>{`${bagged} bagged`}</strong>
        </div>
        <div className={styles.tallyItem}>
          <span className={styles.tallyLabel}>Left loose</span>
          <strong className={styles.tallyValue}>{`${leftLoose} loose`}</strong>
        </div>
      </div>
      <p className={styles.note}>{note}</p>
    </section>
  );
}