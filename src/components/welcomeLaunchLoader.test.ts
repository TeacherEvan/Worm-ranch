import { describe, expect, it } from "vitest";
import {
  getWelcomeLaunchLoaderPhase,
  getWelcomeLaunchLoaderProgress,
  getNextWelcomeLaunchLoaderDisplayProgress,
  shouldShowWelcomeLaunchLoader,
  type WelcomeLaunchLoaderSnapshot,
} from "./welcomeLaunchLoader";

function createSnapshot(overrides: Partial<WelcomeLaunchLoaderSnapshot> = {}): WelcomeLaunchLoaderSnapshot {
  return {
    reducedMotion: false,
    posterLoaded: false,
    introVideoExpected: true,
    introVideoMetadataLoaded: false,
    introVideoCanPlay: false,
    launchMediaState: "video",
    ...overrides,
  };
}

describe("welcomeLaunchLoader", () => {
  it("treats the poster-first launch path as immediately visible even before media readiness events arrive", () => {
    const snapshot = createSnapshot({
      introVideoExpected: false,
      launchMediaState: "image",
    });

    expect(getWelcomeLaunchLoaderPhase(snapshot)).toMatchObject({
      title: "Ranch glass coming online",
      detail: "Locking the still frame before the gate opens.",
    });
    expect(getWelcomeLaunchLoaderProgress(snapshot)).toBe(100);
    expect(shouldShowWelcomeLaunchLoader(snapshot)).toBe(false);
  });

  it("shows a lighter poster-first phase when reduced motion skips the intro reel", () => {
    const snapshot = createSnapshot({
      reducedMotion: true,
      introVideoExpected: false,
      launchMediaState: "image",
    });

    expect(getWelcomeLaunchLoaderPhase(snapshot)).toMatchObject({
      title: "Ranch glass coming online",
      detail: "Locking the still frame before the gate opens.",
    });
    expect(getWelcomeLaunchLoaderProgress(snapshot)).toBe(100);
  });

  it("keeps the image-only launch path ready once the poster has loaded", () => {
    const snapshot = createSnapshot({
      posterLoaded: true,
      introVideoExpected: false,
      launchMediaState: "image",
    });

    expect(getWelcomeLaunchLoaderPhase(snapshot)).toMatchObject({
      title: "Ranch glass coming online",
      detail: "Locking the still frame before the gate opens.",
    });
    expect(getWelcomeLaunchLoaderProgress(snapshot)).toBe(100);
    expect(shouldShowWelcomeLaunchLoader(snapshot)).toBe(false);
  });

  it("does not gate the hero on poster or video readiness once the image path is active", () => {
    expect(
      getWelcomeLaunchLoaderProgress(createSnapshot({ posterLoaded: false, introVideoExpected: false, launchMediaState: "image" })),
    ).toBe(100);
    expect(
      getWelcomeLaunchLoaderProgress(createSnapshot({ posterLoaded: true, introVideoExpected: false, launchMediaState: "image" })),
    ).toBe(100);
    expect(
      getWelcomeLaunchLoaderProgress(
        createSnapshot({
          posterLoaded: true,
          introVideoExpected: false,
          introVideoMetadataLoaded: true,
          introVideoCanPlay: true,
          launchMediaState: "image",
        }),
      ),
    ).toBe(100);
  });

  it("switches to a release phase once the launch media is handing off or settled", () => {
    expect(getWelcomeLaunchLoaderPhase(createSnapshot({ posterLoaded: true, launchMediaState: "handoff" }))).toMatchObject({
      title: "Dropping the blast shield",
    });
  });

  it("eases the displayed progress toward the next real readiness milestone", () => {
    expect(getNextWelcomeLaunchLoaderDisplayProgress({ current: 18, target: 52, reducedMotion: false })).toBe(27);
    expect(getNextWelcomeLaunchLoaderDisplayProgress({ current: 51, target: 52, reducedMotion: false })).toBe(52);
  });

  it("snaps directly to the target when reduced motion is enabled or progress must recover downward", () => {
    expect(getNextWelcomeLaunchLoaderDisplayProgress({ current: 18, target: 52, reducedMotion: true })).toBe(52);
    expect(getNextWelcomeLaunchLoaderDisplayProgress({ current: 63, target: 52, reducedMotion: false })).toBe(52);
  });
});