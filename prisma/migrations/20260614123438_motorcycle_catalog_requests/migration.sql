-- CreateEnum
CREATE TYPE "MotorcycleCatalogRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CATALOG_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CATALOG_REQUEST_REJECTED';

-- AlterTable
ALTER TABLE "motorcycle_brands" ADD COLUMN     "isCatalogPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "pendingCatalogRequestId" TEXT;

-- CreateTable
CREATE TABLE "motorcycle_catalog_requests" (
    "id" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "status" "MotorcycleCatalogRequestStatus" NOT NULL DEFAULT 'PENDING',
    "motorcycleBrandId" TEXT,
    "motorcycleModelFamilyId" TEXT,
    "brandName" TEXT,
    "familyName" TEXT,
    "variantName" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER,
    "userComment" TEXT,
    "resolvedBrandName" TEXT,
    "resolvedFamilyName" TEXT,
    "resolvedVariantName" TEXT,
    "resolvedYearFrom" INTEGER,
    "resolvedYearTo" INTEGER,
    "moderationComment" TEXT,
    "resolvedGenerationId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_catalog_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "motorcycle_catalog_requests_submittedByUserId_status_idx" ON "motorcycle_catalog_requests"("submittedByUserId", "status");

-- CreateIndex
CREATE INDEX "motorcycle_catalog_requests_status_createdAt_idx" ON "motorcycle_catalog_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "vehicles_pendingCatalogRequestId_idx" ON "vehicles"("pendingCatalogRequestId");

-- AddForeignKey
ALTER TABLE "motorcycle_catalog_requests" ADD CONSTRAINT "motorcycle_catalog_requests_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle_catalog_requests" ADD CONSTRAINT "motorcycle_catalog_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle_catalog_requests" ADD CONSTRAINT "motorcycle_catalog_requests_motorcycleBrandId_fkey" FOREIGN KEY ("motorcycleBrandId") REFERENCES "motorcycle_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle_catalog_requests" ADD CONSTRAINT "motorcycle_catalog_requests_motorcycleModelFamilyId_fkey" FOREIGN KEY ("motorcycleModelFamilyId") REFERENCES "motorcycle_model_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle_catalog_requests" ADD CONSTRAINT "motorcycle_catalog_requests_resolvedGenerationId_fkey" FOREIGN KEY ("resolvedGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_pendingCatalogRequestId_fkey" FOREIGN KEY ("pendingCatalogRequestId") REFERENCES "motorcycle_catalog_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
