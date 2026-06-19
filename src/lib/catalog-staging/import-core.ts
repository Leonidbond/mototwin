import type { Prisma, PrismaClient } from "@prisma/client";
import { PARTS_STAGING_COLUMNS } from "@mototwin/types";
import {
  type PartsStagingRow,
} from "../../../scripts/parts/parts-staging-schema";
import {
  buildMotorcycleResolverIndex,
  extractBaseUrl,
  resolveMotorcycleRefs,
} from "./motorcycle-resolve";
import { validateStagingRows } from "./validate-rows";
import { promoteCatalogApplication } from "./promote";
import {
  mapExtendedStagingFields,
  resolveImportBatch,
  resolveStagingRowKey,
} from "./application-fields";

export type ImportStagingSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  promoted: number;
};

export type ImportStagingRowResult = {
  rowIndex: number;
  action: "create" | "update" | "skip" | "error";
  status: "ok" | "warning" | "error";
  errorMessage: string | null;
  applicationId: string | null;
  resolveMessage: string | null;
};

export type ImportStagingOptions = {
  importBatch: string;
  dryRun?: boolean;
  autoPromoteApproved?: boolean;
};

function emptyOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapRowToApplicationData(
  row: PartsStagingRow,
  input: {
    importBatch: string;
    stagingRowKey: string;
    sourceId: string;
    nodeId: string;
    refs: ReturnType<typeof resolveMotorcycleRefs>;
  }
): Prisma.PartCatalogApplicationCreateInput {
  return {
    brand: row.brand.trim(),
    modelFamily: row.model_family.trim(),
    variant: row.variant.trim(),
    generationCode: row.generation.trim(),
    yearFrom: Number.parseInt(row.year_from, 10),
    yearTo: row.year_to.trim() ? Number.parseInt(row.year_to, 10) : null,
    market: row.market,
    motorcycleBrand: input.refs.motorcycleBrandId
      ? { connect: { id: input.refs.motorcycleBrandId } }
      : undefined,
    motorcycleModelFamily: input.refs.motorcycleModelFamilyId
      ? { connect: { id: input.refs.motorcycleModelFamilyId } }
      : undefined,
    motorcycleVariant: input.refs.motorcycleVariantId
      ? { connect: { id: input.refs.motorcycleVariantId } }
      : undefined,
    motorcycleGeneration: input.refs.motorcycleGenerationId
      ? { connect: { id: input.refs.motorcycleGenerationId } }
      : undefined,
    partManufacturer: row.part_manufacturer.trim(),
    partNumber: row.part_number.trim(),
    normalizedPartNumber: row.normalized_part_number.trim(),
    partName: row.part_name.trim(),
    partCategory: row.part_category.trim(),
    isOem: row.is_oem === "true",
    node: { connect: { id: input.nodeId } },
    nodeApplicability: row.node_applicability,
    applicationType: row.application_type,
    safetyCritical: row.safety_critical === "true",
    source: { connect: { id: input.sourceId } },
    sourceUrl: row.source_url.trim(),
    diagramName: emptyOptional(row.diagram_name),
    diagramPosition: emptyOptional(row.diagram_position),
    rawQuantity: emptyOptional(row.raw_quantity),
    rawNotes: emptyOptional(row.raw_notes),
    parsedAt: new Date(row.parsed_at),
    reviewStatus: row.review_status,
    confidence: row.confidence,
    importBatch: input.importBatch,
    stagingRowKey: input.stagingRowKey,
    ...mapExtendedStagingFields(row),
  };
}

async function upsertCatalogSource(
  prisma: PrismaClient,
  row: PartsStagingRow
): Promise<string> {
  const sourceKey = row.source_key.trim();
  const baseUrl = extractBaseUrl(row.source_url);

  if (sourceKey) {
    const byKey = await prisma.catalogSource.findUnique({
      where: { sourceKey },
      select: { id: true },
    });
    if (byKey) {
      await prisma.catalogSource.update({
        where: { id: byKey.id },
        data: {
          sourceName: row.source_name.trim(),
          sourceType: row.source_type,
          sourceRegion: row.source_region,
          baseUrl,
        },
      });
      return byKey.id;
    }
  }

  const existing = await prisma.catalogSource.findFirst({
    where: {
      sourceName: row.source_name.trim(),
      sourceType: row.source_type,
      sourceRegion: row.source_region,
      baseUrl,
    },
    select: { id: true, sourceKey: true },
  });
  if (existing) {
    if (sourceKey && !existing.sourceKey) {
      await prisma.catalogSource.update({
        where: { id: existing.id },
        data: { sourceKey },
      });
    }
    return existing.id;
  }

  const created = await prisma.catalogSource.create({
    data: {
      sourceKey: sourceKey || null,
      sourceName: row.source_name.trim(),
      sourceType: row.source_type,
      sourceRegion: row.source_region,
      baseUrl,
    },
    select: { id: true },
  });
  return created.id;
}

export async function importPartsStagingRows(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  options: ImportStagingOptions
): Promise<{ summary: ImportStagingSummary; rowResults: ImportStagingRowResult[] }> {
  const { issues, parsedRows } = validateStagingRows(rows, PARTS_STAGING_COLUMNS);
  if (issues.length > 0) {
    const message = issues
      .slice(0, 5)
      .map((i) => `row ${i.row}${i.field ? ` ${i.field}` : ""}: ${i.message}`)
      .join("; ");
    throw new Error(`Staging validation failed: ${message}`);
  }

  const index = await buildMotorcycleResolverIndex(prisma);
  const nodeByCode = new Map(
    (await prisma.node.findMany({ select: { id: true, code: true } })).map((n) => [n.code, n.id])
  );

  const summary: ImportStagingSummary = {
    total: parsedRows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    promoted: 0,
  };
  const rowResults: ImportStagingRowResult[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i]!;
    const rowIndex = i + 1;
    const nodeId = nodeByCode.get(row.node_id);
    if (!nodeId) {
      summary.errors += 1;
      rowResults.push({
        rowIndex,
        action: "error",
        status: "error",
        errorMessage: `Unknown node_id: ${row.node_id}`,
        applicationId: null,
        resolveMessage: null,
      });
      continue;
    }

    const refs = resolveMotorcycleRefs({
      brand: row.brand,
      modelFamily: row.model_family,
      variant: row.variant,
      generationCode: row.generation,
      yearFrom: Number.parseInt(row.year_from, 10),
      index,
    });

    if (options.dryRun) {
      rowResults.push({
        rowIndex,
        action: "create",
        status: refs.resolveStatus === "ok" ? "ok" : "warning",
        errorMessage: null,
        applicationId: null,
        resolveMessage: refs.resolveMessage,
      });
      summary.created += 1;
      continue;
    }

    try {
      const sourceId = await upsertCatalogSource(prisma, row);
      const importBatch = resolveImportBatch(row, options.importBatch);
      const stagingRowKey = resolveStagingRowKey(row);
      const existing = await prisma.partCatalogApplication.findUnique({
        where: {
          stagingRowKey_importBatch: { stagingRowKey, importBatch },
        },
        select: { id: true },
      });

      const data = mapRowToApplicationData(row, {
        importBatch,
        stagingRowKey,
        sourceId,
        nodeId,
        refs,
      });

      let applicationId: string;
      if (existing) {
        const updated = await prisma.partCatalogApplication.update({
          where: { id: existing.id },
          data: {
            ...data,
            source: { connect: { id: sourceId } },
            node: { connect: { id: nodeId } },
          },
          select: { id: true },
        });
        applicationId = updated.id;
        summary.updated += 1;
        rowResults.push({
          rowIndex,
          action: "update",
          status: refs.resolveStatus === "ok" ? "ok" : "warning",
          errorMessage: null,
          applicationId,
          resolveMessage: refs.resolveMessage,
        });
      } else {
        const created = await prisma.partCatalogApplication.create({
          data,
          select: { id: true },
        });
        applicationId = created.id;
        summary.created += 1;
        rowResults.push({
          rowIndex,
          action: "create",
          status: refs.resolveStatus === "ok" ? "ok" : "warning",
          errorMessage: null,
          applicationId,
          resolveMessage: refs.resolveMessage,
        });
      }

      if (
        options.autoPromoteApproved &&
        (row.review_status === "MANUAL_APPROVED" || row.review_status === "NOT_APPLICABLE")
      ) {
        await promoteCatalogApplication(prisma, applicationId);
        summary.promoted += 1;
      }
    } catch (error) {
      summary.errors += 1;
      rowResults.push({
        rowIndex,
        action: "error",
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        applicationId: null,
        resolveMessage: refs.resolveMessage,
      });
    }
  }

  return { summary, rowResults };
}

export { partsStagingRowSchema } from "../../../scripts/parts/parts-staging-schema";
