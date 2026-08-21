import cron from "node-cron";
import { prisma } from "@konstria/db";
import { runAdapter, type RunAdapterDeps } from "./runAdapter.js";
import { afrotoolsAdapter } from "./sources/afrotools.js";
import type { SourceAdapter } from "./sources/types.js";

const ADAPTERS: SourceAdapter[] = [afrotoolsAdapter];

const prismaDeps: RunAdapterDeps = {
  async getMaterialCanonicalId(code) {
    const row = await prisma.materialCanonical.findUnique({ where: { code } });
    return row?.id ?? null;
  },
  async getPriceSourceId(sourceName) {
    const row = await prisma.priceSource.upsert({
      where: { name: sourceName },
      update: {},
      create: {
        name: sourceName,
        baseUrl: "",
        type: "NEWS_AGGREGATOR",
        tier: "C",
      },
    });
    return row.id;
  },
  async getRecentAmounts(materialCanonicalId, region) {
    const rows = await prisma.priceRecord.findMany({
      where: { materialCanonicalId, region, isOutlier: false },
      orderBy: { capturedAt: "desc" },
      take: 20,
      select: { amount: true },
    });
    return rows.map((r) => r.amount);
  },
  async savePriceRecord({ materialCanonicalId, priceSourceId, record, isOutlier }) {
    await prisma.priceRecord.create({
      data: {
        materialCanonicalId,
        priceSourceId,
        amount: record.amount,
        currency: record.currency,
        unit: record.unit,
        region: record.region,
        country: record.country,
        sourceUrl: record.sourceUrl,
        capturedAt: new Date(record.capturedAt),
        confidenceTier: record.tier,
        isOutlier,
        rawListingText: record.rawListingText,
      },
    });
  },
  async startRun(priceSourceId) {
    const run = await prisma.scrapeRun.create({
      data: { priceSourceId, status: "running" },
    });
    return run.id;
  },
  async finishRun(runId, result) {
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        status: result.status,
        recordsFound: result.recordsFound,
        recordsMatched: result.recordsMatched,
        errorMessage: result.errorMessage,
        finishedAt: new Date(),
      },
    });
  },
};

async function runAll() {
  for (const adapter of ADAPTERS) {
    try {
      const result = await runAdapter(adapter, prismaDeps);
      console.log(
        `[scraper] ${adapter.sourceName}: ${result.recordsMatched}/${result.recordsFound} matched`,
        result.unmatchedCodes.length > 0
          ? `(unmatched: ${result.unmatchedCodes.join(", ")} — needs Match Queue review)`
          : ""
      );
    } catch (err) {
      console.error(`[scraper] ${adapter.sourceName} failed:`, err);
    }
  }
}

// Weekly sources: every Monday 03:00. Daily sources get their own cron line
// once added — this file intentionally keeps each schedule explicit rather
// than inferring cron syntax from adapter.schedule, so the actual run time
// is always visible here.
cron.schedule("0 3 * * 1", () => {
  void runAll();
});

if (process.argv.includes("--run-now")) {
  void runAll();
}
