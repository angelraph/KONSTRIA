import * as cheerio from "cheerio";
import type { CandidatePriceRecord } from "@konstria/shared-types";
import type { SourceAdapter } from "./types.js";

const SOURCE_URL = "https://afrotools.com/blog/construction-material-prices-nigeria/";

// Column headers on this page map to our target regions from the v1
// roadmap. This source does not cover Oyo/Enugu — that's fine, other
// sources fill those in; the price-resolution layer treats missing
// region+material combinations as MISSING_PRICE, never a guess.
const REGION_COLUMN_MAP: Record<string, string> = {
  Lagos: "Lagos",
  Abuja: "FCT",
  "Port Harcourt": "Rivers",
  Kano: "Kano",
};

interface RegionalTableConfig {
  /** Exact heading text (case-insensitive substring match) preceding the table. */
  headingMatch: string;
  /** Maps the row's first-column label to a MaterialCanonical code, or null to skip the row. */
  resolveCode: (rowLabel: string) => string | null;
  unit: string;
  /** Divides the parsed midpoint amount by this before storing (e.g. 12 to
   * convert "per 12m length" pricing to a per-metre rate). */
  amountDivisor?: number;
}

const TABLE_CONFIGS: RegionalTableConfig[] = [
  {
    headingMatch: "cement prices by brand and region",
    resolveCode: () => "CEMENT_50KG_BAG",
    unit: "BAG",
  },
  {
    headingMatch: "reinforcement bars",
    resolveCode: (label) => {
      const m = label.match(/(\d+)\s*mm/i);
      return m ? `REBAR_${m[1]}MM` : null;
    },
    unit: "M",
    // Source prices rebar "per length" — a standard commercial rebar length
    // in the Nigerian market is 12m — so divide to get a per-metre rate.
    amountDivisor: 12,
  },
  {
    headingMatch: "concrete block prices",
    resolveCode: (label) => {
      if (/6-inch/i.test(label)) return "BLOCK_150MM";
      if (/9-inch/i.test(label)) return "BLOCK_225MM";
      return null;
    },
    unit: "NO",
  },
];

function parseMidpointAmount(cell: string): number | null {
  const numbers = cell
    .replace(/[₦,]/g, "")
    .match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function findTableAfterHeading($: cheerio.CheerioAPI, headingMatch: string) {
  const heading = $("h1,h2,h3,h4")
    .filter((_, el) => $(el).text().trim().toLowerCase().includes(headingMatch))
    .first();
  if (heading.length === 0) return null;

  let node = heading.next();
  while (node.length > 0 && node.prop("tagName")?.toLowerCase() !== "table") {
    if (/^h[1-4]$/i.test(node.prop("tagName") ?? "")) return null; // hit next section first
    const nestedTable = node.find("table").first();
    if (nestedTable.length > 0) return nestedTable;
    node = node.next();
  }
  return node.length > 0 ? node : null;
}

export function parseAfrotools(raw: string, capturedAt: Date): CandidatePriceRecord[] {
  const $ = cheerio.load(raw);
  const records: CandidatePriceRecord[] = [];

  for (const config of TABLE_CONFIGS) {
    const table = findTableAfterHeading($, config.headingMatch);
    if (!table) continue;

    const headerCells = table
      .find("thead th")
      .map((_, th) => $(th).text().trim())
      .get();

    table.find("tbody tr").each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((_, td) => $(td).text().trim())
        .get();
      if (cells.length === 0) return;

      const rowLabel = cells[0];
      const materialCanonicalCode = config.resolveCode(rowLabel);
      if (!materialCanonicalCode) return;

      for (let col = 1; col < cells.length; col++) {
        const headerName = headerCells[col];
        const region = headerName ? REGION_COLUMN_MAP[headerName.split(" (")[0]] : undefined;
        if (!region) continue;

        const midpoint = parseMidpointAmount(cells[col]);
        if (midpoint === null) continue;

        const amount = config.amountDivisor ? midpoint / config.amountDivisor : midpoint;

        records.push({
          materialCanonicalCode,
          amount,
          currency: "NGN",
          unit: config.unit,
          region,
          country: "NG",
          sourceType: "NEWS_AGGREGATOR",
          sourceUrl: SOURCE_URL,
          capturedAt: capturedAt.toISOString(),
          tier: "C",
          rawListingText: `${rowLabel}: ${cells[col]}`,
        });
      }
    });
  }

  return records;
}

export const afrotoolsAdapter: SourceAdapter = {
  sourceName: "Afrotools Nigeria Construction Material Prices",
  sourceUrl: SOURCE_URL,
  tier: "C",
  schedule: "weekly",
  async fetchRaw() {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KonstriaPriceBot/0.1)" },
    });
    if (!res.ok) {
      throw new Error(`afrotools fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  },
  parse: parseAfrotools,
};
