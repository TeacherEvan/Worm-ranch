export const GAME_MODES = [
  {
    id: "standard",
    title: "Standard roundup",
    description: "Ride the usual ranch run with the standard level flow.",
  },
  {
    id: "targetEndless",
    title: "Endless target-color",
    description: "Keep bagging the called color. One wrong-color catch ends the ride.",
  },
] as const;

export type GameMode = (typeof GAME_MODES)[number]["id"];

export const DEFAULT_GAME_MODE: GameMode = "standard";
