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
  it("renders the desktop welcome image without an intro video when reduced motion is off", async () => {
    const html = await renderWelcomeScreen(false);

    expect(html).not.toContain("<video");
    expect(html).toContain("welcome-memory-desktop.webp");
    expect(html).toContain('data-launch-media="image"');
    expect(html).toContain('data-launch-loader-state="loading"');
    expect(html).toContain("Open the gate, or rig the tack first.");
    expect(html).toContain("Ranch glass coming online");
    expect(html).toContain("18%");
  });

  it("uses the same still welcome image contract when reduced motion is on", async () => {
    const html = await renderWelcomeScreen(true);

    expect(html).not.toContain("<video");
    expect(html).toContain('data-launch-media="image"');
    expect(html).toContain("welcome-memory-desktop.webp");
    expect(html).toContain('data-launch-loader-state="loading"');
    expect(html).toContain("Ranch glass coming online");
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
    expect(html).toContain("welcome-memory-mobile.webp");
    expect(html).toContain('data-safe-zone="lower-copy-band"');
  });
});