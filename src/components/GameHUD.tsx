import React from "react";
import styles from "./GameHUD.module.css";

type Props = {
  time?: string | null;
  kills: number;
};

export default function GameHUD({ time, kills }: Props) {
  return (
    <>
      {time ? (
        <div aria-label="game time" className={`${styles.hudBadge} ${styles.timeBadge}`}>
          <span className={styles.hudLabel}>TIME</span>
          <strong className={styles.hudValue}>{time}</strong>
        </div>
      ) : null}
      <div aria-label="worms killed" className={`${styles.hudBadge} ${styles.killsBadge}`}>
        <span className={styles.hudLabel}>BAGGED</span>
        <strong className={styles.hudValue}>{kills}</strong>
      </div>
    </>
  );
}
