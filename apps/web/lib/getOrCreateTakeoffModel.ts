import { prisma } from "@konstria/db";

export async function getOrCreateTakeoffModel(projectId: string) {
  const existing = await prisma.takeoffModel.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (existing) return existing;

  return prisma.takeoffModel.create({
    data: {
      projectId,
      inputMethod: "MANUAL",
      status: "DRAFT",
    },
  });
}
