import { z } from "zod";

export const priceSourceTypeSchema = z.enum([
  "MARKETPLACE",
  "SUPPLIER_SITE",
  "NEWS_AGGREGATOR",
  "MANUAL_ADMIN_ENTRY",
  "USER_OVERRIDE",
]);

export const priceTierSchema = z.enum(["A", "B", "C"]);

/**
 * Shape a scraper adapter (or the admin manual-entry form) must produce
 * BEFORE it is written to PriceRecord. Every field here is required so that
 * no price can enter the system without a real source, region, and date —
 * this is the schema-validation gate referenced in the price-sourcing plan.
 */
export const candidatePriceRecordSchema = z.object({
  materialCanonicalCode: z.string().min(1),
  amount: z.number().positive(),
  currency: z.literal("NGN"),
  unit: z.string().min(1),
  region: z.string().min(1),
  country: z.literal("NG"),
  sourceType: priceSourceTypeSchema,
  sourceUrl: z.string().url(),
  capturedAt: z.string().datetime(),
  tier: priceTierSchema,
  rawListingText: z.string().optional(),
});

export const userRateOverrideSchema = z.object({
  materialCanonicalCode: z.string().min(1),
  amount: z.number().positive(),
  unit: z.string().min(1),
  note: z.string().optional(),
  scope: z.enum(["PROJECT", "ALL_MY_PROJECTS"]),
  projectId: z.string().optional(),
});

export type PriceSourceType = z.infer<typeof priceSourceTypeSchema>;
export type PriceTier = z.infer<typeof priceTierSchema>;
export type CandidatePriceRecord = z.infer<typeof candidatePriceRecordSchema>;
export type UserRateOverride = z.infer<typeof userRateOverrideSchema>;

export type PriceResolutionStatus =
  | "USER_PROJECT_OVERRIDE"
  | "USER_GENERAL_OVERRIDE"
  | "SOURCED"
  | "STALE"
  | "MISSING_PRICE";

export interface ResolvedPrice {
  status: PriceResolutionStatus;
  amount: number | null;
  unit: string;
  /** Human-readable provenance label, e.g. "Jiji.ng, as of 2026-08-18" or "Your rate". */
  provenanceLabel: string;
  sourceUrl?: string;
  asOfDate?: string;
}
