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

type OverlayDensity = "standard" | "compact";

export type StagePresentation = {
  phaseLabel: string;
  phaseChipLabel: string;
  statusItems: StatusItem[];
  copy: StageCopy;
  overlayDensity: OverlayDensity;
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
    statusItems: buildStatusItemsForSummary(viewSummary, rules),
    copy,
    overlayDensity: getOverlayDensity(viewSummary),
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

function getOverlayDensity(summary: GameSummary): OverlayDensity {
  return summary.profile === "mobile" ? "compact" : "standard";
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
  rules: ReturnType<typeof getProfileRules>,
): StatusItem[] {
  const isCountdown = summary.phase === "introCountdown";
  const isResolved = summary.phase === "resolved";

  if (summary.profile === "desktop") {
    return [
      {
        id: "bagged",
        label: "Bagged",
        value: `${summary.collected}/${rules.totalWorms}`,
        active: !isResolved && summary.collected > 0,
      },
      {
        id: "clock",
        label: "Clock",
        value: `${Math.ceil(summary.timerMs / 1000)}s`,
        active: !isCountdown && !isResolved && summary.timerMs <= 15_000,
      },
      {
        id: "mechanic",
        label: summary.phase === "ghostFinale" ? "Ghost" : "Blink gate",
        value: summary.phase === "blinkBand" ? "armed" : summary.phase === "ghostFinale" ? "spent" : "arming",
        active: summary.phase === "blinkBand" || summary.phase === "ghostFinale",
      },
    ];
  }

  return [
    {
      id: "bagged",
      label: "Bagged",
      value: `${summary.collected}/${rules.totalWorms}`,
      active: !isResolved && summary.collected > 0,
    },
    {
      id: "clock",
      label: "Clock",
      value: `${Math.ceil(summary.timerMs / 1000)}s`,
      active: !isCountdown && !isResolved && summary.timerMs <= 15_000,
    },
    {
      id: "mechanic",
      label: summary.rushTriggered ? "Rush" : "Bag rule",
      value: isCountdown ? "waiting" : summary.rushTriggered ? "live" : `${rules.touchBurstsToCapture} taps`,
      active: !isCountdown && !isResolved,
    },
  ];
}

function getStageCopyData(summary: GameSummary, phaseLabel: string): StageCopy {
  if (summary.phase === "introCountdown") {
    if (summary.profile === "mobile") {
      return {
        title: phaseLabel,
        body: "Bell is up. The herd breaks when the countdown clears.",
        hint: "Pick your lane before the first tap.",
      };
    }

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
    if (summary.profile === "mobile") {
      return {
        title: phaseLabel,
        body: "Round closed. Check the tally.",
        hint: "Bagged count and escape state are final.",
      };
    }

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
        body: "The last outlaw only bolts now.",
        hint: "You needed the pen fuller before it turned ghost.",
      };
    }

    if (summary.phase === "blinkBand") {
      return {
        title: phaseLabel,
        body: "Every loose worm gets one blink before the bag sticks.",
        hint: "Watch for the pale halo, then click again after the flash.",
      };
    }

    return {
      title: phaseLabel,
      body: "Mouse roundup is live and every bagged worm spikes the herd.",
      hint: "Sweep, click, recover, then cut back in.",
    };
  }

  if (summary.profile === "mobile" && summary.phase === "ghostFinale") {
    return {
      title: phaseLabel,
      body: "The last outlaw only bolts now.",
      hint: "Cut off the lane and finish the bag.",
    };
  }

  if (summary.rushTriggered) {
    return {
      title: phaseLabel,
      body:
        summary.profile === "mobile"
          ? "Tagged worms need one more clean tap."
          : "A branded worm only needs one more clean tap.",
      hint:
        summary.profile === "mobile"
          ? "Stay on that same worm and cash it out fast."
          : "Stay on that same worm and finish fast.",
    };
  }

  return {
    title: phaseLabel,
    body:
      summary.profile === "mobile"
        ? "First touch wakes the herd. Tap once to brand, again to bag."
        : "The first touch wakes the herd. One clean tap brands and the next one bags.",
    hint:
      summary.profile === "mobile"
        ? "Wake one worm, stay on it, and finish fast."
        : "Wake them up, pick one worm, and finish the second tap before drifting off.",
  };
}

function getOverlayKey(summary: GameSummary) {
  if (summary.profile === "mobile" && summary.phase === "activeChase") {
    return summary.rushTriggered ? "activeChase:rush" : "activeChase:primed";
  }

  return summary.phase;
}