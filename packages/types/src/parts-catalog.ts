/**
 * Unified MotoTwin parts catalog data contract — CSV templates, enums, column lists.
 * Source of truth for docs/catalog/parts-catalog-schema.md and validate-parts-catalog.ts.
 */

import {
  APPLICATION_TYPE,
  CONFIDENCE,
  NODE_APPLICABILITY,
  PARTS_STAGING_EXTENDED_COLUMNS,
  REVIEW_STATUS,
  SOURCE_TYPE,
  STAGING_MARKET,
} from "./parts-staging";

export {
  APPLICATION_TYPE,
  CONFIDENCE,
  NODE_APPLICABILITY,
  PARTS_STAGING_EXTENDED_COLUMNS,
  REVIEW_STATUS,
  SOURCE_TYPE,
  STAGING_MARKET,
} from "./parts-staging";

/** Skill v1.1 MVP top nodes (skill-extended list for validator). */
export const SKILL_EXTENDED_MVP_NODES = [
  "ENGINE.LUBE.FILTER",
  "ENGINE.LUBE.OIL",
  "INTAKE.FILTER",
  "ELECTRICS.IGNITION.SPARK",
  "BRAKES.FRONT.PADS",
  "BRAKES.REAR.PADS",
  "BRAKES.FRONT.DISC",
  "BRAKES.REAR.DISC",
  "BRAKES.FLUID",
  "TIRES.FRONT",
  "TIRES.REAR",
  "ELECTRICS.BATTERY",
  "SUSPENSION.FRONT.SEALS",
  "SUSPENSION.FRONT.OIL",
  "COOLING.LIQUID.COOLANT",
  "DRIVETRAIN.CHAIN",
  "DRIVETRAIN.FRONT_SPROCKET",
  "DRIVETRAIN.REAR_SPROCKET",
] as const;

export type SkillExtendedMvpNode = (typeof SKILL_EXTENDED_MVP_NODES)[number];

export const DRIVETRAIN_CHAIN_NODES = [
  "DRIVETRAIN.CHAIN",
  "DRIVETRAIN.FRONT_SPROCKET",
  "DRIVETRAIN.REAR_SPROCKET",
] as const;

export const EVIDENCE_LEVEL = ["A", "B", "C", "D"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVEL)[number];

export const VERIFICATION_REGION = ["US", "EU", "RU", "GLOBAL", "UNKNOWN"] as const;
export type VerificationRegion = (typeof VERIFICATION_REGION)[number];

export const REGION_MATCH_STATUS = [
  "TARGET_REGION_MATCH",
  "CROSS_REGION_MATCH",
  "REGION_MISMATCH",
  "UNKNOWN",
] as const;
export type RegionMatchStatus = (typeof REGION_MATCH_STATUS)[number];

export const SUPERSESSION_STATUS = [
  "CURRENT",
  "SUPERSEDED",
  "POSSIBLY_SUPERSEDED",
  "UNKNOWN",
] as const;
export type SupersessionStatus = (typeof SUPERSESSION_STATUS)[number];

export const SCRAPING_ALLOWED_STATUS = [
  "ALLOWED",
  "RESTRICTED",
  "FORBIDDEN",
  "UNKNOWN",
] as const;
export type ScrapingAllowedStatus = (typeof SCRAPING_ALLOWED_STATUS)[number];

export const COVERAGE_STATUS = [
  "VERIFIED",
  "NEEDS_REVIEW",
  "NOT_FOUND",
  "NOT_APPLICABLE",
  "SOURCE_UNAVAILABLE",
] as const;
export type CoverageStatus = (typeof COVERAGE_STATUS)[number];

export const REVIEW_PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type ReviewPriority = (typeof REVIEW_PRIORITY)[number];

/** Allowed review_status transitions (from → to[]). */
export const REVIEW_STATUS_TRANSITIONS: Record<
  (typeof REVIEW_STATUS)[number],
  readonly (typeof REVIEW_STATUS)[number][]
> = {
  NEW: ["NEEDS_REVIEW", "MANUAL_APPROVED", "REJECTED", "DUPLICATE", "NOT_APPLICABLE"],
  NEEDS_REVIEW: ["MANUAL_APPROVED", "REJECTED", "DUPLICATE"],
  MANUAL_APPROVED: ["REJECTED"],
  REJECTED: [],
  DUPLICATE: [],
  NOT_APPLICABLE: [],
};

export const CATALOG_SOURCES_COLUMNS = [
  "source_key",
  "source_name",
  "source_type",
  "source_region",
  "brand",
  "base_url",
  "license_notes",
  "scraping_allowed_status",
  "last_checked_at",
] as const;

export type CatalogSourcesColumn = (typeof CATALOG_SOURCES_COLUMNS)[number];

export const PART_APPLICATIONS_STAGING_COLUMNS = [
  "application_key",
  "staging_row_key",
  "source_key",
  "brand",
  "model_family",
  "variant",
  "generation",
  "year_from",
  "year_to",
  "market",
  "node_id",
  "node_applicability",
  "normalized_part_number",
  "application_type",
  "review_status",
  "safety_critical",
  "confidence",
  "verified_at",
] as const;

export type PartApplicationsStagingColumn = (typeof PART_APPLICATIONS_STAGING_COLUMNS)[number];

export const REVIEW_QUEUE_COLUMNS = [
  "staging_row_key",
  "application_key",
  "review_status",
  "blocker_codes",
  "priority",
  "safety_critical",
  "assigned_reviewer",
  "notes",
  "queued_at",
] as const;

export type ReviewQueueColumn = (typeof REVIEW_QUEUE_COLUMNS)[number];

export const COVERAGE_MATRIX_COLUMNS = [
  "brand",
  "model_family",
  "variant",
  "generation",
  "node_id",
  "coverage_status",
  "applicable_count",
  "na_count",
  "needs_review_count",
  "approved_count",
  "last_updated_at",
] as const;

export type CoverageMatrixColumn = (typeof COVERAGE_MATRIX_COLUMNS)[number];
