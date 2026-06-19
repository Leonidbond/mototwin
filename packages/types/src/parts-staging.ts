/** Shared staging catalog enums — source of truth for CSV, Prisma, and UI. */

import type {
  EvidenceLevel,
  RegionMatchStatus,
  SupersessionStatus,
  VerificationRegion,
} from "./parts-catalog";

const PARTS_STAGING_BASE_COLUMNS = [
  "brand",
  "model_family",
  "variant",
  "generation",
  "year_from",
  "year_to",
  "market",
  "node_id",
  "node_applicability",
  "part_manufacturer",
  "part_number",
  "normalized_part_number",
  "part_name",
  "part_category",
  "is_oem",
  "application_type",
  "source_name",
  "source_type",
  "source_region",
  "source_url",
  "diagram_name",
  "diagram_position",
  "raw_quantity",
  "raw_notes",
  "review_status",
  "safety_critical",
  "confidence",
  "parsed_at",
] as const;

export const PARTS_STAGING_EXTENDED_COLUMNS = [
  "staging_row_key",
  "source_key",
  "source_model_code",
  "source_year",
  "verification_region",
  "evidence_level",
  "region_match_status",
  "supersession_status",
  "verified_at",
  "parser_version",
  "import_batch",
] as const;

export const PARTS_STAGING_COLUMNS = [
  ...PARTS_STAGING_BASE_COLUMNS,
  ...PARTS_STAGING_EXTENDED_COLUMNS,
] as const;

export type PartsStagingColumn = (typeof PARTS_STAGING_COLUMNS)[number];

export const NODE_APPLICABILITY = ["APPLICABLE", "NOT_APPLICABLE", "UNKNOWN"] as const;
export type NodeApplicability = (typeof NODE_APPLICABILITY)[number];

export const APPLICATION_TYPE = [
  "OEM_REPLACEMENT",
  "OEM_SERVICE_ITEM",
  "SPECIFICATION_ONLY",
  "COMPATIBLE_AFTERMARKET",
  "COMMUNITY_REPORTED",
] as const;
export type ApplicationType = (typeof APPLICATION_TYPE)[number];

export const REVIEW_STATUS = [
  "NEW",
  "NEEDS_REVIEW",
  "MANUAL_APPROVED",
  "REJECTED",
  "DUPLICATE",
  "NOT_APPLICABLE",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
export type CatalogConfidence = (typeof CONFIDENCE)[number];

export const SOURCE_TYPE = [
  "OFFICIAL_EPC",
  "OFFICIAL_PUBLIC_CATALOG",
  "OFFICIAL_DEALER_PUBLIC_CATALOG",
  "AUTHORIZED_DEALER",
  "REFERENCE_ONLY",
] as const;
export type SourceType = (typeof SOURCE_TYPE)[number];

export const STAGING_MARKET = ["US", "EU", "RU", "GLOBAL"] as const;
export type StagingMarket = (typeof STAGING_MARKET)[number];

export const SAFETY_CRITICAL_NODES = [
  "BRAKES.FRONT.PADS",
  "BRAKES.REAR.PADS",
  "BRAKES.FRONT.DISC",
  "BRAKES.REAR.DISC",
  "SUSPENSION.FRONT.SEALS",
  "ELECTRICS.IGNITION.SPARK",
] as const;

/** Wire shape for catalog evidence shown in picker / fitment report. */
export type CatalogEvidenceWire = {
  id: string;
  applicationType: ApplicationType;
  sourceName: string;
  sourceType: SourceType;
  sourceRegion: StagingMarket;
  sourceUrl: string;
  diagramName: string | null;
  diagramPosition: string | null;
  rawQuantity: string | null;
  rawNotes: string | null;
  reviewStatus: ReviewStatus;
  confidence: CatalogConfidence;
  safetyCritical: boolean;
  market: StagingMarket;
  parsedAt: string;
  sourceKey: string | null;
  sourceModelCode: string | null;
  sourceYear: number | null;
  verificationRegion: VerificationRegion | null;
  evidenceLevel: EvidenceLevel | null;
  regionMatchStatus: RegionMatchStatus | null;
  supersessionStatus: SupersessionStatus | null;
  verifiedAt: string | null;
  parserVersion: string | null;
  importBatch: string;
};

export type AdminCatalogApplicationListItemWire = {
  id: string;
  brand: string;
  modelFamily: string;
  variant: string;
  generationCode: string;
  nodeCode: string;
  nodeName: string;
  partNumber: string;
  partName: string;
  reviewStatus: ReviewStatus;
  confidence: CatalogConfidence;
  sourceRegion: StagingMarket;
  market: StagingMarket;
  importBatch: string;
  promotedAt: string | null;
  updatedAt: string;
};

export type AdminCatalogApplicationDetailWire = AdminCatalogApplicationListItemWire & {
  yearFrom: number;
  yearTo: number | null;
  nodeApplicability: NodeApplicability;
  partManufacturer: string;
  normalizedPartNumber: string;
  partCategory: string;
  isOem: boolean;
  applicationType: ApplicationType;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  diagramName: string | null;
  diagramPosition: string | null;
  rawQuantity: string | null;
  rawNotes: string | null;
  safetyCritical: boolean;
  parsedAt: string;
  importBatch: string;
  stagingRowKey: string;
  sourceKey: string | null;
  sourceModelCode: string | null;
  sourceYear: number | null;
  verificationRegion: VerificationRegion | null;
  evidenceLevel: EvidenceLevel | null;
  regionMatchStatus: RegionMatchStatus | null;
  supersessionStatus: SupersessionStatus | null;
  verifiedAt: string | null;
  parserVersion: string | null;
  promotedSkuId: string | null;
  promotedFitmentId: string | null;
  resolveStatus: "ok" | "partial" | "failed";
  resolveMessage: string | null;
};
