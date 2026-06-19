import fs from "node:fs";
import path from "node:path";

export type TechnicalMasterRow = {
  brand: string;
  modelFamily: string;
  variant: string;
  generation: string;
  yearFrom: number;
  yearTo: number | null;
  drive: string;
  sourceUrl: string;
};

export function loadTechnicalMasterCsv(filePath: string): TechnicalMasterRow[] {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim());
  const index = (name: string) => headers.indexOf(name);

  const brandIdx = index("brand");
  const familyIdx = index("model_family");
  const variantIdx = index("variant");
  const generationIdx = index("generation");
  const yearFromIdx = index("year_from");
  const yearToIdx = index("year_to");
  const driveIdx = index("drive");
  const sourceUrlIdx = index("source_url");

  const rows: TechnicalMasterRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const yearFrom = Number.parseInt(cols[yearFromIdx] ?? "", 10);
    if (!Number.isFinite(yearFrom)) continue;
    const yearToRaw = (cols[yearToIdx] ?? "").trim();
    const yearTo = yearToRaw ? Number.parseInt(yearToRaw, 10) : null;
    rows.push({
      brand: cols[brandIdx] ?? "",
      modelFamily: cols[familyIdx] ?? "",
      variant: cols[variantIdx] ?? "",
      generation: cols[generationIdx] ?? "",
      yearFrom,
      yearTo: yearTo && Number.isFinite(yearTo) ? yearTo : null,
      drive: (cols[driveIdx] ?? "").trim().toUpperCase(),
      sourceUrl: cols[sourceUrlIdx] ?? "",
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export function findTechnicalMasterMatch(
  rows: TechnicalMasterRow[],
  input: { brand: string; modelFamily: string; variant: string; yearFrom: number }
): TechnicalMasterRow | null {
  const brand = input.brand.trim().toLowerCase();
  const family = input.modelFamily.trim().toLowerCase();
  const variantCandidates = [
    input.variant.trim().toLowerCase(),
    input.modelFamily.trim().toLowerCase(),
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  const candidates = rows.filter((row) => {
    if (row.brand.toLowerCase() !== brand) return false;
    if (row.modelFamily.toLowerCase() !== family) return false;
    return variantCandidates.includes(row.variant.toLowerCase());
  });
  if (candidates.length === 0) return null;

  const inYearRange = candidates.filter((row) => {
    if (input.yearFrom < row.yearFrom) return false;
    if (row.yearTo !== null && input.yearFrom > row.yearTo) return false;
    return true;
  });

  return inYearRange[0] ?? candidates[0] ?? null;
}

export const DEFAULT_TECHNICAL_MASTER_PATH = path.join(
  process.cwd(),
  "prisma/seed-data/bmw-model-technical-master.csv"
);
