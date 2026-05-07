import { describe, expect, it } from "vitest";
import {
  getInitialWelcomeLaunchMediaState,
  getNextWelcomeLaunchMediaState,
  type WelcomeLaunchMediaState,
} from "./welcomeLaunchMedia";

describe("welcomeLaunchMedia", () => {
  it("starts in video mode only when motion is allowed and an intro source exists", () => {
    expect(getInitialWelcomeLaunchMediaState({ reducedMotion: false, introVideoSrc: "/art/intro.mp4" })).toBe(
      "video",
    );
    expect(getInitialWelcomeLaunchMediaState({ reducedMotion: true, introVideoSrc: "/art/intro.mp4" })).toBe(
      "image",
    );
    expect(getInitialWelcomeLaunchMediaState({ reducedMotion: false, introVideoSrc: null })).toBe("image");
  });

  it("moves through a handoff state before settling on the still image", () => {
    const stateAfterEnd = getNextWelcomeLaunchMediaState("video", "video-ended");

    expect(stateAfterEnd).toBe("handoff");
    expect(getNextWelcomeLaunchMediaState(stateAfterEnd, "handoff-finished")).toBe("image");
  });

  it("drops straight to the image if the intro video errors before the handoff begins", () => {
    expect(getNextWelcomeLaunchMediaState("video", "video-error")).toBe("image");
  });

  it("ignores irrelevant events once the still image is already showing", () => {
    const state: WelcomeLaunchMediaState = "image";

    expect(getNextWelcomeLaunchMediaState(state, "video-ended")).toBe("image");
    expect(getNextWelcomeLaunchMediaState(state, "handoff-finished")).toBe("image");
  });
});