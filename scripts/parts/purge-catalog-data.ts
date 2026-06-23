#!/usr/bin/env tsx
/**
 * Wipe parts catalog + fitment/compatibility data (no re-import).
 *
 * Run: npx tsx scripts/parts/purge-catalog-data.ts [--dry-run]
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

type Countable = { count: (args?: unknown) => Promise<number> };
type Deletable = {
  deleteMany: (args?: unknown) => Promise<{ count: number }>;
  updateMany?: (args: unknown) => Promise<{ count: number }>;
};

function delegate<T>(prisma: unknown, key: string): T | null {
  const model = (prisma as Record<string, T | undefined>)[key];
  return model ?? null;
}

async function countSnapshot(prisma: PrismaClient) {
  const count = async (key: string) => {
    const model = delegate<Countable>(prisma, key);
    return model ? await model.count() : 0;
  };

  const wishlist = delegate<Countable>(prisma, "partWishlistItem");

  return {
    partCatalogApplication: await count("partCatalogApplication"),
    catalogSource: await count("catalogSource"),
    partFitment: await count("partFitment"),
    partSku: await count("partSku"),
    partMaster: await count("partMaster"),
    partAlias: await count("partAlias"),
    partOffer: await count("partOffer"),
    partNumber: await count("partNumber"),
    partSkuNodeLink: await count("partSkuNodeLink"),
    fitmentReport: await count("fitmentReport"),
    fitmentEvidence: await count("fitmentEvidence"),
    fitmentVote: await count("fitmentVote"),
    fitmentConfidence: await count("fitmentConfidence"),
    wishlistSkuLinked: wishlist
      ? await prisma.partWishlistItem.count({ where: { skuId: { not: null } } })
      : 0,
  };
}

async function purgeCatalogData(prisma: PrismaClient) {
  const counts: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    const fitment = delegate<Deletable>(tx, "partFitment");
    if (fitment?.updateMany) {
      try {
        counts.fitmentPrimaryNulled = (
          await fitment.updateMany({
            data: { primaryApplicationId: null },
            where: { primaryApplicationId: { not: null } },
          })
        ).count;
      } catch {
        counts.fitmentPrimaryNulled = 0;
      }
    }

    const apps = delegate<Deletable>(tx, "partCatalogApplication");
    counts.partCatalogApplication = apps ? (await apps.deleteMany()).count : 0;

    const wishlist = delegate<Deletable>(tx, "partWishlistItem");
    counts.wishlistSkuNulled = wishlist?.updateMany
      ? (
          await wishlist.updateMany({
            data: { skuId: null },
            where: { skuId: { not: null } },
          })
        ).count
      : 0;

    const del = async (key: string) => {
      const model = delegate<Deletable>(tx, key);
      counts[key] = model ? (await model.deleteMany()).count : 0;
    };

    await del("fitmentVote");
    await del("fitmentEvidence");
    await del("fitmentReport");
    await del("fitmentConfidence");
    await del("partOffer");
    await del("partNumber");
    await del("partSkuNodeLink");
    await del("partFitment");
    await del("partSku");
    await del("partAlias");
    await del("partMaster");
    await del("catalogSource");
  });

  return counts;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = createPrisma();

  try {
    const before = await countSnapshot(prisma);
    console.log("Before:", before);

    if (dryRun) {
      console.log("Dry run — no rows deleted.");
      return;
    }

    const deleted = await purgeCatalogData(prisma);
    console.log("Deleted:", deleted);

    const after = await countSnapshot(prisma);
    console.log("After:", after);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
