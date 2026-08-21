import { describe, expect, it } from "vitest";
import { calculateBlockwork } from "./blockwork.js";
import type { Wall } from "../types.js";

describe("calculateBlockwork", () => {
  it("computes block count for a single wall with no openings", () => {
    // Hand-verified: net area 2m x 2m = 4 m2. Blocks/m2 for the 450x225mm
    // nominal module = 1 / (0.45*0.225) = 800/81 = 9.876543... blocks/m2.
    // 4 * 800/81 = 3200/81 = 39.5061728... raw blocks.
    // With 5% wastage: 3200/81 * 1.05 = 3360/81 = 41.481481... -> ceil = 42.
    const wall: Wall = {
      id: "w1",
      lengthM: 2,
      heightM: 2,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    };

    const result = calculateBlockwork([wall], []);
    const blockLine = result.find((li) => li.materialCode === "BLOCK_225MM");

    expect(blockLine).toBeDefined();
    expect(blockLine!.quantity).toBe(42);
    expect(blockLine!.sourceRefs).toEqual([{ entityType: "Wall", entityId: "w1" }]);
  });

  it("subtracts opening area from the wall before counting blocks", () => {
    const wall: Wall = {
      id: "w2",
      lengthM: 4,
      heightM: 3,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    };
    // Gross area 12 m2, one 1x2m door => net area 10 m2.
    const result = calculateBlockwork(
      [wall],
      [{ id: "o1", wallId: "w2", type: "DOOR", widthM: 1, heightM: 2, quantity: 1 }]
    );
    const blockLine = result.find((li) => li.materialCode === "BLOCK_225MM")!;
    const withoutOpeningRaw = 12 * (800 / 81);
    const netRaw = 10 * (800 / 81);

    // Net-area block count must be strictly less than the gross-area count,
    // proving the opening was actually subtracted rather than ignored.
    expect(blockLine.quantity).toBeLessThan(Math.ceil(withoutOpeningRaw * 1.05));
    expect(blockLine.quantity).toBe(Math.ceil(netRaw * 1.05));
  });

  it("emits mortar cement/sand line items derived from the same wall", () => {
    const wall: Wall = {
      id: "w1",
      lengthM: 2,
      heightM: 2,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    };
    const result = calculateBlockwork([wall], []);
    const cement = result.find((li) => li.materialCode === "CEMENT_50KG_BAG");
    const sand = result.find((li) => li.materialCode === "SHARP_SAND");

    expect(cement).toBeDefined();
    expect(sand).toBeDefined();
    expect(cement!.quantity).toBeGreaterThan(0);
    expect(sand!.quantity).toBeGreaterThan(0);
  });

  it("produces no line items for a wall fully covered by openings", () => {
    const wall: Wall = {
      id: "w3",
      lengthM: 2,
      heightM: 2,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    };
    const result = calculateBlockwork(
      [wall],
      [{ id: "o1", wallId: "w3", type: "DOOR", widthM: 2, heightM: 2, quantity: 1 }]
    );
    expect(result.find((li) => li.materialCode === "BLOCK_225MM")).toBeUndefined();
  });

  it("keeps 225mm and 150mm blocks as separate, independently priceable line items", () => {
    const walls: Wall[] = [
      { id: "w1", lengthM: 2, heightM: 2, blockType: "BLOCK_225MM", mortarMix: { cement: 1, sand: 6 } },
      { id: "w2", lengthM: 3, heightM: 2, blockType: "BLOCK_150MM", mortarMix: { cement: 1, sand: 6 } },
    ];
    const result = calculateBlockwork(walls, []);
    const block225 = result.find((li) => li.materialCode === "BLOCK_225MM");
    const block150 = result.find((li) => li.materialCode === "BLOCK_150MM");

    expect(block225).toBeDefined();
    expect(block150).toBeDefined();
    expect(block225!.sourceRefs).toEqual([{ entityType: "Wall", entityId: "w1" }]);
    expect(block150!.sourceRefs).toEqual([{ entityType: "Wall", entityId: "w2" }]);
  });
});
