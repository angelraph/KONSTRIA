import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __konstriaPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__konstriaPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__konstriaPrisma = prisma;
}

export * from "@prisma/client";
