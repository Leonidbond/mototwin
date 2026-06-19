#!/usr/bin/env tsx
/**
 * Import parts-staging.csv into PartCatalogApplication rows.
 *
 * Run: pnpm parts:import -- --file data/parts/bmw/r-1300-gs/parts-staging.csv [--dry-run] [--commit] [--batch <id>] [--auto-promote-approved]
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { importPartsStagingRows } from "../../src/lib/catalog-staging/import-core";

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function parseArgs(argv: string[]) {
  let file: string | null = null;
  let dryRun = true;
  let importBatch = `cli-${new Date().toISOString().slice(0, 10)}`;
  let autoPromoteApproved = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--file" && argv[i + 1]) {
      file = argv[++i]!;
    } else if (arg === "--batch" && argv[i + 1]) {
      importBatch = argv[++i]!;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--commit") {
      dryRun = false;
    } else if (arg === "--auto-promote-approved") {
      autoPromoteApproved = true;
    } else if (!arg.startsWith("-") && !file) {
      file = arg;
    }
  }

  if (!file) {
    throw new Error(
      "Usage: pnpm parts:import -- --file <path/to/parts-staging.csv> [--dry-run|--commit] [--batch <id>] [--auto-promote-approved]"
    );
  }

  return { file, dryRun, importBatch, autoPromoteApproved };
}

function loadCsv(filePath: string): Record<string, string>[] {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, "utf8");
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

async function main() {
  const { file, dryRun, importBatch, autoPromoteApproved } = parseArgs(process.argv.slice(2));
  const rows = loadCsv(file);
  const prisma = createPrisma();

  try {
    const { summary, rowResults } = await importPartsStagingRows(prisma, rows, {
      importBatch,
      dryRun,
      autoPromoteApproved,
    });

    console.log(
      `${dryRun ? "DRY-RUN" : "COMMIT"} ${path.resolve(file)} batch=${importBatch}: ` +
        `total=${summary.total} created=${summary.created} updated=${summary.updated} ` +
        `errors=${summary.errors} promoted=${summary.promoted}`
    );

    const warnings = rowResults.filter((r) => r.status === "warning");
    if (warnings.length > 0) {
      console.log(`Warnings (${warnings.length}):`);
      for (const w of warnings.slice(0, 10)) {
        console.log(`  row ${w.rowIndex}: ${w.resolveMessage ?? "partial resolve"}`);
      }
    }

    if (summary.errors > 0) {
      const errors = rowResults.filter((r) => r.status === "error").slice(0, 5);
      for (const err of errors) {
        console.error(`  row ${err.rowIndex}: ${err.errorMessage}`);
      }
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
