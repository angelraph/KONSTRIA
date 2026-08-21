import { describe, expect, it } from "vitest";
import type { TakeoffModel } from "@konstria/rules-engine";
import type { ResolvedPrice } from "@konstria/shared-types";
import { generateSnapshot } from "./generateSnapshot.js";

const model: TakeoffModel = {
  id: "m1",
  rooms: [{ id: "rm1", name: "Living", areaM2: 20, roomType: "DRY" }],
  walls: [
    {
      id: "w1",
      lengthM: 4,
      heightM: 3,
      blockType: "BLOCK_225MM",
      mortarMix: { cement: 1, sand: 6 },
    },
  ],
  openings: [],
  concreteElements: [],
  rebarSchedules: [],
  roofPlanes: [],
};

describe("generateSnapshot", () => {
  it("prices a materialCode line item using the injected resolver", async () => {
    const resolvePrice = async (): Promise<ResolvedPrice> => ({
      status: "SOURCED",
      amount: 550,
      unit: "NO",
      provenanceLabel: "Afrotools, as of 2026-08-18",
      asOfDate: "2026-08-18",
    });

    const result = await generateSnapshot(model, resolvePrice);
    const blockLine = result.lineItems.find((li) => li.materialCode === "BLOCK_225MM")!;

    expect(blockLine.unitRate).toBe(550);
    expect(blockLine.unitRateSourceType).toBe("PRICE_RECORD");
    expect(blockLine.amount).toBe(Number((blockLine.quantity * 550).toFixed(2)));
    expect(blockLine.provenanceLabel).toBe("Afrotools, as of 2026-08-18");
  });

  it("marks a line item MISSING and leaves amount null when no price is found", async () => {
    const resolvePrice = async (): Promise<ResolvedPrice> => ({
      status: "MISSING_PRICE",
      amount: null,
      unit: "NO",
      provenanceLabel: "Missing — needs input",
    });

    const result = await generateSnapshot(model, resolvePrice);
    const blockLine = result.lineItems.find((li) => li.materialCode === "BLOCK_225MM")!;

    expect(blockLine.unitRate).toBeNull();
    expect(blockLine.unitRateSourceType).toBe("MISSING");
    expect(blockLine.amount).toBeNull();
  });

  it("maps USER_PROJECT_OVERRIDE and USER_GENERAL_OVERRIDE to unitRateSourceType USER_OVERRIDE", async () => {
    for (const status of ["USER_PROJECT_OVERRIDE", "USER_GENERAL_OVERRIDE"] as const) {
      const resolvePrice = async (): Promise<ResolvedPrice> => ({
        status,
        amount: 600,
        unit: "NO",
        provenanceLabel: "Your rate",
      });
      const result = await generateSnapshot(model, resolvePrice);
      const blockLine = result.lineItems.find((li) => li.materialCode === "BLOCK_225MM")!;
      expect(blockLine.unitRateSourceType).toBe("USER_OVERRIDE");
    }
  });

  it("never prices a line item that has no materialCode, and never calls resolvePrice for it", async () => {
    let callCount = 0;
    const resolvePrice = async (): Promise<ResolvedPrice> => {
      callCount++;
      return { status: "SOURCED", amount: 100, unit: "M2", provenanceLabel: "test" };
    };

    const result = await generateSnapshot(model, resolvePrice);
    const plasterLine = result.lineItems.find((li) => li.description.startsWith("Wall plastering"))!;

    expect(plasterLine.materialCode).toBeUndefined();
    expect(plasterLine.unitRateSourceType).toBe("MISSING");
    expect(plasterLine.amount).toBeNull();

    // Every materialCode-bearing line item should have triggered exactly one resolvePrice call.
    const pricedLines = result.lineItems.filter((li) => li.materialCode);
    expect(callCount).toBe(pricedLines.length);
  });

  it("carries the rule engine version through to the result", async () => {
    const result = await generateSnapshot(model, async () => ({
      status: "MISSING_PRICE",
      amount: null,
      unit: "NO",
      provenanceLabel: "Missing — needs input",
    }));
    expect(result.ruleEngineVersion).toBeTruthy();
  });
});
