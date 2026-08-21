import { describe, expect, it } from "vitest";
import { runTakeoff } from "./index.js";
import type { TakeoffModel } from "./types.js";

describe("runTakeoff", () => {
  it("runs all stages over a minimal model and tags the rule engine version", () => {
    const model: TakeoffModel = {
      id: "m1",
      rooms: [{ id: "rm1", name: "Living", areaM2: 20, roomType: "DRY" }],
      walls: [
        {
          id: "w1",
          lengthM: 5,
          heightM: 3,
          blockType: "BLOCK_225MM",
          mortarMix: { cement: 1, sand: 6 },
        },
      ],
      openings: [{ id: "o1", wallId: "w1", type: "DOOR", widthM: 1, heightM: 2.1, quantity: 1 }],
      concreteElements: [
        {
          id: "c1",
          stage: "SUBSTRUCTURE",
          description: "Foundation footing",
          volumeM3: 4,
          mix: { cement: 1, sand: 3, granite: 6 },
        },
      ],
      rebarSchedules: [{ id: "r1", elementId: "c1", diameterMm: 12, lengthM: 2, quantity: 8 }],
      roofPlanes: [{ id: "rp1", areaM2: 30, sheetType: "LONG_SPAN_ALUMINIUM", sheetLengthM: 3 }],
    };

    const result = runTakeoff(model);

    expect(result.ruleEngineVersion).toBeTruthy();
    expect(result.lineItems.length).toBeGreaterThan(0);

    const stages = new Set(result.lineItems.map((li) => li.stage));
    expect(stages.has("BLOCKWORK")).toBe(true);
    expect(stages.has("SUBSTRUCTURE")).toBe(true);
    expect(stages.has("REINFORCEMENT")).toBe(true);
    expect(stages.has("ROOFING")).toBe(true);
    expect(stages.has("OPENINGS")).toBe(true);
    expect(stages.has("FINISHES")).toBe(true);

    // Every line item must carry at least one traceability source reference
    // back to the takeoff entities that produced it — no untraceable numbers.
    for (const li of result.lineItems) {
      expect(li.sourceRefs.length).toBeGreaterThan(0);
    }
  });
});
