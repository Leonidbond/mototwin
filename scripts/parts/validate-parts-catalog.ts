/**
 * Unified MotoTwin parts catalog validator (5 CSV contract files).
 *
 * Run:
 *   npm run parts:catalog:validate -- \
 *     --sources data/parts/bmw/r-1300-gs/catalog-sources.csv \
 *     --staging data/parts/bmw/r-1300-gs/parts-staging.csv \
 *     --applications data/parts/bmw/r-1300-gs/part-applications-staging.csv \
 *     --review-queue data/parts/bmw/r-1300-gs/review-queue.csv \
 *     --coverage data/parts/bmw/r-1300-gs/coverage-matrix.csv
 */
import path from "node:path";
import {
  validatePartsCatalog,
  type CatalogValidationInput,
  type CatalogValidationIssue,
} from "./catalog-validate-core";

function parseArgs(argv: string[]): CatalogValidationInput {
  const input: CatalogValidationInput = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    if (arg === "--sources" && next) {
      input.sourcesPath = next;
      i++;
    } else if (arg === "--staging" && next) {
      input.stagingPath = next;
      i++;
    } else if (arg === "--applications" && next) {
      input.applicationsPath = next;
      i++;
    } else if (arg === "--review-queue" && next) {
      input.reviewQueuePath = next;
      i++;
    } else if (arg === "--coverage" && next) {
      input.coveragePath = next;
      i++;
    } else if (arg === "--technical-master" && next) {
      input.technicalMasterPath = next;
      i++;
    }
  }
  return input;
}

function printIssues(issues: CatalogValidationIssue[]) {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  for (const issue of errors) {
    const location = issue.field ? `row ${issue.row}, ${issue.field}` : `row ${issue.row}`;
    console.error(`ERROR ${issue.file} ${location}: ${issue.message}`);
  }
  for (const issue of warnings) {
    const location = issue.field ? `row ${issue.row}, ${issue.field}` : `row ${issue.row}`;
    console.warn(`WARN  ${issue.file} ${location}: ${issue.message}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("OK  all catalog files passed validation");
  } else {
    console.error(`Validation finished: ${errors.length} error(s), ${warnings.length} warning(s)`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

function main() {
  const input = parseArgs(process.argv.slice(2));
  if (!input.stagingPath && !input.sourcesPath && !input.applicationsPath) {
    throw new Error(
      "Usage: npm run parts:catalog:validate -- --sources <catalog-sources.csv> --staging <parts-staging.csv> --applications <part-applications-staging.csv> [--review-queue ...] [--coverage ...]"
    );
  }

  const resolved: CatalogValidationInput = {
    ...input,
    sourcesPath: input.sourcesPath ? path.resolve(input.sourcesPath) : undefined,
    stagingPath: input.stagingPath ? path.resolve(input.stagingPath) : undefined,
    applicationsPath: input.applicationsPath ? path.resolve(input.applicationsPath) : undefined,
    reviewQueuePath: input.reviewQueuePath ? path.resolve(input.reviewQueuePath) : undefined,
    coveragePath: input.coveragePath ? path.resolve(input.coveragePath) : undefined,
    technicalMasterPath: input.technicalMasterPath
      ? path.resolve(input.technicalMasterPath)
      : undefined,
  };

  const issues = validatePartsCatalog(resolved);
  printIssues(issues);
}

main();
