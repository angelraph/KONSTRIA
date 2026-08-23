import { prisma } from "@konstria/db";
import { loadTakeoffModel } from "./loadTakeoffModel.js";
import { generateSnapshot } from "./generateSnapshot.js";
import { resolvePrice } from "../pricing/resolvePrice.js";

/**
 * Runs the full pipeline (load reviewed takeoff -> quantities -> price
 * resolution) and writes the result as a new, immutable BOQSnapshot.
 * Regenerating a BOQ never mutates a prior snapshot — this always inserts a
 * new version, so historical estimates stay reproducible even after price
 * data or the rules engine changes later.
 */
export async function persistSnapshot(takeoffModelId: string, generatedByUserId: string) {
  const { model, projectId, region } = await loadTakeoffModel(takeoffModelId);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: generatedByUserId } });

  const materials = await prisma.materialCanonical.findMany();
  const materialIdByCode = new Map(materials.map((m) => [m.code, m.id] as const));

  const generated = await generateSnapshot(model, async (materialCode) => {
    const materialCanonicalId = materialIdByCode.get(materialCode);
    if (!materialCanonicalId) {
      return {
        status: "MISSING_PRICE",
        amount: null,
        unit: "",
        provenanceLabel: "Missing, needs input",
      };
    }
    return resolvePrice({
      userId: generatedByUserId,
      organizationId: user.organizationId,
      projectId,
      region,
      materialCanonicalId,
      materialCode,
    });
  });

  const ruleEngineVersion = await prisma.ruleEngineVersion.findUniqueOrThrow({
    where: { versionTag: generated.ruleEngineVersion },
  });

  const lastSnapshot = await prisma.bOQSnapshot.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastSnapshot?.version ?? 0) + 1;

  const snapshot = await prisma.bOQSnapshot.create({
    data: {
      projectId,
      takeoffModelId,
      version: nextVersion,
      status: "DRAFT",
      generatedById: generatedByUserId,
      ruleEngineVersionId: ruleEngineVersion.id,
      lineItems: {
        create: generated.lineItems.map((item) => ({
          materialCanonicalId: item.materialCode ? materialIdByCode.get(item.materialCode) : undefined,
          stage: item.stage,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitRate: item.unitRate ?? undefined,
          unitRateSourceType: item.unitRateSourceType,
          provenanceLabel: item.provenanceLabel,
          asOfDate: item.asOfDate ? new Date(item.asOfDate) : undefined,
          amount: item.amount ?? undefined,
          traceabilityRefs: item.traceabilityRefs,
        })),
      },
    },
    include: { lineItems: true },
  });

  return snapshot;
}
