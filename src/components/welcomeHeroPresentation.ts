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
    src: "/art/welcome-memory-desktop.webp",
    introVideoSrc: null,
    imageObjectPosition: "34% 46%",
    videoObjectPosition: "34% 46%",
    cropIntent: "preserve-rider-silhouette-and-copy-safe-zone",
    overlayStrength: "strong",
    textSafeZone: "right-copy-column",
  },
  mobile: {
    layout: "mobile",
    src: "/art/welcome-memory-mobile.webp",
    introVideoSrc: null,
    imageObjectPosition: "58% 22%",
    videoObjectPosition: "56% 20%",
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