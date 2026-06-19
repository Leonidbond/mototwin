/**
 * Validates parts-staging.csv against MotoTwin catalog rules.
 * Thin wrapper around catalog-validate-core for backward compatibility.
 *
 * Run: pnpm parts:validate -- data/parts/bmw/r-1300-gs/parts-staging.csv
 */
import path from "node:path";
import { validatePartsStagingFile } from "./catalog-validate-core";

function parseArgs(argv: string[]): string[] {
  const files = argv.filter((arg) => !arg.startsWith("-"));
  if (files.length === 0) {
    throw new Error(
      "Usage: pnpm parts:validate -- <path/to/parts-staging.csv> [more files...]"
    );
  }
  return files;
}

function main() {
  const files = parseArgs(process.argv.slice(2));
  let totalIssues = 0;

  for (const file of files) {
    const { issues } = validatePartsStagingFile(path.resolve(file));
    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length === 0) {
      console.log(`OK  ${path.resolve(file)}`);
      continue;
    }

    totalIssues += errors.length;
    console.error(`FAIL ${path.resolve(file)} (${errors.length} issue(s))`);
    for (const issue of errors) {
      const location = issue.field ? `row ${issue.row}, ${issue.field}` : `row ${issue.row}`;
      console.error(`  - ${location}: ${issue.message}`);
    }
  }

  if (totalIssues > 0) {
    process.exit(1);
  }
}

main();
