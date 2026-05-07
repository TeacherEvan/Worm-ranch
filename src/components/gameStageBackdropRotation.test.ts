import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMEPLAY_BACKDROP_URLS, getGameplayBackdropUrlForLevel } from "./gameStageBackdropRotation";

const COMPONENT_DIR = dirname(fileURLToPath(import.meta.url));

describe("gameStageBackdropRotation", () => {
  it("keeps the exported backdrop manifest aligned with files staged under public", () => {
    for (const backdropUrl of GAMEPLAY_BACKDROP_URLS) {
      const relativeBackdropPath = decodeURIComponent(backdropUrl).replace(/^\//, "");
      const absoluteBackdropPath = resolve(COMPONENT_DIR, "..", "..", "public", relativeBackdropPath);

      expect(existsSync(absoluteBackdropPath)).toBe(true);
    }
  });

  it("maps gameplay levels to deterministic backdrops and only loops after the full theme set", () => {
    const openingBackdrop = getGameplayBackdropUrlForLevel(1);
    const secondBackdrop = getGameplayBackdropUrlForLevel(2);
    const wrappedBackdrop = getGameplayBackdropUrlForLevel(GAMEPLAY_BACKDROP_URLS.length + 1);

    expect(openingBackdrop).toBe(GAMEPLAY_BACKDROP_URLS[0]);
    expect(secondBackdrop).toBe(GAMEPLAY_BACKDROP_URLS[1]);
    expect(getGameplayBackdropUrlForLevel(1)).toBe(openingBackdrop);
    expect(wrappedBackdrop).toBe(openingBackdrop);
    expect(getGameplayBackdropUrlForLevel(0)).toBe(openingBackdrop);
  });
});