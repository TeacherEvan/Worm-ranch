import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WormRanchShellHeader } from "./WormRanchShellHeader";

describe("WormRanchShellHeader", () => {
  it("renders the welcome density with the trimmed eyebrow and no chip row", () => {
    const html = renderToStaticMarkup(
      createElement(WormRanchShellHeader, {
        density: "welcome",
        shellProfile: "mobile",
        shellScanProfile: "mobile",
      }),
    );

    expect(html).toContain("Moonlit trouble");
    expect(html).not.toContain("Pasture scan");
    expect(html).not.toContain("Loose herd");
  });

  it("renders the standard density with the herd count chip", () => {
    const html = renderToStaticMarkup(
      createElement(WormRanchShellHeader, {
        shellProfile: "desktop",
        shellScanProfile: "desktop",
        totalWorms: 100,
      }),
    );

    expect(html).toContain("Loose herd");
    expect(html).toContain("100");
  });
});