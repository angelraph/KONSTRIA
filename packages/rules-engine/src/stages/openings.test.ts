import { describe, expect, it } from "vitest";
import { calculateOpenings } from "./openings.js";
import type { Opening } from "../types.js";

describe("calculateOpenings", () => {
  it("counts doors/windows and computes frame length and glazing area", () => {
    // Hand-verified window: 1.2m x 1.2m, qty 3.
    // Frame per unit = 2*(1.2+1.2) + 0.15 = 4.95m -> x3 = 14.85m,
    // rounded to 1dp (line-item precision) = 14.9m.
    // Glazing area = 1.2*1.2*3 = 4.32 m2.
    const openings: Opening[] = [
      { id: "o1", wallId: "w1", type: "WINDOW", widthM: 1.2, heightM: 1.2, quantity: 3 },
      { id: "o2", wallId: "w1", type: "DOOR", widthM: 0.9, heightM: 2.1, quantity: 1 },
    ];
    const result = calculateOpenings(openings);

    const windowCount = result.find((li) => li.materialCode === "WINDOW");
    const windowFrame = result.find((li) => li.materialCode === "WINDOW_FRAME");
    const glazing = result.find((li) => li.materialCode === "GLASS");
    const doorCount = result.find((li) => li.materialCode === "DOOR");

    expect(windowCount!.quantity).toBe(3);
    expect(windowFrame!.quantity).toBeCloseTo(14.9, 1);
    expect(glazing!.quantity).toBeCloseTo(4.32, 2);
    expect(doorCount!.quantity).toBe(1);
  });
});
