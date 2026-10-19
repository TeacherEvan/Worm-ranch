"use client";

import { useState } from "react";
import styles from "./BaseDefenseBankBar.module.css";
import type { BaseDefenseSummary, BaseDefensePowerupId } from "@/game/baseDefenseTypes";
import { POWERUP_COSTS, getBaseUpgradeCost } from "@/game/baseDefenseConstants";

type BaseDefenseBankBarProps = {
  summary: BaseDefenseSummary;
  onPurchase: (type: BaseDefensePowerupId) => void;
};

interface ShopOption {
  type: BaseDefensePowerupId;
  label: string;
  description: string;
  getCost: (summary: BaseDefenseSummary) => number | null;
  isMaxed?: (summary: BaseDefenseSummary) => boolean;
}

const SHOP_OPTIONS: ShopOption[] = [
  {
    type: "damage",
    label: "Player Damage",
    description: "+5 Click/Shotgun Damage",
    getCost: () => POWERUP_COSTS.damage,
  },
  {
    type: "minerSpeed",
    label: "Miner Speed",
    description: "+25% Miner Movement Speed",
    getCost: () => POWERUP_COSTS.minerSpeed,
  },
  {
    type: "health",
    label: "Base Health",
    description: "+100 Max HP & +150 Heal",
    getCost: () => POWERUP_COSTS.health,
  },
  {
    type: "armor",
    label: "Armor Plating",
    description: "+1 Base Armor (-1 Dmg taken)",
    getCost: () => POWERUP_COSTS.armor,
  },
  {
    type: "minerCarry",
    label: "Miner Carry Capacity",
    description: "+5 Credits per Crystal Trip",
    getCost: () => POWERUP_COSTS.minerCarry,
  },
  {
    type: "extraMiner",
    label: "+1 Miner",
    description: "Hire an extra Crystal Mining NPC",
    getCost: () => POWERUP_COSTS.extraMiner,
  },
  {
    type: "aoeRadius",
    label: "Shotgun AOE Radius",
    description: "+1 Area of Effect unit radius",
    getCost: () => POWERUP_COSTS.aoeRadius,
  },
  {
    type: "tower",
    label: "Attack Tower",
    description: "200 HP / 10 DMG Arrow Tower",
    getCost: () => POWERUP_COSTS.tower,
  },
  {
    type: "wall",
    label: "Defense Wall",
    description: "200 HP Barrier to distract worms",
    getCost: () => POWERUP_COSTS.wall,
  },
  {
    type: "baseUpgrade",
    label: "Upgrade Tent",
    description: "Upgrade base tier + unlocks 1 extra miner",
    getCost: (s) => getBaseUpgradeCost(s.tentUpgradeCount),
    isMaxed: (s) => s.tentUpgradeCount >= 10,
  },
];

export function BaseDefenseBankBar({ summary, onPurchase }: BaseDefenseBankBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const hpRatio = summary.tentHp / summary.tentMaxHp;
  const isCritical = hpRatio < 0.3;

  return (
    <div
      className={styles.bankBarContainer}
      data-base-defense-hud="active"
      data-credits={summary.bankCredits}
      data-miners-count={summary.minersCount}
      data-base-level={summary.tentUpgradeCount}
      data-base-hp={summary.tentHp}
      data-towers-count={summary.towersCount}
      data-walls-count={summary.wallsCount}
      data-aoe-units={summary.aoeUnits}
      data-worm-hp={summary.currentWormHp}
      data-worm-dps={summary.currentWormDps}
    >
      <button
        type="button"
        className={styles.bankTabButton}
        onClick={toggleDropdown}
        data-testid="bank-tab"
        aria-expanded={isOpen}
      >
        <span className={styles.bankCredits}>BANK: {summary.bankCredits} CR</span>
        <span
          className={`${styles.tentHpBadge} ${isCritical ? styles.tentHpCritical : ""}`.trim()}
          title={`Tent Tier ${summary.tentLevel}`}
        >
          TENT T{summary.tentLevel}: {Math.ceil(summary.tentHp)}/{summary.tentMaxHp} HP
        </span>
        <span className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ""}`.trim()}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} data-testid="bank-dropdown">
          <div className={styles.menuHeader}>
            <span>BASE REQUISITIONS</span>
            <span>{summary.minersCount} MINERS</span>
          </div>

          {SHOP_OPTIONS.map((opt) => {
            const cost = opt.getCost(summary);
            const isMaxed = opt.isMaxed ? opt.isMaxed(summary) : cost === null;
            const canAfford = cost !== null && summary.bankCredits >= cost && !isMaxed;

            return (
              <button
                key={opt.type}
                type="button"
                className={styles.shopItemButton}
                disabled={!canAfford}
                data-testid={`buy-${opt.type}`}
                onClick={() => {
                  if (canAfford) {
                    onPurchase(opt.type);
                  }
                }}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemLabel}>{opt.label}</span>
                  <span className={styles.itemDesc}>
                    {isMaxed ? "MAX LEVEL REACHED" : opt.description}
                  </span>
                </div>
                <span className={styles.itemCostBadge}>
                  {isMaxed || cost === null ? "MAX" : `${cost} CR`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default BaseDefenseBankBar;
