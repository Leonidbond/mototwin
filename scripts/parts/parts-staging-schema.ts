import { z } from "zod";
import {
  APPLICATION_TYPE,
  CONFIDENCE,
  EVIDENCE_LEVEL,
  NODE_APPLICABILITY,
  PARTS_STAGING_COLUMNS,
  REGION_MATCH_STATUS,
  REVIEW_STATUS,
  SOURCE_TYPE,
  STAGING_MARKET,
  SUPERSESSION_STATUS,
  VERIFICATION_REGION,
  type PartsStagingColumn,
} from "@mototwin/types";

export {
  APPLICATION_TYPE,
  CONFIDENCE,
  NODE_APPLICABILITY,
  PARTS_STAGING_COLUMNS,
  REVIEW_STATUS,
  SOURCE_TYPE,
  STAGING_MARKET as MARKET,
} from "@mototwin/types";

export type { PartsStagingColumn };

export const SAFETY_CRITICAL_NODES = new Set([
  "BRAKES.FRONT.PADS",
  "BRAKES.REAR.PADS",
  "BRAKES.FRONT.DISC",
  "BRAKES.REAR.DISC",
  "SUSPENSION.FRONT.SEALS",
  "ELECTRICS.IGNITION.SPARK",
]);

const boolString = z.enum(["true", "false"]);
const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO datetime",
});

export const partsStagingRowSchema = z.object({
  brand: z.string().min(1),
  model_family: z.string().min(1),
  variant: z.string().min(1),
  generation: z.string().min(1),
  year_from: z.string().regex(/^\d{4}$/),
  year_to: z.string(),
  market: z.enum(STAGING_MARKET),
  node_id: z.string().min(1),
  node_applicability: z.enum(NODE_APPLICABILITY),
  part_manufacturer: z.string(),
  part_number: z.string(),
  normalized_part_number: z.string(),
  part_name: z.string().min(1),
  part_category: z.string().min(1),
  is_oem: boolString,
  application_type: z.enum(APPLICATION_TYPE),
  source_name: z.string().min(1),
  source_type: z.enum(SOURCE_TYPE),
  source_region: z.enum(STAGING_MARKET),
  source_url: z.string().url(),
  diagram_name: z.string(),
  diagram_position: z.string(),
  raw_quantity: z.string(),
  raw_notes: z.string(),
  review_status: z.enum(REVIEW_STATUS),
  safety_critical: boolString,
  confidence: z.enum(CONFIDENCE),
  parsed_at: isoDateTime,
  staging_row_key: z.string().min(1),
  source_key: z.string().min(1),
  source_model_code: z.string().min(1),
  source_year: z.string().regex(/^\d{4}$/),
  verification_region: z.enum(VERIFICATION_REGION),
  evidence_level: z.enum(EVIDENCE_LEVEL),
  region_match_status: z.enum(REGION_MATCH_STATUS),
  supersession_status: z.enum(SUPERSESSION_STATUS),
  verified_at: isoDateTime,
  parser_version: z.string().min(1),
  import_batch: z.string().min(1),
});

export type PartsStagingRow = z.infer<typeof partsStagingRowSchema>;

export function normalizePartNumber(value: string): string {
  return value.replace(/[\s.\-/]/g, "").toUpperCase();
}

export function duplicateKey(row: z.infer<typeof partsStagingRowSchema>): string {
  return [
    row.brand,
    row.model_family,
    row.variant,
    row.generation,
    row.node_id,
    row.normalized_part_number,
    row.source_region,
  ].join("|");
}
