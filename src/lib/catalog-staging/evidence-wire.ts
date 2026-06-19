import type { CatalogEvidenceWire } from "@mototwin/types";
import type { PartCatalogApplication, CatalogSource } from "@prisma/client";
import {
  resolveEvidenceLevel,
  resolveRegionMatchStatus,
  resolveSourceModelCode,
  resolveVerificationRegion,
} from "./application-fields";

type ApplicationWithSource = PartCatalogApplication & { source: CatalogSource };

export function mapCatalogApplicationToEvidenceWire(
  app: ApplicationWithSource
): CatalogEvidenceWire {
  return {
    id: app.id,
    applicationType: app.applicationType,
    sourceName: app.source.sourceName,
    sourceType: app.source.sourceType,
    sourceRegion: app.source.sourceRegion,
    sourceUrl: app.sourceUrl,
    diagramName: app.diagramName,
    diagramPosition: app.diagramPosition,
    rawQuantity: app.rawQuantity,
    rawNotes: app.rawNotes,
    reviewStatus: app.reviewStatus,
    confidence: app.confidence,
    safetyCritical: app.safetyCritical,
    market: app.market,
    parsedAt: app.parsedAt.toISOString(),
    sourceKey: app.sourceKey ?? app.source.sourceKey,
    sourceModelCode: resolveSourceModelCode(app),
    sourceYear: app.sourceYear,
    verificationRegion: resolveVerificationRegion(app),
    evidenceLevel: resolveEvidenceLevel(app),
    regionMatchStatus: resolveRegionMatchStatus(app),
    supersessionStatus: app.supersessionStatus,
    verifiedAt: app.verifiedAt?.toISOString() ?? null,
    parserVersion: app.parserVersion,
    importBatch: app.importBatch,
  };
}

export function buildDiagramHintRu(evidence: CatalogEvidenceWire): string | null {
  if (!evidence.diagramName?.trim() && !evidence.diagramPosition?.trim()) return null;
  const parts: string[] = [];
  if (evidence.diagramName?.trim()) parts.push(evidence.diagramName.trim());
  if (evidence.diagramPosition?.trim()) parts.push(`поз. ${evidence.diagramPosition.trim()}`);
  return `EPC: ${parts.join(", ")}`;
}

export function buildProvenanceLineRu(evidence: CatalogEvidenceWire): string {
  const region =
    evidence.sourceRegion && evidence.sourceRegion !== "GLOBAL"
      ? ` (${evidence.sourceRegion})`
      : "";
  return `${evidence.sourceName}${region}`;
}
