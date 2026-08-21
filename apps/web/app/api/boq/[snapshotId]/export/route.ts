import { NextResponse } from "next/server";
import { prisma } from "@konstria/db";
import { generateBoqWorkbookBuffer } from "@konstria/excel-export";
import type { BOQSnapshotExport } from "@konstria/shared-types";
import { ensureAccount } from "../../../../../lib/ensureAccount.js";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { snapshotId } = await params;
  const user = await ensureAccount();

  const snapshot = await prisma.bOQSnapshot.findFirst({
    where: { id: snapshotId, project: { organizationId: user.organizationId } },
    include: { project: true, ruleEngineVersion: true, lineItems: true },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const exportData: BOQSnapshotExport = {
    projectName: snapshot.project.name,
    region: snapshot.project.region,
    currency: snapshot.currency,
    generatedAt: snapshot.generatedAt.toISOString(),
    ruleEngineVersion: snapshot.ruleEngineVersion.versionTag,
    lineItems: snapshot.lineItems.map((item) => ({
      stage: item.stage,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitRate: item.unitRate,
      provenanceLabel: item.provenanceLabel,
      asOfDate: item.asOfDate ? item.asOfDate.toISOString().slice(0, 10) : null,
      amount: item.amount,
    })),
  };

  const buffer = await generateBoqWorkbookBuffer(exportData);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${snapshot.project.name.replace(/[^a-z0-9]+/gi, "-")}-BOQ-v${snapshot.version}.xlsx"`,
    },
  });
}
