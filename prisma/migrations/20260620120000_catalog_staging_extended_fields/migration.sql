-- CreateEnum
CREATE TYPE "CatalogEvidenceLevel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "CatalogVerificationRegion" AS ENUM ('US', 'EU', 'RU', 'GLOBAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CatalogRegionMatchStatus" AS ENUM ('TARGET_REGION_MATCH', 'CROSS_REGION_MATCH', 'REGION_MISMATCH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CatalogSupersessionStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'POSSIBLY_SUPERSEDED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "catalog_sources" ADD COLUMN "sourceKey" TEXT;

-- AlterTable
ALTER TABLE "part_catalog_applications" ADD COLUMN "sourceKey" TEXT,
ADD COLUMN "sourceModelCode" TEXT,
ADD COLUMN "sourceYear" INTEGER,
ADD COLUMN "verificationRegion" "CatalogVerificationRegion",
ADD COLUMN "evidenceLevel" "CatalogEvidenceLevel",
ADD COLUMN "regionMatchStatus" "CatalogRegionMatchStatus",
ADD COLUMN "supersessionStatus" "CatalogSupersessionStatus",
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "parserVersion" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sources_sourceKey_key" ON "catalog_sources"("sourceKey");
