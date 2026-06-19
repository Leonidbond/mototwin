import { z } from "zod";
import {
  APPLICATION_TYPE,
  CATALOG_SOURCES_COLUMNS,
  CONFIDENCE,
  COVERAGE_MATRIX_COLUMNS,
  COVERAGE_STATUS,
  NODE_APPLICABILITY,
  PART_APPLICATIONS_STAGING_COLUMNS,
  REVIEW_PRIORITY,
  REVIEW_QUEUE_COLUMNS,
  REVIEW_STATUS,
  SCRAPING_ALLOWED_STATUS,
  SOURCE_TYPE,
  STAGING_MARKET,
} from "@mototwin/types";

export {
  CATALOG_SOURCES_COLUMNS,
  PART_APPLICATIONS_STAGING_COLUMNS,
  REVIEW_QUEUE_COLUMNS,
  COVERAGE_MATRIX_COLUMNS,
};

const boolString = z.enum(["true", "false"]);
const optionalString = z.string();
const yearToString = z.string();
const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO datetime",
});

export const catalogSourceRowSchema = z.object({
  source_key: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/),
  source_name: z.string().min(1),
  source_type: z.enum(SOURCE_TYPE),
  source_region: z.enum(STAGING_MARKET),
  brand: z.string(),
  base_url: z.string().url(),
  license_notes: optionalString,
  scraping_allowed_status: z.enum(SCRAPING_ALLOWED_STATUS),
  last_checked_at: isoDateTime,
});

export type CatalogSourceRow = z.infer<typeof catalogSourceRowSchema>;

export const partApplicationStagingRowSchema = z.object({
  application_key: z.string().min(1),
  staging_row_key: z.string().min(1),
  source_key: z.string().min(1),
  brand: z.string().min(1),
  model_family: z.string().min(1),
  variant: z.string().min(1),
  generation: z.string().min(1),
  year_from: z.string().regex(/^\d{4}$/),
  year_to: yearToString,
  market: z.enum(STAGING_MARKET),
  node_id: z.string().min(1),
  node_applicability: z.enum(NODE_APPLICABILITY),
  normalized_part_number: z.string(),
  application_type: z.enum(APPLICATION_TYPE),
  review_status: z.enum(REVIEW_STATUS),
  safety_critical: boolString,
  confidence: z.enum(CONFIDENCE),
  verified_at: isoDateTime,
});

export type PartApplicationStagingRow = z.infer<typeof partApplicationStagingRowSchema>;

export const reviewQueueRowSchema = z.object({
  staging_row_key: z.string().min(1),
  application_key: z.string().min(1),
  review_status: z.enum(REVIEW_STATUS),
  blocker_codes: z.string(),
  priority: z.enum(REVIEW_PRIORITY),
  safety_critical: boolString,
  assigned_reviewer: z.string(),
  notes: z.string(),
  queued_at: isoDateTime,
});

export type ReviewQueueRow = z.infer<typeof reviewQueueRowSchema>;

export const coverageMatrixRowSchema = z.object({
  brand: z.string().min(1),
  model_family: z.string().min(1),
  variant: z.string().min(1),
  generation: z.string().min(1),
  node_id: z.string().min(1),
  coverage_status: z.enum(COVERAGE_STATUS),
  applicable_count: z.string().regex(/^\d+$/),
  na_count: z.string().regex(/^\d+$/),
  needs_review_count: z.string().regex(/^\d+$/),
  approved_count: z.string().regex(/^\d+$/),
  last_updated_at: isoDateTime,
});

export type CoverageMatrixRow = z.infer<typeof coverageMatrixRowSchema>;

export function catalogSourceDuplicateKey(row: CatalogSourceRow): string {
  return row.source_key;
}

export function applicationDuplicateKey(row: PartApplicationStagingRow): string {
  return row.application_key;
}

export function coverageMatrixKey(row: CoverageMatrixRow): string {
  return [row.brand, row.model_family, row.variant, row.generation, row.node_id].join("|");
}

/** BMW-style OEM part numbers: 5–14 uppercase alphanumeric. */
export const OEM_PART_NUMBER_REGEX = /^[A-Z0-9]{5,14}$/;

export function isLikelyOemPartNumber(normalized: string): boolean {
  return OEM_PART_NUMBER_REGEX.test(normalized);
}

export function slugifySourceKey(
  sourceName: string,
  sourceType: string,
  sourceRegion: string
): string {
  const slug = sourceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const typeSlug = sourceType.toLowerCase().replace(/_/g, "-");
  return `${slug}.${typeSlug}.${sourceRegion.toLowerCase()}`;
}

export function parseRawNotesMetadata(rawNotes: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const segment of rawNotes.split(";")) {
    const trimmed = segment.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}
