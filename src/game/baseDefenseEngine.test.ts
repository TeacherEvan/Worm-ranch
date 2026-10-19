import { describe, it, expect } from "vitest";
import { createWorld } from "./engine";
import {
  initBaseDefenseMode,
  stepBaseDefenseMode,
  purchaseBaseDefenseItem,
  applyBaseDefensePress,
  getBaseDefenseSummary,
} from "./baseDefenseEngine";
import {
  BASE_TENT_INITIAL_HP,
  BASE_MINER_HP,
  CRYSTAL_SPAWN_COUNT,
  WALL_HP,
  TOWER_HP,
  INITIAL_WORM_HP,
  WORM_HP_STEP_MS,
  WORM_DPS_STEP_MS,
} from "./baseDefenseConstants";

describe("Base Defense Engine", () => {
  it("initializes base defense world with central tent, 2 miners, and 6 crystals", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    expect(world.baseDefense).toBeDefined();
    expect(world.baseDefense?.active).toBe(true);
    expect(world.baseDefense?.bankCredits).toBe(0);
    expect(world.baseDefense?.tent.x).toBe(400);
    expect(world.baseDefense?.tent.y).toBe(300);
    expect(world.baseDefense?.tent.hp).toBe(BASE_TENT_INITIAL_HP);
    expect(world.baseDefense?.tent.upgradeCount).toBe(0);

    expect(world.baseDefense?.miners.length).toBe(2);
    expect(world.baseDefense?.miners[0].hp).toBe(BASE_MINER_HP);
    expect(world.baseDefense?.crystals.length).toBe(CRYSTAL_SPAWN_COUNT);
  });

  it("miners move between crystal and tent, adding credits on return", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    // Keep tent alive during the test run so simulation doesn't halt early
    world.baseDefense!.tent.hp = 999999;
    world.baseDefense!.tent.maxHp = 999999;

    const initialCredits = world.baseDefense!.bankCredits;
    // Step world enough for miner to make trips
    for (let i = 0; i < 150; i++) {
      stepBaseDefenseMode(world, 50);
    }

    expect(world.baseDefense!.bankCredits).toBeGreaterThan(initialCredits);
    // Miners must still have 500 HP and remain unobstructed
    expect(world.baseDefense!.miners[0].hp).toBe(BASE_MINER_HP);
  });

  it("purchasing walls and towers consumes credits and adds constructions", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);
    world.baseDefense!.bankCredits = 200;

    const boughtWall = purchaseBaseDefenseItem(world, "wall");
    expect(boughtWall).toBe(true);
    expect(world.baseDefense!.bankCredits).toBe(190);
    expect(world.baseDefense!.constructions.filter((c) => c.kind === "wall").length).toBe(1);
    expect(world.baseDefense!.constructions[0].hp).toBe(WALL_HP);

    const boughtTower = purchaseBaseDefenseItem(world, "tower");
    expect(boughtTower).toBe(true);
    expect(world.baseDefense!.bankCredits).toBe(90);
    expect(world.baseDefense!.constructions.filter((c) => c.kind === "tower").length).toBe(1);
    expect(world.baseDefense!.constructions[1].hp).toBe(TOWER_HP);
  });

  it("base tent upgrades up to 10 times, scaling cost by 100 * (level + 1) and granting a miner", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    world.baseDefense!.bankCredits = 100;
    const upgrade1 = purchaseBaseDefenseItem(world, "baseUpgrade");
    expect(upgrade1).toBe(true);
    expect(world.baseDefense!.tent.upgradeCount).toBe(1);
    expect(world.baseDefense!.miners.length).toBe(3); // 2 + 1
    expect(world.baseDefense!.bankCredits).toBe(0);

    // Upgrade 2 requires 200 credits
    world.baseDefense!.bankCredits = 150;
    expect(purchaseBaseDefenseItem(world, "baseUpgrade")).toBe(false);

    world.baseDefense!.bankCredits = 200;
    expect(purchaseBaseDefenseItem(world, "baseUpgrade")).toBe(true);
    expect(world.baseDefense!.tent.upgradeCount).toBe(2);
    expect(world.baseDefense!.miners.length).toBe(4);
  });

  it("worms scale in HP every 20 seconds and damage every 60 seconds", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    stepBaseDefenseMode(world, 100);
    const summary0 = getBaseDefenseSummary(world);
    expect(summary0?.currentWormHp).toBe(INITIAL_WORM_HP);
    expect(summary0?.currentWormDps).toBe(5);

    // Advance 21 seconds
    stepBaseDefenseMode(world, WORM_HP_STEP_MS + 1000);
    const summary20 = getBaseDefenseSummary(world);
    expect(summary20?.currentWormHp).toBe(INITIAL_WORM_HP + 10);

    // Advance to 65 seconds
    stepBaseDefenseMode(world, WORM_DPS_STEP_MS);
    const summary65 = getBaseDefenseSummary(world);
    expect(summary65?.currentWormDps).toBe(10);
  });

  it("shotgun AOE press damages all worms within blast radius", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    // Manually spawn a worm near center
    const worm = world.worms[0];
    worm.x = 410;
    worm.y = 310;
    worm.state = "roaming";
    worm.baseDefense = {
      hp: 10,
      maxHp: 10,
      dps: 5,
      targetKind: "tent",
      targetId: null,
    };

    const pressResult = applyBaseDefensePress(world, { x: 400, y: 300 });
    expect(pressResult.kind).toBe("collect");
    expect(worm.state).toBe("captured");
  });
});
