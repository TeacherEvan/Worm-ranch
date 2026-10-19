import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BaseDefenseBankBar } from "./BaseDefenseBankBar";
import type { BaseDefenseSummary } from "@/game/baseDefenseTypes";

describe("BaseDefenseBankBar", () => {
  const mockSummary: BaseDefenseSummary = {
    active: true,
    bankCredits: 150,
    tentHp: 500,
    tentMaxHp: 500,
    tentLevel: 1,
    tentUpgradeCount: 0,
    nextUpgradeCost: 100,
    minersCount: 2,
    wallsCount: 0,
    towersCount: 0,
    aoeUnits: 1,
    playerDamage: 10,
    armor: 0,
    currentWormHp: 10,
    currentWormDps: 5,
    currentSpawnRatePerSec: 1,
  };

  it("renders the bank credits and tent tier button in static markup", () => {
    const onPurchase = vi.fn();
    const html = renderToStaticMarkup(
      createElement(BaseDefenseBankBar, { summary: mockSummary, onPurchase }),
    );

    expect(html).toContain("BANK: 150 CR");
    expect(html).toContain("TENT T1: 500/500 HP");
    expect(html).toContain('data-testid="bank-tab"');
  });

  it("renders with critical hp indicator when tent hp is below 30%", () => {
    const criticalSummary: BaseDefenseSummary = {
      ...mockSummary,
      tentHp: 100,
      tentMaxHp: 500,
    };
    const onPurchase = vi.fn();
    const html = renderToStaticMarkup(
      createElement(BaseDefenseBankBar, { summary: criticalSummary, onPurchase }),
    );

    expect(html).toContain("tentHpCritical");
    expect(html).toContain("100/500 HP");
  });
});
