import { z } from "zod";

export const boqLineItemExportSchema = z.object({
  stage: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitRate: z.number().nullable(),
  provenanceLabel: z.string(),
  asOfDate: z.string().nullable(),
  amount: z.number().nullable(),
});

export const boqSnapshotExportSchema = z.object({
  projectName: z.string(),
  region: z.string(),
  currency: z.string(),
  generatedAt: z.string(),
  ruleEngineVersion: z.string(),
  lineItems: z.array(boqLineItemExportSchema),
});

export type BOQLineItemExport = z.infer<typeof boqLineItemExportSchema>;
export type BOQSnapshotExport = z.infer<typeof boqSnapshotExportSchema>;

export function groupByStage(
  snapshot: BOQSnapshotExport
): Array<{ stage: string; lineItems: BOQLineItemExport[]; subtotal: number }> {
  const stages = new Map<string, BOQLineItemExport[]>();
  for (const item of snapshot.lineItems) {
    const list = stages.get(item.stage) ?? [];
    list.push(item);
    stages.set(item.stage, list);
  }
  return [...stages.entries()].map(([stage, lineItems]) => ({
    stage,
    lineItems,
    subtotal: lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0),
  }));
}
