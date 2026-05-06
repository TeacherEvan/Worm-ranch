import type { DisplayProfile } from "@/game/detection";
import { getProfileRules } from "@/game/rules";
import type { GameSummary } from "@/game/types";

type StatusItem = {
  id: string;
  label: string;
  value: string;
  active: boolean;
};

type StageCopy = {
  title: string;
  body: string;
  hint: string;
};

export type StagePresentation = {
  phaseLabel: string;
  phaseChipLabel: string;
  statusItems: StatusItem[];
  copy: StageCopy;
  overlayKey: string;
  countdownOverlay: { value: string; progress: number } | null;
  fieldBanner: string | null;
};

export function getPhaseLabel(profile: DisplayProfile, summary: GameSummary) {
  return getStagePresentation(summary, profile).phaseLabel;
}

export function getPhaseChipLabel(profile: DisplayProfile, summary: GameSummary) {
  return getStagePresentation(summary, profile).phaseChipLabel;
}

export function getStagePresentation(summary: GameSummary, profile: DisplayProfile = summary.profile): StagePresentation {
  const rules = getProfileRules(profile);
  const viewSummary = profile === summary.profile ? summary : { ...summary, profile };
  const phaseLabel = getPhaseLabelText(viewSummary);
  const phaseChipLabel = getPhaseChipText(viewSummary, rules);
  const copy = getStageCopyData(viewSummary, phaseLabel);

  return {
    phaseLabel,
    phaseChipLabel,
    statusItems: buildStatusItemsForSummary(viewSummary, phaseLabel, rules),
    copy,
    overlayKey: getOverlayKey(viewSummary),
    countdownOverlay:
      viewSummary.phase === "introCountdown"
        ? {
            value: String(Math.max(1, Math.ceil(viewSummary.countdownMs / 1000))),
            progress:
              rules.introCountdownMs > 0
                ? Math.max(0, Math.min(1, viewSummary.countdownMs / rules.introCountdownMs))
                : 0,
          }
        : null,
    fieldBanner:
      profile === "desktop" && viewSummary.phase === "ghostFinale"
        ? "Ghost finale: the last outlaw only bolts"
        : null,
  };
}

function getPhaseLabelText(summary: GameSummary) {
  switch (summary.phase) {
    case "introCountdown":
      return "Countdown";
    case "activeChase":
      return "Live chase";
    case "blinkBand":
      return "Blink armed";
    case "ghostFinale":
      return "Ghost finale";
    case "resolved":
      return "Tallied";
  }
}

function getPhaseChipText(summary: GameSummary, rules: ReturnType<typeof getProfileRules>) {
  if (summary.phase === "introCountdown") {
    return "Countdown";
  }

  if (summary.profile === "desktop") {
    if (summary.phase === "ghostFinale") {
      return "Ghost escaping";
    }

    if (summary.phase === "blinkBand") {
      return "Blinks live";
    }

    if (summary.phase === "resolved") {
      return "Round tallied";
    }

    return `Blinks arm in ${Math.max(0, rules.teleportUnlockCount - summary.collected)}`;
  }

  if (summary.phase === "resolved") {
    return "Round tallied";
  }

  if (summary.phase === "ghostFinale") {
    return "Final escape";
  }

  return summary.rushTriggered ? "Rush live" : "Touch wakes rush";
}

function buildStatusItemsForSummary(
  summary: GameSummary,
  phaseLabel: string,
  rules: ReturnType<typeof getProfileRules>,
): StatusItem[] {
  const isCountdown = summary.phase === "introCountdown";
  const isResolved = summary.phase === "resolved";

  if (summary.profile === "desktop") {
    return [
      { id: "phase", label: "Phase", value: phaseLabel, active: !isResolved },
      {
        id: "clock",
        label: "Clock",
        value: `${Math.ceil(summary.timerMs / 1000)}s`,
        active: !isCountdown && !isResolved && summary.timerMs <= 15_000,
      },
      {
        id: "blink",
        label: "Blink gate",
        value: summary.phase === "blinkBand" ? "armed" : summary.phase === "ghostFinale" ? "spent" : "arming",
        active: summary.phase === "blinkBand",
      },
      {
        id: "ghost",
        label: "Ghost",
        value: summary.phase === "ghostFinale" ? "escaping" : "idle",
        active: summary.phase === "ghostFinale",
      },
    ];
  }

  return [
    { id: "phase", label: "Phase", value: phaseLabel, active: !isResolved },
    {
      id: "clock",
      label: "Clock",
      value: `${Math.ceil(summary.timerMs / 1000)}s`,
      active: !isCountdown && !isResolved && summary.timerMs <= 15_000,
    },
    {
      id: "rush",
      label: "Rush",
      value: isCountdown ? "waiting" : summary.rushTriggered ? "live" : "primed",
      active: !isCountdown && summary.rushTriggered,
    },
    {
      id: "tag",
      label: "Tagged",
      value: `${rules.touchBurstsToCapture} taps to bag`,
      active: !isCountdown && !isResolved,
    },
  ];
}

function getStageCopyData(summary: GameSummary, phaseLabel: string): StageCopy {
  if (summary.phase === "introCountdown") {
    return {
      title: phaseLabel,
      body: "The corral is lit, but the herd does not break until the bell clears.",
      hint:
        summary.profile === "desktop"
          ? "Set your corral line before the first click."
          : "Pick a lane before you brand the first worm.",
    };
  }

  if (summary.phase === "resolved") {
    return {
      title: phaseLabel,
      body: "The round has closed and the ranch is settling.",
      hint: "Check the tally for the final bagged count and escape state.",
    };
  }

  if (summary.profile === "desktop") {
    if (summary.phase === "ghostFinale") {
      return {
        title: phaseLabel,
        body: "The last outlaw is all ghost. Every clean press only forces another bolt through the fence.",
        hint: "Close the round before the pen narrows to one ghost worm.",
      };
    }

    if (summary.phase === "blinkBand") {
      return {
        title: phaseLabel,
        body: "Blink charges are armed. Every loose worm flashes once through the fence before it can be bagged.",
        hint: "Charged worms show a pale halo and an orbit spark.",
      };
    }

    return {
      title: phaseLabel,
      body: "Mouse roundup is live. Every bagged worm spooks the herd while the blink fence winds up.",
      hint: "Herd with the pointer, then snap the catch clean.",
    };
  }

  if (summary.rushTriggered) {
    return {
      title: phaseLabel,
      body: "The chase is fully live. A branded worm keeps a visible 1/2 marker until the next clean tap bags it.",
      hint: "Stay on the same worm after the first clean tag and finish it with the next tap.",
    };
  }

  return {
    title: phaseLabel,
    body: "The first touch wakes the herd immediately, even on a miss. Accurate taps add the visible 1/2 marker, and the next accurate tap on that same worm bags it.",
    hint: "Use the first touch to wake the herd and, if you land on target, tag that worm. Then stay on it for the finishing tap.",
  };
}

function getOverlayKey(summary: GameSummary) {
  if (summary.profile === "mobile" && summary.phase === "activeChase") {
    return summary.rushTriggered ? "activeChase:rush" : "activeChase:primed";
  }

  return summary.phase;
}