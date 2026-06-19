import type { PartCatalogApplication } from "@prisma/client";
import type {
  EvidenceLevel,
  RegionMatchStatus,
  VerificationRegion,
} from "@mototwin/types";
import { EVIDENCE_LEVEL, REGION_MATCH_STATUS, VERIFICATION_REGION } from "@mototwin/types";
import type { PartsStagingRow } from "../../../scripts/parts/parts-staging-schema";
import { duplicateKey } from "../../../scripts/parts/parts-staging-schema";
import { parseRawNotesMetadata } from "@mototwin/domain";

type ApplicationMetadataFields = Pick<
  PartCatalogApplication,
  | "sourceKey"
  | "sourceModelCode"
  | "sourceYear"
  | "verificationRegion"
  | "evidenceLevel"
  | "regionMatchStatus"
  | "supersessionStatus"
  | "verifiedAt"
  | "parserVersion"
  | "rawNotes"
>;

/** CSV import_batch column wins over CLI default when present. */
export function resolveImportBatch(row: PartsStagingRow, cliDefault: string): string {
  const fromCsv = row.import_batch.trim();
  return fromCsv || cliDefault;
}

/** Prefer explicit CSV staging_row_key; fall back to duplicateKey(). */
export function resolveStagingRowKey(row: PartsStagingRow): string {
  const explicit = row.staging_row_key.trim();
  return explicit || duplicateKey(row);
}

export function resolveEvidenceLevel(app: ApplicationMetadataFields): EvidenceLevel | null {
  if (app.evidenceLevel) return app.evidenceLevel;
  const fromNotes = parseRawNotesMetadata(app.rawNotes).evidence_level;
  return EVIDENCE_LEVEL.includes(fromNotes as EvidenceLevel) ? (fromNotes as EvidenceLevel) : null;
}

export function resolveRegionMatchStatus(app: ApplicationMetadataFields): RegionMatchStatus | null {
  if (app.regionMatchStatus) return app.regionMatchStatus;
  const fromNotes = parseRawNotesMetadata(app.rawNotes).region_match_status;
  return REGION_MATCH_STATUS.includes(fromNotes as RegionMatchStatus)
    ? (fromNotes as RegionMatchStatus)
    : null;
}

export function resolveVerificationRegion(app: ApplicationMetadataFields): VerificationRegion | null {
  if (app.verificationRegion) return app.verificationRegion;
  const fromNotes = parseRawNotesMetadata(app.rawNotes).verification_region;
  return VERIFICATION_REGION.includes(fromNotes as VerificationRegion)
    ? (fromNotes as VerificationRegion)
    : null;
}

export function resolveSourceModelCode(app: ApplicationMetadataFields): string | null {
  return app.sourceModelCode ?? parseRawNotesMetadata(app.rawNotes).source_model_code ?? null;
}

export function mapExtendedStagingFields(row: PartsStagingRow) {
  return {
    sourceKey: row.source_key.trim(),
    sourceModelCode: row.source_model_code.trim(),
    sourceYear: Number.parseInt(row.source_year, 10),
    verificationRegion: row.verification_region,
    evidenceLevel: row.evidence_level,
    regionMatchStatus: row.region_match_status,
    supersessionStatus: row.supersession_status,
    verifiedAt: new Date(row.verified_at),
    parserVersion: row.parser_version.trim(),
  };
}
