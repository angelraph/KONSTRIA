import { RULE_ENGINE_VERSION } from "./constants/ng-standards.js";
import { calculateBlockwork } from "./stages/blockwork.js";
import { calculateConcrete } from "./stages/concrete.js";
import { calculateFinishes } from "./stages/finishes.js";
import { calculateOpenings } from "./stages/openings.js";
import { calculateReinforcement } from "./stages/reinforcement.js";
import { calculateRoofing } from "./stages/roofing.js";
import type { LineItem, TakeoffModel } from "./types.js";

export * from "./types.js";
export * from "./constants/ng-standards.js";
export { calculateBlockwork } from "./stages/blockwork.js";
export { calculateConcrete } from "./stages/concrete.js";
export { calculateReinforcement } from "./stages/reinforcement.js";
export { calculateRoofing } from "./stages/roofing.js";
export { calculateOpenings } from "./stages/openings.js";
export { calculateFinishes } from "./stages/finishes.js";

export interface TakeoffResult {
  ruleEngineVersion: string;
  lineItems: LineItem[];
}

/**
 * Runs the full stage pipeline (substructure/superstructure concrete,
 * blockwork, reinforcement, roofing, openings, finishes) over a reviewed
 * TakeoffModel. Pure function: no I/O, no pricing — quantities only. Pricing
 * is resolved separately by the price-resolution layer against each
 * line item's materialCode.
 */
export function runTakeoff(model: TakeoffModel): TakeoffResult {
  const lineItems: LineItem[] = [
    ...calculateConcrete(model.concreteElements),
    ...calculateBlockwork(model.walls, model.openings),
    ...calculateReinforcement(model.rebarSchedules),
    ...calculateRoofing(model.roofPlanes),
    ...calculateOpenings(model.openings),
    ...calculateFinishes(model.walls, model.openings, model.rooms),
  ];

  return { ruleEngineVersion: RULE_ENGINE_VERSION, lineItems };
}
