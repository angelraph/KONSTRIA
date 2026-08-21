import { describe, expect, it } from "vitest";
import { groupByStage, type BOQSnapshotExport } from "./boq.js";

describe("groupByStage", () => {
  it("groups line items by stage and sums amounts into a subtotal", () => {
    const snapshot: BOQSnapshotExport = {
      projectName: "Test",
      region: "Lagos",
      currency: "NGN",
      generatedAt: new Date().toISOString(),
      ruleEngineVersion: "1.0.0",
      lineItems: [
        { stage: "BLOCKWORK", description: "Blocks", quantity: 100, unit: "NO", unitRate: 500, provenanceLabel: "x", asOfDate: null, amount: 50000 },
        { stage: "BLOCKWORK", description: "Cement", quantity: 10, unit: "BAG", unitRate: 9500, provenanceLabel: "x", asOfDate: null, amount: 95000 },
        { stage: "ROOFING", description: "Sheets", quantity: 20, unit: "NO", unitRate: 7000, provenanceLabel: "x", asOfDate: null, amount: 140000 },
      ],
    };

    const grouped = groupByStage(snapshot);
    const blockwork = grouped.find((g) => g.stage === "BLOCKWORK")!;
    const roofing = grouped.find((g) => g.stage === "ROOFING")!;

    expect(blockwork.lineItems).toHaveLength(2);
    expect(blockwork.subtotal).toBe(145000);
    expect(roofing.subtotal).toBe(140000);
  });

  it("treats a null amount (missing price) as zero in the subtotal, not a thrown error", () => {
    const snapshot: BOQSnapshotExport = {
      projectName: "Test",
      region: "Lagos",
      currency: "NGN",
      generatedAt: new Date().toISOString(),
      ruleEngineVersion: "1.0.0",
      lineItems: [
        { stage: "FINISHES", description: "Paint", quantity: 5, unit: "LITRE", unitRate: null, provenanceLabel: "Missing — needs input", asOfDate: null, amount: null },
      ],
    };
    const grouped = groupByStage(snapshot);
    expect(grouped[0].subtotal).toBe(0);
  });
});
