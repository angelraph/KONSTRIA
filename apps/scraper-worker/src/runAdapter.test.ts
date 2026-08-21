import { describe, expect, it } from "vitest";
import { runAdapter, type RunAdapterDeps } from "./runAdapter.js";
import type { SourceAdapter } from "./sources/types.js";

function makeInMemoryDeps(knownCodes: string[]): RunAdapterDeps & { saved: unknown[] } {
  const saved: unknown[] = [];
  return {
    saved,
    async getMaterialCanonicalId(code) {
      return knownCodes.includes(code) ? `id-${code}` : null;
    },
    async getPriceSourceId() {
      return "source-1";
    },
    async getRecentAmounts() {
      return [];
    },
    async savePriceRecord(input) {
      saved.push(input);
    },
    async startRun() {
      return "run-1";
    },
    async finishRun() {
      // no-op for the test
    },
  };
}

const fakeAdapter: SourceAdapter = {
  sourceName: "Fake Source",
  sourceUrl: "https://example.test/prices",
  tier: "C",
  schedule: "weekly",
  async fetchRaw() {
    return "<html></html>";
  },
  parse: () => [
    {
      materialCanonicalCode: "CEMENT_50KG_BAG",
      amount: 9500,
      currency: "NGN",
      unit: "BAG",
      region: "Lagos",
      country: "NG",
      sourceType: "NEWS_AGGREGATOR",
      sourceUrl: "https://example.test/prices",
      capturedAt: new Date().toISOString(),
      tier: "C",
    },
    {
      materialCanonicalCode: "UNKNOWN_MATERIAL",
      amount: 100,
      currency: "NGN",
      unit: "NO",
      region: "Lagos",
      country: "NG",
      sourceType: "NEWS_AGGREGATOR",
      sourceUrl: "https://example.test/prices",
      capturedAt: new Date().toISOString(),
      tier: "C",
    },
  ],
};

describe("runAdapter", () => {
  it("persists records with a known canonical material and reports unmatched codes separately", async () => {
    const deps = makeInMemoryDeps(["CEMENT_50KG_BAG"]);
    const result = await runAdapter(fakeAdapter, deps);

    expect(result.recordsFound).toBe(2);
    expect(result.recordsMatched).toBe(1);
    expect(result.unmatchedCodes).toEqual(["UNKNOWN_MATERIAL"]);
    expect(deps.saved).toHaveLength(1);
  });

  it("marks the run failed and rethrows when fetchRaw throws", async () => {
    const deps = makeInMemoryDeps(["CEMENT_50KG_BAG"]);
    let finishedStatus: string | undefined;
    deps.finishRun = async (_runId, result) => {
      finishedStatus = result.status;
    };

    const brokenAdapter: SourceAdapter = {
      ...fakeAdapter,
      async fetchRaw() {
        throw new Error("network error");
      },
    };

    await expect(runAdapter(brokenAdapter, deps)).rejects.toThrow("network error");
    expect(finishedStatus).toBe("failed");
  });
});
