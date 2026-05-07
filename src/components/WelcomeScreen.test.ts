import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeScreen } from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("renders the intro video above the poster when reduced motion is off", () => {
    const html = renderToStaticMarkup(
      createElement(WelcomeScreen, {
        metrics: [{ label: "Bagged", value: "0" }],
        onOpenGate: vi.fn(),
        onRigTack: vi.fn(),
        reducedMotion: false,
      }),
    );

    expect(html).toContain("<video");
    expect(html).toContain('src="/art/worm-ranch-launch-intro.mp4"');
    expect(html).toContain('poster="/art/worm-ranch-launch-poster.png"');
    expect(html).toContain('data-launch-media="video"');
  });

  it("skips the intro video and settles directly on the poster when reduced motion is on", () => {
    const html = renderToStaticMarkup(
      createElement(WelcomeScreen, {
        metrics: [{ label: "Bagged", value: "0" }],
        onOpenGate: vi.fn(),
        onRigTack: vi.fn(),
        reducedMotion: true,
      }),
    );

    expect(html).not.toContain("<video");
    expect(html).toContain('data-launch-media="image"');
    expect(html).toContain("worm-ranch-launch-poster.png");
  });
});