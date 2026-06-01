import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function renderWelcomeScreen(reducedMotion: boolean) {
  const { WelcomeScreen } = await import("./WelcomeScreen");

  return renderToStaticMarkup(
    createElement(WelcomeScreen, {
      metrics: [{ label: "Bagged", value: "0" }],
      onOpenGate: vi.fn(),
      onRigTack: vi.fn(),
      reducedMotion,
    }),
  );
}

afterEach(() => {
  vi.doUnmock("react");
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("WelcomeScreen", () => {
  it("renders the launch media in a full-bleed hero surface instead of the old framed card", async () => {
    const html = await renderWelcomeScreen(false);

    expect(html).toContain('data-layout="full-bleed-hero"');
    expect(html).toMatch(
      /<div[^>]*data-hero-stage="full-bleed"[^>]*>\s*<div[^>]*data-hero-media-surface="full-bleed"[^>]*data-launch-media="image"[^>]*data-launch-loader-state="ready"[^>]*>[\s\S]*<\/div>\s*<div[^>]*data-hero-copy-layer="overlay"[^>]*>/,
    );
    expect(html).not.toContain('data-hero-frame="card"');
  });

  it("renders the desktop launch poster without visually activating the intro video before readiness when reduced motion is off", async () => {
    const html = await renderWelcomeScreen(false);

    expect(html).toContain("<video");
    expect(html).toContain("worm-ranch-launch-poster.png");
    expect(html).toContain("worm-ranch-launch-intro.mp4");
    expect(html).toContain('data-launch-media="image"');
    expect(html).toContain('data-launch-loader-state="ready"');
    expect(html).toMatch(/class="[^"]*heroVideoLayer[^"]*" data-launch-state="image"/);
    expect(html).toContain("Open the gate, or rig the tack first.");
  });

  it("uses the launch poster without autoplay video when reduced motion is on", async () => {
    const html = await renderWelcomeScreen(true);

    expect(html).not.toContain("<video");
    expect(html).toContain('data-launch-media="image"');
    expect(html).toContain("worm-ranch-launch-poster.png");
    expect(html).toContain('data-launch-loader-state="ready"');
  });

  it("selects the mobile backdrop when matchMedia reports a narrow viewport", async () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener,
      removeEventListener,
    });

    vi.stubGlobal("window", {
      location: { href: "http://localhost/" },
      matchMedia,
    });
    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useSyncExternalStore: (
          subscribe: (onStoreChange: () => void) => () => void,
          getSnapshot: () => number | undefined,
        ) => {
          const unsubscribe = subscribe(() => {});
          const snapshot = getSnapshot();

          unsubscribe();

          return snapshot;
        },
      };
    });

    const html = await renderWelcomeScreen(false);

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(html).toContain("worm-ranch-launch-poster.png");
    expect(html).toContain('data-hero-media-surface="full-bleed"');
    expect(html).toContain('data-safe-zone="lower-copy-band"');
  });
});