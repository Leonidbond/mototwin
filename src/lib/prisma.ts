import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString });

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter });
}

/**
 * In dev, Next keeps `globalThis.prisma` across restarts/HMR while `@prisma/client`
 * is regenerated after `prisma generate`. A stale singleton then misses new model
 * delegates (`prisma.userServiceEventFormTemplate` → undefined → ".create" errors).
 */
function getOrCreatePrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const delegateMissing =
    !cached ||
    typeof (cached as { userServiceEventFormTemplate?: { create?: unknown } }).userServiceEventFormTemplate
      ?.create !== "function";

  if (!delegateMissing && cached) {
    return cached;
  }

  if (cached && process.env.NODE_ENV !== "production") {
    void cached.$disconnect().catch(() => undefined);
  }

  const next = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = next;
  }
  return next;
}

export const prisma = getOrCreatePrisma();