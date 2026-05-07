import { describe, expect, it } from "vitest";
import { getWelcomeHeroPresentation } from "./welcomeHeroPresentation";

describe("welcomeHeroPresentation", () => {
  it("selects the desktop asset for wide layouts", () => {
    const presentation = getWelcomeHeroPresentation({ viewportWidth: 1280, reducedMotion: false });

    expect(presentation.layout).toBe("desktop");
    expect(presentation.assetPath).toBe("/art/welcome-memory-desktop.webp");
    expect(presentation.desktopAssetPath).toBe("/art/welcome-memory-desktop.webp");
    expect(presentation.mobileAssetPath).toBe("/art/welcome-memory-mobile.webp");
    expect(presentation.overlayStrength).toBe("strong");
    expect(presentation.ambientMotionLayersEnabled).toBe(true);
  });

  it("selects the mobile asset for narrow layouts", () => {
    const presentation = getWelcomeHeroPresentation({ viewportWidth: 390, reducedMotion: false });

    expect(presentation.layout).toBe("mobile");
    expect(presentation.assetPath).toBe("/art/welcome-memory-mobile.webp");
    expect(presentation.cropIntent).toBe("preserve-rider-silhouette-and-copy-safe-zone");
  });

  it("disables optional motion layers when reduced motion is enabled", () => {
    const presentation = getWelcomeHeroPresentation({ viewportWidth: 1280, reducedMotion: true });

    expect(presentation.layout).toBe("desktop");
    expect(presentation.assetPath).toBe("/art/welcome-memory-desktop.webp");
    expect(presentation.ambientMotionLayersEnabled).toBe(false);
  });
});