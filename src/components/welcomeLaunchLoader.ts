import type { WelcomeLaunchMediaState } from "./welcomeLaunchMedia";

export type WelcomeLaunchLoaderSnapshot = {
  reducedMotion: boolean;
  posterLoaded: boolean;
  introVideoExpected: boolean;
  introVideoMetadataLoaded: boolean;
  introVideoCanPlay: boolean;
  launchMediaState: WelcomeLaunchMediaState;
};

export type WelcomeLaunchLoaderPhase = {
  title: string;
  detail: string;
};

export function getWelcomeLaunchLoaderProgress(snapshot: WelcomeLaunchLoaderSnapshot) {
  if (!snapshot.introVideoExpected || snapshot.launchMediaState === "image") {
    return 100;
  }

  const baseline = 18;

  let progress = baseline;

  if (snapshot.posterLoaded) {
    progress += 34;
  }

  if (snapshot.introVideoMetadataLoaded) {
    progress += 22;
  }

  if (snapshot.introVideoCanPlay) {
    progress += 26;
  }

  return Math.min(100, progress);
}

export function getWelcomeLaunchLoaderPhase(snapshot: WelcomeLaunchLoaderSnapshot): WelcomeLaunchLoaderPhase {
  if (snapshot.launchMediaState === "handoff") {
    return {
      title: "Dropping the blast shield",
      detail: "Handing the launch plate off to the live ranch feed.",
    };
  }

  if (snapshot.launchMediaState === "image") {
    return {
      title: "Ranch glass coming online",
      detail: "Locking the still frame before the gate opens.",
    };
  }

  if (snapshot.reducedMotion || !snapshot.introVideoExpected) {
    return {
      title: "Ranch glass coming online",
      detail: "Locking the still frame before the gate opens.",
    };
  }

  if (!snapshot.posterLoaded) {
    return {
      title: "Booting the reclamation rig",
      detail: "Spooling pasture glass and worm-scan overlays.",
    };
  }

  if (!snapshot.introVideoMetadataLoaded) {
    return {
      title: "Indexing the intro reel",
      detail: "Reading the blast tape and syncing the salvage frame.",
    };
  }

  if (!snapshot.introVideoCanPlay) {
    return {
      title: "Pressurizing the launch bay",
      detail: "Giving the reel enough charge to run clean on first fire.",
    };
  }

  return {
    title: "Gate ready",
    detail: "Intro reel primed. Opening the pasture glass.",
  };
}

export function getNextWelcomeLaunchLoaderDisplayProgress({
  current,
  target,
  reducedMotion,
}: {
  current: number;
  target: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion || target <= current) {
    return target;
  }

  const delta = target - current;
  const step = Math.max(2, Math.min(12, Math.ceil(delta / 4)));

  return Math.min(target, current + step);
}

export function shouldShowWelcomeLaunchLoader(snapshot: WelcomeLaunchLoaderSnapshot) {
  return getWelcomeLaunchLoaderProgress(snapshot) < 100;
}