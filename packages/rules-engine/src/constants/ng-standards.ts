/**
 * Standard Nigerian construction quantity-takeoff constants.
 *
 * Every value here is a documented industry/engineering standard (block module
 * sizes, mix-ratio bulking factors, steel unit-weight formula), not a guess.
 * Changing any of these changes the output of every BOQ generated after the
 * change, which is why `RULE_ENGINE_VERSION` exists — the DB records which
 * version produced a given BOQSnapshot so historical estimates stay reproducible.
 */

export const RULE_ENGINE_VERSION = "1.0.0";

export const BAG_CEMENT_KG = 50;
// Loose (uncompacted) bulk density of Portland cement ~1440 kg/m3, so a 50kg
// bag occupies ~0.0347 m3. Standard figure used in Nigerian/Commonwealth QS
// mix-ratio calculations (e.g. Dutta, "Estimating and Costing in Civil Engineering").
export const CEMENT_M3_PER_BAG = BAG_CEMENT_KG / 1440;

export type BlockType = "BLOCK_225MM" | "BLOCK_150MM";

interface BlockSpec {
  /** Nominal face length including one mortar joint, metres */
  nominalLengthM: number;
  /** Nominal face height including one mortar joint, metres */
  nominalHeightM: number;
  /** Block thickness, metres */
  thicknessM: number;
  /** Actual (unjointed) block dimensions, for net solid volume */
  actualLengthM: number;
  actualHeightM: number;
}

// Standard Nigerian sandcrete block module: 450mm x 225mm nominal face
// (400/440mm x 200/215mm actual block + ~10mm mortar joint on two faces).
export const BLOCK_SPECS: Record<BlockType, BlockSpec> = {
  BLOCK_225MM: {
    nominalLengthM: 0.45,
    nominalHeightM: 0.225,
    thicknessM: 0.225,
    actualLengthM: 0.44,
    actualHeightM: 0.215,
  },
  BLOCK_150MM: {
    nominalLengthM: 0.45,
    nominalHeightM: 0.225,
    thicknessM: 0.15,
    actualLengthM: 0.44,
    actualHeightM: 0.215,
  },
};

/** Blocks per m2 of wall face = 1 / (nominal face area). Same for both block
 * types since thickness doesn't affect face area, only wall volume. */
export function blocksPerSquareMetre(blockType: BlockType): number {
  const spec = BLOCK_SPECS[blockType];
  return 1 / (spec.nominalLengthM * spec.nominalHeightM);
}

/** Standard wastage allowances (fraction), per Nigerian site practice. */
export const WASTAGE = {
  blocks: 0.05,
  cementMortar: 0.05,
  cementConcrete: 0.03,
  reinforcement: 0.05, // covers laps/off-cuts beyond explicit lap length
  roofingSheets: 0.05,
  tiles: 0.1,
  paint: 0.05,
};

export type MixRatio = { cement: number; sand: number; granite?: number };

// Common Nigerian mix ratios by use.
export const MIX_RATIOS: Record<string, MixRatio> = {
  MORTAR_1_4: { cement: 1, sand: 4 }, // plastering/rendering
  MORTAR_1_6: { cement: 1, sand: 6 }, // blockwork bedding/jointing
  CONCRETE_1_2_4: { cement: 1, sand: 2, granite: 4 }, // slabs, columns, beams
  CONCRETE_1_3_6: { cement: 1, sand: 3, granite: 6 }, // mass/foundation concrete, blinding
};

// Dry-volume bulking factor applied to wet (finished) volume before splitting
// by mix ratio, to account for voids between aggregate particles that close up
// on mixing. Standard values used in Commonwealth QS practice.
export const DRY_VOLUME_FACTOR = {
  mortar: 1.33,
  concrete: 1.54,
};

/**
 * Reinforcement unit weight: W (kg/m) = D^2 / 162, D = bar diameter in mm.
 * This is the standard steel-density-derived formula (density 7850 kg/m3,
 * circular cross-section) used worldwide for deformed/round bar takeoff.
 */
export function rebarUnitWeightKgPerM(diameterMm: number): number {
  return (diameterMm * diameterMm) / 162;
}

// Standard corrugated long-span/aluminium roofing sheet cover widths (metres),
// i.e. the effective width one sheet contributes after side-lap overlap.
export const ROOFING_SHEET_COVER_WIDTH_M: Record<string, number> = {
  LONG_SPAN_ALUMINIUM: 0.9,
  CORRUGATED_STANDARD: 0.8,
};

// Paint coverage, m2 per litre per coat (typical emulsion on plastered wall).
export const PAINT_COVERAGE_M2_PER_LITRE = 10;

// Standard door/window frame section: linear metres of frame per opening
// perimeter (2*(w+h) + allowance for jamb overlap at floor/wall).
export const FRAME_ALLOWANCE_M = 0.15;

// Typical Nigerian residential opening heights, used as an editable default
// when height can't be read off a plan view (a 2D floor plan never shows
// vertical height, for manual entry or AI-extracted openings alike).
export const STANDARD_OPENING_HEIGHT_M: Record<"DOOR" | "WINDOW", number> = {
  DOOR: 2.1,
  WINDOW: 1.2,
};

// Typical Nigerian residential eave overhang beyond the wall footprint, used
// to turn a floor plan's wall envelope into a rough roof-area estimate. Roof
// pitch and rafter length aren't visible on a floor plan at all (that's a
// section/elevation concept), so sheet length still needs the reviewer's
// input; this only estimates plan-view area.
export const STANDARD_ROOF_OVERHANG_M = 0.45;

// Common stocked long-span/aluminium roofing sheet length in Nigeria, used as
// an editable default when the real rafter length isn't known yet.
export const STANDARD_ROOF_SHEET_LENGTH_M = 3.6;
