import type { CandidatePriceRecord } from "@konstria/shared-types";

export interface SourceAdapter {
  /** Matches PriceSource.name in the DB — used to log ScrapeRun and PriceSource rows. */
  sourceName: string;
  sourceUrl: string;
  tier: "A" | "B" | "C";
  /** How often this source should be re-fetched. */
  schedule: "daily" | "weekly";

  fetchRaw(): Promise<string>;

  /**
   * Parses raw fetched content into schema-validated candidate price
   * records. MUST NOT throw on a single malformed row — skip it and let the
   * caller see fewer records than expected (visible in ScrapeRun.recordsFound
   * vs. table row count), rather than failing the whole run.
   */
  parse(raw: string, capturedAt: Date): CandidatePriceRecord[];
}
