import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsScreen } from "./SettingsScreen";

describe("SettingsScreen", () => {
  it("renders a compact settings surface with action controls and two focused option groups", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsScreen, {
        analyticsEnabled: true,
        displayMode: "auto",
        onAnalyticsEnabledChange: vi.fn(),
        onBack: vi.fn(),
        onDisplayModeChange: vi.fn(),
        onReducedMotionChange: vi.fn(),
        onStart: vi.fn(),
        reducedMotion: false,
      }),
    );

    expect(html).toContain('data-layout="compact-settings"');
    expect(html).toContain('data-role="option-groups"');
    expect(html).toContain("Ride this setup");
    expect(html).toContain("Display mode");
    expect(html).toContain("Preferences");
  });

  it("exposes the CRT overlay toggle and stage density choices when wired", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsScreen, {
        analyticsEnabled: true,
        crtOverlay: true,
        displayDensity: "cinematic",
        displayMode: "auto",
        onAnalyticsEnabledChange: vi.fn(),
        onBack: vi.fn(),
        onCrtOverlayChange: vi.fn(),
        onDisplayDensityChange: vi.fn(),
        onDisplayModeChange: vi.fn(),
        onReducedMotionChange: vi.fn(),
        onStart: vi.fn(),
        reducedMotion: false,
      }),
    );

    expect(html).toContain("CRT scanline overlay");
    expect(html).toContain("Stage density");
    expect(html).toContain("Cinematic bars");
  });
});