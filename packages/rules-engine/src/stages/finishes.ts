import {
  DRY_VOLUME_FACTOR,
  PAINT_COVERAGE_M2_PER_LITRE,
  WASTAGE,
} from "../constants/ng-standards.js";
import { breakdownMix } from "../lib/mix.js";
import type { LineItem, Opening, Room, Wall } from "../types.js";

const PLASTER_THICKNESS_M = 0.015;

function openingAreaForWall(wall: Wall, openings: Opening[]): number {
  return openings
    .filter((o) => o.wallId === wall.id)
    .reduce((sum, o) => sum + o.widthM * o.heightM * o.quantity, 0);
}

/**
 * Finishes stage: plaster (both wall faces minus openings), floor screed
 * (room areas), and paint (plaster area / coverage rate, one coat).
 */
export function calculateFinishes(
  walls: Wall[],
  openings: Opening[],
  rooms: Room[]
): LineItem[] {
  const lineItems: LineItem[] = [];

  let totalPlasterAreaM2 = 0;
  const wallSourceRefs: { entityType: string; entityId: string }[] = [];
  for (const wall of walls) {
    const grossAreaM2 = wall.lengthM * wall.heightM;
    const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaForWall(wall, openings));
    totalPlasterAreaM2 += netAreaM2 * 2; // both faces
    wallSourceRefs.push({ entityType: "Wall", entityId: wall.id });
  }

  if (totalPlasterAreaM2 > 0) {
    lineItems.push({
      stage: "FINISHES",
      description: "Wall plastering/rendering (both faces)",
      quantity: Number(totalPlasterAreaM2.toFixed(1)),
      unit: "M2",
      sourceRefs: wallSourceRefs,
    });

    const plasterVolumeM3 = totalPlasterAreaM2 * PLASTER_THICKNESS_M;
    const mixed = breakdownMix(
      plasterVolumeM3 * (1 + WASTAGE.cementMortar),
      { cement: 1, sand: 4 },
      DRY_VOLUME_FACTOR.mortar
    );

    lineItems.push({
      stage: "FINISHES",
      description: "Cement for plastering (1:4)",
      quantity: Math.ceil(mixed.cementBags),
      unit: "BAG",
      materialCode: "CEMENT_50KG_BAG",
      sourceRefs: wallSourceRefs,
    });
    lineItems.push({
      stage: "FINISHES",
      description: "Sharp sand for plastering (1:4)",
      quantity: Number(mixed.sandM3.toFixed(2)),
      unit: "M3",
      materialCode: "SHARP_SAND",
      sourceRefs: wallSourceRefs,
    });

    const paintLitres =
      (totalPlasterAreaM2 / PAINT_COVERAGE_M2_PER_LITRE) * (1 + WASTAGE.paint);
    lineItems.push({
      stage: "FINISHES",
      description: "Emulsion paint (one coat)",
      quantity: Number(paintLitres.toFixed(1)),
      unit: "LITRE",
      materialCode: "EMULSION_PAINT",
      sourceRefs: wallSourceRefs,
    });
  }

  const totalFloorAreaM2 = rooms.reduce((sum, r) => sum + r.areaM2, 0);
  if (totalFloorAreaM2 > 0) {
    const roomSourceRefs = rooms.map((r) => ({ entityType: "Room", entityId: r.id }));
    lineItems.push({
      stage: "FINISHES",
      description: "Floor screed",
      quantity: Number(totalFloorAreaM2.toFixed(1)),
      unit: "M2",
      sourceRefs: roomSourceRefs,
    });
  }

  return lineItems;
}
