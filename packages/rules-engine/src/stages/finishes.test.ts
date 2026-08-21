import { describe, expect, it } from "vitest";
import { calculateFinishes } from "./finishes.js";
import type { Room, Wall } from "../types.js";

describe("calculateFinishes", () => {
  it("computes plaster area for both wall faces net of openings", () => {
    // Hand-verified: wall 4m x 3m = 12 m2 gross, minus one 1x2m door = 10 m2 net.
    // Both faces -> 20 m2 plaster.
    const wall: Wall = {
      id: "w1",
      lengthM: 4,
      heightM: 3,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    };
    const result = calculateFinishes(
      [wall],
      [{ id: "o1", wallId: "w1", type: "DOOR", widthM: 1, heightM: 2, quantity: 1 }],
      []
    );
    const plaster = result.find((li) => li.description.startsWith("Wall plastering"));
    expect(plaster!.quantity).toBeCloseTo(20, 1);
  });

  it("sums room floor areas into a single screed line item", () => {
    const rooms: Room[] = [
      { id: "rm1", name: "Living", areaM2: 18, roomType: "DRY" },
      { id: "rm2", name: "Kitchen", areaM2: 9, roomType: "WET" },
    ];
    const result = calculateFinishes([], [], rooms);
    const screed = result.find((li) => li.description === "Floor screed");
    expect(screed!.quantity).toBe(27);
  });
});
