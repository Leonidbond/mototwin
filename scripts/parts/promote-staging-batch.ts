#!/usr/bin/env tsx
/**
 * Approve and promote staging applications for a batch.
 * Run: npm run parts:promote-batch -- --batch <importBatchId>
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { approveAndPromoteCatalogApplication } from "../../src/lib/catalog-staging/promote";

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main() {
  const batchArg = process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--batch") + 1];
  if (!batchArg) throw new Error("Usage: npm run parts:promote-batch -- --batch <importBatchId>");

  const prisma = createPrisma();
  try {
    const rows = await prisma.partCatalogApplication.findMany({
      where: {
        importBatch: batchArg,
        reviewStatus: { in: ["NEW", "NEEDS_REVIEW"] },
        nodeApplicability: "APPLICABLE",
      },
      select: { id: true, partName: true, partNumber: true },
    });

    let promoted = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await approveAndPromoteCatalogApplication(prisma, row.id);
        promoted += 1;
        console.log(`OK  ${row.partNumber || row.partName}`);
      } catch (error) {
        failed += 1;
        console.error(
          `FAIL ${row.partNumber || row.partName}: ${error instanceof Error ? error.message : error}`
        );
      }
    }
    console.log(`Promoted ${promoted}, failed ${failed}, total ${rows.length}`);
    if (failed > 0) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
