/** Normalize catalog display name for duplicate checks (case/whitespace insensitive). */
export function normalizeMotorcycleCatalogName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** URL-safe slug for motorcycle catalog entities. */
export function slugifyMotorcycleCatalogValue(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Build a human-readable years label from year range. */
export function buildMotorcycleYearsLabel(yearFrom: number, yearTo: number | null): string {
  if (yearTo != null && yearTo !== yearFrom) {
    return `${yearFrom}–${yearTo}`;
  }
  return `${yearFrom}–`;
}

/** Default generation name for user-submitted catalog entries. */
export function buildMotorcycleGenerationName(yearFrom: number, yearTo: number | null): string {
  if (yearTo != null && yearTo !== yearFrom) {
    return `${yearFrom}–${yearTo}`;
  }
  return String(yearFrom);
}
