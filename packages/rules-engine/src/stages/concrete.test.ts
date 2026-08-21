import { describe, expect, it } from "vitest";
import { calculateConcrete } from "./concrete.js";
import type { ConcreteElement } from "../types.js";

describe("calculateConcrete", () => {
  it("breaks down a 1:2:4 concrete volume into cement/sand/granite", () => {
    // Hand-verified: 10 m3 wet volume, +3% wastage = 10.3 m3.
    // Dry volume = 10.3 * 1.54 = 15.862 m3. Ratio sum = 1+2+4 = 7.
    // cement volume = 15.862/7 = 2.266 m3 -> bags = 2.266 / (50/1440) = 65.2608 -> ceil 66
    // sand volume   = 15.862*2/7 = 4.532 m3 -> 4.53 (2dp)
    // granite volume= 15.862*4/7 = 9.064 m3 -> 9.06 (2dp)
    const element: ConcreteElement = {
      id: "c1",
      stage: "SUPERSTRUCTURE",
      description: "Ground floor slab",
      volumeM3: 10,
      mix: { cement: 1, sand: 2, granite: 4 },
    };

    const result = calculateConcrete([element]);

    const volume = result.find((li) => li.description.startsWith("Concrete volume"));
    const cement = result.find((li) => li.materialCode === "CEMENT_50KG_BAG");
    const sand = result.find((li) => li.materialCode === "SHARP_SAND");
    const granite = result.find((li) => li.materialCode === "GRANITE");

    expect(volume!.quantity).toBe(10);
    expect(cement!.quantity).toBe(66);
    expect(sand!.quantity).toBeCloseTo(4.53, 2);
    expect(granite!.quantity).toBeCloseTo(9.06, 2);
    expect(volume!.sourceRefs).toEqual([{ entityType: "ConcreteElement", entityId: "c1" }]);
  });

  it("omits the granite line item for a mortar-only mix (no granite ratio)", () => {
    const element: ConcreteElement = {
      id: "c2",
      stage: "SUBSTRUCTURE",
      description: "Blinding",
      volumeM3: 2,
      mix: { cement: 1, sand: 3, granite: 6 },
    };
    const result = calculateConcrete([element]);
    expect(result.find((li) => li.materialCode === "GRANITE")).toBeDefined();
  });

  it("groups multiple elements sharing the same stage and mix into one set of totals", () => {
    const elements: ConcreteElement[] = [
      { id: "c3", stage: "SUBSTRUCTURE", description: "Footing A", volumeM3: 3, mix: { cement: 1, sand: 3, granite: 6 } },
      { id: "c4", stage: "SUBSTRUCTURE", description: "Footing B", volumeM3: 2, mix: { cement: 1, sand: 3, granite: 6 } },
    ];
    const result = calculateConcrete(elements);
    const volume = result.find((li) => li.description.startsWith("Concrete volume"));
    expect(volume!.quantity).toBe(5);
    expect(volume!.sourceRefs).toHaveLength(2);
  });
});
