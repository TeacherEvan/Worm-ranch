export type DisplayProfile = "desktop" | "mobile";

export type DisplayMode = "auto" | DisplayProfile;

export type DisplaySnapshot = {
  profile: DisplayProfile;
  pointer: "fine" | "coarse";
  width: number;
  height: number;
  orientation: "landscape" | "portrait";
  dpr: number;
};

export function detectDisplayProfile(currentWindow: Window): DisplaySnapshot {
  const width = currentWindow.innerWidth;
  const height = currentWindow.innerHeight;
  const coarse = currentWindow.matchMedia("(pointer: coarse)").matches;
  const profile = coarse || width < 820 ? "mobile" : "desktop";

  return {
    profile,
    pointer: coarse ? "coarse" : "fine",
    width,
    height,
    orientation: width >= height ? "landscape" : "portrait",
    dpr: currentWindow.devicePixelRatio || 1,
  };
}
