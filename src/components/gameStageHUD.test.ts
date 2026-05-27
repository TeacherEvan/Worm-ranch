import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import GameHUD from "./GameHUD";

describe("GameHUD", () => {
  it("renders time and kills with accessible labels", () => {
    const html = renderToStaticMarkup(createElement(GameHUD, { time: "01:23", kills: 5 }));
    expect(html).toContain('aria-label="game time"');
    expect(html).toContain("01:23");
    expect(html).toContain('aria-label="worms killed"');
    expect(html).toContain("5");
  });

  it("hides the timer when no time is provided", () => {
    const html = renderToStaticMarkup(createElement(GameHUD, { time: null, kills: 5 }));
    expect(html).not.toContain('aria-label="game time"');
    expect(html).toContain('aria-label="worms killed"');
  });
});
