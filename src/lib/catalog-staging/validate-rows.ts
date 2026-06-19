import type { PartsStagingRow } from "../../../scripts/parts/parts-staging-schema";
import {
  SAFETY_CRITICAL_NODES,
  duplicateKey,
  normalizePartNumber,
  partsStagingRowSchema,
} from "../../../scripts/parts/parts-staging-schema";

export type StagingValidationIssue = {
  row: number;
  field?: string;
  message: string;
};

export function validateStagingStructure(
  rows: Record<string, string>[],
  columns: readonly string[]
): StagingValidationIssue[] {
  const issues: StagingValidationIssue[] = [];
  if (rows.length === 0) {
    issues.push({ row: 0, message: "CSV has no data rows" });
    return issues;
  }
  const headers = Object.keys(rows[0] ?? {});
  for (const column of columns) {
    if (!headers.includes(column)) {
      issues.push({ row: 0, field: column, message: `Missing required column: ${column}` });
    }
  }
  return issues;
}

export function validateStagingRowRules(rowNumber: number, row: PartsStagingRow): StagingValidationIssue[] {
  const issues: StagingValidationIssue[] = [];

  if (row.node_applicability === "NOT_APPLICABLE") {
    if (row.part_number.trim() || row.normalized_part_number.trim()) {
      issues.push({
        row: rowNumber,
        field: "part_number",
        message: "NOT_APPLICABLE rows must not contain part numbers",
      });
    }
  }

  if (row.node_applicability === "APPLICABLE" && row.application_type !== "SPECIFICATION_ONLY") {
    if (!row.part_number.trim() || !row.normalized_part_number.trim()) {
      issues.push({
        row: rowNumber,
        field: "part_number",
        message: "APPLICABLE OEM rows require part_number and normalized_part_number",
      });
    }
  }

  if (row.part_number.trim()) {
    const expected = normalizePartNumber(row.part_number);
    if (row.normalized_part_number !== expected) {
      issues.push({
        row: rowNumber,
        field: "normalized_part_number",
        message: `Expected normalized_part_number=${expected}, got ${row.normalized_part_number}`,
      });
    }
  }

  if (SAFETY_CRITICAL_NODES.has(row.node_id) && row.safety_critical !== "true") {
    issues.push({
      row: rowNumber,
      field: "safety_critical",
      message: `${row.node_id} must have safety_critical=true`,
    });
  }

  if (row.source_region === "US" && row.market === "GLOBAL") {
    issues.push({
      row: rowNumber,
      field: "market",
      message: "US-only source must not use market=GLOBAL",
    });
  }

  if (row.source_region === "US" && row.confidence === "HIGH") {
    issues.push({
      row: rowNumber,
      field: "confidence",
      message: "US-only source must not use confidence=HIGH without EU/RU cross-check",
    });
  }

  return issues;
}

export function validateStagingRows(
  rows: Record<string, string>[],
  columns: readonly string[]
): { issues: StagingValidationIssue[]; parsedRows: PartsStagingRow[] } {
  const issues = validateStagingStructure(rows, columns);
  const parsedRows: PartsStagingRow[] = [];
  const seen = new Map<string, number>();

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const parsed = partsStagingRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          row: rowNumber,
          field: issue.path.join("."),
          message: issue.message,
        });
      }
      return;
    }
    issues.push(...validateStagingRowRules(rowNumber, parsed.data));
    parsedRows.push(parsed.data);

    if (parsed.data.normalized_part_number.trim()) {
      const key = duplicateKey(parsed.data);
      const previous = seen.get(key);
      if (previous !== undefined) {
        issues.push({
          row: rowNumber,
          message: `Duplicate row for node/part (first seen on row ${previous})`,
        });
      } else {
        seen.set(key, rowNumber);
      }
    }
  });

  return { issues, parsedRows };
}
