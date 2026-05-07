import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMEPLAY_BACKDROP_URLS, getNextGameplayBackdropRotation, type GameplayBackdropRotation } from "./gameStageBackdropRotation";

const COMPONENT_DIR = dirname(fileURLToPath(import.meta.url));

describe("gameStageBackdropRotation", () => {
  it("keeps the exported backdrop manifest aligned with files staged under public", () => {
    for (const backdropUrl of GAMEPLAY_BACKDROP_URLS) {
      const relativeBackdropPath = decodeURIComponent(backdropUrl).replace(/^\//, "");
      const absoluteBackdropPath = resolve(COMPONENT_DIR, "..", "..", "public", relativeBackdropPath);

      expect(existsSync(absoluteBackdropPath)).toBe(true);
    }
  });

  it("cycles through every gameplay backdrop before reshuffling and avoids immediate repeats between rounds", () => {
    let state: GameplayBackdropRotation | null = null;
    const random = createDeterministicRandom([0.81, 0.13, 0.54, 0.22, 0.67, 0.41, 0.09, 0.73]);

    const seen: string[] = [];

    for (let round = 0; round < GAMEPLAY_BACKDROP_URLS.length; round += 1) {
      state = getNextGameplayBackdropRotation(state, random);
      seen.push(state.activeBackdropUrl);
    }

    expect(new Set(seen)).toEqual(new Set(GAMEPLAY_BACKDROP_URLS));
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1]).not.toBe(seen[2]);

    const previousBackdrop = state?.activeBackdropUrl ?? null;
    state = getNextGameplayBackdropRotation(state, createDeterministicRandom([0, 0, 0]));

    expect(state.activeBackdropUrl).not.toBe(previousBackdrop);
    expect(GAMEPLAY_BACKDROP_URLS).toContain(state.activeBackdropUrl);
  });
});

function createDeterministicRandom(sequence: number[]) {
  let index = 0;

  return () => {
    const value = sequence[index] ?? 0;
    index += 1;
    return value;
  };
}