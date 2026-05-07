import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WormRanchGameExit } from "./WormRanchGameExit";

describe("WormRanchGameExit", () => {
  it("renders a compact mobile exit chip that keeps gameplay chrome terse", () => {
    const html = renderToStaticMarkup(
      createElement(WormRanchGameExit, {
        profile: "mobile",
        onLeave: vi.fn(),
      }),
    );

    expect(html).toContain('data-density="compact"');
    expect(html).toContain('data-profile="mobile"');
    expect(html).toContain("Yard");
    expect(html).not.toContain("Leave corral");
  });

  it("keeps the desktop exit copy explicit while still using the game exit shell", () => {
    const html = renderToStaticMarkup(
      createElement(WormRanchGameExit, {
        profile: "desktop",
        onLeave: vi.fn(),
      }),
    );

    expect(html).toContain('data-density="standard"');
    expect(html).toContain('data-profile="desktop"');
    expect(html).toContain("Leave corral");
  });
});