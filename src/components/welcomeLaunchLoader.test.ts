import { describe, expect, it } from "vitest";
import {
  getWelcomeLaunchLoaderPhase,
  getWelcomeLaunchLoaderProgress,
  getNextWelcomeLaunchLoaderDisplayProgress,
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
  it("starts with a themed boot phase and a visible baseline progress floor", () => {
    const snapshot = createSnapshot();

    expect(getWelcomeLaunchLoaderPhase(snapshot)).toMatchObject({
      title: "Booting the reclamation rig",
      detail: "Spooling pasture glass and worm-scan overlays.",
    });
    expect(getWelcomeLaunchLoaderProgress(snapshot)).toBe(18);
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
    expect(getWelcomeLaunchLoaderProgress(snapshot)).toBe(18);
  });

  it("advances as poster and video resources become ready", () => {
    expect(getWelcomeLaunchLoaderProgress(createSnapshot({ posterLoaded: true }))).toBe(52);
    expect(
      getWelcomeLaunchLoaderProgress(
        createSnapshot({ posterLoaded: true, introVideoMetadataLoaded: true, introVideoCanPlay: true }),
      ),
    ).toBe(100);
  });

  it("switches to a release phase once the launch media is handing off or settled", () => {
    expect(getWelcomeLaunchLoaderPhase(createSnapshot({ posterLoaded: true, launchMediaState: "handoff" }))).toMatchObject({
      title: "Dropping the blast shield",
    });
    expect(
      getWelcomeLaunchLoaderPhase(
        createSnapshot({
          posterLoaded: true,
          reducedMotion: true,
          introVideoExpected: false,
          launchMediaState: "image",
        }),
      ),
    ).toMatchObject({
      title: "Gate ready",
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