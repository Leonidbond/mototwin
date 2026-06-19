import path from "node:path";
import {
  CATALOG_SOURCES_COLUMNS,
  COVERAGE_MATRIX_COLUMNS,
  DRIVETRAIN_CHAIN_NODES,
  PART_APPLICATIONS_STAGING_COLUMNS,
  PARTS_STAGING_COLUMNS,
  REVIEW_QUEUE_COLUMNS,
  SKILL_EXTENDED_MVP_NODES,
} from "@mototwin/types";
import { readCsvFile } from "./catalog-csv";
import {
  applicationDuplicateKey,
  catalogSourceDuplicateKey,
  catalogSourceRowSchema,
  coverageMatrixKey,
  coverageMatrixRowSchema,
  isLikelyOemPartNumber,
  partApplicationStagingRowSchema,
  reviewQueueRowSchema,
  type CatalogSourceRow,
  type CoverageMatrixRow,
  type PartApplicationStagingRow,
  type ReviewQueueRow,
} from "./catalog-schemas";
import {
  DEFAULT_TECHNICAL_MASTER_PATH,
  findTechnicalMasterMatch,
  loadTechnicalMasterCsv,
  type TechnicalMasterRow,
} from "./catalog-technical-master";
import {
  duplicateKey,
  normalizePartNumber,
  partsStagingRowSchema,
  SAFETY_CRITICAL_NODES,
  type PartsStagingRow,
} from "./parts-staging-schema";

export type CatalogValidationIssue = {
  file: string;
  row: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

export type CatalogValidationInput = {
  sourcesPath?: string;
  stagingPath?: string;
  applicationsPath?: string;
  reviewQueuePath?: string;
  coveragePath?: string;
  technicalMasterPath?: string;
};

export type CatalogValidationContext = {
  sources: CatalogSourceRow[];
  staging: PartsStagingRow[];
  applications: PartApplicationStagingRow[];
  reviewQueue: ReviewQueueRow[];
  coverage: CoverageMatrixRow[];
  technicalMaster: TechnicalMasterRow[];
  sourceKeys: Set<string>;
  stagingKeys: Set<string>;
  applicationKeys: Set<string>;
};

const CHAIN_NODE_SET = new Set<string>(DRIVETRAIN_CHAIN_NODES);
const MVP_NODE_SET = new Set<string>(SKILL_EXTENDED_MVP_NODES);

const PRODUCTION_READY_STATUSES = new Set(["MANUAL_APPROVED"]);
const REVIEW_GATED_STATUSES = new Set(["NEW", "NEEDS_REVIEW"]);

export function loadCsvRows(filePath: string): Record<string, string>[] {
  return readCsvFile(filePath);
}

function validateStructure(
  file: string,
  rows: Record<string, string>[],
  columns: readonly string[]
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  if (rows.length === 0) {
    issues.push({ file, row: 0, message: "CSV has no data rows", severity: "error" });
    return issues;
  }
  const headers = Object.keys(rows[0] ?? {});
  for (const column of columns) {
    if (!headers.includes(column)) {
      issues.push({
        file,
        row: 0,
        field: column,
        message: `Missing required column: ${column}`,
        severity: "error",
      });
    }
  }
  return issues;
}

function pushZodIssues(
  file: string,
  rowNumber: number,
  error: { issues: { path: (string | number)[]; message: string }[] },
  issues: CatalogValidationIssue[]
) {
  for (const issue of error.issues) {
    issues.push({
      file,
      row: rowNumber,
      field: issue.path.join("."),
      message: issue.message,
      severity: "error",
    });
  }
}

export function validateStagingRowRules(
  file: string,
  rowNumber: number,
  row: PartsStagingRow,
  technicalMaster: TechnicalMasterRow[]
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];

  if (row.staging_row_key !== duplicateKey(row)) {
    issues.push({
      file,
      row: rowNumber,
      field: "staging_row_key",
      message: `staging_row_key must equal duplicate key: ${duplicateKey(row)}`,
      severity: "error",
    });
  }

  if (!MVP_NODE_SET.has(row.node_id)) {
    issues.push({
      file,
      row: rowNumber,
      field: "node_id",
      message: `Unknown MVP node_id (skill-extended): ${row.node_id}`,
      severity: "error",
    });
  }

  if (row.node_applicability === "NOT_APPLICABLE") {
    if (row.part_number.trim() || row.normalized_part_number.trim()) {
      issues.push({
        file,
        row: rowNumber,
        field: "part_number",
        message: "NOT_APPLICABLE rows must not contain part numbers",
        severity: "error",
      });
    }
    if (row.review_status !== "NOT_APPLICABLE") {
      issues.push({
        file,
        row: rowNumber,
        field: "review_status",
        message: "NOT_APPLICABLE rows should use review_status=NOT_APPLICABLE",
        severity: "error",
      });
    }
  }

  if (row.node_applicability === "APPLICABLE" && row.application_type !== "SPECIFICATION_ONLY") {
    if (!row.part_number.trim() || !row.normalized_part_number.trim()) {
      issues.push({
        file,
        row: rowNumber,
        field: "part_number",
        message: "APPLICABLE OEM rows require part_number and normalized_part_number",
        severity: "error",
      });
    }
  }

  if (row.part_number.trim()) {
    const expected = normalizePartNumber(row.part_number);
    if (row.normalized_part_number !== expected) {
      issues.push({
        file,
        row: rowNumber,
        field: "normalized_part_number",
        message: `Expected normalized_part_number=${expected}, got ${row.normalized_part_number}`,
        severity: "error",
      });
    }
    if (
      row.is_oem === "true" &&
      row.application_type !== "SPECIFICATION_ONLY" &&
      row.normalized_part_number.trim() &&
      !isLikelyOemPartNumber(row.normalized_part_number)
    ) {
      issues.push({
        file,
        row: rowNumber,
        field: "normalized_part_number",
        message: "OEM part number must be 5–14 uppercase alphanumeric characters",
        severity: "error",
      });
    }
  }

  if (SAFETY_CRITICAL_NODES.has(row.node_id) && row.safety_critical !== "true") {
    issues.push({
      file,
      row: rowNumber,
      field: "safety_critical",
      message: `${row.node_id} must have safety_critical=true`,
      severity: "error",
    });
  }

  if (SAFETY_CRITICAL_NODES.has(row.node_id) && row.review_status === "MANUAL_APPROVED") {
    issues.push({
      file,
      row: rowNumber,
      field: "review_status",
      message: "Safety-critical rows must not be MANUAL_APPROVED in staging without explicit review",
      severity: "error",
    });
  }

  if (SAFETY_CRITICAL_NODES.has(row.node_id) && REVIEW_GATED_STATUSES.has(row.review_status)) {
    issues.push({
      file,
      row: rowNumber,
      field: "review_status",
      message: "Safety-critical row requires human review before production use",
      severity: "warning",
    });
  }

  if (!row.source_url.startsWith("http")) {
    issues.push({
      file,
      row: rowNumber,
      field: "source_url",
      message: "source_url must be an http(s) URL",
      severity: "error",
    });
  }

  if (!row.verified_at.trim()) {
    issues.push({
      file,
      row: rowNumber,
      field: "verified_at",
      message: "verified_at is required",
      severity: "error",
    });
  }

  if (row.source_region === "US" && row.market === "GLOBAL") {
    issues.push({
      file,
      row: rowNumber,
      field: "market",
      message: "US-only source must not use market=GLOBAL until EU/RU cross-check",
      severity: "error",
    });
  }

  if (row.source_region === "US" && row.confidence === "HIGH") {
    issues.push({
      file,
      row: rowNumber,
      field: "confidence",
      message: "US-only source must not use confidence=HIGH without EU/RU cross-check",
      severity: "error",
    });
  }

  if (row.source_region === "US" && row.review_status === "MANUAL_APPROVED") {
    issues.push({
      file,
      row: rowNumber,
      field: "review_status",
      message: "US-only source cannot be MANUAL_APPROVED without EU/RU verification",
      severity: "error",
    });
  }

  if (
    row.source_region === "US" &&
    ["EU", "RU"].includes(row.market) &&
    row.region_match_status === "TARGET_REGION_MATCH"
  ) {
    issues.push({
      file,
      row: rowNumber,
      field: "region_match_status",
      message: "US-only source cannot be TARGET_REGION_MATCH for EU/RU market",
      severity: "error",
    });
  }

  if (
    row.source_region === "US" &&
    ["EU", "RU", "GLOBAL"].includes(row.verification_region) &&
    row.region_match_status === "TARGET_REGION_MATCH"
  ) {
    issues.push({
      file,
      row: rowNumber,
      field: "verification_region",
      message: "US-only source falsely marked as target-region verified for EU/RU/GLOBAL",
      severity: "error",
    });
  }

  if (row.source_type === "REFERENCE_ONLY" && row.review_status === "MANUAL_APPROVED") {
    issues.push({
      file,
      row: rowNumber,
      field: "source_type",
      message: "REFERENCE_ONLY sources cannot be MANUAL_APPROVED",
      severity: "error",
    });
  }

  if (PRODUCTION_READY_STATUSES.has(row.review_status)) {
    if (row.source_type === "REFERENCE_ONLY" || row.evidence_level === "D") {
      issues.push({
        file,
        row: rowNumber,
        field: "review_status",
        message: "Production-ready row requires evidence_level A/B and non-reference source",
        severity: "error",
      });
    }
    if (!["A", "B"].includes(row.evidence_level)) {
      issues.push({
        file,
        row: rowNumber,
        field: "evidence_level",
        message: "MANUAL_APPROVED requires evidence_level A or B",
        severity: "error",
      });
    }
  }

  const yearFrom = Number.parseInt(row.year_from, 10);
  const sourceYear = Number.parseInt(row.source_year, 10);
  if (Number.isFinite(sourceYear) && Math.abs(sourceYear - yearFrom) > 2) {
    issues.push({
      file,
      row: rowNumber,
      field: "source_year",
      message: `source_year=${row.source_year} diverges from year_from=${row.year_from}`,
      severity: "warning",
    });
  }

  const tech = findTechnicalMasterMatch(technicalMaster, {
    brand: row.brand,
    modelFamily: row.model_family,
    variant: row.variant,
    yearFrom,
  });

  if (!tech) {
    issues.push({
      file,
      row: rowNumber,
      field: "model_family",
      message: "No technical master match for brand/model/variant/year",
      severity: "warning",
    });
  } else {
    if (yearFrom < tech.yearFrom || (tech.yearTo !== null && yearFrom > tech.yearTo)) {
      issues.push({
        file,
        row: rowNumber,
        field: "year_from",
        message: `year_from=${row.year_from} outside technical master range ${tech.yearFrom}-${tech.yearTo ?? "present"}`,
        severity: "error",
      });
    }

    if (tech.drive === "SHAFT" && CHAIN_NODE_SET.has(row.node_id)) {
      if (row.node_applicability !== "NOT_APPLICABLE") {
        issues.push({
          file,
          row: rowNumber,
          field: "node_applicability",
          message: `Shaft-drive model must mark ${row.node_id} as NOT_APPLICABLE`,
          severity: "error",
        });
      }
    }

    if (tech.drive === "CHAIN" && CHAIN_NODE_SET.has(row.node_id) && row.node_applicability === "NOT_APPLICABLE") {
      issues.push({
        file,
        row: rowNumber,
        field: "node_applicability",
        message: `Chain-drive model should not mark ${row.node_id} as NOT_APPLICABLE without evidence`,
        severity: "warning",
      });
    }
  }

  return issues;
}

export function validateCatalogSourcesFile(
  filePath: string
): { issues: CatalogValidationIssue[]; rows: CatalogSourceRow[] } {
  const file = filePath;
  const rawRows = loadCsvRows(filePath);
  const issues = validateStructure(file, rawRows, CATALOG_SOURCES_COLUMNS);
  const rows: CatalogSourceRow[] = [];
  const seen = new Map<string, number>();

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = catalogSourceRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      pushZodIssues(file, rowNumber, parsed.error, issues);
      return;
    }
    rows.push(parsed.data);

    const key = catalogSourceDuplicateKey(parsed.data);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.push({
        file,
        row: rowNumber,
        message: `Duplicate source_key (first seen on row ${previous})`,
        severity: "error",
      });
    } else {
      seen.set(key, rowNumber);
    }

    if (parsed.data.source_type === "REFERENCE_ONLY" && parsed.data.scraping_allowed_status === "ALLOWED") {
      issues.push({
        file,
        row: rowNumber,
        field: "scraping_allowed_status",
        message: "REFERENCE_ONLY sources should not be marked scraping ALLOWED for production ingest",
        severity: "warning",
      });
    }
  });

  return { issues, rows };
}

export function validatePartsStagingFile(
  filePath: string,
  technicalMasterPath = DEFAULT_TECHNICAL_MASTER_PATH
): { issues: CatalogValidationIssue[]; rows: PartsStagingRow[] } {
  const file = filePath;
  const rawRows = loadCsvRows(filePath);
  const issues = validateStructure(file, rawRows, PARTS_STAGING_COLUMNS);
  const rows: PartsStagingRow[] = [];
  const seenStagingKey = new Map<string, number>();
  const seenDuplicateKey = new Map<string, number>();
  const technicalMaster = loadTechnicalMasterCsv(technicalMasterPath);

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = partsStagingRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      pushZodIssues(file, rowNumber, parsed.error, issues);
      return;
    }
    rows.push(parsed.data);
    issues.push(...validateStagingRowRules(file, rowNumber, parsed.data, technicalMaster));

    const stagingKey = parsed.data.staging_row_key;
    const prevStaging = seenStagingKey.get(stagingKey);
    if (prevStaging !== undefined) {
      issues.push({
        file,
        row: rowNumber,
        field: "staging_row_key",
        message: `Duplicate staging_row_key (first seen on row ${prevStaging})`,
        severity: "error",
      });
    } else {
      seenStagingKey.set(stagingKey, rowNumber);
    }

    if (parsed.data.normalized_part_number.trim()) {
      const key = duplicateKey(parsed.data);
      const previous = seenDuplicateKey.get(key);
      if (previous !== undefined) {
        issues.push({
          file,
          row: rowNumber,
          message: `Duplicate node/part/region row (first seen on row ${previous})`,
          severity: "error",
        });
      } else {
        seenDuplicateKey.set(key, rowNumber);
      }
    }
  });

  return { issues, rows };
}

export function validatePartApplicationsFile(
  filePath: string
): { issues: CatalogValidationIssue[]; rows: PartApplicationStagingRow[] } {
  const file = filePath;
  const rawRows = loadCsvRows(filePath);
  const issues = validateStructure(file, rawRows, PART_APPLICATIONS_STAGING_COLUMNS);
  const rows: PartApplicationStagingRow[] = [];
  const seen = new Map<string, number>();

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = partApplicationStagingRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      pushZodIssues(file, rowNumber, parsed.error, issues);
      return;
    }
    rows.push(parsed.data);

    if (!MVP_NODE_SET.has(parsed.data.node_id)) {
      issues.push({
        file,
        row: rowNumber,
        field: "node_id",
        message: `Unknown MVP node_id (skill-extended): ${parsed.data.node_id}`,
        severity: "error",
      });
    }

    if (parsed.data.application_key !== parsed.data.staging_row_key) {
      issues.push({
        file,
        row: rowNumber,
        field: "application_key",
        message: "application_key must equal staging_row_key in v1 companion contract",
        severity: "error",
      });
    }

    const key = applicationDuplicateKey(parsed.data);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.push({
        file,
        row: rowNumber,
        message: `Duplicate application_key (first seen on row ${previous})`,
        severity: "error",
      });
    } else {
      seen.set(key, rowNumber);
    }
  });

  return { issues, rows };
}

export function validateReviewQueueFile(
  filePath: string
): { issues: CatalogValidationIssue[]; rows: ReviewQueueRow[] } {
  const file = filePath;
  const rawRows = loadCsvRows(filePath);
  const issues = validateStructure(file, rawRows, REVIEW_QUEUE_COLUMNS);
  const rows: ReviewQueueRow[] = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = reviewQueueRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      pushZodIssues(file, rowNumber, parsed.error, issues);
      return;
    }
    rows.push(parsed.data);

    if (!REVIEW_GATED_STATUSES.has(parsed.data.review_status) && parsed.data.review_status !== "NOT_APPLICABLE") {
      issues.push({
        file,
        row: rowNumber,
        field: "review_status",
        message: "review-queue should only contain NEW, NEEDS_REVIEW, or NOT_APPLICABLE rows",
        severity: "warning",
      });
    }
  });

  return { issues, rows };
}

export function validateCoverageMatrixFile(
  filePath: string
): { issues: CatalogValidationIssue[]; rows: CoverageMatrixRow[] } {
  const file = filePath;
  const rawRows = loadCsvRows(filePath);
  const issues = validateStructure(file, rawRows, COVERAGE_MATRIX_COLUMNS);
  const rows: CoverageMatrixRow[] = [];
  const seen = new Map<string, number>();

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = coverageMatrixRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      pushZodIssues(file, rowNumber, parsed.error, issues);
      return;
    }
    rows.push(parsed.data);

    if (!MVP_NODE_SET.has(parsed.data.node_id)) {
      issues.push({
        file,
        row: rowNumber,
        field: "node_id",
        message: `Unknown MVP node_id (skill-extended): ${parsed.data.node_id}`,
        severity: "error",
      });
    }

    const key = coverageMatrixKey(parsed.data);
    const previous = seen.get(key);
    if (previous !== undefined) {
      issues.push({
        file,
        row: rowNumber,
        message: `Duplicate coverage matrix row (first seen on row ${previous})`,
        severity: "error",
      });
    } else {
      seen.set(key, rowNumber);
    }
  });

  return { issues, rows };
}

export function validateCrossFileRules(
  ctx: CatalogValidationContext
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];

  for (const row of ctx.staging) {
    if (!ctx.sourceKeys.has(row.source_key)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "source_key",
        message: `staging_row_key=${row.staging_row_key}: source_key ${row.source_key} missing from catalog-sources.csv`,
        severity: "error",
      });
    }
    if (!ctx.applicationKeys.has(row.staging_row_key)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "staging_row_key",
        message: `parts-staging row ${row.staging_row_key} missing from part-applications-staging.csv`,
        severity: "error",
      });
    }
  }

  for (const app of ctx.applications) {
    if (!ctx.stagingKeys.has(app.staging_row_key)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "staging_row_key",
        message: `application ${app.application_key} references unknown staging_row_key`,
        severity: "error",
      });
    }
    if (!ctx.sourceKeys.has(app.source_key)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "source_key",
        message: `application ${app.application_key}: source_key ${app.source_key} missing from catalog-sources.csv`,
        severity: "error",
      });
    }
  }

  for (const queue of ctx.reviewQueue) {
    if (!ctx.stagingKeys.has(queue.staging_row_key)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "staging_row_key",
        message: `review-queue row references unknown staging_row_key ${queue.staging_row_key}`,
        severity: "error",
      });
    }
  }

  const expectedNodes = new Set(SKILL_EXTENDED_MVP_NODES);
  const coveredNodes = new Set(ctx.coverage.map((row) => row.node_id));
  for (const node of expectedNodes) {
    if (!coveredNodes.has(node)) {
      issues.push({
        file: "cross-file",
        row: 0,
        field: "node_id",
        message: `coverage-matrix.csv missing MVP node ${node}`,
        severity: "error",
      });
    }
  }

  return issues;
}

export function validatePartsCatalog(input: CatalogValidationInput): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const ctx: CatalogValidationContext = {
    sources: [],
    staging: [],
    applications: [],
    reviewQueue: [],
    coverage: [],
    technicalMaster: loadTechnicalMasterCsv(input.technicalMasterPath ?? DEFAULT_TECHNICAL_MASTER_PATH),
    sourceKeys: new Set(),
    stagingKeys: new Set(),
    applicationKeys: new Set(),
  };

  if (!input.sourcesPath && !input.stagingPath && !input.applicationsPath) {
    throw new Error("At least one of --sources, --staging, or --applications is required");
  }

  if (input.sourcesPath) {
    const result = validateCatalogSourcesFile(input.sourcesPath);
    issues.push(...result.issues);
    ctx.sources = result.rows;
    ctx.sourceKeys = new Set(result.rows.map((row) => row.source_key));
  }

  if (input.stagingPath) {
    const result = validatePartsStagingFile(input.stagingPath, input.technicalMasterPath);
    issues.push(...result.issues);
    ctx.staging = result.rows;
    ctx.stagingKeys = new Set(result.rows.map((row) => row.staging_row_key));
  }

  if (input.applicationsPath) {
    const result = validatePartApplicationsFile(input.applicationsPath);
    issues.push(...result.issues);
    ctx.applications = result.rows;
    ctx.applicationKeys = new Set(result.rows.map((row) => row.application_key));
  }

  if (input.reviewQueuePath) {
    const result = validateReviewQueueFile(input.reviewQueuePath);
    issues.push(...result.issues);
    ctx.reviewQueue = result.rows;
  }

  if (input.coveragePath) {
    const result = validateCoverageMatrixFile(input.coveragePath);
    issues.push(...result.issues);
    ctx.coverage = result.rows;
  }

  if (input.stagingPath && input.applicationsPath) {
    issues.push(...validateCrossFileRules(ctx));
  } else if (input.stagingPath && !input.applicationsPath) {
    issues.push({
      file: "cross-file",
      row: 0,
      message: "part-applications-staging.csv is required when validating parts-staging.csv",
      severity: "error",
    });
  }

  if (input.stagingPath && input.sourcesPath === undefined) {
    issues.push({
      file: "cross-file",
      row: 0,
      message: "catalog-sources.csv is required when validating parts-staging.csv",
      severity: "error",
    });
  }

  return issues;
}