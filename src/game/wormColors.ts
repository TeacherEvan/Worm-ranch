export const STANDARD_WORM_COLORS = [
  { id: "sun-yellow", label: "Sun Yellow", hue: 52 },
  { id: "fence-red", label: "Fence Red", hue: 12 },
  { id: "pond-blue", label: "Pond Blue", hue: 204 },
  { id: "clover-green", label: "Clover Green", hue: 132 },
] as const;

export type WormColorId = (typeof STANDARD_WORM_COLORS)[number]["id"];

export function getStandardWormColor(index: number) {
  return STANDARD_WORM_COLORS[index % STANDARD_WORM_COLORS.length];
}