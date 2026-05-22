"use client";

import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./GameStage.module.css";
import badgeStyles from "./GameStagePhaseBadge.module.css";
import { createGameStageAudioController } from "@/components/gameStageAudio";
import { useLatestValue, useStageActionEcho } from "./gameStageActionEcho";
import { getKeyboardStatus, getKeyboardTargetId, type KeyboardTargetMode } from "@/components/gameStageKeyboard";
import { areSummariesEqual, renderStage, stepFeedback, type StageFeedback } from "@/components/gameStagePresentation";
import { getMotionFeedback, type StageMotionCue } from "@/components/gameStageMotion";
import { getStagePresentation } from "@/components/gameStagePhasePresentation";
import { getFairyLifecycleEvents, getRoundEndedDetails, getRoundTransitionEvents } from "@/lib/analytics";
import {
  applyAccuratePress,
  applyMiss,
  createWorld,
  findWormIdAtPoint,
  getSummary,
  resizeWorld,
  setPointer,
  stepWorld,
  triggerTouchRush,
} from "@/game/engine";
import type { DisplayProfile } from "@/game/detection";
import { getGameplayLevelRules } from "@/game/levels";
import type { ActionResult, FairyState, GameSummary, RoundResult } from "@/game/types";
import type { EventName } from "@/lib/logger";

type GameStageProps = {
  backdropUrl?: string | null;
  level: number;
  profile: DisplayProfile;
  reducedMotion: boolean;
  onSummaryChange: (summary: GameSummary) => void;
  onRoundEnd: (result: RoundResult) => void;
  onEvent: (name: EventName, details?: Record<string, unknown>) => void;
};

const SUMMARY_INTERVAL_MS = 120;

export function GameStage({
  backdropUrl = null,
  level,
  profile,
  reducedMotion,
  onSummaryChange,
  onRoundEnd,
  onEvent,
}: GameStageProps) {
  const levelRules = useMemo(() => getGameplayLevelRules(profile, level), [level, profile]);
  const [initialWorld] = useState(() => createWorld(profile, 800, 540, { rules: levelRules }));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(initialWorld);
  const frameRef = useRef<number | null>(null);
  const summaryRef = useRef(0);
  const feedbackRef = useRef<StageFeedback[]>([]);
  const feedbackIdRef = useRef(0);
  const finishedRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);
  const canvasBoundsRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const summaryAnalyticsRef = useRef<GameSummary | null>(null);
  const previousSummaryRef = useRef<GameSummary | null>(null);
  const fairyStatesRef = useRef<Map<string, FairyState>>(new Map());
  const cueTimerRef = useRef<number | null>(null);
  const keyboardHelpId = useId();
  const keyboardStatusId = useId();
  const [stageSummary, setStageSummary] = useState<GameSummary>(() => getSummary(initialWorld));
  const [keyboardTargetId, setKeyboardTargetId] = useState<string | null>(() => getKeyboardTargetId(initialWorld, null, "first"));
  const [continuousActive, setContinuousActive] = useState<boolean>(() => initialWorld.continuousMode?.active ?? false);
  const [motionCue, setMotionCue] = useState<StageMotionCue>("none");
  const reducedMotionRef = useLatestValue(reducedMotion);
  const keyboardTargetRef = useLatestValue(keyboardTargetId);
  const onSummaryChangeRef = useLatestValue(onSummaryChange);
  const onRoundEndRef = useLatestValue(onRoundEnd);
  const onEventRef = useLatestValue(onEvent);
  const stagePresentation = getStagePresentation(stageSummary, profile, level);
  const { phaseChipLabel, statusItems, overlayCopy, overlayKey, showActionEchoRef } = useStageActionEcho(
    stagePresentation.phaseChipLabel,
    stagePresentation.statusItems,
    stagePresentation.copy,
    stagePresentation.overlayKey,
    profile,
  );
  const keyboardStatus = getKeyboardStatus(stagePresentation.copy.title, stageSummary, keyboardTargetId);

  useEffect(() => {
    return () => {
      if (cueTimerRef.current !== null) {
        window.clearTimeout(cueTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const motionFeedback = getMotionFeedback(previousSummaryRef.current, stageSummary);
    previousSummaryRef.current = stageSummary;
    if (motionFeedback.stageCue === "none") {
      return;
    }
    if (cueTimerRef.current !== null) {
      window.clearTimeout(cueTimerRef.current);
    }

    setMotionCue(motionFeedback.stageCue);
    cueTimerRef.current = window.setTimeout(() => {
      setMotionCue("none");
      cueTimerRef.current = null;
    }, reducedMotion ? 140 : 760);
  }, [reducedMotion, stageSummary]);

  useEffect(() => {
    const nextWorld = hasMountedRef.current
      ? createWorld(profile, 800, 540, { rules: levelRules })
      : worldRef.current;
    hasMountedRef.current = true;
    worldRef.current = nextWorld;
    feedbackRef.current = [];
    finishedRef.current = false;
    lastTimestampRef.current = null;
    summaryRef.current = 0;
    canvasBoundsRef.current = null;
    fairyStatesRef.current = new Map();

    const initialSummary = getSummary(worldRef.current);
    summaryAnalyticsRef.current = initialSummary;
    previousSummaryRef.current = initialSummary;
    setStageSummary(initialSummary);
    setKeyboardTargetId(getKeyboardTargetId(worldRef.current, null, "first"));
    onSummaryChangeRef.current(initialSummary);

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    canvas.focus({ preventScroll: true });

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    const audioController = createGameStageAudioController();

    const updateCanvasBounds = () => {
      const rect = canvas.getBoundingClientRect();
      canvasBoundsRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      return rect;
    };

    const resize = () => {
      const rect = updateCanvasBounds();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeWorld(worldRef.current, rect.width, rect.height);
    };

    const emitSummaryTransitionEvents = (nextSummary: GameSummary) => {
      const pendingEvents = getRoundTransitionEvents(summaryAnalyticsRef.current, nextSummary);
      summaryAnalyticsRef.current = nextSummary;

      for (const pendingEvent of pendingEvents) {
        onEventRef.current(pendingEvent.name, pendingEvent.details);
      }
    };

    const updateSummary = () => {
      const now = performance.now();
      if (now - summaryRef.current < SUMMARY_INTERVAL_MS) {
        return;
      }

      summaryRef.current = now;
      const nextSummary = getSummary(worldRef.current);
      emitSummaryTransitionEvents(nextSummary);
      setStageSummary((currentSummary) =>
        areSummariesEqual(currentSummary, nextSummary) ? currentSummary : nextSummary,
      );
      setKeyboardTargetId((currentTargetId) => getKeyboardTargetId(worldRef.current, currentTargetId, "preserve"));
      onSummaryChangeRef.current(nextSummary);
    };

    const emitFairyLifecycleEvents = (flushMorphing = false) => {
      const { events, nextStates } = getFairyLifecycleEvents(fairyStatesRef.current, worldRef.current.fairies, {
        flushMorphing,
      });

      for (const pendingEvent of events) {
        onEventRef.current(pendingEvent.name, pendingEvent.details);
      }

      fairyStatesRef.current = nextStates;
    };

    const pushFeedback = (result: Exclude<ActionResult, { kind: "ignored" } | { kind: "miss" }>) => {
      const worm = worldRef.current.worms.find((candidate) => candidate.id === result.wormId);
      if (!worm) {
        return;
      }

      const id = feedbackIdRef.current + 1;
      feedbackIdRef.current = id;

      feedbackRef.current = [
        ...feedbackRef.current.slice(-9),
        {
          id,
          x: worm.x,
          y: worm.y - worm.radius * 1.8,
          lifeMs: 0,
          ttlMs: result.kind === "collect" ? 920 : result.kind === "tag" ? 840 : 880,
          label:
            result.kind === "collect"
              ? "BAGGED"
              : result.kind === "tag"
                ? "TAGGED"
                : result.immortal
                  ? "OUTLAW"
                  : "BLINK",
          tone:
            result.kind === "collect"
              ? "collect"
              : result.kind === "tag"
                ? "tag"
                : result.immortal
                  ? "final"
                  : "teleport",
        },
      ];
    };

    const loop = (timestamp: number) => {
      const last = lastTimestampRef.current ?? timestamp;
      const delta = Math.min(32, timestamp - last);
      lastTimestampRef.current = timestamp;

      stepWorld(worldRef.current, delta);
      emitFairyLifecycleEvents();
      stepFeedback(feedbackRef.current, delta);
      renderStage(
        context,
        worldRef.current,
        reducedMotionRef.current,
        feedbackRef.current,
        keyboardTargetRef.current,
        level,
      );
      updateSummary();

      const roundResult = worldRef.current.roundResult;
      if (roundResult && !finishedRef.current) {
        // stop continuous mode when round finishes
        if (worldRef.current.continuousMode) {
          worldRef.current.continuousMode.active = false;
          worldRef.current.continuousMode.spawnTimerMs = 0;
          worldRef.current.continuousMode.speedMultiplier = 1;
        }
        setContinuousActive(false);
        finishedRef.current = true;
        emitFairyLifecycleEvents(true);
        const finalSummary = getSummary(worldRef.current);
        emitSummaryTransitionEvents(finalSummary);
        setStageSummary(finalSummary);
        onSummaryChangeRef.current(finalSummary);
        onEventRef.current("round_ended", getRoundEndedDetails(roundResult));
        onRoundEndRef.current(roundResult);
        return;
      }

      frameRef.current = window.requestAnimationFrame(loop);
    };

    const toCanvasPoint = (event: PointerEvent) => {
      const rect = canvasBoundsRef.current ?? updateCanvasBounds();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handleAction = (result: ActionResult) => {
      if (result.kind === "tag" || result.kind === "teleport" || result.kind === "collect") {
        audioController.play(result);
      }
      showActionEchoRef.current(result);

      if (result.kind === "collect") {
        pushFeedback(result);
        onEventRef.current("worm_collected", { wormId: result.wormId, collected: result.collected });
      }

      if (result.kind === "tag") {
        pushFeedback(result);
      }

      if (result.kind === "teleport") {
        pushFeedback(result);
        onEventRef.current("worm_teleported", {
          wormId: result.wormId,
          immortal: result.immortal,
        });
      }

      setKeyboardTargetId((currentTargetId) => getKeyboardTargetId(worldRef.current, currentTargetId, "preserve"));
    };

    const moveKeyboardTarget = (mode: Exclude<KeyboardTargetMode, "preserve">) => {
      setKeyboardTargetId((currentTargetId) => getKeyboardTargetId(worldRef.current, currentTargetId, mode));
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "touch") {
        setPointer(worldRef.current, toCanvasPoint(event));
      }
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        setPointer(worldRef.current, null);
      }
    };

    const clearTouchPointer = (event: PointerEvent) => {
      if (event.pointerType !== "touch") {
        return;
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      setPointer(worldRef.current, null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = toCanvasPoint(event);

      if (event.pointerType === "touch") {
        canvas.setPointerCapture(event.pointerId);
        triggerTouchRush(worldRef.current, point);
      } else {
        setPointer(worldRef.current, point);
      }

      const wormId = findWormIdAtPoint(worldRef.current, point);
      if (!wormId) {
        handleAction(applyMiss(worldRef.current));
        return;
      }

      setKeyboardTargetId(wormId);
      handleAction(applyAccuratePress(worldRef.current, wormId));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveKeyboardTarget("next");
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveKeyboardTarget("previous");
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        moveKeyboardTarget("first");
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        moveKeyboardTarget("last");
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
        event.preventDefault();
        const targetId = getKeyboardTargetId(worldRef.current, keyboardTargetRef.current, "preserve");
        if (!targetId) {
          return;
        }

        setKeyboardTargetId(targetId);
        handleAction(applyAccuratePress(worldRef.current, targetId));
      }
    };

    resize();
    renderStage(
      context,
      worldRef.current,
      reducedMotionRef.current,
      feedbackRef.current,
      keyboardTargetRef.current,
      level,
    );
    frameRef.current = window.requestAnimationFrame(loop);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateCanvasBounds, true);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", clearTouchPointer);
    canvas.addEventListener("pointercancel", clearTouchPointer);
    canvas.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateCanvasBounds, true);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", clearTouchPointer);
      canvas.removeEventListener("pointercancel", clearTouchPointer);
      canvas.removeEventListener("keydown", handleKeyDown);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      // Ensure continuous mode is stopped when the stage unmounts
      if (worldRef.current.continuousMode) {
        worldRef.current.continuousMode.active = false;
        worldRef.current.continuousMode.spawnTimerMs = 0;
        worldRef.current.continuousMode.speedMultiplier = 1;
      }
      setContinuousActive(false);
      audioController.dispose();
    };
  }, [keyboardTargetRef, level, levelRules, onEventRef, onRoundEndRef, onSummaryChangeRef, profile, reducedMotionRef, showActionEchoRef]);

  return (
    <div
      className={styles.shell}
      data-motion={reducedMotion ? "reduced" : "full"}
      data-phase={stageSummary.phase}
      data-feedback-cue={motionCue}
      data-overlay-density={stagePresentation.overlayDensity}
    >
      <div className={styles.backdropLayer} style={{ backgroundImage: backdropUrl ? `url("${backdropUrl}")` : "none" }} />
      <button
        type="button"
        className={styles.continuousToggle}
        onClick={() => {
          const active = worldRef.current.continuousMode?.active;
          if (active) {
            if (worldRef.current.continuousMode) {
              worldRef.current.continuousMode.active = false;
              worldRef.current.continuousMode.spawnTimerMs = 0;
              worldRef.current.continuousMode.speedMultiplier = 1;
            }
            setContinuousActive(false);
          } else {
            if (!worldRef.current.continuousMode) {
              worldRef.current.continuousMode = {
                active: true,
                elapsedMs: 0,
                speedMultiplier: 1,
                spawnTimerMs: 0,
                spawnIntervalMs: 1200,
              };
            } else {
              worldRef.current.continuousMode.active = true;
              worldRef.current.continuousMode.elapsedMs = 0;
              worldRef.current.continuousMode.spawnTimerMs = 0;
              worldRef.current.continuousMode.speedMultiplier = 1;
            }
            setContinuousActive(true);
          }
          // update summary/UI immediately
          const nextSummary = getSummary(worldRef.current);
          setStageSummary(nextSummary);
          onSummaryChangeRef.current(nextSummary);
        }}
      >
        {continuousActive ? "Stop" : "Continuous"}
      </button>
      <p id={keyboardHelpId} className={styles.srOnly}>
        Use arrow keys to move the target between worms. Press Enter or Space to act on the selected worm.
      </p>
      <p id={keyboardStatusId} className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {keyboardStatus}
      </p>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-describedby={`${keyboardHelpId} ${keyboardStatusId}`}
        aria-label="Worm Ranch game field"
        tabIndex={0}
      />
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
    </div>
  );
}
