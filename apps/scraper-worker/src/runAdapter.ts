import type { CandidatePriceRecord } from "@konstria/shared-types";
import { candidatePriceRecordSchema } from "@konstria/shared-types";
import { isOutlier } from "./outlier.js";
import type { SourceAdapter } from "./sources/types.js";

export interface RunAdapterDeps {
  getMaterialCanonicalId(code: string): Promise<string | null>;
  getPriceSourceId(sourceName: string): Promise<string>;
  getRecentAmounts(materialCanonicalId: string, region: string): Promise<number[]>;
  savePriceRecord(input: {
    materialCanonicalId: string;
    priceSourceId: string;
    record: CandidatePriceRecord;
    isOutlier: boolean;
  }): Promise<void>;
  startRun(priceSourceId: string): Promise<string>;
  finishRun(
    runId: string,
    result: { status: "success" | "failed"; recordsFound: number; recordsMatched: number; errorMessage?: string }
  ): Promise<void>;
}

export interface RunAdapterResult {
  recordsFound: number;
  recordsMatched: number;
  unmatchedCodes: string[];
}

/**
 * Runs one source adapter end to end: fetch -> parse -> schema-validate ->
 * resolve each record's canonical material -> outlier-check against recent
 * history -> persist. A record whose materialCanonicalCode isn't in the DB
 * yet is skipped and reported in unmatchedCodes rather than silently
 * dropped or auto-created — matches the "no silent misclassification" rule.
 */
export async function runAdapter(
  adapter: SourceAdapter,
  deps: RunAdapterDeps
): Promise<RunAdapterResult> {
  const priceSourceId = await deps.getPriceSourceId(adapter.sourceName);
  const runId = await deps.startRun(priceSourceId);

  try {
    const raw = await adapter.fetchRaw();
    const capturedAt = new Date();
    const candidates = adapter.parse(raw, capturedAt);

    let matched = 0;
    const unmatchedCodes = new Set<string>();

    for (const candidate of candidates) {
      const parsed = candidatePriceRecordSchema.safeParse(candidate);
      if (!parsed.success) continue;

      const materialCanonicalId = await deps.getMaterialCanonicalId(
        parsed.data.materialCanonicalCode
      );
      if (!materialCanonicalId) {
        unmatchedCodes.add(parsed.data.materialCanonicalCode);
        continue;
      }

      const recentAmounts = await deps.getRecentAmounts(
        materialCanonicalId,
        parsed.data.region
      );
      const outlier = isOutlier(parsed.data.amount, recentAmounts);

      await deps.savePriceRecord({
        materialCanonicalId,
        priceSourceId,
        record: parsed.data,
        isOutlier: outlier,
      });
      matched++;
    }

    await deps.finishRun(runId, {
      status: "success",
      recordsFound: candidates.length,
      recordsMatched: matched,
    });

    return {
      recordsFound: candidates.length,
      recordsMatched: matched,
      unmatchedCodes: [...unmatchedCodes],
    };
  } catch (err) {
    await deps.finishRun(runId, {
      status: "failed",
      recordsFound: 0,
      recordsMatched: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
