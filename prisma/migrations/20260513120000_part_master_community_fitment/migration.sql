-- PartMaster + community fitment (reports, evidence, votes, confidence) + wishlist source.

-- CreateEnum
CREATE TYPE "PartWishlistItemSource" AS ENUM ('RECOMMENDATION', 'USER_ADDED');

-- CreateEnum
CREATE TYPE "PartMasterSource" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PartMasterStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'MERGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FitmentReportResult" AS ENUM ('DIRECT_FIT', 'FIT_WITH_MODIFICATION', 'PARTIAL_FIT', 'DOES_NOT_FIT', 'OEM_REPLACEMENT');

-- CreateEnum
CREATE TYPE "FitmentInstallationStatus" AS ENUM ('INSTALLED', 'PURCHASED_NOT_INSTALLED', 'TESTED_NOT_INSTALLED');

-- CreateEnum
CREATE TYPE "FitmentReportModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'NEEDS_REVIEW', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "FitmentEvidenceType" AS ENUM ('PART_PHOTO', 'PACKAGING_PHOTO', 'INSTALLED_PHOTO', 'RECEIPT', 'SERVICE_EVENT');

-- CreateEnum
CREATE TYPE "FitmentVoteType" AS ENUM ('CONFIRM', 'REJECT', 'SAME_EXPERIENCE', 'DIFFERENT_EXPERIENCE', 'HELPFUL');

-- CreateEnum
CREATE TYPE "FitmentConfidenceStatus" AS ENUM ('VERIFIED_BY_MOTOTWIN', 'COMMUNITY_CONFIRMED', 'FITS_WITH_MODIFICATION', 'MIXED_REPORTS', 'LOW_CONFIDENCE', 'REJECTED_LIKELY_INCOMPATIBLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isModerator" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "part_masters" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandNormalized" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "normalizedSku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "aliasesJson" JSONB NOT NULL DEFAULT '[]',
    "source" "PartMasterSource" NOT NULL DEFAULT 'ADMIN',
    "status" "PartMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "part_masters_normalizedSku_brandNormalized_key" ON "part_masters"("normalizedSku", "brandNormalized");
CREATE INDEX "part_masters_brandNormalized_idx" ON "part_masters"("brandNormalized");
CREATE INDEX "part_masters_status_idx" ON "part_masters"("status");

ALTER TABLE "part_masters" ADD CONSTRAINT "part_masters_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "part_skus" ADD COLUMN "partMasterId" TEXT;

CREATE INDEX "part_skus_partMasterId_idx" ON "part_skus"("partMasterId");

ALTER TABLE "part_skus" ADD CONSTRAINT "part_skus_partMasterId_fkey" FOREIGN KEY ("partMasterId") REFERENCES "part_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "part_wishlist_items" ADD COLUMN "source" "PartWishlistItemSource" NOT NULL DEFAULT 'RECOMMENDATION';

CREATE INDEX "part_wishlist_items_source_idx" ON "part_wishlist_items"("source");

-- CreateTable
CREATE TABLE "fitment_reports" (
    "id" TEXT NOT NULL,
    "partMasterId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "modelVariantId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "fitmentResult" "FitmentReportResult" NOT NULL,
    "installationStatus" "FitmentInstallationStatus" NOT NULL,
    "modificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "modificationDetails" TEXT,
    "comment" TEXT,
    "installedAtMileage" INTEGER,
    "installedAtHours" INTEGER,
    "rideProfileSnapshot" JSONB,
    "rating" INTEGER,
    "serviceEventId" TEXT,
    "moderationStatus" "FitmentReportModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitment_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fitment_reports_partMasterId_modelVariantId_nodeId_idx" ON "fitment_reports"("partMasterId", "modelVariantId", "nodeId");
CREATE INDEX "fitment_reports_vehicleId_idx" ON "fitment_reports"("vehicleId");
CREATE INDEX "fitment_reports_moderationStatus_idx" ON "fitment_reports"("moderationStatus");
CREATE INDEX "fitment_reports_createdByUserId_idx" ON "fitment_reports"("createdByUserId");

ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_partMasterId_fkey" FOREIGN KEY ("partMasterId") REFERENCES "part_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_modelVariantId_fkey" FOREIGN KEY ("modelVariantId") REFERENCES "model_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_serviceEventId_fkey" FOREIGN KEY ("serviceEventId") REFERENCES "service_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "fitment_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "FitmentEvidenceType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitment_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fitment_evidence_reportId_idx" ON "fitment_evidence"("reportId");

ALTER TABLE "fitment_evidence" ADD CONSTRAINT "fitment_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "fitment_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "fitment_votes" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" "FitmentVoteType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitment_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fitment_votes_reportId_userId_key" ON "fitment_votes"("reportId", "userId");
CREATE INDEX "fitment_votes_reportId_idx" ON "fitment_votes"("reportId");
CREATE INDEX "fitment_votes_userId_idx" ON "fitment_votes"("userId");

ALTER TABLE "fitment_votes" ADD CONSTRAINT "fitment_votes_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "fitment_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_votes" ADD CONSTRAINT "fitment_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "fitment_confidence" (
    "id" TEXT NOT NULL,
    "partMasterId" TEXT NOT NULL,
    "modelVariantId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "confirmationCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "modificationCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FitmentConfidenceStatus" NOT NULL DEFAULT 'LOW_CONFIDENCE',
    "isStaffVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastRecalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitment_confidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fitment_confidence_partMasterId_modelVariantId_nodeId_key" ON "fitment_confidence"("partMasterId", "modelVariantId", "nodeId");
CREATE INDEX "fitment_confidence_modelVariantId_nodeId_idx" ON "fitment_confidence"("modelVariantId", "nodeId");

ALTER TABLE "fitment_confidence" ADD CONSTRAINT "fitment_confidence_partMasterId_fkey" FOREIGN KEY ("partMasterId") REFERENCES "part_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_confidence" ADD CONSTRAINT "fitment_confidence_modelVariantId_fkey" FOREIGN KEY ("modelVariantId") REFERENCES "model_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fitment_confidence" ADD CONSTRAINT "fitment_confidence_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
