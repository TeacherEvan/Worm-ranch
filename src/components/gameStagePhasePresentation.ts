import type { DisplayProfile } from "@/game/detection";
import { getGameplayLevelRules, normalizeGameplayLevel } from "@/game/levels";
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

type OverlayDensity = "standard" | "compact" | "focused" | "cinematic";

export type DensityPreference = "auto" | "focused" | "cinematic";

export type StagePresentation = {
  phaseLabel: string;
  phaseChipLabel: string;
  statusItems: StatusItem[];
  copy: StageCopy;
  overlayDensity: OverlayDensity;
  overlayKey: string;
  countdownOverlay: { value: string; progress: number; tickMs: number } | null;
  fieldBanner: string | null;
};

export function getStagePresentation(
  summary: GameSummary,
  profile: DisplayProfile = summary.profile,
  level = 1,
  densityPreference: DensityPreference = "auto",
): StagePresentation {
  const rules = getGameplayLevelRules(profile, level);
  const viewSummary = profile === summary.profile ? summary : { ...summary, profile };
  const phaseLabel = getPhaseLabelText(viewSummary);
  const phaseChipLabel = getPhaseChipText(viewSummary, rules);
  const copy = getStageCopyData(viewSummary, phaseLabel, level, rules);

  return {
    phaseLabel,
    phaseChipLabel,
    statusItems: buildStatusItemsForSummary(viewSummary, rules),
    copy,
    overlayDensity: getOverlayDensity(viewSummary, densityPreference),
    overlayKey: getOverlayKey(viewSummary),
    countdownOverlay:
      viewSummary.phase === "introCountdown"
        ? {
            value: String(Math.max(1, Math.ceil(viewSummary.countdownMs / 1000))),
            progress:
              rules.introCountdownMs > 0
                ? Math.max(0, Math.min(1, viewSummary.countdownMs / rules.introCountdownMs))
                : 0,
            tickMs: Math.max(0, viewSummary.countdownMs % 1000),
          }
        : null,
    fieldBanner:
      profile === "desktop" && viewSummary.phase === "ghostFinale"
        ? "Ghost finale: the last outlaw only bolts"
        : null,
  };
}

function getOverlayDensity(summary: GameSummary, densityPreference: DensityPreference = "auto"): OverlayDensity {
  if (densityPreference === "focused" || densityPreference === "cinematic") {
    return densityPreference;
  }

  // Adaptive auto mode (spec section 5): immersion rises with intensity.
  if (summary.phase === "blinkBand" || summary.phase === "ghostFinale") {
    return "focused";
  }

  if (summary.phase === "gameOver" || summary.phase === "resolved") {
    return "cinematic";
  }

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
    case "gameOver":
      return "Game over";
    case "resolved":
      return "Tallied";
  }
}

function getPhaseChipText(summary: GameSummary, rules: ReturnType<typeof getGameplayLevelRules>) {
  if (summary.baseDefense?.active) {
    if (summary.phase === "gameOver") {
      return "BASE DESTROYED";
    }
    return `TENT T${summary.baseDefense.tentLevel}`;
  }

  if (summary.phase === "introCountdown") {
    return "Countdown";
  }

  if (summary.continuousActive) {
    if (summary.phase === "gameOver") {
      return "GAME OVER";
    }

    return summary.targetColor ? `${summary.targetColor.label} target` : "Target live";
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
  rules: ReturnType<typeof getGameplayLevelRules>,
): StatusItem[] {
  const isCountdown = summary.phase === "introCountdown";
  const isResolved = summary.phase === "resolved";
  const isGameOver = summary.phase === "gameOver";
  const showClock = !summary.continuousActive && !summary.baseDefense?.active;

  if (summary.baseDefense?.active) {
    const bd = summary.baseDefense;
    return [
      {
        id: "bank",
        label: "Bank",
        value: `${bd.bankCredits} CR`,
        active: bd.bankCredits > 0,
      },
      {
        id: "tentHp",
        label: "Tent HP",
        value: `${Math.ceil(bd.tentHp)}/${bd.tentMaxHp}`,
        active: bd.tentHp < bd.tentMaxHp * 0.4,
      },
      {
        id: "miners",
        label: "Miners",
        value: `${bd.minersCount}`,
        active: true,
      },
      {
        id: "defenses",
        label: "Defenses",
        value: `W:${bd.wallsCount} T:${bd.towersCount}`,
        active: bd.wallsCount > 0 || bd.towersCount > 0,
      },
    ];
  }

  if (summary.continuousActive) {
    return [
      {
        id: "bagged",
        label: "Bagged",
        value: `${summary.collected}/${rules.totalWorms}`,
        active: !isResolved && !isGameOver && summary.collected > 0,
      },
      {
        id: "mechanic",
        label: isGameOver ? "Failure" : "Target",
        value: isGameOver ? "wrong color" : summary.targetColor ? `${summary.targetColor.progress}/${summary.targetColor.goal}` : "Waiting",
        active: !isCountdown && !isResolved,
      },
    ];
  }

  if (summary.profile === "desktop") {
    return [
      {
        id: "bagged",
        label: "Bagged",
        value: `${summary.collected}/${rules.totalWorms}`,
        active: !isResolved && summary.collected > 0,
      },
      ...(showClock
        ? [
            {
              id: "clock",
              label: "Clock",
              value: `${Math.ceil(summary.timerMs / 1000)}s`,
              active: !isCountdown && !isResolved && summary.timerMs <= 15_000,
            },
          ]
        : []),
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
    ...(showClock
      ? [
          {
            id: "clock",
            label: "Beat bell",
            value: `${Math.ceil(summary.timerMs / 1000)}s left`,
            active: !isCountdown && !isResolved,
          },
        ]
      : []),
    {
      id: "mechanic",
      label: summary.rushTriggered ? "Rush" : "Bag rule",
      value:
        isCountdown
          ? "waiting"
          : summary.rushTriggered
            ? `${rules.touchBurstsToCapture} taps live`
            : `${rules.touchBurstsToCapture} taps`,
      active: !isCountdown && !isResolved,
    },
  ];
}

function getStageCopyData(
  summary: GameSummary,
  phaseLabel: string,
  level: number,
  rules: ReturnType<typeof getGameplayLevelRules>,
): StageCopy {
  const title = `Level ${normalizeGameplayLevel(level)} · ${phaseLabel}`;

  if (summary.phase === "introCountdown") {
    return {
      title,
      body: "Round starts on zero.",
      hint: summary.profile === "desktop" ? "Line up your first click." : "Pick a lane now.",
    };
  }

  if (summary.phase === "resolved") {
    return {
      title,
      body: "Round closed.",
      hint: "Check the tally.",
    };
  }

  if (summary.baseDefense?.active) {
    if (summary.phase === "gameOver") {
      return {
        title: "BASE DESTROYED",
        body: "The central tent was overwhelmed by the swarm.",
        hint: "Upgrade your defenses and miners next round.",
      };
    }
    return {
      title: `Base Defense · Tier ${summary.baseDefense.tentLevel}`,
      body: "Protect your tent! Click worms with your shotgun blast.",
      hint: "Use BANK menu at top to purchase towers, walls, and upgrades.",
    };
  }

  if (summary.continuousActive && summary.phase === "gameOver") {
    return {
      title: "GAME OVER",
      body: summary.targetColor ? `Wrong color bagged. Target was ${summary.targetColor.label}.` : "Wrong color bagged.",
      hint: "Hold the called color only.",
    };
  }

  if (summary.continuousActive) {
    if (!summary.targetColor) {
      return {
        title,
        body: "Hold the lane. New target incoming.",
        hint: "Stay loose until the next color call lands.",
      };
    }

    return {
      title,
      body: `Remove ${summary.targetColor.goal} ${summary.targetColor.label} worms.`,
      hint:
        summary.profile === "desktop"
          ? "Ignore the others until the target changes."
          : "Stay on the called color until it flips.",
    };
  }

  if (summary.profile === "desktop") {
    if (summary.phase === "ghostFinale") {
      return {
        title,
        body: "Only the last worm moves now.",
        hint: "Cut it off before the clock runs out.",
      };
    }

    if (summary.phase === "blinkBand") {
      return {
        title,
        body: "Loose worms blink once before a bag sticks.",
        hint: "Wait out the flash, then click again.",
      };
    }

    return {
      title,
      body: "Roundup is live.",
      hint: "Click once to brand, again to bag.",
    };
  }

  if (summary.phase === "ghostFinale") {
    return {
      title,
      body: "Only the last worm moves now.",
      hint: "Cut off the lane and finish the bag.",
    };
  }

  if (summary.rushTriggered) {
    return {
      title,
      body: `Tagged worms need ${rules.touchBurstsToCapture} taps.`,
      hint: "Stay on one worm until it bags.",
    };
  }

  return {
    title,
    body: `First touch starts the chase. ${rules.touchBurstsToCapture} taps bag a worm.`,
    hint: "Stay on one worm until it bags.",
  };
}

function getOverlayKey(summary: GameSummary) {
  if (summary.continuousActive && summary.phase === "gameOver") {
    return `gameOver:${summary.targetColor?.colorId ?? "none"}`;
  }

  if (summary.continuousActive && summary.targetColor) {
    return `target:${summary.targetColor.colorId}:${summary.targetColor.progress}:${summary.targetColor.visible}`;
  }

  if (summary.profile === "mobile" && summary.phase === "activeChase") {
    return summary.rushTriggered ? "activeChase:rush" : "activeChase:primed";
  }

  return summary.phase;
}
