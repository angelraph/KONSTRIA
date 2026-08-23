"use server";

import { redirect } from "next/navigation";
import { prisma } from "@konstria/db";
import { requireProjectAccess } from "../../../../../lib/requireProjectAccess.js";
import { getOrCreateTakeoffModel } from "../../../../../lib/getOrCreateTakeoffModel.js";
import { persistSnapshot } from "../../../../../lib/boq/persistSnapshot.js";

/**
 * Saves the rates a user typed in for materials that came back MISSING_PRICE,
 * as general (all-projects) UserRateOverride rows, then regenerates the BOQ
 * so the new total reflects them immediately. The prior snapshot is left
 * untouched (snapshots are immutable) — this always creates a new version.
 */
export async function saveRatesAndRegenerate(projectId: string, formData: FormData) {
  const { user, project } = await requireProjectAccess(projectId);

  const entries: { materialCanonicalId: string; amount: number; unit: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("rate:")) continue;
    const amount = Number(value);
    if (!(amount > 0)) continue;
    const materialCanonicalId = key.slice("rate:".length);
    const unit = String(formData.get(`unit:${materialCanonicalId}`) ?? "");
    entries.push({ materialCanonicalId, amount, unit });
  }

  for (const entry of entries) {
    const existing = await prisma.userRateOverride.findFirst({
      where: { userId: user.id, materialCanonicalId: entry.materialCanonicalId, projectId: null },
    });
    if (existing) {
      await prisma.userRateOverride.update({
        where: { id: existing.id },
        data: { amount: entry.amount, unit: entry.unit },
      });
    } else {
      await prisma.userRateOverride.create({
        data: {
          userId: user.id,
          organizationId: project.organizationId,
          materialCanonicalId: entry.materialCanonicalId,
          projectId: null,
          amount: entry.amount,
          unit: entry.unit,
        },
      });
    }
  }

  const takeoff = await getOrCreateTakeoffModel(projectId);
  const snapshot = await persistSnapshot(takeoff.id, user.id);
  redirect(`/projects/${projectId}/boq/${snapshot.id}`);
}
