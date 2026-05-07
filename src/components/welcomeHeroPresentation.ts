const MOBILE_LAYOUT_MAX_WIDTH = 767;

const DESKTOP_ASSET_PATH = "/art/welcome-memory-desktop.webp";
const MOBILE_ASSET_PATH = "/art/welcome-memory-mobile.webp";

export type WelcomeHeroLayout = "desktop" | "mobile";
export type WelcomeHeroCropIntent = "preserve-rider-silhouette-and-copy-safe-zone";
export type WelcomeHeroOverlayStrength = "strong";

export type WelcomeHeroPresentation = {
  layout: WelcomeHeroLayout;
  assetPath: string;
  desktopAssetPath: string;
  mobileAssetPath: string;
  cropIntent: WelcomeHeroCropIntent;
  overlayStrength: WelcomeHeroOverlayStrength;
  ambientMotionLayersEnabled: boolean;
};

export type WelcomeHeroPresentationOptions = {
  viewportWidth: number;
  reducedMotion: boolean;
};

export function getWelcomeHeroPresentation({
  viewportWidth,
  reducedMotion,
}: WelcomeHeroPresentationOptions): WelcomeHeroPresentation {
  const layout: WelcomeHeroLayout = viewportWidth <= MOBILE_LAYOUT_MAX_WIDTH ? "mobile" : "desktop";

  return {
    layout,
    assetPath: layout === "mobile" ? MOBILE_ASSET_PATH : DESKTOP_ASSET_PATH,
    desktopAssetPath: DESKTOP_ASSET_PATH,
    mobileAssetPath: MOBILE_ASSET_PATH,
    cropIntent: "preserve-rider-silhouette-and-copy-safe-zone",
    overlayStrength: "strong",
    ambientMotionLayersEnabled: !reducedMotion,
  };
}