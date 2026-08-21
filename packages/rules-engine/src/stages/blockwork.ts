import {
  BLOCK_SPECS,
  DRY_VOLUME_FACTOR,
  WASTAGE,
  blocksPerSquareMetre,
  type BlockType,
} from "../constants/ng-standards.js";
import { breakdownMix } from "../lib/mix.js";
import type { LineItem, Opening, Wall } from "../types.js";

function openingAreaForWall(wall: Wall, openings: Opening[]): number {
  return openings
    .filter((o) => o.wallId === wall.id)
    .reduce((sum, o) => sum + o.widthM * o.heightM * o.quantity, 0);
}

/**
 * Blockwork stage: for each wall, computes net face area (gross minus
 * openings), block count with wastage, and the mortar cement/sand required
 * for bedding + jointing. Mortar volume is derived from the actual net solid
 * volume of blocks used vs. the gross wall volume, not a flat rule of thumb.
 *
 * Blocks are grouped and priced per BlockType (225mm/150mm) rather than
 * combined into one generic "blocks" line — 6-inch and 9-inch blocks have
 * materially different real market prices, so combining them would make the
 * line item impossible to price accurately against real rates.
 */
export function calculateBlockwork(walls: Wall[], openings: Opening[]): LineItem[] {
  const lineItems: LineItem[] = [];

  const blocksByType = new Map<BlockType, number>();
  const sourceRefsByType = new Map<BlockType, { entityType: string; entityId: string }[]>();
  let totalMortarM3 = 0;
  const allSourceRefs: { entityType: string; entityId: string }[] = [];

  for (const wall of walls) {
    const spec = BLOCK_SPECS[wall.blockType];
    const grossAreaM2 = wall.lengthM * wall.heightM;
    const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaForWall(wall, openings));

    if (netAreaM2 === 0) continue;

    const rawBlocks = netAreaM2 * blocksPerSquareMetre(wall.blockType);
    const blocksWithWastage = rawBlocks * (1 + WASTAGE.blocks);

    blocksByType.set(wall.blockType, (blocksByType.get(wall.blockType) ?? 0) + blocksWithWastage);
    const refs = sourceRefsByType.get(wall.blockType) ?? [];
    refs.push({ entityType: "Wall", entityId: wall.id });
    sourceRefsByType.set(wall.blockType, refs);
    allSourceRefs.push({ entityType: "Wall", entityId: wall.id });

    const grossWallVolumeM3 = netAreaM2 * spec.thicknessM;
    const solidBlockVolumeM3 =
      rawBlocks * spec.actualLengthM * spec.actualHeightM * spec.thicknessM;
    const mortarVolumeM3 = Math.max(0, grossWallVolumeM3 - solidBlockVolumeM3);
    totalMortarM3 += mortarVolumeM3;
  }

  for (const [blockType, count] of blocksByType) {
    lineItems.push({
      stage: "BLOCKWORK",
      description: `Sandcrete blocks (${blockType === "BLOCK_225MM" ? "9-inch" : "6-inch"})`,
      quantity: Math.ceil(count),
      unit: "NO",
      materialCode: blockType,
      sourceRefs: sourceRefsByType.get(blockType)!,
    });
  }

  if (totalMortarM3 > 0) {
    const mixed = breakdownMix(
      totalMortarM3 * (1 + WASTAGE.cementMortar),
      { cement: 1, sand: 6 },
      DRY_VOLUME_FACTOR.mortar
    );
    lineItems.push({
      stage: "BLOCKWORK",
      description: "Cement for block bedding/jointing mortar (1:6)",
      quantity: Math.ceil(mixed.cementBags),
      unit: "BAG",
      materialCode: "CEMENT_50KG_BAG",
      sourceRefs: allSourceRefs,
    });
    lineItems.push({
      stage: "BLOCKWORK",
      description: "Sharp sand for block bedding/jointing mortar (1:6)",
      quantity: Number(mixed.sandM3.toFixed(2)),
      unit: "M3",
      materialCode: "SHARP_SAND",
      sourceRefs: allSourceRefs,
    });
  }

  return lineItems;
}
