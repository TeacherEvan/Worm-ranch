import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameStage, getCappedCanvasDpr, getVisibleSummary } from "./GameStage";
import styles from "./GameStage.module.css";
import type { ActionResult } from "@/game/types";
import { createInteractionHarness } from "./gameStageTestHelpers";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("GameStage.render", () => {
  it("caps canvas DPR on high-density screens with stricter caps for mobile and reduced motion", () => {
    expect(getCappedCanvasDpr(3, "desktop", false)).toBe(2);
    expect(getCappedCanvasDpr(3, "mobile", false)).toBe(1.5);
    expect(getCappedCanvasDpr(3, "desktop", true)).toBe(1.5);
    expect(getCappedCanvasDpr(1.25, "desktop", false)).toBe(1.25);
  });

  it("quantizes visible summary timer fields to whole seconds", () => {
    expect(
      getVisibleSummary({
        profile: "desktop",
        phase: "activeChase",
        collected: 0,
        remaining: 4,
        fairies: 0,
        targetColor: null,
        timerMs: 12_345,
        continuousActive: false,
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 1_120,
        finalWormActive: false,
        rushTriggered: false,
      }),
    ).toMatchObject({ timerMs: 13_000, countdownMs: 2_000 });
  });

  it("renders a dedicated phase chip so the current round state stays visible above the guidance copy", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "mobile",
        mode: "standard",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain(styles.phaseBadge);
    expect(html).toContain(`class="${styles.phaseBadge} `);
  });

  it("marks the phase chip as a full-motion idle badge when no gameplay cue is active", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "desktop",
        mode: "standard",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-phase-cue="none"');
    expect(html).toContain('data-phase-motion="full"');
  });

  it("marks the phase chip as reduced-motion when motion is dialed down", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 1,
        profile: "desktop",
        mode: "standard",
        reducedMotion: true,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-phase-cue="none"');
    expect(html).toContain('data-phase-motion="reduced"');
  });

  it("renders a keyboard-focusable canvas with hidden keyboard help and live status text", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        level: 2,
        profile: "desktop",
        mode: "standard",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Level 2");
    expect(html).toContain("Use arrow keys to move the target between worms.");
    expect(html).toContain('aria-live="polite"');
  });

  it("renders the provided gameplay backdrop behind the stage", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        backdropUrl: "/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif",
        level: 1,
        profile: "desktop",
        mode: "standard",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('background-image:url(&quot;/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif&quot;)');
  });

  it("renders the live target-color callout while the announce window is visible", async () => {
    vi.resetModules();

    vi.doMock("@/components/gameStageAudio", () => ({
      createGameStageAudioController: vi.fn(() => ({
        dispose: vi.fn(),
        play: vi.fn(),
      })),
    }));
    vi.doMock("@/components/gameStageKeyboard", () => ({
      getKeyboardStatus: () => "status",
      getKeyboardTargetId: () => null,
    }));
    vi.doMock("@/components/gameStagePresentation", () => ({
      areSummariesEqual: () => true,
      drawStaticStageBackdrop: vi.fn(),
      renderStage: vi.fn(),
      stepFeedback: vi.fn(),
    }));
    vi.doMock("@/components/gameStageMotion", () => ({
      getMotionFeedback: () => ({ stageCue: "none" }),
    }));
    vi.doMock("@/components/gameStagePhasePresentation", () => ({
      getStagePresentation: () => ({
        overlayKey: "overlay",
        overlayDensity: "standard",
        phaseChipLabel: "Target live",
        copy: {
          title: "Level 1 · Live chase",
          body: "Remove 2 Pond Blue worms.",
          hint: "Ignore the others until the target changes.",
        },
        statusItems: [
          { id: "bagged", label: "Bagged", value: "0/12", active: false },
          { id: "mechanic", label: "Target", value: "0/2", active: true },
        ],
      }),
    }));
    vi.doMock("@/lib/analytics", () => ({
      getFairyLifecycleEvents: () => ({ events: [], nextStates: new Map() }),
      getRoundEndedDetails: vi.fn(),
      getRoundTransitionEvents: () => [],
    }));
    vi.doMock("@/game/engine", () => ({
      applyAccuratePress: vi.fn(),
      applyMiss: vi.fn(),
      createWorld: vi.fn(() => ({
        worms: [],
        fairies: [],
        roundResult: null,
        continuousMode: { active: true },
      })),
      findWormIdAtPoint: vi.fn(),
      getSummary: vi.fn(() => ({
        profile: "desktop",
        phase: "activeChase",
        collected: 0,
        remaining: 8,
        fairies: 0,
        timerMs: 42_000,
        continuousActive: true,
        speedBonus: 0,
        teleportsUnlocked: false,
        countdownMs: 0,
        finalWormActive: false,
        rushTriggered: false,
        targetColor: {
          colorId: "pond-blue",
          label: "Pond Blue",
          progress: 0,
          goal: 2,
          visible: true,
        },
      })),
      resizeWorld: vi.fn(),
      setPointer: vi.fn(),
      startContinuousMode: vi.fn(),
      startRound: vi.fn(),
      stepWorld: vi.fn(),
      stopContinuousMode: vi.fn(),
      triggerTouchRush: vi.fn(),
    }));
    vi.doMock("@/game/levels", () => ({
      getGameplayLevelRules: vi.fn(() => ({})),
    }));

    const { GameStage: TargetCalloutStage } = await import("./GameStage");
    const html = renderToStaticMarkup(
      createElement(TargetCalloutStage, {
        level: 1,
        profile: "desktop",
        mode: "standard",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain("TAP POND BLUE");
    expect(html).toContain("0/2");
  });
});
