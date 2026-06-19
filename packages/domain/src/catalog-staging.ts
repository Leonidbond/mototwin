import type { CatalogConfidence, PartRecommendationViewModel, StagingMarket } from "@mototwin/types";

/** Maps staging enum confidence to numeric PartFitment.confidence for sorting. */
export function catalogConfidenceToNumeric(confidence: CatalogConfidence): number {
  switch (confidence) {
    case "HIGH":
      return 90;
    case "MEDIUM":
      return 70;
    case "LOW":
      return 50;
    default:
      return 70;
  }
}

/** Parses raw_quantity like "1", "2", "5.0 l max" into a positive integer or null. */
export function parseRawQuantity(rawQuantity: string | null | undefined): number | null {
  const trimmed = rawQuantity?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Whether catalog market matches vehicle MotoMarketRegion (GLOBAL always matches). */
export function isCatalogMarketCompatible(
  catalogMarket: StagingMarket | string | null | undefined,
  vehicleMarket: string | null | undefined
): boolean {
  const cat = (catalogMarket ?? "").trim().toUpperCase();
  if (!cat || cat === "GLOBAL") return true;
  const vehicle = (vehicleMarket ?? "").trim().toUpperCase();
  if (!vehicle || vehicle === "GLOBAL" || vehicle === "OTHER") return true;
  return cat === vehicle;
}

/** Key=value pairs from raw_notes staging metadata. */
export function parseRawNotesMetadata(rawNotes: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  const text = rawNotes?.trim();
  if (!text) return result;
  for (const segment of text.split(";")) {
    const part = segment.trim();
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

export function formatCatalogConfidenceTierRu(confidence: CatalogConfidence): string {
  switch (confidence) {
    case "HIGH":
      return "Высокая уверенность каталога";
    case "MEDIUM":
      return "Средняя уверенность каталога";
    case "LOW":
      return "Низкая уверенность каталога";
    default:
      return "Уверенность каталога";
  }
}

export function formatSourceTypeRu(sourceType: string): string {
  switch (sourceType) {
    case "OFFICIAL_EPC":
      return "Официальная EPC";
    case "OFFICIAL_PUBLIC_CATALOG":
      return "Официальный каталог";
    case "OFFICIAL_DEALER_PUBLIC_CATALOG":
      return "Публичный дилерский каталог";
    case "AUTHORIZED_DEALER":
      return "Авторизованный дилер";
    case "REFERENCE_ONLY":
      return "Справочный источник";
    default:
      return sourceType;
  }
}

export function formatApplicationTypeRu(applicationType: string): string {
  switch (applicationType) {
    case "OEM_REPLACEMENT":
      return "OEM замена";
    case "OEM_SERVICE_ITEM":
      return "Расходник ТО";
    case "SPECIFICATION_ONLY":
      return "Только спецификация";
    case "COMPATIBLE_AFTERMARKET":
      return "Совместимый аналог";
    case "COMMUNITY_REPORTED":
      return "Сообщество";
    default:
      return applicationType;
  }
}

export function formatEvidenceLevelRu(level: string): string {
  switch (level) {
    case "A":
      return "Уровень доказательности A (официальный первичный источник)";
    case "B":
      return "Уровень доказательности B (дилерский/EPC каталог)";
    case "C":
      return "Уровень доказательности C (косвенное подтверждение)";
    case "D":
      return "Уровень доказательности D (справочно)";
    default:
      return `Уровень доказательности ${level}`;
  }
}

export function formatRegionMatchStatusRu(status: string): string {
  switch (status) {
    case "TARGET_REGION_MATCH":
      return "Совпадение целевого рынка";
    case "CROSS_REGION_MATCH":
      return "Кросс-региональное подтверждение";
    case "REGION_MISMATCH":
      return "Несовпадение рынка источника";
    case "UNKNOWN":
      return "Рынок не определён";
    default:
      return status;
  }
}

/** User-facing provenance lines for picker cards. */
export function getPickerCatalogProvenanceLinesRu(
  rec: PartRecommendationViewModel
): string[] {
  const lines: string[] = [];
  const evidence = rec.catalogEvidence[0];
  if (rec.applicationType) {
    lines.push(formatApplicationTypeRu(rec.applicationType));
  }
  if (evidence?.evidenceLevel) {
    lines.push(formatEvidenceLevelRu(evidence.evidenceLevel));
  }
  if (evidence?.confidence) {
    lines.push(formatCatalogConfidenceTierRu(evidence.confidence));
  }
  if (evidence?.regionMatchStatus) {
    lines.push(formatRegionMatchStatusRu(evidence.regionMatchStatus));
  }
  if (rec.marketMismatch) {
    lines.push("Источник из другого рынка");
  }
  if (evidence?.diagramName || evidence?.diagramPosition) {
    const parts = [evidence.diagramName, evidence.diagramPosition ? `поз. ${evidence.diagramPosition}` : null]
      .filter(Boolean)
      .join(", ");
    lines.push(`EPC: ${parts}`);
  }
  if (evidence?.sourceUrl) {
    lines.push(`${formatSourceTypeRu(evidence.sourceType)} · ${evidence.sourceName}`);
  }
  if (rec.recommendedQuantity != null && rec.recommendedQuantity > 0) {
    lines.push(`Рекомендуемое кол-во: ${rec.recommendedQuantity}`);
  }
  if (rec.catalogSafetyCritical) {
    lines.push("Критично для безопасности");
  }
  return lines;
}
