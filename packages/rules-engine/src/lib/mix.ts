import { CEMENT_M3_PER_BAG, type MixRatio } from "../constants/ng-standards.js";

export interface MixBreakdown {
  cementBags: number;
  sandM3: number;
  graniteM3: number;
}

/**
 * Converts a wet (finished, in-place) volume of mortar or concrete into a
 * cement/sand/granite breakdown using the standard dry-volume method:
 *
 *   dryVolume = wetVolume * bulkingFactor
 *   componentVolume = dryVolume * (ratioPart / sumOfRatioParts)
 *   cementBags = cementVolume / cementM3PerBag
 */
export function breakdownMix(
  wetVolumeM3: number,
  mix: MixRatio,
  dryVolumeFactor: number
): MixBreakdown {
  const dryVolume = wetVolumeM3 * dryVolumeFactor;
  const ratioSum = mix.cement + mix.sand + (mix.granite ?? 0);

  const cementVolume = dryVolume * (mix.cement / ratioSum);
  const sandVolume = dryVolume * (mix.sand / ratioSum);
  const graniteVolume = mix.granite ? dryVolume * (mix.granite / ratioSum) : 0;

  return {
    cementBags: cementVolume / CEMENT_M3_PER_BAG,
    sandM3: sandVolume,
    graniteM3: graniteVolume,
  };
}
