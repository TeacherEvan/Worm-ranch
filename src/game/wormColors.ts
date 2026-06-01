export const STANDARD_WORM_COLORS = [
  { id: "sun-yellow", label: "YELLOW", hue: 52 },
  { id: "fence-red", label: "RED", hue: 12 },
  { id: "pond-blue", label: "BLUE", hue: 204 },
  { id: "clover-green", label: "GREEN", hue: 132 },
  { id: "blaze-orange", label: "ORANGE", hue: 28 },
  { id: "shock-purple", label: "PURPLE", hue: 282 },
] as const;

export type WormColorId = (typeof STANDARD_WORM_COLORS)[number]["id"];

export function getStandardWormColor(index: number) {
  return STANDARD_WORM_COLORS[index % STANDARD_WORM_COLORS.length];
}

export function getWormColorById(colorId: WormColorId) {
  const color = STANDARD_WORM_COLORS.find((candidate) => candidate.id === colorId);

  if (!color) {
    throw new Error(`unknown worm color: ${colorId}`);
  }

  return color;
}