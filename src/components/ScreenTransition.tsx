"use client";

import React from "react";
import styles from "./ScreenTransition.module.css";

export type ScreenTransitionProps = {
  title: string;
  detail: string;
  reducedMotion: boolean;
};

export function ScreenTransition({ title, detail, reducedMotion }: ScreenTransitionProps) {
  return (
    <section
      className={`${styles.screen} ${reducedMotion ? styles.reduced : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className={styles.loader} aria-hidden="true">
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.ring} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.detail}>{detail}</p>
    </section>
  );
}