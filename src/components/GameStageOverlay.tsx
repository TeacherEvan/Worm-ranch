import { type CSSProperties } from "react";
import styles from "./GameStage.module.css";
import badgeStyles from "./GameStagePhaseBadge.module.css";
import GameHUD from "./GameHUD";
import type { StageCopy, StatusItem } from "@/components/gameStagePresentation";
import type { StageMotionCue } from "@/components/gameStageMotion";
import type { StageTargetCallout } from "./gameStageTargetCallout";

type GameStageOverlayProps = {
  kills: number;
  motionCue: StageMotionCue;
  overlayCopy: StageCopy;
  overlayKey: string;
  phaseChipLabel: string;
  reducedMotion: boolean;
  statusItems: StatusItem[];
  targetCallout: StageTargetCallout;
  time: string | null;
};

export function GameStageOverlay({
  kills,
  motionCue,
  overlayCopy,
  overlayKey,
  phaseChipLabel,
  reducedMotion,
  statusItems,
  targetCallout,
  time,
}: GameStageOverlayProps) {
  const targetTitle = `TAP ${targetCallout.label.toUpperCase()}`;
  const targetProgress = `${targetCallout.progress}/${targetCallout.goal}`;

  return (
    <>
      <GameHUD time={time} kills={kills} />
      {targetCallout.visible ? (
        <div className={styles.targetCallout} style={{ color: targetCallout.textColor } as CSSProperties}>
          <strong>{targetTitle}</strong>
          <span>{targetProgress}</span>
        </div>
      ) : null}
      <div className={styles.statusStrip} aria-live="off">
        {statusItems.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.statusPill} ${item.active ? styles.statusPillActive : ""}`.trim()}
            style={{ "--status-index": index } as CSSProperties}
          >
            <span className={styles.statusLabel}>{item.label}</span>
            <strong className={styles.statusValue}>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className={styles.overlay}>
        <div key={overlayKey} className={styles.copyCluster}>
          <div
            className={`${styles.phaseBadge} ${badgeStyles.phaseBadgeMotion}`}
            data-phase-cue={motionCue}
            data-phase-motion={reducedMotion ? "reduced" : "full"}
          >
            {phaseChipLabel}
          </div>
          <div className={styles.message}>
            <strong>{overlayCopy.title}</strong>
            {overlayCopy.body}
          </div>
          <div className={styles.hint}>{overlayCopy.hint}</div>
        </div>
      </div>
    </>
  );
}