import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultsScreen } from "./ResultsScreen";

describe("ResultsScreen", () => {
  it("renders a compact replay-first tally surface instead of a broad metric wall", () => {
    const html = renderToStaticMarkup(
      createElement(ResultsScreen, {
        bagged: 8,
        leftLoose: 2,
        note: "Fairy lift stays active after clean catches.",
        onReplay: vi.fn(),
        onReturnHome: vi.fn(),
        outcome: "Corral cleared",
      }),
    );

    expect(html).toContain('data-layout="compact-replay"');
    expect(html).toContain('data-role="tally-strip"');
    expect(html).toContain("Ride again");
    expect(html).toContain("8 bagged");
    expect(html.indexOf("Ride again")).toBeLessThan(html.indexOf("Fairy lift stays active after clean catches."));
  });
});