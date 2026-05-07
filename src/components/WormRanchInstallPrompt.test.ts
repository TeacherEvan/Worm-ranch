import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WormRanchInstallPrompt } from "./WormRanchInstallPrompt";

describe("WormRanchInstallPrompt", () => {
  it("renders a compact inline install utility instead of floating overlay chrome when requested", () => {
    const html = renderToStaticMarkup(
      createElement(WormRanchInstallPrompt, {
        visible: true,
        placement: "inline",
        onInstall: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );

    expect(html).toContain('data-placement="inline"');
    expect(html).toContain("Install the ranch app");
    expect(html).toContain("Install");
    expect(html).toContain("Later");
    expect(html).not.toContain("Keep Worm Ranch on the desktop like a real cabinet");
  });
});