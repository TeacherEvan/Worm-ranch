import { describe, expect, it } from "vitest";
import {
  MOBILE_LAYOUT_MAX_WIDTH,
  getWelcomeHeroLayout,
  getWelcomeHeroPresentation,
  getWelcomeHeroVariant,
} from "./welcomeHeroPresentation";

describe("welcomeHeroPresentation", () => {
  it("selects the desktop welcome image for wide layouts", () => {
    const presentation = getWelcomeHeroPresentation({ reducedMotion: false });
    const variant = getWelcomeHeroVariant(1280);

    expect(getWelcomeHeroLayout(1280)).toBe("desktop");
    expect(variant.src).toBe("/art/worm-ranch-launch-poster.png");
    expect(variant.introVideoSrc).toBe("/art/worm-ranch-launch-intro.mp4");
    expect(presentation.variants.desktop.src).toBe("/art/worm-ranch-launch-poster.png");
    expect(presentation.variants.desktop.introVideoSrc).toBe("/art/worm-ranch-launch-intro.mp4");
    expect(presentation.variants.mobile.src).toBe("/art/worm-ranch-launch-poster.png");
    expect(presentation.variants.mobile.introVideoSrc).toBe("/art/worm-ranch-launch-intro.mp4");
    expect(variant.imageObjectPosition).toBe("50% 50%");
    expect(variant.videoObjectPosition).toBe("50% 50%");
    expect(variant.overlayStrength).toBe("strong");
    expect(presentation.ambientMotionLayersEnabled).toBe(true);
  });

  it("selects the mobile welcome image for narrow layouts", () => {
    const variant = getWelcomeHeroVariant(390);

    expect(getWelcomeHeroLayout(390)).toBe("mobile");
    expect(variant.src).toBe("/art/worm-ranch-launch-poster.png");
    expect(variant.introVideoSrc).toBe("/art/worm-ranch-launch-intro.mp4");
    expect(variant.imageObjectPosition).toBe("50% 50%");
    expect(variant.videoObjectPosition).toBe("50% 50%");
    expect(variant.cropIntent).toBe("preserve-rider-silhouette-and-copy-safe-zone");
  });

  it("disables optional motion layers when reduced motion is enabled", () => {
    const presentation = getWelcomeHeroPresentation({ reducedMotion: true });

    expect(presentation.variants.desktop.textSafeZone).toBe("right-copy-column");
    expect(presentation.ambientMotionLayersEnabled).toBe(false);
  });

  it("treats the mobile cutoff as inclusive and falls back to desktop when width is unknown", () => {
    expect(getWelcomeHeroLayout(MOBILE_LAYOUT_MAX_WIDTH)).toBe("mobile");
    expect(getWelcomeHeroLayout(undefined)).toBe("desktop");
  });
});