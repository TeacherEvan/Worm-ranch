import styles from "./WormRanchApp.module.css";
import motionStyles from "./WormRanchAppMotion.module.css";

export type MetricImpact = "idle" | "bagged" | "remaining" | "fairies" | "critical";

type WormRanchMetricProps = {
  label: string;
  value: string;
  impact?: MetricImpact;
  urgent?: boolean;
};

export function WormRanchMetric({
  label,
  value,
  impact = "idle",
  urgent = false,
}: WormRanchMetricProps) {
  return (
    <div
      className={`${styles.metric} ${motionStyles.metricShell}`}
      data-impact={impact}
      data-urgent={urgent ? "true" : "false"}
    >
      <span className={styles.metricLabel}>{label}</span>
      <strong className={`${styles.metricValue} ${motionStyles.metricValue}`} data-impact={impact}>
        {value}
      </strong>
    </div>
  );
}