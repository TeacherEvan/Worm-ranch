import { normalizeGameplayLevel } from "@/game/levels";

export const GAMEPLAY_BACKDROP_URLS = [
  "/art/Gameplay%20backdrops/Grasspastures.jpeg",
  "/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif",
  "/art/Gameplay%20backdrops/istockphoto-866482364-612x612.jpg",
  "/art/Gameplay%20backdrops/top-view-city-with-desert_70347-2005.avif",
  "/art/Gameplay%20backdrops/top-view-countryside-with-forest-grass-with-stones-trees_70347-5426.avif",
  "/art/Gameplay%20backdrops/vector-top-view-of-the-countryside.jpg",
] as const;

export function getGameplayBackdropUrlForLevel(level: number) {
  const normalizedLevel = normalizeGameplayLevel(level);
  const backdropIndex = (normalizedLevel - 1) % GAMEPLAY_BACKDROP_URLS.length;

  return GAMEPLAY_BACKDROP_URLS[backdropIndex] ?? GAMEPLAY_BACKDROP_URLS[0];
}