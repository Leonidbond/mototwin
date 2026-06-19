#!/usr/bin/env tsx
/**
 * Wipe catalog/staging parts tables and re-import parts-staging.csv.
 *
 * Run: tsx scripts/parts/reset-local-catalog.ts --file data/parts/bmw/r-1300-gs/parts-staging.csv [--promote]
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { importPartsStagingRows } from "../../src/lib/catalog-staging/import-core";
import { approveAndPromoteCatalogApplication } from "../../src/lib/catalog-staging/promote";

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function parseArgs(argv: string[]) {
  let file: string | null = null;
  let promote = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--file" && argv[i + 1]) file = argv[++i]!;
    else if (arg === "--promote") promote = true;
    else if (!arg.startsWith("-") && !file) file = arg;
  }
  if (!file) {
    throw new Error("Usage: tsx scripts/parts/reset-local-catalog.ts --file <parts-staging.csv> [--promote]");
  }
  return { file, promote };
}

function loadCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(path.resolve(filePath), "utf8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((e) => e.message).join("; "));
  }
  return parsed.data;
}

async function purgeCatalogParts(prisma: PrismaClient): Promise<void> {
  const counts = {
    fitmentPrimaryNulled: 0,
    catalogApplications: 0,
    wishlistSkuNulled: 0,
    offers: 0,
    numbers: 0,
    nodeLinks: 0,
    fitments: 0,
    skus: 0,
    orphanMasters: 0,
    catalogSources: 0,
  };

  await prisma.$transaction(async (tx) => {
    const fitmentPrimary = await tx.partFitment.updateMany({
      data: { primaryApplicationId: null },
      where: { primaryApplicationId: { not: null } },
    });
    counts.fitmentPrimaryNulled = fitmentPrimary.count;

    const apps = await tx.partCatalogApplication.deleteMany();
    counts.catalogApplications = apps.count;

    const wishlist = await tx.partWishlistItem.updateMany({
      data: { skuId: null },
      where: { skuId: { not: null } },
    });
    counts.wishlistSkuNulled = wishlist.count;

    counts.offers = (await tx.partOffer.deleteMany()).count;
    counts.numbers = (await tx.partNumber.deleteMany()).count;
    counts.nodeLinks = (await tx.partSkuNodeLink.deleteMany()).count;
    counts.fitments = (await tx.partFitment.deleteMany()).count;
    counts.skus = (await tx.partSku.deleteMany()).count;

    counts.orphanMasters = (
      await tx.partMaster.deleteMany({
        where: {
          skus: { none: {} },
          fitmentReports: { none: {} },
          fitmentConfidences: { none: {} },
        },
      })
    ).count;

    counts.catalogSources = (await tx.catalogSource.deleteMany()).count;
  });

  console.log("Purged catalog data:", counts);
}

async function promoteImportedApplications(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.partCatalogApplication.findMany({
    where: {
      reviewStatus: { in: ["NEW", "NEEDS_REVIEW", "NOT_APPLICABLE"] },
    },
    select: { id: true, partName: true, partNumber: true, nodeApplicability: true },
    orderBy: { stagingRowKey: "asc" },
  });

  let promoted = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await approveAndPromoteCatalogApplication(prisma, row.id);
      promoted += 1;
      console.log(`PROMOTED ${row.partNumber || row.partName} (${row.nodeApplicability})`);
    } catch (error) {
      failed += 1;
      console.error(
        `FAIL ${row.partNumber || row.partName}: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  console.log(`Promote summary: ok=${promoted} failed=${failed} total=${rows.length}`);
  if (failed > 0) process.exit(1);
}

async function main() {
  const { file, promote } = parseArgs(process.argv.slice(2));
  const rows = loadCsv(file);
  const prisma = createPrisma();

  try {
    await purgeCatalogParts(prisma);

    const { summary, rowResults } = await importPartsStagingRows(prisma, rows, {
      importBatch: `cli-${new Date().toISOString().slice(0, 10)}`,
      dryRun: false,
      autoPromoteApproved: false,
    });

    console.log(
      `Import ${path.resolve(file)}: total=${summary.total} created=${summary.created} ` +
        `updated=${summary.updated} errors=${summary.errors}`
    );

    const errors = rowResults.filter((r) => r.status === "error");
    if (errors.length > 0) {
      for (const err of errors.slice(0, 10)) {
        console.error(`  row ${err.rowIndex}: ${err.errorMessage}`);
      }
      process.exit(1);
    }

    if (promote) {
      await promoteImportedApplications(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
