import { useEffect, useRef, useState } from "react";
import type { DisplayProfile } from "@/game/detection";
import type { ActionResult } from "@/game/types";

export type StageActionEcho = {
  key: string;
  phaseChipLabel: string;
  mechanicValue: string;
  mechanicActive: boolean;
  body: string;
  hint: string;
  ttlMs: number;
};

type StageCopy = {
  title: string;
  body: string;
  hint: string;
};

type StageStatusItem = {
  id: string;
  label: string;
  value: string;
  active: boolean;
};

export function useLatestValue<T>(value: T) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return valueRef;
}

export function useStageActionEcho(
  basePhaseChipLabel: string,
  baseStatusItems: StageStatusItem[],
  baseCopy: StageCopy,
  baseOverlayKey: string,
  profile: DisplayProfile,
) {
  const [actionEcho, setActionEcho] = useState<StageActionEcho | null>(null);
  const timerRef = useRef<number | null>(null);
  const showActionEchoRef = useRef<(result: ActionResult) => void>(() => undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    showActionEchoRef.current = (result: ActionResult) => {
      const nextActionEcho = getStageActionEcho(result, profile);
      if (!nextActionEcho) {
        return;
      }

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      setActionEcho(nextActionEcho);
      timerRef.current = window.setTimeout(() => {
        setActionEcho(null);
        timerRef.current = null;
      }, nextActionEcho.ttlMs);
    };
  }, [profile]);

  return {
    phaseChipLabel: actionEcho ? actionEcho.phaseChipLabel : basePhaseChipLabel,
    statusItems: actionEcho
      ? baseStatusItems.map((item) =>
          item.id === "mechanic"
            ? { ...item, value: actionEcho.mechanicValue, active: actionEcho.mechanicActive }
            : item,
        )
      : baseStatusItems,
    overlayCopy: actionEcho ? { ...baseCopy, body: actionEcho.body, hint: actionEcho.hint } : baseCopy,
    overlayKey: actionEcho ? `${baseOverlayKey}:${actionEcho.key}` : baseOverlayKey,
    showActionEchoRef,
  };
}

export function getStageActionEcho(result: ActionResult, profile: DisplayProfile): StageActionEcho | null {
  switch (result.kind) {
    case "ignored":
      return null;
    case "miss":
      return {
        key: "miss",
        phaseChipLabel: "Missed",
        mechanicValue: "Track",
        mechanicActive: true,
        body: "Swing missed.",
        hint: profile === "desktop" ? "Track the next mover, then click." : "Stay on one lane and tap again.",
        ttlMs: 980,
      };
    case "tag":
      return {
        key: "tag",
        phaseChipLabel: "Tagged",
        mechanicValue: "Hold",
        mechanicActive: true,
        body: "Brand landed.",
        hint: "Stay on this worm until it bags.",
        ttlMs: 1100,
      };
    case "teleport":
      return result.immortal
        ? {
            key: "ghost",
            phaseChipLabel: "Slipped",
            mechanicValue: "Reset",
            mechanicActive: true,
            body: "Ghost slipped.",
            hint: "Cut it off before the clock runs out.",
            ttlMs: 1250,
          }
        : {
            key: "teleport",
            phaseChipLabel: "Slipped",
            mechanicValue: "Reset",
            mechanicActive: true,
            body: "Blink burned.",
            hint: "Wait for the flash, then click again.",
            ttlMs: 1200,
          };
    case "collect":
      return {
        key: "collect",
        phaseChipLabel: "Bagged",
        mechanicValue: "Next",
        mechanicActive: true,
        body: "Bag secured.",
        hint: profile === "desktop" ? "Snap to the next loose worm." : "Slide to the next lane.",
        ttlMs: 960,
      };
  }
}