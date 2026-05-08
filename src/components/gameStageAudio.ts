import type { ActionResult } from "@/game/types";

export const GAME_STAGE_AUDIO_CYCLE_LENGTH = 9;
const GUNSHOT_CYCLE_LENGTH = 6;
const GAME_STAGE_AUDIO_ASSET_PATHS = {
  gunshot: "/audio/gameplay/western-gunshot.mp3",
  whip: "/audio/gameplay/whip-crack.mp3",
} satisfies Record<GameStageAudioCue, string>;
const GAME_STAGE_AUDIO_POOL_SIZES = {
  gunshot: 6,
  whip: 3,
} satisfies Record<GameStageAudioCue, number>;

export type GameStageAudioCue = "gunshot" | "whip";

export type GameStageAudioResolution = {
  cue: GameStageAudioCue | null;
  nextCycleStep: number;
};

type GameStageAudioPlayer = Pick<HTMLAudioElement, "currentTime" | "pause" | "play" | "preload" | "src"> & {
  paused?: boolean;
};

type AudioElementFactory = (src: string) => GameStageAudioPlayer | null;

type GameStageAudioControllerOptions = {
  initialCycleStep?: number;
  audioElementFactory?: AudioElementFactory;
};

export type GameStageAudioController = {
  getCycleStep: () => number;
  play: (actionResult: ActionResult) => GameStageAudioResolution;
  dispose: () => void;
};

export function normalizeGameStageAudioCycleStep(cycleStep: number) {
  return ((cycleStep % GAME_STAGE_AUDIO_CYCLE_LENGTH) + GAME_STAGE_AUDIO_CYCLE_LENGTH) % GAME_STAGE_AUDIO_CYCLE_LENGTH;
}

export function resolveNextGameStageAudioCue(
  actionResult: ActionResult,
  cycleStep: number,
): GameStageAudioResolution {
  const normalizedCycleStep = normalizeGameStageAudioCycleStep(cycleStep);

  if (actionResult.kind === "ignored" || actionResult.kind === "miss") {
    return {
      cue: null,
      nextCycleStep: normalizedCycleStep,
    };
  }

  return {
    cue: getCycleCue(normalizedCycleStep),
    nextCycleStep: normalizeGameStageAudioCycleStep(normalizedCycleStep + 1),
  };
}

export function createGameStageAudioController(
  options: GameStageAudioControllerOptions = {},
): GameStageAudioController {
  const audioElementFactory = options.audioElementFactory ?? createBrowserAudioElement;
  let cycleStep = normalizeGameStageAudioCycleStep(options.initialCycleStep ?? 0);
  const playerPools = new Map<GameStageAudioCue, GameStageAudioPlayer[]>();
  const nextPlayerIndexes = new Map<GameStageAudioCue, number>();

  function getPlayer(cue: GameStageAudioCue) {
    const players = playerPools.get(cue) ?? [];
    const poolSize = GAME_STAGE_AUDIO_POOL_SIZES[cue];

    if (players.length < poolSize) {
      const player = safelyCreateAudioElement(audioElementFactory, GAME_STAGE_AUDIO_ASSET_PATHS[cue]);

      if (!player) {
        return null;
      }

      players.push(player);
      playerPools.set(cue, players);
      return player;
    }

    const nextPlayerIndex = nextPlayerIndexes.get(cue) ?? 0;
    const player = players[nextPlayerIndex] ?? null;

    nextPlayerIndexes.set(cue, (nextPlayerIndex + 1) % players.length);

    return player;
  }

  return {
    getCycleStep() {
      return cycleStep;
    },
    play(actionResult) {
      const resolution = resolveNextGameStageAudioCue(actionResult, cycleStep);
      cycleStep = resolution.nextCycleStep;

      if (resolution.cue) {
        safelyPlayCue(getPlayer(resolution.cue));
      }

      return resolution;
    },
    dispose() {
      for (const players of playerPools.values()) {
        for (const player of players) {
          safelyPauseAndResetPlayer(player);
        }
      }

      playerPools.clear();
      nextPlayerIndexes.clear();
    },
  };
}

function getCycleCue(cycleStep: number): GameStageAudioCue {
  return cycleStep < GUNSHOT_CYCLE_LENGTH ? "gunshot" : "whip";
}

function createBrowserAudioElement(src: string): GameStageAudioPlayer | null {
  if (typeof Audio === "undefined") {
    return null;
  }

  try {
    const player = new Audio(src);
    player.preload = "auto";
    return player;
  } catch {
    return null;
  }
}

function safelyCreateAudioElement(
  audioElementFactory: AudioElementFactory,
  src: string,
): GameStageAudioPlayer | null {
  try {
    const player = audioElementFactory(src);

    if (!player) {
      return null;
    }

    player.src = src;
    player.preload = "auto";
    return player;
  } catch {
    return null;
  }
}

function safelyPlayCue(player: GameStageAudioPlayer | null) {
  if (!player) {
    return;
  }

  try {
    if (player.paused === false) {
      player.pause();
    }

    player.currentTime = 0;

    const playback = player.play();
    if (playback && typeof playback.catch === "function") {
      void playback.catch(() => undefined);
    }
  } catch {
    return;
  }
}

function safelyPauseAndResetPlayer(player: GameStageAudioPlayer) {
  try {
    player.pause();
  } catch {
    return;
  }

  try {
    player.currentTime = 0;
  } catch {
    return;
  }
}