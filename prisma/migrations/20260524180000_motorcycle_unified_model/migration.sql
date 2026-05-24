-- Unified MotoTwin motorcycle model standard.
-- Replaces legacy Brand/Model/ModelVariant with the canonical 4-level hierarchy
-- MotorcycleBrand -> MotorcycleModelFamily -> MotorcycleVariant -> MotorcycleGeneration
-- plus a 1:1 MotorcycleTechnicalSpecs sidecar.
-- See docs/models/mototwin_model_technical_master_standard_cursor.md.

-- ============================================================================
-- 1) WIPE: dev-only — truncate the legacy catalog plus every table whose data
--    becomes meaningless once vehicles/part_fitments/fitment_* are rebuilt.
--    CASCADE handles all FK-dependent rows (service_events, ride_profiles,
--    notifications, expense_items, etc.).
-- ============================================================================

TRUNCATE TABLE
  "fitment_evidence",
  "fitment_votes",
  "fitment_reports",
  "fitment_confidence",
  "part_fitments",
  "vehicles",
  "model_variants",
  "models",
  "brands"
RESTART IDENTITY CASCADE;

-- ============================================================================
-- 2) Drop legacy FKs / indexes / columns / tables.
-- ============================================================================

-- DropForeignKey
ALTER TABLE "fitment_confidence" DROP CONSTRAINT "fitment_confidence_modelVariantId_fkey";
ALTER TABLE "fitment_reports" DROP CONSTRAINT "fitment_reports_modelVariantId_fkey";
ALTER TABLE "model_variants" DROP CONSTRAINT "model_variants_modelId_fkey";
ALTER TABLE "models" DROP CONSTRAINT "models_brandId_fkey";
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_brandId_fkey";
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_modelId_fkey";
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_modelVariantId_fkey";

-- DropIndex
DROP INDEX "fitment_confidence_modelVariantId_nodeId_idx";
DROP INDEX "fitment_confidence_partMasterId_modelVariantId_nodeId_key";
DROP INDEX "fitment_reports_partMasterId_modelVariantId_nodeId_idx";
DROP INDEX "part_fitments_brandId_idx";
DROP INDEX "part_fitments_modelId_idx";
DROP INDEX "part_fitments_modelVariantId_idx";
DROP INDEX "vehicles_brandId_modelId_modelVariantId_idx";

-- AlterTable: legacy column removal
ALTER TABLE "fitment_confidence" DROP COLUMN "modelVariantId";
ALTER TABLE "fitment_reports" DROP COLUMN "modelVariantId";
ALTER TABLE "part_fitments"
  DROP COLUMN "brandId",
  DROP COLUMN "modelId",
  DROP COLUMN "modelVariantId",
  DROP COLUMN "yearFrom",
  DROP COLUMN "yearTo";
ALTER TABLE "vehicles"
  DROP COLUMN "brandId",
  DROP COLUMN "modelId",
  DROP COLUMN "modelVariantId";

-- DropTable
DROP TABLE "model_variants";
DROP TABLE "models";
DROP TABLE "brands";

-- ============================================================================
-- 3) Replace ModelSupportLevel enum (Postgres can't remove values in-place).
--    No remaining users reference it (model_variants is dropped above).
-- ============================================================================

DROP TYPE "ModelSupportLevel";
CREATE TYPE "ModelSupportLevel" AS ENUM ('MVP_CORE', 'MVP_CORE_LEGACY', 'COMMUNITY_SUPPORT', 'EARLY_BETA', 'NO_FITMENT_DATA_YET');

-- ============================================================================
-- 4) New technical-master enums.
-- ============================================================================

CREATE TYPE "MotoDriveType" AS ENUM ('CHAIN', 'SHAFT', 'BELT', 'UNKNOWN');
CREATE TYPE "MotoPowerUnit" AS ENUM ('hp', 'PS', 'kW');
CREATE TYPE "MotoMarketRegion" AS ENUM ('GLOBAL', 'EU', 'US', 'RU', 'OTHER');
CREATE TYPE "MotoWeightType" AS ENUM ('dry', 'wet', 'curb', 'fully_fueled', 'without_fuel', 'unknown');

-- ============================================================================
-- 5) New motorcycle_* tables.
-- ============================================================================

-- CreateTable
CREATE TABLE "motorcycle_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_model_families" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_model_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_variants" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_generations" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER,
    "yearsLabel" TEXT NOT NULL,
    "marketRegion" "MotoMarketRegion" NOT NULL,
    "segment" TEXT NOT NULL,
    "supportLevel" "ModelSupportLevel" NOT NULL DEFAULT 'EARLY_BETA',
    "supportLevelReason" TEXT,
    "dataStatus" TEXT NOT NULL,
    "comment" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_technical_specs" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "displacementCc" DOUBLE PRECISION,
    "displacementIsApprox" BOOLEAN NOT NULL DEFAULT false,
    "powerValue" DOUBLE PRECISION,
    "powerUnit" "MotoPowerUnit",
    "powerHpNormalized" DOUBLE PRECISION,
    "powerIsApprox" BOOLEAN NOT NULL DEFAULT false,
    "torqueNm" DOUBLE PRECISION,
    "torqueIsApprox" BOOLEAN NOT NULL DEFAULT false,
    "gearbox" TEXT,
    "drive" "MotoDriveType" NOT NULL,
    "frontWheelIn" DOUBLE PRECISION,
    "rearWheelIn" DOUBLE PRECISION,
    "frontTire" TEXT,
    "rearTire" TEXT,
    "fuelLiters" DOUBLE PRECISION,
    "fuelIsApprox" BOOLEAN NOT NULL DEFAULT false,
    "weightKg" DOUBLE PRECISION,
    "weightType" "MotoWeightType",
    "seatMm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motorcycle_technical_specs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motorcycle_brands_name_key" ON "motorcycle_brands"("name");
CREATE UNIQUE INDEX "motorcycle_brands_slug_key" ON "motorcycle_brands"("slug");
CREATE UNIQUE INDEX "motorcycle_model_families_brandId_slug_key" ON "motorcycle_model_families"("brandId", "slug");
CREATE UNIQUE INDEX "motorcycle_variants_familyId_slug_key" ON "motorcycle_variants"("familyId", "slug");
CREATE UNIQUE INDEX "motorcycle_generations_variantId_name_yearFrom_yearTo_key" ON "motorcycle_generations"("variantId", "name", "yearFrom", "yearTo");
CREATE INDEX "motorcycle_generations_yearFrom_yearTo_idx" ON "motorcycle_generations"("yearFrom", "yearTo");
CREATE INDEX "motorcycle_generations_supportLevel_idx" ON "motorcycle_generations"("supportLevel");
CREATE UNIQUE INDEX "motorcycle_technical_specs_generationId_key" ON "motorcycle_technical_specs"("generationId");
CREATE INDEX "motorcycle_technical_specs_drive_idx" ON "motorcycle_technical_specs"("drive");
CREATE INDEX "motorcycle_technical_specs_frontWheelIn_rearWheelIn_idx" ON "motorcycle_technical_specs"("frontWheelIn", "rearWheelIn");
CREATE INDEX "motorcycle_technical_specs_displacementCc_idx" ON "motorcycle_technical_specs"("displacementCc");

-- AddForeignKey: motorcycle_* hierarchy
ALTER TABLE "motorcycle_model_families" ADD CONSTRAINT "motorcycle_model_families_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "motorcycle_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "motorcycle_variants" ADD CONSTRAINT "motorcycle_variants_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "motorcycle_model_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "motorcycle_generations" ADD CONSTRAINT "motorcycle_generations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "motorcycle_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "motorcycle_technical_specs" ADD CONSTRAINT "motorcycle_technical_specs_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "motorcycle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 6) Wire vehicles, part_fitments, fitment_reports, fitment_confidence to the new hierarchy.
--    Tables are empty after the wipe step, so NOT NULL columns can be added directly.
-- ============================================================================

-- AlterTable: vehicles
ALTER TABLE "vehicles"
  ADD COLUMN "motorcycleBrandId" TEXT NOT NULL,
  ADD COLUMN "motorcycleModelFamilyId" TEXT NOT NULL,
  ADD COLUMN "motorcycleVariantId" TEXT NOT NULL,
  ADD COLUMN "motorcycleGenerationId" TEXT NOT NULL;

CREATE INDEX "vehicles_motorcycleBrandId_motorcycleModelFamilyId_motorcyc_idx" ON "vehicles"("motorcycleBrandId", "motorcycleModelFamilyId", "motorcycleVariantId", "motorcycleGenerationId");

ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_motorcycleBrandId_fkey" FOREIGN KEY ("motorcycleBrandId") REFERENCES "motorcycle_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_motorcycleModelFamilyId_fkey" FOREIGN KEY ("motorcycleModelFamilyId") REFERENCES "motorcycle_model_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_motorcycleVariantId_fkey" FOREIGN KEY ("motorcycleVariantId") REFERENCES "motorcycle_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_motorcycleGenerationId_fkey" FOREIGN KEY ("motorcycleGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: part_fitments
ALTER TABLE "part_fitments"
  ADD COLUMN "motorcycleBrandId" TEXT,
  ADD COLUMN "motorcycleModelFamilyId" TEXT,
  ADD COLUMN "motorcycleVariantId" TEXT,
  ADD COLUMN "motorcycleGenerationId" TEXT;

CREATE INDEX "part_fitments_motorcycleBrandId_idx" ON "part_fitments"("motorcycleBrandId");
CREATE INDEX "part_fitments_motorcycleModelFamilyId_idx" ON "part_fitments"("motorcycleModelFamilyId");
CREATE INDEX "part_fitments_motorcycleVariantId_idx" ON "part_fitments"("motorcycleVariantId");
CREATE INDEX "part_fitments_motorcycleGenerationId_idx" ON "part_fitments"("motorcycleGenerationId");

ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_motorcycleBrandId_fkey" FOREIGN KEY ("motorcycleBrandId") REFERENCES "motorcycle_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_motorcycleModelFamilyId_fkey" FOREIGN KEY ("motorcycleModelFamilyId") REFERENCES "motorcycle_model_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_motorcycleVariantId_fkey" FOREIGN KEY ("motorcycleVariantId") REFERENCES "motorcycle_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_motorcycleGenerationId_fkey" FOREIGN KEY ("motorcycleGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: fitment_reports
ALTER TABLE "fitment_reports" ADD COLUMN "motorcycleGenerationId" TEXT NOT NULL;
CREATE INDEX "fitment_reports_partMasterId_motorcycleGenerationId_nodeId_idx" ON "fitment_reports"("partMasterId", "motorcycleGenerationId", "nodeId");
ALTER TABLE "fitment_reports" ADD CONSTRAINT "fitment_reports_motorcycleGenerationId_fkey" FOREIGN KEY ("motorcycleGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: fitment_confidence
ALTER TABLE "fitment_confidence" ADD COLUMN "motorcycleGenerationId" TEXT NOT NULL;
CREATE INDEX "fitment_confidence_motorcycleGenerationId_nodeId_idx" ON "fitment_confidence"("motorcycleGenerationId", "nodeId");
CREATE UNIQUE INDEX "fitment_confidence_partMasterId_motorcycleGenerationId_node_key" ON "fitment_confidence"("partMasterId", "motorcycleGenerationId", "nodeId");
ALTER TABLE "fitment_confidence" ADD CONSTRAINT "fitment_confidence_motorcycleGenerationId_fkey" FOREIGN KEY ("motorcycleGenerationId") REFERENCES "motorcycle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
