import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseAfrotools } from "./afrotools.js";
import { candidatePriceRecordSchema } from "@konstria/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  path.join(__dirname, "fixtures", "afrotools-2026-08.html"),
  "utf-8"
);

describe("parseAfrotools (against a real saved page fixture)", () => {
  const capturedAt = new Date("2026-08-20T00:00:00.000Z");
  const records = parseAfrotools(fixture, capturedAt);

  it("extracts every record as a schema-valid CandidatePriceRecord", () => {
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(() => candidatePriceRecordSchema.parse(r)).not.toThrow();
    }
  });

  it("extracts Dangote cement Lagos price as the midpoint of the real page's range", () => {
    // Real page content: Dangote Cement, Lagos column = "₦9,800 – ₦10,500"
    // Midpoint = (9800 + 10500) / 2 = 10150.
    const dangoteLagos = records.find(
      (r) =>
        r.materialCanonicalCode === "CEMENT_50KG_BAG" &&
        r.region === "Lagos" &&
        r.rawListingText?.startsWith("Dangote Cement")
    );
    expect(dangoteLagos).toBeDefined();
    expect(dangoteLagos!.amount).toBe(10150);
    expect(dangoteLagos!.unit).toBe("BAG");
    expect(dangoteLagos!.tier).toBe("C");
  });

  it("converts rebar 'per 12m length' pricing to a per-metre rate", () => {
    // Real page content: 12mm rebar, Lagos = "₦6,200 – ₦7,500" per length.
    // Midpoint = 6850, /12m standard length = 570.8333... per metre.
    const rebar12Lagos = records.find(
      (r) => r.materialCanonicalCode === "REBAR_12MM" && r.region === "Lagos"
    );
    expect(rebar12Lagos).toBeDefined();
    expect(rebar12Lagos!.amount).toBeCloseTo(570.83, 2);
    expect(rebar12Lagos!.unit).toBe("M");
  });

  it("maps 9-inch/6-inch block rows to the BLOCK_225MM/BLOCK_150MM canonical codes", () => {
    // Real page content: 9-inch block, Kano = "₦420 – ₦520" -> midpoint 470.
    const block9Kano = records.find(
      (r) => r.materialCanonicalCode === "BLOCK_225MM" && r.region === "Kano"
    );
    expect(block9Kano).toBeDefined();
    expect(block9Kano!.amount).toBe(470);
  });

  it("does not fabricate a region for columns outside the target region map", () => {
    for (const r of records) {
      expect(["Lagos", "FCT", "Rivers", "Kano"]).toContain(r.region);
    }
  });
});
