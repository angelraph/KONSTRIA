import { runTakeoff, type TakeoffModel } from "@konstria/rules-engine";
import type { ResolvedPrice } from "@konstria/shared-types";

export type LineRateSourceType = "PRICE_RECORD" | "USER_OVERRIDE" | "MISSING";

export interface GeneratedLineItem {
  stage: string;
  description: string;
  quantity: number;
  unit: string;
  materialCode?: string;
  unitRate: number | null;
  unitRateSourceType: LineRateSourceType;
  provenanceLabel: string;
  asOfDate: string | null;
  amount: number | null;
  traceabilityRefs: { entityType: string; entityId: string }[];
}

export interface GeneratedSnapshot {
  ruleEngineVersion: string;
  lineItems: GeneratedLineItem[];
}

export type PriceResolver = (materialCode: string) => Promise<ResolvedPrice>;

function rateSourceTypeFor(status: ResolvedPrice["status"]): LineRateSourceType {
  if (status === "USER_PROJECT_OVERRIDE" || status === "USER_GENERAL_OVERRIDE") return "USER_OVERRIDE";
  if (status === "SOURCED" || status === "STALE") return "PRICE_RECORD";
  return "MISSING";
}

/**
 * Combines the rules-engine's quantity takeoff with price resolution into
 * priced line items. Pure aside from the injected `resolvePrice` call —
 * takes no DB dependency directly, so it's fully testable with a fake
 * resolver. Persisting the result as an immutable BOQSnapshot is a
 * separate step (see persistSnapshot.ts).
 */
export async function generateSnapshot(
  takeoffModel: TakeoffModel,
  resolvePrice: PriceResolver
): Promise<GeneratedSnapshot> {
  const { ruleEngineVersion, lineItems } = runTakeoff(takeoffModel);

  const priced: GeneratedLineItem[] = [];

  for (const item of lineItems) {
    if (!item.materialCode) {
      priced.push({
        stage: item.stage,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitRate: null,
        unitRateSourceType: "MISSING",
        provenanceLabel: "Quantity reference — no direct material cost",
        asOfDate: null,
        amount: null,
        traceabilityRefs: item.sourceRefs,
      });
      continue;
    }

    const resolved = await resolvePrice(item.materialCode);
    const amount = resolved.amount !== null ? Number((item.quantity * resolved.amount).toFixed(2)) : null;

    priced.push({
      stage: item.stage,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      materialCode: item.materialCode,
      unitRate: resolved.amount,
      unitRateSourceType: rateSourceTypeFor(resolved.status),
      provenanceLabel: resolved.provenanceLabel,
      asOfDate: resolved.asOfDate ?? null,
      amount,
      traceabilityRefs: item.sourceRefs,
    });
  }

  return { ruleEngineVersion, lineItems: priced };
}
