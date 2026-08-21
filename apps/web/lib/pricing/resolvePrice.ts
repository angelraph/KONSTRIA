import { prisma } from "@konstria/db";
import type { ResolvedPrice } from "@konstria/shared-types";

// Beyond this age a sourced price is still shown, but flagged stale rather
// than treated as current — matches the price-sourcing design in the plan.
const STALE_AFTER_DAYS: Record<"A" | "B" | "C", number> = {
  A: 60,
  B: 14,
  C: 30,
};

function daysAgo(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function formatProvenance(sourceName: string, capturedAt: Date, stale: boolean): string {
  const dateStr = capturedAt.toISOString().slice(0, 10);
  return stale ? `Stale — last seen ${dateStr} (${sourceName})` : `${sourceName}, as of ${dateStr}`;
}

export interface ResolvePriceContext {
  userId: string;
  organizationId: string;
  projectId: string;
  region: string;
  materialCanonicalId: string;
  materialCode: string;
}

/**
 * Price resolution order (see plan): project-scoped user override -> user's
 * general override -> freshest non-outlier in-region PriceRecord (tier A
 * preferred) -> MISSING_PRICE. Never fabricates a value — a material with no
 * override and no matching PriceRecord comes back MISSING_PRICE.
 */
export async function resolvePrice(ctx: ResolvePriceContext): Promise<ResolvedPrice> {
  const projectOverride = await prisma.userRateOverride.findFirst({
    where: {
      userId: ctx.userId,
      materialCanonicalId: ctx.materialCanonicalId,
      projectId: ctx.projectId,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (projectOverride) {
    return {
      status: "USER_PROJECT_OVERRIDE",
      amount: projectOverride.amount,
      unit: projectOverride.unit,
      provenanceLabel: "Your rate (this project)",
    };
  }

  const generalOverride = await prisma.userRateOverride.findFirst({
    where: {
      userId: ctx.userId,
      materialCanonicalId: ctx.materialCanonicalId,
      projectId: null,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (generalOverride) {
    return {
      status: "USER_GENERAL_OVERRIDE",
      amount: generalOverride.amount,
      unit: generalOverride.unit,
      provenanceLabel: "Your rate",
    };
  }

  const candidates = await prisma.priceRecord.findMany({
    where: {
      materialCanonicalId: ctx.materialCanonicalId,
      region: ctx.region,
      isOutlier: false,
    },
    include: { priceSource: true },
    orderBy: [{ confidenceTier: "asc" }, { capturedAt: "desc" }],
    take: 5,
  });

  if (candidates.length === 0) {
    return {
      status: "MISSING_PRICE",
      amount: null,
      unit: "",
      provenanceLabel: "Missing — needs input",
    };
  }

  const best = candidates[0];
  const tier = best.confidenceTier as "A" | "B" | "C";
  const stale = daysAgo(best.capturedAt) > STALE_AFTER_DAYS[tier];

  return {
    status: stale ? "STALE" : "SOURCED",
    amount: best.amount,
    unit: best.unit,
    provenanceLabel: formatProvenance(best.priceSource.name, best.capturedAt, stale),
    sourceUrl: best.sourceUrl,
    asOfDate: best.capturedAt.toISOString().slice(0, 10),
  };
}
