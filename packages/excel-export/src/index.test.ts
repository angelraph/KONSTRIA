import { describe, expect, it } from "vitest";
import { generateBoqWorkbook, generateBoqWorkbookBuffer } from "./index.js";
import type { BOQSnapshotExport } from "@konstria/shared-types";

const sampleSnapshot: BOQSnapshotExport = {
  projectName: "4-Bedroom Duplex, Lekki",
  region: "Lagos",
  currency: "NGN",
  generatedAt: "2026-08-20T00:00:00.000Z",
  ruleEngineVersion: "1.0.0",
  lineItems: [
    { stage: "BLOCKWORK", description: "9-inch blocks", quantity: 4250, unit: "NO", unitRate: 550, provenanceLabel: "Afrotools, as of 2026-08-18", asOfDate: "2026-08-18", amount: 2337500 },
    { stage: "BLOCKWORK", description: "Cement (mortar)", quantity: 85, unit: "BAG", unitRate: 9500, provenanceLabel: "Afrotools, as of 2026-08-18", asOfDate: "2026-08-18", amount: 807500 },
    { stage: "ROOFING", description: "Long-span sheets", quantity: 24, unit: "NO", unitRate: 7500, provenanceLabel: "Your rate", asOfDate: null, amount: 180000 },
  ],
};

describe("generateBoqWorkbook", () => {
  it("creates a Summary sheet plus one sheet per stage", async () => {
    const workbook = await generateBoqWorkbook(sampleSnapshot);
    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    expect(sheetNames).toEqual(["Summary", "BLOCKWORK", "ROOFING"]);
  });

  it("writes a stage total formula summing the amount column", async () => {
    const workbook = await generateBoqWorkbook(sampleSnapshot);
    const blockworkSheet = workbook.getWorksheet("BLOCKWORK")!;
    // 2 line items + header -> total row is row 4.
    const totalCell = blockworkSheet.getCell("E4");
    expect(totalCell.formula).toBe("SUM(E2:E3)");
  });

  it("puts every stage subtotal into the Summary sheet with a grand-total formula", async () => {
    const workbook = await generateBoqWorkbook(sampleSnapshot);
    const summary = workbook.getWorksheet("Summary")!;
    // Row 1 header, rows 2-3 stages (BLOCKWORK, ROOFING), row 4 grand total.
    expect(summary.getCell("A2").value).toBe("BLOCKWORK");
    expect(summary.getCell("B2").value).toBeCloseTo(2337500 + 807500);
    expect(summary.getCell("A3").value).toBe("ROOFING");
    expect(summary.getCell("B3").value).toBe(180000);
    expect(summary.getCell("B4").formula).toBe("SUM(B2:B3)");
  });

  it("serializes to a non-empty, valid XLSX (zip) buffer", async () => {
    const buffer = await generateBoqWorkbookBuffer(sampleSnapshot);
    expect(buffer.length).toBeGreaterThan(0);
    // XLSX files are zip archives; zip local file headers start with "PK".
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});
