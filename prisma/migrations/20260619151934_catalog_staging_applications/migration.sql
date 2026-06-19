-- CreateEnum
CREATE TYPE "CatalogSourceType" AS ENUM ('OFFICIAL_EPC', 'OFFICIAL_PUBLIC_CATALOG', 'OFFICIAL_DEALER_PUBLIC_CATALOG', 'AUTHORIZED_DEALER', 'REFERENCE_ONLY');

-- CreateEnum
CREATE TYPE "CatalogNodeApplicability" AS ENUM ('APPLICABLE', 'NOT_APPLICABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CatalogApplicationType" AS ENUM ('OEM_REPLACEMENT', 'OEM_SERVICE_ITEM', 'SPECIFICATION_ONLY', 'COMPATIBLE_AFTERMARKET', 'COMMUNITY_REPORTED');

-- CreateEnum
CREATE TYPE "CatalogReviewStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'MANUAL_APPROVED', 'REJECTED', 'DUPLICATE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CatalogConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CatalogMarket" AS ENUM ('US', 'EU', 'RU', 'GLOBAL');

-- AlterEnum
ALTER TYPE "ImportBatchType" ADD VALUE 'PARTS_STAGING';

-- AlterTable
ALTER TABLE "part_fitments" ADD COLUMN     "applicationType" "CatalogApplicationType",
ADD COLUMN     "catalogConfidence" "CatalogConfidence",
ADD COLUMN     "primaryApplicationId" TEXT,
ADD COLUMN     "safetyCritical" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "part_skus" ADD COLUMN     "catalogCategory" TEXT,
ADD COLUMN     "defaultQuantity" INTEGER;

-- CreateTable
CREATE TABLE "catalog_sources" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" "CatalogSourceType" NOT NULL,
    "sourceRegion" "CatalogMarket" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_catalog_applications" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelFamily" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "generationCode" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER,
    "market" "CatalogMarket" NOT NULL,
    "motorcycleBrandId" TEXT,
    "motorcycleModelFamilyId" TEXT,
    "motorcycleVariantId" TEXT,
    "motorcycleGenerationId" TEXT,
    "partManufacturer" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "normalizedPartNumber" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partCategory" TEXT NOT NULL,
    "isOem" BOOLEAN NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeApplicability" "CatalogNodeApplicability" NOT NULL,
    "applicationType" "CatalogApplicationType" NOT NULL,
    "safetyCritical" BOOLEAN NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "diagramName" TEXT,
    "diagramPosition" TEXT,
    "rawQuantity" TEXT,
    "rawNotes" TEXT,
    "parsedAt" TIMESTAMP(3) NOT NULL,
    "reviewStatus" "CatalogReviewStatus" NOT NULL,
    "confidence" "CatalogConfidence" NOT NULL,
    "importBatch" TEXT NOT NULL,
    "stagingRowKey" TEXT NOT NULL,
    "promotedSkuId" TEXT,
    "promotedFitmentId" TEXT,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_catalog_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sources_sourceName_sourceType_sourceRegion_baseUrl_key" ON "catalog_sources"("sourceName", "sourceType", "sourceRegion", "baseUrl");

-- CreateIndex
CREATE INDEX "part_catalog_applications_reviewStatus_brand_idx" ON "part_catalog_applications"("reviewStatus", "brand");

-- CreateIndex
CREATE INDEX "part_catalog_applications_nodeId_motorcycleGenerationId_idx" ON "part_catalog_applications"("nodeId", "motorcycleGenerationId");

-- CreateIndex
CREATE INDEX "part_catalog_applications_importBatch_idx" ON "part_catalog_applications"("importBatch");

-- CreateIndex
CREATE UNIQUE INDEX "part_catalog_applications_stagingRowKey_importBatch_key" ON "part_catalog_applications"("stagingRowKey", "importBatch");

-- CreateIndex
CREATE INDEX "part_fitments_primaryApplicationId_idx" ON "part_fitments"("primaryApplicationId");

-- AddForeignKey
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_primaryApplicationId_fkey" FOREIGN KEY ("primaryApplicationId") REFERENCES "part_catalog_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "catalog_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_motorcycleBrandId_fkey" FOREIGN KEY ("motorcycleBrandId") REFERENCES "motorcycle_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_motorcycleModelFamilyId_fkey" FOREIGN KEY ("motorcycleModelFamilyId") REFERENCES "motorcycle_model_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_motorcycleVariantId_fkey" FOREIGN KEY ("motorcycleVariantId") REFERENCES "motorcycle_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_motorcycleGenerationId_fkey" FOREIGN KEY ("motorcycleGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_promotedSkuId_fkey" FOREIGN KEY ("promotedSkuId") REFERENCES "part_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_catalog_applications" ADD CONSTRAINT "part_catalog_applications_promotedFitmentId_fkey" FOREIGN KEY ("promotedFitmentId") REFERENCES "part_fitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
