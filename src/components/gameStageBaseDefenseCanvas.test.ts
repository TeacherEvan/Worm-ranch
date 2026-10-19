import { describe, it, expect, vi } from "vitest";
import { drawBaseDefenseLayer } from "./gameStageBaseDefenseCanvas";
import { createWorld, initBaseDefenseMode } from "@/game/engine";

describe("Base Defense Canvas Renderer", () => {
  it("renders base tent, crystals, miners, walls, towers and arrows without errors", () => {
    const world = createWorld("desktop", 800, 600);
    initBaseDefenseMode(world);

    // Add a wall, tower, and arrow
    world.baseDefense!.constructions.push({
      id: "wall-1",
      kind: "wall",
      x: 200,
      y: 200,
      hp: 150,
      maxHp: 200,
      attackCooldownMs: 0,
      rangePx: 0,
      targetWormId: null,
    });

    world.baseDefense!.constructions.push({
      id: "tower-1",
      kind: "tower",
      x: 300,
      y: 200,
      hp: 200,
      maxHp: 200,
      attackCooldownMs: 0,
      rangePx: 220,
      targetWormId: null,
    });

    world.baseDefense!.arrows.push({
      id: "arrow-1",
      x: 300,
      y: 200,
      targetX: 350,
      targetY: 250,
      vx: 200,
      vy: 100,
      damage: 10,
      lifeMs: 100,
      ttlMs: 1000,
    });

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawBaseDefenseLayer(mockCtx, world, false, 1000);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });
});
