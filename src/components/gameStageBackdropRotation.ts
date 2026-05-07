export const GAMEPLAY_BACKDROP_URLS = [
  "/art/Gameplay%20backdrops/Grasspastures.jpeg",
  "/art/Gameplay%20backdrops/desert-landscape-with-sparse-vegetation_1308-178017.avif",
  "/art/Gameplay%20backdrops/istockphoto-866482364-612x612.jpg",
  "/art/Gameplay%20backdrops/top-view-city-with-desert_70347-2005.avif",
  "/art/Gameplay%20backdrops/top-view-countryside-with-forest-grass-with-stones-trees_70347-5426.avif",
  "/art/Gameplay%20backdrops/vector-top-view-of-the-countryside.jpg",
] as const;

export type GameplayBackdropRotation = {
  activeBackdropUrl: string;
  remainingBackdropUrls: string[];
};

export function getNextGameplayBackdropRotation(
  current: GameplayBackdropRotation | null,
  random: () => number = Math.random,
): GameplayBackdropRotation {
  if (!current) {
    return createBackdropRotationFromOrder(shuffleBackdropUrls(GAMEPLAY_BACKDROP_URLS, random));
  }

  if (current.remainingBackdropUrls.length > 0) {
    const [activeBackdropUrl = current.activeBackdropUrl, ...remainingBackdropUrls] = current.remainingBackdropUrls;
    return { activeBackdropUrl, remainingBackdropUrls };
  }

  const nextOrder = shuffleBackdropUrls(GAMEPLAY_BACKDROP_URLS, random);

  if (nextOrder[0] === current.activeBackdropUrl && nextOrder.length > 1) {
    [nextOrder[0], nextOrder[1]] = [nextOrder[1] ?? nextOrder[0], nextOrder[0]];
  }

  return createBackdropRotationFromOrder(nextOrder);
}

function createBackdropRotationFromOrder(order: readonly string[]): GameplayBackdropRotation {
  const [activeBackdropUrl = GAMEPLAY_BACKDROP_URLS[0], ...remainingBackdropUrls] = order;
  return {
    activeBackdropUrl,
    remainingBackdropUrls: [...remainingBackdropUrls],
  };
}

function shuffleBackdropUrls(urls: readonly string[], random: () => number) {
  const shuffled = [...urls];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex] ?? shuffled[index], shuffled[index]];
  }

  return shuffled;
}