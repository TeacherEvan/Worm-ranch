export type WelcomeLaunchMediaState = "video" | "handoff" | "image";

export type WelcomeLaunchMediaEvent = "video-ready" | "video-ended" | "video-error" | "handoff-finished";

export function getInitialWelcomeLaunchMediaState(options: {
  reducedMotion: boolean;
  introVideoSrc: string | null;
}): WelcomeLaunchMediaState {
  void options;

  return "image";
}

export function getNextWelcomeLaunchMediaState(
  state: WelcomeLaunchMediaState,
  event: WelcomeLaunchMediaEvent,
): WelcomeLaunchMediaState {
  if (state === "image" && event === "video-ready") {
    return "video";
  }

  if (state === "video") {
    if (event === "video-ended") {
      return "handoff";
    }

    if (event === "video-error") {
      return "image";
    }
  }

  if (state === "handoff" && event === "handoff-finished") {
    return "image";
  }

  return state;
}