import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeScreen } from "./HomeScreen";

describe("HomeScreen", () => {
  it("keeps the home surface down to a catchy title and the essential launch actions", () => {
    const html = renderToStaticMarkup(
      createElement(HomeScreen, {
        installPrompt: createElement("span", null, "Install utility"),
        onBack: vi.fn(),
        onOpenSettings: vi.fn(),
        onStart: vi.fn(),
      }),
    );

    expect(html).toContain('data-layout="compact-launch"');
    expect(html).toContain("Moonlit roundup");
    expect(html).toContain("Install utility");
    expect(html).toContain("Start roundup");
    expect(html).toContain("Ranch settings");
    expect(html).toContain("Back to launch");
    expect(html).not.toContain("Tack mode");
    expect(html).not.toContain("Desktop runs stretch the whole pasture.");
  });
});