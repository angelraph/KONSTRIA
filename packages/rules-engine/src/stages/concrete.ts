import { DRY_VOLUME_FACTOR, WASTAGE } from "../constants/ng-standards.js";
import { breakdownMix } from "../lib/mix.js";
import type { ConcreteElement, LineItem } from "../types.js";

/**
 * Concrete stage: for each concrete element (footing, column, beam, slab, ...),
 * breaks its wet volume down into cement bags / sand / granite via its mix
 * ratio, then emits one grouped line item per stage x mix ratio.
 */
export function calculateConcrete(elements: ConcreteElement[]): LineItem[] {
  const lineItems: LineItem[] = [];

  const groups = new Map<string, ConcreteElement[]>();
  for (const el of elements) {
    const key = `${el.stage}:${el.mix.cement}-${el.mix.sand}-${el.mix.granite ?? 0}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(el);
  }

  for (const [, group] of groups) {
    const mix = group[0].mix;
    const totalVolumeM3 = group.reduce((sum, e) => sum + e.volumeM3, 0);
    const sourceRefs = group.map((e) => ({ entityType: "ConcreteElement", entityId: e.id }));
    const mixLabel = `${mix.cement}:${mix.sand}${mix.granite ? `:${mix.granite}` : ""}`;
    const stage = group[0].stage;

    lineItems.push({
      stage,
      description: `Concrete volume placed (mix ${mixLabel})`,
      quantity: Number(totalVolumeM3.toFixed(2)),
      unit: "M3",
      sourceRefs,
    });

    const mixed = breakdownMix(
      totalVolumeM3 * (1 + WASTAGE.cementConcrete),
      mix,
      DRY_VOLUME_FACTOR.concrete
    );

    lineItems.push({
      stage,
      description: `Cement for concrete (mix ${mixLabel})`,
      quantity: Math.ceil(mixed.cementBags),
      unit: "BAG",
      materialCode: "CEMENT_50KG_BAG",
      sourceRefs,
    });
    lineItems.push({
      stage,
      description: `Sharp sand for concrete (mix ${mixLabel})`,
      quantity: Number(mixed.sandM3.toFixed(2)),
      unit: "M3",
      materialCode: "SHARP_SAND",
      sourceRefs,
    });
    if (mix.granite) {
      lineItems.push({
        stage,
        description: `Granite chippings for concrete (mix ${mixLabel})`,
        quantity: Number(mixed.graniteM3.toFixed(2)),
        unit: "M3",
        materialCode: "GRANITE",
        sourceRefs,
      });
    }
  }

  return lineItems;
}
