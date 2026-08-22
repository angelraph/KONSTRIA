import { prisma } from "@konstria/db";
import { ensureAccount } from "./ensureAccount.js";

export async function requireProjectAccess(projectId: string) {
  const user = await ensureAccount();
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, organizationId: user.organizationId },
  });
  return { user, project };
}
