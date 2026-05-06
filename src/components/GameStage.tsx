"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./GameStage.module.css";
import {
  areSummariesEqual,
  createInitialSummary,
  renderStage,
  stepFeedback,
  type StageFeedback,
} from "@/components/gameStagePresentation";
import { getStagePresentation } from "@/components/gameStagePhasePresentation";
import { getRoundEndedDetails, getRoundTransitionEvents } from "@/lib/analytics";
import {
  applyAccuratePress,
  createWorld,
  findWormIdAtPoint,
  getSummary,
  resizeWorld,
  setPointer,
  stepWorld,
  triggerTouchRush,
} from "@/game/engine";
import type { DisplayProfile } from "@/game/detection";
import type { ActionResult, FairyState, GameSummary, RoundResult } from "@/game/types";
import type { EventName } from "@/lib/logger";

type GameStageProps = {
  profile: DisplayProfile;
  reducedMotion: boolean;
  onSummaryChange: (summary: GameSummary) => void;
  onRoundEnd: (result: RoundResult) => void;
  onEvent: (name: EventName, details?: Record<string, unknown>) => void;
};

const SUMMARY_INTERVAL_MS = 120;

export function GameStage({
  profile,
  reducedMotion,
  onSummaryChange,
  onRoundEnd,
  onEvent,
}: GameStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(createWorld(profile, 800, 540));
  const frameRef = useRef<number | null>(null);
  const summaryRef = useRef(0);
  const feedbackRef = useRef<StageFeedback[]>([]);
  const feedbackIdRef = useRef(0);
  const finishedRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);
  const canvasBoundsRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const summaryAnalyticsRef = useRef<GameSummary | null>(null);
  const fairyStatesRef = useRef<Map<string, FairyState>>(new Map());
  const reducedMotionRef = useRef(reducedMotion);
  const onSummaryChangeRef = useRef(onSummaryChange);
  const onRoundEndRef = useRef(onRoundEnd);
  const onEventRef = useRef(onEvent);
  const [stageSummary, setStageSummary] = useState<GameSummary>(() => createInitialSummary(profile));
  const stagePresentation = getStagePresentation(stageSummary, profile);
  const copyKey = stagePresentation.overlayKey;

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  useEffect(() => {
    onRoundEndRef.current = onRoundEnd;
  }, [onRoundEnd]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    worldRef.current = createWorld(profile, 800, 540);
    feedbackRef.current = [];
    finishedRef.current = false;
    lastTimestampRef.current = null;
    summaryRef.current = 0;
    canvasBoundsRef.current = null;
    fairyStatesRef.current = new Map();

    const initialSummary = getSummary(worldRef.current);
    summaryAnalyticsRef.current = initialSummary;
    setStageSummary(initialSummary);
    onSummaryChangeRef.current(initialSummary);

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

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
      onSummaryChangeRef.current(nextSummary);
    };

    const emitFairyLifecycleEvents = () => {
      const nextStates = new Map<string, FairyState>();

      for (const fairy of worldRef.current.fairies) {
        const previousState = fairyStatesRef.current.get(fairy.id);

        if (previousState === "morphing" && fairy.state !== "morphing") {
          onEventRef.current("worm_morphed", {
            wormId: fairy.wormId,
            fairies: worldRef.current.fairies.length,
          });
        }

        nextStates.set(fairy.id, fairy.state);
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
          ttlMs: 780,
          label:
            result.kind === "collect"
              ? "HIT"
              : result.kind === "tag"
                ? "BRANDED"
                : result.immortal
                  ? "OUTLAW"
                  : "BOLTED",
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
      renderStage(context, worldRef.current, reducedMotionRef.current, feedbackRef.current);
      updateSummary();

      const roundResult = worldRef.current.roundResult;
      if (roundResult && !finishedRef.current) {
        finishedRef.current = true;
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
        return;
      }

      handleAction(applyAccuratePress(worldRef.current, wormId));
    };

    resize();
    renderStage(context, worldRef.current, reducedMotionRef.current, feedbackRef.current);
    frameRef.current = window.requestAnimationFrame(loop);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateCanvasBounds, true);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", clearTouchPointer);
    canvas.addEventListener("pointercancel", clearTouchPointer);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateCanvasBounds, true);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", clearTouchPointer);
      canvas.removeEventListener("pointercancel", clearTouchPointer);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [profile]);

  return (
    <div
      className={styles.shell}
      data-motion={reducedMotion ? "reduced" : "full"}
      data-phase={stageSummary.phase}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Worm Ranch game field" />
      <div className={styles.statusStrip} aria-live="off">
        {stagePresentation.statusItems.map((item, index) => (
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
        <div key={copyKey} className={styles.copyCluster}>
          <div className={styles.message}>
            <strong>{stagePresentation.copy.title}</strong>
            {stagePresentation.copy.body}
          </div>
          <div className={styles.hint}>{stagePresentation.copy.hint}</div>
        </div>
      </div>
    </div>
  );
}
