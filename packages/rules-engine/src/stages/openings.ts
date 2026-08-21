import { FRAME_ALLOWANCE_M } from "../constants/ng-standards.js";
import type { LineItem, Opening } from "../types.js";

/**
 * Openings stage: door/window counts and frame linear metres (perimeter of
 * each opening plus a fixed jamb/sill allowance) and glazing area for windows.
 */
export function calculateOpenings(openings: Opening[]): LineItem[] {
  const lineItems: LineItem[] = [];

  for (const type of ["DOOR", "WINDOW"] as const) {
    const group = openings.filter((o) => o.type === type);
    if (group.length === 0) continue;

    const totalCount = group.reduce((sum, o) => sum + o.quantity, 0);
    const totalFrameM = group.reduce(
      (sum, o) => sum + (2 * (o.widthM + o.heightM) + FRAME_ALLOWANCE_M) * o.quantity,
      0
    );
    const sourceRefs = group.map((o) => ({ entityType: "Opening", entityId: o.id }));

    lineItems.push({
      stage: "OPENINGS",
      description: `${type === "DOOR" ? "Doors" : "Windows"} (count)`,
      quantity: totalCount,
      unit: "NO",
      materialCode: type,
      sourceRefs,
    });

    lineItems.push({
      stage: "OPENINGS",
      description: `${type === "DOOR" ? "Door" : "Window"} frame material`,
      quantity: Number(totalFrameM.toFixed(1)),
      unit: "M",
      materialCode: `${type}_FRAME`,
      sourceRefs,
    });

    if (type === "WINDOW") {
      const glazingAreaM2 = group.reduce(
        (sum, o) => sum + o.widthM * o.heightM * o.quantity,
        0
      );
      lineItems.push({
        stage: "OPENINGS",
        description: "Window glazing",
        quantity: Number(glazingAreaM2.toFixed(2)),
        unit: "M2",
        materialCode: "GLASS",
        sourceRefs,
      });
    }
  }

  return lineItems;
}
