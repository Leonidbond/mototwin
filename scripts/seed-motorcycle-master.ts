/**
 * Upserts motorcycle catalog rows from prisma/seed-data/*-model-technical-master.csv.
 * Safe to run on production after `prisma migrate deploy` (idempotent upserts).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  listMotorcycleTechnicalMasterCsvFiles,
  loadMotorcycleTechnicalMaster,
} from "../prisma/seed-data/loaders/load-motorcycle-technical-master";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const files = await listMotorcycleTechnicalMasterCsvFiles();
  console.log(`Motorcycle master seed: ${files.length} CSV file(s)`);
  console.log(files.join(", "));
  const stats = await loadMotorcycleTechnicalMaster(prisma);
  console.log("Motorcycle master seed completed:", stats);
}

main()
  .catch((error) => {
    console.error("Motorcycle master seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
