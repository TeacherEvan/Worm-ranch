"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./GameStage.module.css";
import {
  applyAccuratePress,
  createWorld,
  findWormIdAtPoint,
  getSummary,
  PROFILE_RULES,
  resizeWorld,
  setPointer,
  stepWorld,
  triggerTouchRush,
  type ActionResult,
  type GameSummary,
  type RoundResult,
  type Worm,
} from "@/game/engine";
import type { DisplayProfile } from "@/game/detection";
import type { EventName } from "@/lib/logger";

type GameStageProps = {
  profile: DisplayProfile;
  reducedMotion: boolean;
  sessionId: string;
  onSummaryChange: (summary: GameSummary) => void;
  onRoundEnd: (result: RoundResult) => void;
  onEvent: (name: EventName, details?: Record<string, unknown>) => void;
};

type TapTracker = {
  wormId: string | null;
  at: number;
};

type StageFeedback = {
  id: number;
  x: number;
  y: number;
  lifeMs: number;
  ttlMs: number;
  label: string;
  tone: "tag" | "teleport" | "collect" | "final";
};

const SUMMARY_INTERVAL_MS = 120;

export function GameStage({
  profile,
  reducedMotion,
  sessionId,
  onSummaryChange,
  onRoundEnd,
  onEvent,
}: GameStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(createWorld(profile, 800, 540));
  const frameRef = useRef<number | null>(null);
  const summaryRef = useRef<number>(0);
  const feedbackRef = useRef<StageFeedback[]>([]);
  const feedbackIdRef = useRef(0);
  const finishedRef = useRef(false);
  const tapRef = useRef<TapTracker>({ wormId: null, at: 0 });
  const lastTimestampRef = useRef<number | null>(null);
  const [stageSummary, setStageSummary] = useState<GameSummary>(() => createInitialSummary(profile));

  useEffect(() => {
    worldRef.current = createWorld(profile, 800, 540);
    feedbackRef.current = [];
    finishedRef.current = false;
    const initialSummary = getSummary(worldRef.current);
    setStageSummary(initialSummary);
    onSummaryChange(initialSummary);
    onEvent("gameplay_started", {
      totalWorms: PROFILE_RULES[profile].totalWorms,
      sessionId,
    });

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeWorld(worldRef.current, rect.width, rect.height);
    };

    const updateSummary = () => {
      const now = performance.now();
      if (now - summaryRef.current < SUMMARY_INTERVAL_MS) {
        return;
      }

      summaryRef.current = now;
      const nextSummary = getSummary(worldRef.current);
      setStageSummary((currentSummary) =>
        areSummariesEqual(currentSummary, nextSummary) ? currentSummary : nextSummary,
      );
      onSummaryChange(nextSummary);
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
              ? "BAGGED"
              : result.kind === "tag"
                ? "MARKED"
                : result.immortal
                  ? "FINAL"
                  : "BLINK",
          tone: result.kind === "collect" ? "collect" : result.kind === "tag" ? "tag" : result.immortal ? "final" : "teleport",
        },
      ];
    };

    const loop = (timestamp: number) => {
      const last = lastTimestampRef.current ?? timestamp;
      const delta = Math.min(32, timestamp - last);
      lastTimestampRef.current = timestamp;

      stepWorld(worldRef.current, delta);
      stepFeedback(feedbackRef.current, delta);
      renderStage(context, worldRef.current, reducedMotion, feedbackRef.current);
      updateSummary();

      const roundResult = worldRef.current.roundResult;
      if (roundResult && !finishedRef.current) {
        finishedRef.current = true;
        const finalSummary = getSummary(worldRef.current);
        setStageSummary(finalSummary);
        onSummaryChange(finalSummary);
        const escaped = roundResult.remaining;
        if (escaped > 0) {
          onEvent("worm_escaped", { escaped });
        }
        onEvent("gameplay_ended", roundResult);
        onRoundEnd(roundResult);
        return;
      }

      frameRef.current = window.requestAnimationFrame(loop);
    };

    const toCanvasPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handleAction = (result: ActionResult) => {
      if (result.kind === "collect") {
        pushFeedback(result);
        onEvent("worm_collected", { wormId: result.wormId, collected: result.collected });
      }

      if (result.kind === "tag") {
        pushFeedback(result);
        onEvent("worm_tagged", { wormId: result.wormId, bursts: result.bursts });
      }

      if (result.kind === "teleport") {
        pushFeedback(result);
        onEvent("worm_teleported", {
          wormId: result.wormId,
          immortal: result.immortal,
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        setPointer(worldRef.current, toCanvasPoint(event));
      }
    };

    const handlePointerLeave = () => {
      setPointer(worldRef.current, null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = toCanvasPoint(event);

      if (event.pointerType === "touch") {
        triggerTouchRush(worldRef.current, point);
      } else {
        setPointer(worldRef.current, point);
      }

      const wormId = findWormIdAtPoint(worldRef.current, point);
      if (!wormId) {
        tapRef.current = { wormId: null, at: 0 };
        return;
      }

      if (profile === "mobile") {
        const now = performance.now();
        const isDoubleTap = tapRef.current.wormId === wormId && now - tapRef.current.at < 320;

        if (!isDoubleTap) {
          tapRef.current = { wormId, at: now };
          return;
        }

        tapRef.current = { wormId: null, at: 0 };
      }

      handleAction(applyAccuratePress(worldRef.current, wormId));
    };

    resize();
  renderStage(context, worldRef.current, reducedMotion, feedbackRef.current);
    frameRef.current = window.requestAnimationFrame(loop);

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [onEvent, onRoundEnd, onSummaryChange, profile, reducedMotion, sessionId]);

  return (
    <div className={styles.shell}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Worm Ranch game field" />
      <div className={styles.statusStrip} aria-live="polite">
        {buildStatusItems(profile, stageSummary).map((item) => (
          <div
            key={item.label}
            className={`${styles.statusPill} ${item.active ? styles.statusPillActive : ""}`.trim()}
          >
            <span className={styles.statusLabel}>{item.label}</span>
            <strong className={styles.statusValue}>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className={styles.overlay}>
        <div className={styles.message}>
          <strong>{getStageCopy(profile, stageSummary).title}</strong>
          {getStageCopy(profile, stageSummary).body}
        </div>
        <div className={styles.hint}>{getStageCopy(profile, stageSummary).hint}</div>
      </div>
    </div>
  );
}

function renderStage(
  context: CanvasRenderingContext2D,
  world: ReturnType<typeof createWorld>,
  reducedMotion: boolean,
  feedback: StageFeedback[],
) {
  context.clearRect(0, 0, world.width, world.height);

  const gradient = context.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "rgba(7, 18, 26, 0.98)");
  gradient.addColorStop(1, "rgba(13, 31, 38, 0.98)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, world.width, world.height);

  drawGrid(context, world.width, world.height);

  const summary = getSummary(world);
  const activeWorms = world.worms.filter((worm) => worm.active);
  const finalWormId = summary.finalWormActive ? activeWorms[0]?.id ?? null : null;

  for (const fairy of world.fairies) {
    const alpha = 1 - fairy.lifeMs / fairy.ttlMs;
    context.save();
    context.translate(fairy.x, fairy.y);
    context.globalAlpha = alpha;
    context.fillStyle = `hsla(${fairy.hue}, 95%, 75%, 0.95)`;
    context.beginPath();
    context.ellipse(-6, 0, 6, 3, -0.45, 0, Math.PI * 2);
    context.ellipse(6, 0, 6, 3, 0.45, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 255, 255, 0.95)";
    context.beginPath();
    context.arc(0, 0, 3.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  for (const worm of activeWorms) {
    drawWorm(context, world, worm, reducedMotion, worm.id === finalWormId);
  }

  if (world.countdownMs > 0) {
    context.save();
    context.fillStyle = "rgba(5, 10, 15, 0.62)";
    context.fillRect(0, 0, world.width, world.height);
    context.fillStyle = "#f5f4e9";
    context.font = "600 60px var(--font-sans)";
    context.textAlign = "center";
    context.fillText(String(Math.ceil(world.countdownMs / 1000)), world.width / 2, world.height / 2);
    context.restore();
  }

  if (world.profile === "desktop" && summary.finalWormActive) {
    context.save();
    context.fillStyle = "rgba(240, 126, 67, 0.95)";
    context.font = "500 18px var(--font-mono)";
    context.textAlign = "center";
    context.fillText("Final worm unlocked: impossible catch mode", world.width / 2, 42);
    context.restore();
  }

  drawFeedback(context, feedback);
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.strokeStyle = "rgba(199, 243, 107, 0.05)";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function drawWorm(
  context: CanvasRenderingContext2D,
  world: ReturnType<typeof createWorld>,
  worm: Worm,
  reducedMotion: boolean,
  isFinalWorm: boolean,
) {
  const speed = Math.hypot(worm.vx, worm.vy) || 1;
  const direction = Math.atan2(worm.vy, worm.vx);
  const bodyLength = worm.radius * 2.8;
  const squirm = reducedMotion ? 0 : Math.sin(performance.now() * 0.012 + worm.wave) * 3.2;
  const pulse = reducedMotion ? 1 : 0.72 + (Math.sin(performance.now() * 0.01 + worm.wave) + 1) * 0.14;

  context.save();
  context.translate(worm.x, worm.y);
  context.rotate(direction);

  if (isFinalWorm) {
    context.strokeStyle = `rgba(240, 126, 67, ${0.45 * pulse})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.25, 0, Math.PI * 2);
    context.stroke();
  } else if (world.profile === "desktop" && worm.teleportsRemaining > 0) {
    context.setLineDash([5, 5]);
    context.strokeStyle = `rgba(199, 243, 107, ${0.38 * pulse})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2.05, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  } else if (world.profile === "mobile" && worm.touchBursts > 0) {
    context.strokeStyle = `rgba(255, 228, 164, ${0.52 * pulse})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, worm.radius * 2, -Math.PI * 0.7, Math.PI * 1.3);
    context.stroke();
  }

  context.lineCap = "round";
  context.lineWidth = worm.radius * 1.3;
  context.strokeStyle = `hsla(${worm.hue}, 74%, 60%, 0.95)`;
  context.beginPath();
  context.moveTo(-bodyLength * 0.55, 0);
  context.quadraticCurveTo(-worm.radius, squirm, worm.radius * 0.6, -squirm * 0.6);
  context.lineTo(bodyLength * 0.5 + speed * 2, 0);
  context.stroke();

  context.fillStyle = `hsla(${worm.hue + 24}, 100%, 82%, 0.95)`;
  context.beginPath();
  context.arc(bodyLength * 0.5 + speed * 1.1, 0, worm.radius * 0.8, 0, Math.PI * 2);
  context.fill();

  if (world.profile === "mobile" && worm.touchBursts > 0) {
    context.fillStyle = "rgba(255, 245, 207, 0.96)";
    context.font = `700 ${Math.max(12, worm.radius * 0.95)}px var(--font-mono)`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(worm.touchBursts), 0, -worm.radius * 2.65);
  }

  context.fillStyle = "#07111b";
  context.beginPath();
  context.arc(bodyLength * 0.72, -worm.radius * 0.18, worm.radius * 0.13, 0, Math.PI * 2);
  context.arc(bodyLength * 0.72, worm.radius * 0.18, worm.radius * 0.13, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFeedback(context: CanvasRenderingContext2D, feedback: StageFeedback[]) {
  for (const item of feedback) {
    const alpha = 1 - item.lifeMs / item.ttlMs;
    if (alpha <= 0) {
      continue;
    }

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle =
      item.tone === "collect"
        ? "#f5f4e9"
        : item.tone === "tag"
          ? "#ffe4a4"
          : item.tone === "final"
            ? "#f07e43"
            : "#c7f36b";
    context.font = "700 13px var(--font-mono)";
    context.textAlign = "center";
    context.fillText(item.label, item.x, item.y);
    context.restore();
  }
}

function stepFeedback(feedback: StageFeedback[], deltaMs: number) {
  for (const item of feedback) {
    item.lifeMs += deltaMs;
    item.y -= deltaMs * 0.028;
  }

  let index = feedback.length - 1;
  while (index >= 0) {
    if (feedback[index] && feedback[index].lifeMs >= feedback[index].ttlMs) {
      feedback.splice(index, 1);
    }
    index -= 1;
  }
}

function areSummariesEqual(left: GameSummary, right: GameSummary) {
  return (
    left.profile === right.profile &&
    left.collected === right.collected &&
    left.remaining === right.remaining &&
    left.fairies === right.fairies &&
    left.timerMs === right.timerMs &&
    left.speedBonus === right.speedBonus &&
    left.teleportsUnlocked === right.teleportsUnlocked &&
    left.countdownMs === right.countdownMs &&
    left.finalWormActive === right.finalWormActive &&
    left.rushTriggered === right.rushTriggered
  );
}

function buildStatusItems(profile: DisplayProfile, summary: GameSummary) {
  if (profile === "desktop") {
    return [
      {
        label: "Countdown",
        value: summary.countdownMs > 0 ? String(Math.ceil(summary.countdownMs / 1000)) : "live",
        active: summary.countdownMs > 0,
      },
      {
        label: "Timer",
        value: `${Math.ceil(summary.timerMs / 1000)}s`,
        active: summary.countdownMs === 0 && summary.timerMs <= 15_000,
      },
      {
        label: "Teleport band",
        value: summary.teleportsUnlocked ? "armed" : `${Math.max(0, 50 - summary.collected)} to arm`,
        active: summary.teleportsUnlocked,
      },
      {
        label: "Final worm",
        value: summary.finalWormActive ? "escape mode" : "dormant",
        active: summary.finalWormActive,
      },
    ];
  }

  return [
    {
      label: "Countdown",
      value: summary.countdownMs > 0 ? String(Math.ceil(summary.countdownMs / 1000)) : "live",
      active: summary.countdownMs > 0,
    },
    {
      label: "Timer",
      value: `${Math.ceil(summary.timerMs / 1000)}s`,
      active: summary.countdownMs === 0 && summary.timerMs <= 15_000,
    },
    {
      label: "Rush",
      value: summary.rushTriggered ? "full panic" : "steady",
      active: summary.rushTriggered,
    },
    {
      label: "Touch chain",
      value: "mark then bank",
      active: summary.countdownMs === 0,
    },
  ];
}

function getStageCopy(profile: DisplayProfile, summary: GameSummary) {
  if (summary.countdownMs > 0) {
    return {
      title: "Get ready",
      body: "The field is visible, but pressure is not live until the countdown clears.",
      hint: profile === "desktop" ? "Track motion before the first click." : "Pick a lane before the first double-tap.",
    };
  }

  if (profile === "desktop") {
    if (summary.finalWormActive) {
      return {
        title: "Final worm",
        body: "The last survivor cannot be captured. Every accurate press makes it blink away until the escape timer wins.",
        hint: "The only way to beat this state is to avoid leaving one worm alive.",
      };
    }

    if (summary.teleportsUnlocked) {
      return {
        title: "Teleport band armed",
        body: "Every surviving worm gets one blink-away escape on an accurate click. Re-acquire after the flash.",
        hint: "The green halo means that worm still has its teleport.",
      };
    }

    return {
      title: "Mouse hunt",
      body: "Each catch adds 0.1 speed to the rest. Hit fifty before the teleport band wakes up.",
      hint: "Track the cursor and click cleanly.",
    };
  }

  if (summary.rushTriggered) {
    return {
      title: "Full panic",
      body: "The first touch pushed every worm to rush speed. A numbered halo means that worm is already marked once.",
      hint: "Land the second successful double-tap on the same worm to bank it.",
    };
  }

  return {
    title: "Touch panic",
    body: "Every worm needs two successful double-taps. The first one marks it, the second one turns it into a fairy.",
    hint: "Double-tap the same worm twice to bank it.",
  };
}

function createInitialSummary(profile: DisplayProfile) {
  return getSummary(createWorld(profile, 800, 540));
}
