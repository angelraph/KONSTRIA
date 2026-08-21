import { ROOFING_SHEET_COVER_WIDTH_M, WASTAGE } from "../constants/ng-standards.js";
import type { LineItem, RoofPlane } from "../types.js";

/**
 * Roofing stage: number of sheets per plane = plane area / (sheet length x
 * effective cover width after side-lap), rounded up, with wastage for
 * cut/off-cut loss at hips/valleys.
 */
export function calculateRoofing(planes: RoofPlane[]): LineItem[] {
  const lineItems: LineItem[] = [];

  const byType = new Map<string, RoofPlane[]>();
  for (const p of planes) {
    if (!byType.has(p.sheetType)) byType.set(p.sheetType, []);
    byType.get(p.sheetType)!.push(p);
  }

  for (const [sheetType, group] of byType) {
    let totalSheets = 0;
    const sourceRefs = group.map((p) => ({ entityType: "RoofPlane", entityId: p.id }));

    for (const plane of group) {
      const coverWidth = ROOFING_SHEET_COVER_WIDTH_M[sheetType];
      const sheetAreaM2 = plane.sheetLengthM * coverWidth;
      totalSheets += plane.areaM2 / sheetAreaM2;
    }

    const withWastage = Math.ceil(totalSheets * (1 + WASTAGE.roofingSheets));

    lineItems.push({
      stage: "ROOFING",
      description: `Roofing sheets (${sheetType.replace(/_/g, " ").toLowerCase()})`,
      quantity: withWastage,
      unit: "NO",
      materialCode: `ROOF_SHEET_${sheetType}`,
      sourceRefs,
    });
  }

  return lineItems;
}
