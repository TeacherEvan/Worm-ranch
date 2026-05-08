import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGameStageAudioController,
  resolveNextGameStageAudioCue,
} from "./gameStageAudio";

afterEach(() => {
  vi.unstubAllGlobals();
});

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

type FakeAudio = {
  currentTime: number;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  preload: string;
  src: string;
};

function createAudioFactory() {
  const createdPlayers: FakeAudio[] = [];

  return {
    createdPlayers,
    factory(src: string) {
      const player: FakeAudio = {
        currentTime: 0,
        pause: vi.fn(),
        play: vi.fn(() => Promise.resolve()),
        preload: "",
        src,
      };

      createdPlayers.push(player);

      return player as unknown as HTMLAudioElement;
    },
  };
}

describe("gameStageAudio", () => {
  it("uses gunshot for the first six successful non-collect actions", () => {
    let cycleStep = 0;

    const cues = Array.from({ length: 6 }, () => {
      const resolution = resolveNextGameStageAudioCue({ kind: "tag", wormId: "worm-1", bursts: 1 }, cycleStep);
      cycleStep = resolution.nextCycleStep;
      return resolution.cue;
    });

    expect(cues).toEqual(["gunshot", "gunshot", "gunshot", "gunshot", "gunshot", "gunshot"]);
    expect(cycleStep).toBe(6);
  });

  it("uses whip for the next three successful non-collect actions", () => {
    let cycleStep = 6;

    const cues = Array.from({ length: 3 }, () => {
      const resolution = resolveNextGameStageAudioCue({ kind: "teleport", wormId: "worm-1", immortal: false }, cycleStep);
      cycleStep = resolution.nextCycleStep;
      return resolution.cue;
    });

    expect(cues).toEqual(["whip", "whip", "whip"]);
    expect(cycleStep).toBe(0);
  });

  it("repeats the nine-step cycle", () => {
    const finalWhip = resolveNextGameStageAudioCue({ kind: "tag", wormId: "worm-1", bursts: 1 }, 8);
    const wrappedGunshot = resolveNextGameStageAudioCue({ kind: "tag", wormId: "worm-1", bursts: 1 }, finalWhip.nextCycleStep);

    expect(finalWhip).toEqual({ cue: "whip", nextCycleStep: 0 });
    expect(wrappedGunshot).toEqual({ cue: "gunshot", nextCycleStep: 1 });
  });

  it("uses dinosaur for collect actions and still advances the cycle", () => {
    expect(resolveNextGameStageAudioCue({ kind: "collect", wormId: "worm-1", collected: 3 }, 5)).toEqual({
      cue: "dinosaur",
      nextCycleStep: 6,
    });
    expect(resolveNextGameStageAudioCue({ kind: "collect", wormId: "worm-1", collected: 4 }, 8)).toEqual({
      cue: "dinosaur",
      nextCycleStep: 0,
    });
  });

  it("stays silent and does not advance on miss and ignored actions", () => {
    expect(resolveNextGameStageAudioCue({ kind: "miss" }, 4)).toEqual({ cue: null, nextCycleStep: 4 });
    expect(resolveNextGameStageAudioCue({ kind: "ignored" }, 7)).toEqual({ cue: null, nextCycleStep: 7 });
  });

  it("creates a safe no-op controller when browser audio is unavailable", () => {
    const controller = createGameStageAudioController({
      audioElementFactory: () => null,
    });

    expect(() => controller.play({ kind: "tag", wormId: "worm-1", bursts: 1 })).not.toThrow();
    expect(controller.play({ kind: "collect", wormId: "worm-1", collected: 1 })).toEqual({
      cue: "dinosaur",
      nextCycleStep: 2,
    });
  });

  it("plays the expected local asset for each cue while keeping the sequencer progression intact", async () => {
    const { createdPlayers, factory } = createAudioFactory();
    const controller = createGameStageAudioController({
      audioElementFactory: factory,
    });

    expect(controller.play({ kind: "tag", wormId: "worm-1", bursts: 1 })).toEqual({
      cue: "gunshot",
      nextCycleStep: 1,
    });
    expect(controller.play({ kind: "teleport", wormId: "worm-1", immortal: false })).toEqual({
      cue: "gunshot",
      nextCycleStep: 2,
    });
    expect(controller.play({ kind: "collect", wormId: "worm-1", collected: 1 })).toEqual({
      cue: "dinosaur",
      nextCycleStep: 3,
    });

    await flushMicrotasks();

    expect(createdPlayers).toHaveLength(3);
    expect(createdPlayers.map((player) => player.src)).toEqual([
      "/audio/gameplay/western-gunshot.wav",
      "/audio/gameplay/western-gunshot.wav",
      "/audio/gameplay/dinosaur-roar.wav",
    ]);
    expect(createdPlayers[0]?.play).toHaveBeenCalledTimes(1);
    expect(createdPlayers[1]?.play).toHaveBeenCalledTimes(1);
    expect(createdPlayers[2]?.play).toHaveBeenCalledTimes(1);
    expect(controller.getCycleStep()).toBe(3);
  });

  it("reuses pooled players when the cue wraps back around", async () => {
    const { createdPlayers, factory } = createAudioFactory();
    const controller = createGameStageAudioController({
      audioElementFactory: factory,
    });

    for (let index = 0; index < 6; index += 1) {
      controller.play({ kind: "tag", wormId: `worm-${index}`, bursts: 1 });
    }

    controller.play({ kind: "teleport", wormId: "worm-7", immortal: false });
    controller.play({ kind: "teleport", wormId: "worm-8", immortal: false });
    controller.play({ kind: "teleport", wormId: "worm-9", immortal: false });
    controller.play({ kind: "tag", wormId: "worm-10", bursts: 1 });

    await flushMicrotasks();

    expect(createdPlayers).toHaveLength(9);
    expect(createdPlayers[0]?.play).toHaveBeenCalledTimes(2);
    expect(createdPlayers[0]?.currentTime).toBe(0);
    expect(createdPlayers[6]?.src).toBe("/audio/gameplay/whip-crack.wav");
    expect(controller.getCycleStep()).toBe(1);
  });

  it("swallows playback failures from local audio elements", async () => {
    const { factory } = createAudioFactory();
    const failure = new Error("boom");

    const failingController = createGameStageAudioController({
      audioElementFactory(src) {
        const player = factory(src) as unknown as FakeAudio;
        player.play.mockRejectedValueOnce(failure);
        return player as unknown as HTMLAudioElement;
      },
    });

    expect(() => failingController.play({ kind: "tag", wormId: "worm-1", bursts: 1 })).not.toThrow();

    await flushMicrotasks();

    expect(failingController.getCycleStep()).toBe(1);
  });

  it("pauses and resets every pooled player on dispose", async () => {
    const { createdPlayers, factory } = createAudioFactory();
    const controller = createGameStageAudioController({
      audioElementFactory: factory,
    });

    controller.play({ kind: "tag", wormId: "worm-1", bursts: 1 });
    controller.play({ kind: "teleport", wormId: "worm-2", immortal: false });
    controller.play({ kind: "collect", wormId: "worm-3", collected: 1 });

    await flushMicrotasks();

    createdPlayers[0]!.currentTime = 1.25;
    createdPlayers[1]!.currentTime = 0.5;
    createdPlayers[2]!.currentTime = 3.5;

    controller.dispose();

    for (const player of createdPlayers) {
      expect(player.pause).toHaveBeenCalledTimes(1);
      expect(player.currentTime).toBe(0);
    }
  });
});