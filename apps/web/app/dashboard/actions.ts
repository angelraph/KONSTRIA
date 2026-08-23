"use server";

import { redirect } from "next/navigation";
import { prisma } from "@konstria/db";
import { ensureAccount } from "../../lib/ensureAccount.js";

export async function createProject(formData: FormData) {
  const user = await ensureAccount();

  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  if (!name || !region) {
    throw new Error("Project name and region are required");
  }

  const project = await prisma.project.create({
    data: {
      organizationId: user.organizationId,
      ownerUserId: user.id,
      name,
      region,
    },
  });

  redirect(`/projects/${project.id}/upload`);
}
