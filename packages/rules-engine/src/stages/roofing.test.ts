import { describe, expect, it } from "vitest";
import { calculateRoofing } from "./roofing.js";
import type { RoofPlane } from "../types.js";

describe("calculateRoofing", () => {
  it("computes sheet count from plane area / (sheet length x cover width)", () => {
    // Hand-verified: cover width for LONG_SPAN_ALUMINIUM = 0.9m.
    // Sheet length 3m -> one sheet covers 3*0.9 = 2.7 m2.
    // Plane area 54 m2 -> 54/2.7 = 20 raw sheets. +5% wastage = 21 -> ceil 21.
    const plane: RoofPlane = {
      id: "rp1",
      areaM2: 54,
      sheetType: "LONG_SPAN_ALUMINIUM",
      sheetLengthM: 3,
    };
    const result = calculateRoofing([plane]);
    const line = result[0];
    expect(line.quantity).toBe(21);
    expect(line.sourceRefs).toEqual([{ entityType: "RoofPlane", entityId: "rp1" }]);
  });
});
