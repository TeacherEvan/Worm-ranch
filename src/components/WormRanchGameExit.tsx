import type { DisplayProfile } from "@/game/detection";
import styles from "./WormRanchGameExit.module.css";

type WormRanchGameExitProps = {
  profile: DisplayProfile;
  onLeave: () => void;
};

export function WormRanchGameExit({ profile, onLeave }: WormRanchGameExitProps) {
  const compact = profile === "mobile";
  const accessibleLabel = compact ? "Return to yard" : "Leave corral and return to the yard";

  return (
    <aside
      className={styles.shell}
      data-density={compact ? "compact" : "standard"}
      data-profile={profile}
      aria-label="Game controls"
    >
      {compact ? null : <span className={styles.kicker}>Exit</span>}
      <button
        type="button"
        className={styles.leave}
        onClick={onLeave}
        aria-label={accessibleLabel}
      >
        {compact ? "Yard" : "Leave corral"}
      </button>
    </aside>
  );
}