import { WASTAGE, rebarUnitWeightKgPerM } from "../constants/ng-standards.js";
import type { LineItem, RebarSchedule } from "../types.js";

/**
 * Reinforcement stage: converts a bar schedule (diameter x length x count)
 * into weight in kg using W = D^2/162 (kg/m), grouped by diameter, with a
 * wastage allowance for laps/off-cuts on top of whatever lap length is
 * already included in each schedule row's lengthM.
 */
export function calculateReinforcement(schedules: RebarSchedule[]): LineItem[] {
  const byDiameter = new Map<number, RebarSchedule[]>();
  for (const s of schedules) {
    if (!byDiameter.has(s.diameterMm)) byDiameter.set(s.diameterMm, []);
    byDiameter.get(s.diameterMm)!.push(s);
  }

  const lineItems: LineItem[] = [];
  let totalWeightKg = 0;
  const allSourceRefs: { entityType: string; entityId: string }[] = [];

  const sortedDiameters = [...byDiameter.keys()].sort((a, b) => a - b);

  for (const diameterMm of sortedDiameters) {
    const rows = byDiameter.get(diameterMm)!;
    const unitWeight = rebarUnitWeightKgPerM(diameterMm);
    const totalLengthM = rows.reduce((sum, r) => sum + r.lengthM * r.quantity, 0);
    const weightKg = totalLengthM * unitWeight;
    totalWeightKg += weightKg;

    const sourceRefs = rows.map((r) => ({ entityType: "ConcreteElement", entityId: r.elementId }));
    allSourceRefs.push(...sourceRefs);

    lineItems.push({
      stage: "REINFORCEMENT",
      description: `Y${diameterMm}mm reinforcement bars`,
      quantity: Number(totalLengthM.toFixed(1)),
      unit: "M",
      materialCode: `REBAR_${diameterMm}MM`,
      sourceRefs,
    });
  }

  const totalWeightWithWastageTonnes = (totalWeightKg * (1 + WASTAGE.reinforcement)) / 1000;

  lineItems.push({
    stage: "REINFORCEMENT",
    description: "Total reinforcement weight (incl. wastage/off-cuts)",
    quantity: Number(totalWeightWithWastageTonnes.toFixed(3)),
    unit: "TONNE",
    materialCode: "REBAR_TONNAGE",
    sourceRefs: allSourceRefs,
  });

  return lineItems;
}
