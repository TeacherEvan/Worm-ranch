import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameStage } from "./GameStage";
import styles from "./GameStage.module.css";

describe("GameStage", () => {
  it("renders a dedicated phase chip so the current round state stays visible above the guidance copy", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        profile: "mobile",
        reducedMotion: false,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain(styles.phaseBadge);
    expect(html).toContain(`class="${styles.phaseBadge} `);
    expect(html.indexOf(styles.phaseBadge)).toBeLessThan(html.indexOf("Bell is up. The herd breaks when the countdown clears."));
  });

  it("marks the phase chip as a full-motion idle badge when no gameplay cue is active", () => {
    const html = renderToStaticMarkup(
      createElement(GameStage, {
        profile: "desktop",
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
        profile: "desktop",
        reducedMotion: true,
        onSummaryChange: vi.fn(),
        onRoundEnd: vi.fn(),
        onEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-phase-cue="none"');
    expect(html).toContain('data-phase-motion="reduced"');
  });
});