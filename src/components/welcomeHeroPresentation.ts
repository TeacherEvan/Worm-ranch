export const MOBILE_LAYOUT_MAX_WIDTH = 767;

export type WelcomeHeroLayout = "desktop" | "mobile";
export type WelcomeHeroCropIntent = "preserve-rider-silhouette-and-copy-safe-zone";
export type WelcomeHeroOverlayStrength = "strong";
export type WelcomeHeroTextSafeZone = "right-copy-column" | "lower-copy-band";

export type WelcomeHeroVariant = {
  layout: WelcomeHeroLayout;
  src: string;
  introVideoSrc: string | null;
  imageObjectPosition: string;
  videoObjectPosition: string;
  cropIntent: WelcomeHeroCropIntent;
  overlayStrength: WelcomeHeroOverlayStrength;
  textSafeZone: WelcomeHeroTextSafeZone;
};

export type WelcomeHeroPresentation = {
  variants: Record<WelcomeHeroLayout, WelcomeHeroVariant>;
  ambientMotionLayersEnabled: boolean;
};

export type WelcomeHeroPresentationOptions = {
  reducedMotion: boolean;
};

const HERO_VARIANTS: Record<WelcomeHeroLayout, WelcomeHeroVariant> = {
  desktop: {
    layout: "desktop",
    src: "/art/worm-ranch-launch-poster.png",
    introVideoSrc: "/art/worm-ranch-launch-intro.mp4",
    imageObjectPosition: "50% 50%",
    videoObjectPosition: "50% 50%",
    cropIntent: "preserve-rider-silhouette-and-copy-safe-zone",
    overlayStrength: "strong",
    textSafeZone: "right-copy-column",
  },
  mobile: {
    layout: "mobile",
    src: "/art/worm-ranch-launch-poster.png",
    introVideoSrc: "/art/worm-ranch-launch-intro.mp4",
    imageObjectPosition: "50% 50%",
    videoObjectPosition: "50% 50%",
    cropIntent: "preserve-rider-silhouette-and-copy-safe-zone",
    overlayStrength: "strong",
    textSafeZone: "lower-copy-band",
  },
};

export function getWelcomeHeroLayout(viewportWidth: number | undefined): WelcomeHeroLayout {
  if (viewportWidth === undefined) {
    return "desktop";
  }

  return viewportWidth <= MOBILE_LAYOUT_MAX_WIDTH ? "mobile" : "desktop";
}

export function getWelcomeHeroPresentation({ reducedMotion }: WelcomeHeroPresentationOptions): WelcomeHeroPresentation {
  return {
    variants: HERO_VARIANTS,
    ambientMotionLayersEnabled: !reducedMotion,
  };
}

export function getWelcomeHeroVariant(viewportWidth: number | undefined): WelcomeHeroVariant {
  return HERO_VARIANTS[getWelcomeHeroLayout(viewportWidth)];
}