import { drawStaticStageBackdrop } from "@/components/gameStagePresentation";
import type { DisplayProfile } from "@/game/detection";
import type { GameSummary } from "@/game/types";

export type CanvasBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type StaticBackdropCache = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  dpr: number;
  height: number;
  width: number;
};

export function getCappedCanvasDpr(devicePixelRatio: number, profile: DisplayProfile, reducedMotion: boolean) {
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const maxDpr = profile === "mobile" || reducedMotion ? 1.5 : 2;
  return Math.min(safeDpr, maxDpr);
}

export function getVisibleSummary(summary: GameSummary): GameSummary {
  return {
    ...summary,
    timerMs: quantizeVisibleMs(summary.timerMs),
    countdownMs: quantizeVisibleMs(summary.countdownMs),
  };
}

export function formatStageTime(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function updateCanvasBounds(
  canvas: HTMLCanvasElement,
  canvasBoundsRef: { current: CanvasBounds | null },
) {
  const rect = canvas.getBoundingClientRect();
  canvasBoundsRef.current = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  return rect;
}

export function prepareStaticBackdrop(
  staticBackdropRef: { current: StaticBackdropCache | null },
  width: number,
  height: number,
  dpr: number,
) {
  if (typeof document === "undefined") {
    staticBackdropRef.current = null;
    return null;
  }

  let cachedBackdrop = staticBackdropRef.current;
  if (!cachedBackdrop) {
    const cacheCanvas = document.createElement("canvas");
    const cacheContext = cacheCanvas.getContext("2d");
    if (!cacheContext) {
      staticBackdropRef.current = null;
      return null;
    }

    cachedBackdrop = {
      canvas: cacheCanvas,
      context: cacheContext,
      dpr: 0,
      height: 0,
      width: 0,
    };
    staticBackdropRef.current = cachedBackdrop;
  }

  if (cachedBackdrop.width === width && cachedBackdrop.height === height && cachedBackdrop.dpr === dpr) {
    return cachedBackdrop.canvas;
  }

  cachedBackdrop.width = width;
  cachedBackdrop.height = height;
  cachedBackdrop.dpr = dpr;
  cachedBackdrop.canvas.width = Math.round(width * dpr);
  cachedBackdrop.canvas.height = Math.round(height * dpr);
  cachedBackdrop.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  cachedBackdrop.context.clearRect(0, 0, width, height);
  drawStaticStageBackdrop(cachedBackdrop.context, width, height);
  return cachedBackdrop.canvas;
}

function quantizeVisibleMs(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000) * 1000);
}