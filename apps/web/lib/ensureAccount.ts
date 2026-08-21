import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@konstria/db";

/**
 * JIT account provisioning: the first time a signed-in Clerk user hits a
 * protected page, create their Organization (in both Clerk and our own
 * tables, sharing the same id) and User row. Every later call is a single
 * lookup. Avoids requiring the user to click through Clerk's own
 * organization-creation UI, and avoids depending on a webhook endpoint
 * (which needs a public URL Clerk can reach) for local development.
 */
export async function ensureAccount() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("ensureAccount called without an authenticated session");
  }

  const existing = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Signed-in Clerk user has no email address");
  }

  const client = await clerkClient();
  const orgName = clerkUser?.firstName ? `${clerkUser.firstName}'s Organization` : "My Organization";
  const clerkOrg = await client.organizations.createOrganization({ name: orgName, createdBy: userId });

  return prisma.$transaction(async (tx) => {
    await tx.organization.create({ data: { id: clerkOrg.id, name: clerkOrg.name } });
    return tx.user.create({
      data: {
        clerkUserId: userId,
        organizationId: clerkOrg.id,
        email,
        name: clerkUser?.fullName ?? undefined,
        role: "OWNER",
      },
    });
  });
}
