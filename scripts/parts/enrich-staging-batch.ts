/**
 * Enriches legacy parts-staging.csv with extended contract columns and companion files.
 *
 * Run: tsx scripts/parts/enrich-staging-batch.ts data/parts/bmw/r-1300-gs
 */
import path from "node:path";
import { SKILL_EXTENDED_MVP_NODES } from "@mototwin/types";
import { readCsvFile, writeCsvFile } from "./catalog-csv";
import {
  parseRawNotesMetadata,
  slugifySourceKey,
} from "./catalog-schemas";
import {
  duplicateKey,
  normalizePartNumber,
  type PartsStagingRow,
} from "./parts-staging-schema";

type LegacyRow = Record<string, string>;

function readCsv(filePath: string): LegacyRow[] {
  return readCsvFile(filePath) as LegacyRow[];
}

function writeCsv(filePath: string, rows: Record<string, string>[], columns: string[]) {
  writeCsvFile(filePath, rows, columns);
}

function extractBaseUrl(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return sourceUrl;
  }
}

function enrichStagingRow(row: LegacyRow): Record<string, string> {
  const meta = parseRawNotesMetadata(row.raw_notes ?? "");
  const sourceKey = slugifySourceKey(
    row.source_name ?? "",
    row.source_type ?? "",
    row.source_region ?? ""
  );
  const stagingKey = duplicateKey({
    ...row,
    year_to: row.year_to ?? "",
    diagram_name: row.diagram_name ?? "",
    diagram_position: row.diagram_position ?? "",
    raw_quantity: row.raw_quantity ?? "",
    raw_notes: row.raw_notes ?? "",
    staging_row_key: "",
    source_key: sourceKey,
    source_model_code: meta.source_model_code ?? row.generation ?? row.year_from ?? "UNKNOWN",
    source_year: meta.source_year ?? row.year_from ?? "",
    verification_region: meta.verification_region ?? row.source_region ?? "UNKNOWN",
    evidence_level: meta.evidence_level ?? "D",
    region_match_status: meta.region_match_status ?? "UNKNOWN",
    supersession_status: meta.supersession_status ?? "UNKNOWN",
    verified_at: row.parsed_at ?? new Date().toISOString(),
    parser_version: meta.parser_version ?? "parts-catalog-v1",
    import_batch: meta.import_batch ?? "unknown-batch",
  } as PartsStagingRow);

  return {
    ...row,
    staging_row_key: stagingKey,
    source_key: sourceKey,
    source_model_code: meta.source_model_code ?? row.generation ?? row.year_from ?? "UNKNOWN",
    source_year: meta.source_year ?? row.year_from ?? "",
    verification_region: meta.verification_region ?? row.source_region ?? "UNKNOWN",
    evidence_level: meta.evidence_level ?? "D",
    region_match_status: meta.region_match_status ?? "UNKNOWN",
    supersession_status: meta.supersession_status ?? "UNKNOWN",
    verified_at: row.parsed_at ?? new Date().toISOString(),
    parser_version: meta.parser_version ?? "parts-catalog-v1",
    import_batch: meta.import_batch ?? "unknown-batch",
  };
}

function buildCatalogSources(stagingRows: Record<string, string>[]) {
  const byKey = new Map<string, Record<string, string>>();
  for (const row of stagingRows) {
    const key = row.source_key!;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      source_key: key,
      source_name: row.source_name ?? "",
      source_type: row.source_type ?? "",
      source_region: row.source_region ?? "",
      brand: row.brand ?? "",
      base_url: extractBaseUrl(row.source_url ?? "https://example.com"),
      license_notes: "",
      scraping_allowed_status: row.source_type === "REFERENCE_ONLY" ? "FORBIDDEN" : "RESTRICTED",
      last_checked_at: row.verified_at ?? row.parsed_at ?? new Date().toISOString(),
    });
  }
  return [...byKey.values()].sort((a, b) => a.source_key.localeCompare(b.source_key));
}

function buildApplications(stagingRows: Record<string, string>[]) {
  return stagingRows.map((row) => ({
    application_key: row.staging_row_key!,
    staging_row_key: row.staging_row_key!,
    source_key: row.source_key!,
    brand: row.brand ?? "",
    model_family: row.model_family ?? "",
    variant: row.variant ?? "",
    generation: row.generation ?? "",
    year_from: row.year_from ?? "",
    year_to: row.year_to ?? "",
    market: row.market ?? "",
    node_id: row.node_id ?? "",
    node_applicability: row.node_applicability ?? "",
    normalized_part_number: row.normalized_part_number ?? "",
    application_type: row.application_type ?? "",
    review_status: row.review_status ?? "",
    safety_critical: row.safety_critical ?? "false",
    confidence: row.confidence ?? "LOW",
    verified_at: row.verified_at ?? row.parsed_at ?? "",
  }));
}

function buildReviewQueue(stagingRows: Record<string, string>[]) {
  return stagingRows
    .filter((row) => ["NEW", "NEEDS_REVIEW", "NOT_APPLICABLE"].includes(row.review_status ?? ""))
    .map((row) => {
      const blockers: string[] = [];
      if (row.safety_critical === "true") blockers.push("SAFETY_CRITICAL");
      if (row.region_match_status === "REGION_MISMATCH") blockers.push("REGION_MISMATCH");
      if (row.source_region === "US" && ["EU", "RU", "GLOBAL"].includes(row.market ?? "")) {
        blockers.push("US_BOOTSTRAP");
      }
      if (row.evidence_level === "D") blockers.push("LOW_EVIDENCE");
      const priority =
        row.safety_critical === "true"
          ? "HIGH"
          : row.region_match_status === "REGION_MISMATCH"
            ? "NORMAL"
            : "LOW";
      return {
        staging_row_key: row.staging_row_key!,
        application_key: row.staging_row_key!,
        review_status: row.review_status ?? "",
        blocker_codes: blockers.join("|"),
        priority,
        safety_critical: row.safety_critical ?? "false",
        assigned_reviewer: "",
        notes: (row.raw_notes ?? "").slice(0, 240),
        queued_at: row.verified_at ?? row.parsed_at ?? "",
      };
    });
}

function buildCoverageMatrix(stagingRows: Record<string, string>[]) {
  if (stagingRows.length === 0) return [];
  const sample = stagingRows[0]!;
  const grouped = new Map<string, Record<string, string>[]>();
  for (const row of stagingRows) {
    const key = `${row.brand}|${row.model_family}|${row.variant}|${row.generation}|${row.node_id}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const rows: Record<string, string>[] = [];
  for (const node of SKILL_EXTENDED_MVP_NODES) {
    const key = `${sample.brand}|${sample.model_family}|${sample.variant}|${sample.generation}|${node}`;
    const nodeRows = grouped.get(key) ?? [];
    const applicable = nodeRows.filter((r) => r.node_applicability === "APPLICABLE");
    const na = nodeRows.filter((r) => r.node_applicability === "NOT_APPLICABLE");
    const needsReview = nodeRows.filter((r) => r.review_status === "NEEDS_REVIEW" || r.review_status === "NEW");
    const approved = nodeRows.filter((r) => r.review_status === "MANUAL_APPROVED");
    const oemPartNumbers = new Set(
      applicable
        .filter(
          (r) =>
            r.is_oem === "true" &&
            r.application_type !== "SPECIFICATION_ONLY" &&
            (r.normalized_part_number ?? "").trim()
        )
        .map((r) => r.normalized_part_number!.trim())
    );
    const hasTierAbEvidence = applicable.some((r) =>
      ["A", "B"].includes((r.evidence_level ?? "").trim())
    );
    const hasSpecEvidenceA = applicable.some(
      (r) =>
        r.application_type === "SPECIFICATION_ONLY" && (r.evidence_level ?? "").trim() === "A"
    );
    const safetyCriticalNode = [
      "BRAKES.FRONT.PADS",
      "BRAKES.REAR.PADS",
      "BRAKES.FRONT.DISC",
      "BRAKES.REAR.DISC",
      "SUSPENSION.FRONT.SEALS",
      "ELECTRICS.IGNITION.SPARK",
    ].includes(node);

    let coverageStatus = "NOT_FOUND";
    if (na.length > 0 && applicable.length === 0) {
      coverageStatus = "NOT_APPLICABLE";
    } else if (applicable.length === 0) {
      coverageStatus = "NOT_FOUND";
    } else if (safetyCriticalNode && needsReview.length > 0) {
      coverageStatus = "NEEDS_REVIEW";
    } else if (oemPartNumbers.size > 1) {
      coverageStatus = "NEEDS_REVIEW";
    } else if (hasTierAbEvidence || hasSpecEvidenceA) {
      coverageStatus = "VERIFIED";
    } else if (needsReview.length > 0) {
      coverageStatus = "NEEDS_REVIEW";
    } else {
      coverageStatus = "VERIFIED";
    }

    rows.push({
      brand: sample.brand ?? "",
      model_family: sample.model_family ?? "",
      variant: sample.variant ?? "",
      generation: sample.generation ?? "",
      node_id: node,
      coverage_status: coverageStatus,
      applicable_count: String(applicable.length),
      na_count: String(na.length),
      needs_review_count: String(needsReview.length),
      approved_count: String(approved.length),
      last_updated_at: sample.verified_at ?? sample.parsed_at ?? new Date().toISOString(),
    });
  }
  return rows;
}

function main() {
  const batchDir = process.argv[2];
  if (!batchDir) {
    throw new Error("Usage: tsx scripts/parts/enrich-staging-batch.ts <batch-dir>");
  }

  const stagingPath = path.join(batchDir, "parts-staging.csv");
  const legacyRows = readCsv(stagingPath);
  const enriched = legacyRows.map(enrichStagingRow);

  const stagingColumns = [
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
  ];

  writeCsv(stagingPath, enriched, stagingColumns);
  writeCsv(
    path.join(batchDir, "catalog-sources.csv"),
    buildCatalogSources(enriched),
    [
      "source_key",
      "source_name",
      "source_type",
      "source_region",
      "brand",
      "base_url",
      "license_notes",
      "scraping_allowed_status",
      "last_checked_at",
    ]
  );
  writeCsv(
    path.join(batchDir, "part-applications-staging.csv"),
    buildApplications(enriched),
    [
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
    ]
  );
  writeCsv(
    path.join(batchDir, "review-queue.csv"),
    buildReviewQueue(enriched),
    [
      "staging_row_key",
      "application_key",
      "review_status",
      "blocker_codes",
      "priority",
      "safety_critical",
      "assigned_reviewer",
      "notes",
      "queued_at",
    ]
  );
  writeCsv(
    path.join(batchDir, "coverage-matrix.csv"),
    buildCoverageMatrix(enriched),
    [
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
    ]
  );

  console.log(`Enriched ${enriched.length} staging rows in ${batchDir}`);
}

main();
