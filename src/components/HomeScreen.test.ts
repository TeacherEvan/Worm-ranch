import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeScreen } from "./HomeScreen";

describe("HomeScreen", () => {
  it("renders the launch controls ahead of a compact scan strip instead of a second full dashboard block", () => {
    const html = renderToStaticMarkup(
      createElement(HomeScreen, {
        installPrompt: createElement("span", null, "Install utility"),
        leadCopy: "Desktop runs stretch the whole pasture.",
        onOpenSettings: vi.fn(),
        onStart: vi.fn(),
        scanItems: [
          { label: "Tack mode", value: "auto" },
          { label: "Reins", value: "fine" },
          { label: "Horizon", value: "landscape" },
          { label: "Pasture glass", value: "1440 x 900" },
        ],
      }),
    );

    expect(html).toContain('data-layout="compact-launch"');
    expect(html).toContain('data-role="scan-strip"');
    expect(html).toContain("Install utility");
    expect(html.indexOf("Start roundup")).toBeLessThan(html.indexOf("Tack mode"));
  });
});