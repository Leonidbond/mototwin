CREATE TYPE "ModelSupportLevel" AS ENUM (
  'FULL_SUPPORT',
  'COMMUNITY_SUPPORT',
  'EARLY_BETA',
  'NO_DATA',
  'UNSUPPORTED'
);

ALTER TABLE "model_variants"
  ADD COLUMN "supportLevel" "ModelSupportLevel",
  ADD COLUMN "supportLevelReason" TEXT;
