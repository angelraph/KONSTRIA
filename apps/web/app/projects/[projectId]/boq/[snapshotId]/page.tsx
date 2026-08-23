import Link from "next/link";
import { prisma } from "@konstria/db";
import { ensureAccount } from "../../../../../lib/ensureAccount.js";
import AppHeader from "../../../../../components/AppHeader.js";
import { saveRatesAndRegenerate } from "./actions.js";

function formatNaira(amount: number | null): string {
  if (amount === null) return "-";
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default async function BOQPage({
  params,
}: PageProps<"/projects/[projectId]/boq/[snapshotId]">) {
  const { projectId, snapshotId } = await params;
  const user = await ensureAccount();

  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, organizationId: user.organizationId },
  });

  const snapshot = await prisma.bOQSnapshot.findFirstOrThrow({
    where: { id: snapshotId, projectId },
    include: { lineItems: { include: { materialCanonical: true } }, ruleEngineVersion: true },
  });

  const byStage = new Map<string, typeof snapshot.lineItems>();
  for (const item of snapshot.lineItems) {
    const list = byStage.get(item.stage) ?? [];
    list.push(item);
    byStage.set(item.stage, list);
  }

  const grandTotal = snapshot.lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const hasMissingPrices = snapshot.lineItems.some((item) => item.unitRateSourceType === "MISSING" && item.materialCanonicalId);

  const missingMaterials = new Map<string, { name: string; unit: string }>();
  for (const item of snapshot.lineItems) {
    if (item.unitRateSourceType === "MISSING" && item.materialCanonical) {
      missingMaterials.set(item.materialCanonical.id, {
        name: item.materialCanonical.name,
        unit: item.materialCanonical.unit,
      });
    }
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:underline">
        ← {project.name}
      </Link>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Bill of Quantities v{snapshot.version}</h1>
        <a
          href={`/api/boq/${snapshot.id}/export`}
          className="self-start rounded bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 sm:self-auto"
        >
          Export Excel
        </a>
      </div>
      <p className="text-sm text-zinc-500">
        {project.region} · generated {snapshot.generatedAt.toISOString().slice(0, 10)} · rule engine {snapshot.ruleEngineVersion.versionTag}
      </p>

      {hasMissingPrices && missingMaterials.size > 0 && (
        <form
          action={saveRatesAndRegenerate.bind(null, projectId)}
          className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
        >
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {missingMaterials.size} material{missingMaterials.size > 1 ? "s" : ""} below have no
            tracked price yet. Enter your own current rate for each and the estimate will refresh
            with a real total. Your rate is saved and reused on future estimates too.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {[...missingMaterials.entries()].map(([id, m]) => (
              <label key={id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-56 shrink-0">{m.name}</span>
                <span className="text-xs text-zinc-500">₦</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name={`rate:${id}`}
                  placeholder="0.00"
                  className="w-32 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <input type="hidden" name={`unit:${id}`} value={m.unit} />
                <span className="text-xs text-zinc-500">per {m.unit}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save rates and refresh estimate
          </button>
        </form>
      )}

      {[...byStage.entries()].map(([stage, items]) => (
        <section key={stage} className="mt-8">
          <h2 className="font-medium">{stage.replace(/_/g, " ")}</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2">Qty</th>
                  <th className="py-1 pr-2">Unit</th>
                  <th className="py-1 pr-2">Rate</th>
                  <th className="py-1 pr-2">Amount</th>
                  <th className="py-1 pr-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1 pr-2">{item.description}</td>
                    <td className="py-1 pr-2">{item.quantity}</td>
                    <td className="py-1 pr-2">{item.unit}</td>
                    <td className="py-1 pr-2">{item.unitRate !== null ? formatNaira(item.unitRate) : "-"}</td>
                    <td className="py-1 pr-2">{formatNaira(item.amount)}</td>
                    <td className="py-1 pr-2 text-xs text-zinc-500">{item.provenanceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="mt-8 flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="text-lg font-semibold">Grand total: {formatNaira(grandTotal)}</span>
      </div>
      </div>
    </>
  );
}
