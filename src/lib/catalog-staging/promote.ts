import type { PrismaClient } from "@prisma/client";
import {
  buildPartMasterIdentity,
  catalogConfidenceToNumeric,
  normalizePartNumber,
  parseRawQuantity,
} from "@mototwin/domain";

function partTypeFromCategory(category: string, applicationType: string): string {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized) return normalized.toUpperCase();
  if (applicationType === "SPECIFICATION_ONLY") return "SPECIFICATION";
  return "PART";
}

export async function promoteCatalogApplication(
  prisma: PrismaClient,
  applicationId: string
): Promise<{ skuId: string | null; fitmentId: string | null }> {
  const app = await prisma.partCatalogApplication.findUnique({
    where: { id: applicationId },
    include: {
      node: { select: { code: true } },
      source: true,
    },
  });
  if (!app) {
    throw new Error(`PartCatalogApplication not found: ${applicationId}`);
  }
  if (app.reviewStatus === "REJECTED" || app.reviewStatus === "DUPLICATE") {
    throw new Error(`Cannot promote application with reviewStatus=${app.reviewStatus}`);
  }

  if (app.nodeApplicability === "NOT_APPLICABLE") {
    const fitment = await upsertNotApplicableFitment(prisma, app);
    await prisma.partCatalogApplication.update({
      where: { id: app.id },
      data: {
        promotedFitmentId: fitment.id,
        promotedAt: new Date(),
      },
    });
    return { skuId: null, fitmentId: fitment.id };
  }

  if (app.applicationType === "SPECIFICATION_ONLY" && !app.normalizedPartNumber) {
    const sku = await upsertSpecificationSku(prisma, app);
    const fitment = await upsertFitmentForApplication(prisma, app, sku.id);
    await prisma.partCatalogApplication.update({
      where: { id: app.id },
      data: {
        promotedSkuId: sku.id,
        promotedFitmentId: fitment.id,
        promotedAt: new Date(),
      },
    });
    return { skuId: sku.id, fitmentId: fitment.id };
  }

  const sku = await upsertCatalogSku(prisma, app);
  await upsertPartSkuNodeLink(prisma, sku.id, app.nodeId, app.confidence);
  const fitment = await upsertFitmentForApplication(prisma, app, sku.id);

  await prisma.partCatalogApplication.update({
    where: { id: app.id },
    data: {
      promotedSkuId: sku.id,
      promotedFitmentId: fitment.id,
      promotedAt: new Date(),
    },
  });

  return { skuId: sku.id, fitmentId: fitment.id };
}

async function upsertPartMaster(
  prisma: PrismaClient,
  app: {
    partManufacturer: string;
    normalizedPartNumber: string;
    partName: string;
    partCategory: string;
  }
) {
  const skuLabel = app.normalizedPartNumber || app.partName;
  const identity = buildPartMasterIdentity({
    brandName: app.partManufacturer,
    skuLabel,
  });

  return prisma.partMaster.upsert({
    where: {
      normalizedSku_brandNormalized: {
        normalizedSku: identity.normalizedSku,
        brandNormalized: identity.brandNormalized,
      },
    },
    create: {
      brandName: app.partManufacturer,
      brandNormalized: identity.brandNormalized,
      sku: identity.skuLabel,
      normalizedSku: identity.normalizedSku,
      title: app.partName,
      subcategory: app.partCategory || null,
      source: "ADMIN",
      status: "ACTIVE",
    },
    update: {
      title: app.partName,
      subcategory: app.partCategory || null,
      status: "ACTIVE",
    },
    select: { id: true },
  });
}

async function upsertCatalogSku(
  prisma: PrismaClient,
  app: {
    id: string;
    partManufacturer: string;
    normalizedPartNumber: string;
    partName: string;
    partCategory: string;
    isOem: boolean;
    nodeId: string;
    sourceUrl: string;
    rawQuantity: string | null;
    applicationType: string;
  }
) {
  const partMaster = await upsertPartMaster(prisma, app);
  const seedKey = `STAGING_${app.normalizedPartNumber}_${app.nodeId}`;
  const defaultQuantity = parseRawQuantity(app.rawQuantity);
  const partType = partTypeFromCategory(app.partCategory, app.applicationType);

  const sku = await prisma.partSku.upsert({
    where: { seedKey },
    create: {
      seedKey,
      partMasterId: partMaster.id,
      primaryNodeId: app.nodeId,
      brandName: app.partManufacturer,
      canonicalName: app.partName,
      partType,
      category: app.partCategory,
      catalogCategory: app.partCategory,
      sourceUrl: app.sourceUrl,
      isOem: app.isOem,
      defaultQuantity,
      isActive: true,
    },
    update: {
      partMasterId: partMaster.id,
      primaryNodeId: app.nodeId,
      brandName: app.partManufacturer,
      canonicalName: app.partName,
      partType,
      category: app.partCategory,
      catalogCategory: app.partCategory,
      sourceUrl: app.sourceUrl,
      isOem: app.isOem,
      defaultQuantity,
      isActive: true,
    },
    select: { id: true },
  });

  if (app.normalizedPartNumber) {
    const numberType = app.isOem ? "OEM" : "MANUFACTURER";
    await prisma.partNumber.upsert({
      where: {
        skuId_normalizedNumber_numberType: {
          skuId: sku.id,
          normalizedNumber: app.normalizedPartNumber,
          numberType,
        },
      },
      create: {
        skuId: sku.id,
        number: app.normalizedPartNumber,
        normalizedNumber: app.normalizedPartNumber,
        numberType,
        brandName: app.partManufacturer,
      },
      update: {
        number: app.normalizedPartNumber,
        brandName: app.partManufacturer,
      },
    });
  }

  return sku;
}

async function upsertSpecificationSku(
  prisma: PrismaClient,
  app: {
    id: string;
    partManufacturer: string;
    partNumber: string;
    normalizedPartNumber: string;
    partName: string;
    partCategory: string;
    isOem: boolean;
    nodeId: string;
    sourceUrl: string;
    rawQuantity: string | null;
    applicationType: string;
  }
) {
  const token = normalizePartNumber(app.partNumber || app.partName).slice(0, 40) || "SPEC";
  const seedKey = `STAGING_SPEC_${token}_${app.nodeId}`;
  const defaultQuantity = parseRawQuantity(app.rawQuantity);

  return prisma.partSku.upsert({
    where: { seedKey },
    create: {
      seedKey,
      primaryNodeId: app.nodeId,
      brandName: app.partManufacturer,
      canonicalName: app.partName,
      partType: "SPECIFICATION",
      category: app.partCategory,
      catalogCategory: app.partCategory,
      sourceUrl: app.sourceUrl,
      isOem: app.isOem,
      defaultQuantity,
      isActive: true,
    },
    update: {
      primaryNodeId: app.nodeId,
      canonicalName: app.partName,
      category: app.partCategory,
      catalogCategory: app.partCategory,
      sourceUrl: app.sourceUrl,
      defaultQuantity,
      isActive: true,
    },
    select: { id: true },
  });
}

async function upsertPartSkuNodeLink(
  prisma: PrismaClient,
  skuId: string,
  nodeId: string,
  confidence: "HIGH" | "MEDIUM" | "LOW"
) {
  await prisma.partSkuNodeLink.upsert({
    where: {
      skuId_nodeId_relationType: {
        skuId,
        nodeId,
        relationType: "PRIMARY",
      },
    },
    create: {
      skuId,
      nodeId,
      relationType: "PRIMARY",
      confidence: catalogConfidenceToNumeric(confidence),
    },
    update: {
      confidence: catalogConfidenceToNumeric(confidence),
    },
  });
}

async function upsertFitmentForApplication(
  prisma: PrismaClient,
  app: {
    id: string;
    motorcycleBrandId: string | null;
    motorcycleModelFamilyId: string | null;
    motorcycleVariantId: string | null;
    motorcycleGenerationId: string | null;
    market: string;
    applicationType: string;
    safetyCritical: boolean;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    rawNotes: string | null;
    nodeId: string;
  },
  skuId: string
) {
  const numericConfidence = catalogConfidenceToNumeric(app.confidence);
  const existing = await prisma.partFitment.findFirst({
    where: {
      skuId,
      motorcycleGenerationId: app.motorcycleGenerationId,
      motorcycleVariantId: app.motorcycleVariantId,
      motorcycleModelFamilyId: app.motorcycleModelFamilyId,
      motorcycleBrandId: app.motorcycleBrandId,
      market: app.market,
    },
    select: { id: true },
  });

  const data = {
    skuId,
    motorcycleBrandId: app.motorcycleBrandId,
    motorcycleModelFamilyId: app.motorcycleModelFamilyId,
    motorcycleVariantId: app.motorcycleVariantId,
    motorcycleGenerationId: app.motorcycleGenerationId,
    market: app.market,
    fitmentType: app.applicationType,
    confidence: numericConfidence,
    note: app.rawNotes,
    applicationType: app.applicationType,
    safetyCritical: app.safetyCritical,
    catalogConfidence: app.confidence,
    primaryApplicationId: app.id,
  };

  if (existing) {
    return prisma.partFitment.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return prisma.partFitment.create({
    data,
    select: { id: true },
  });
}

async function upsertNotApplicableFitment(
  prisma: PrismaClient,
  app: {
    id: string;
    motorcycleBrandId: string | null;
    motorcycleModelFamilyId: string | null;
    motorcycleVariantId: string | null;
    motorcycleGenerationId: string | null;
    market: string;
    nodeId: string;
    rawNotes: string | null;
  }
) {
  const placeholderSeed = `NOT_APPLICABLE_${app.nodeId}_${app.motorcycleGenerationId ?? "generic"}`;
  const sku = await prisma.partSku.upsert({
    where: { seedKey: placeholderSeed },
    create: {
      seedKey: placeholderSeed,
      brandName: "MotoTwin",
      canonicalName: "Not applicable",
      partType: "NOT_APPLICABLE",
      primaryNodeId: app.nodeId,
      isOem: false,
      isActive: false,
    },
    update: {},
    select: { id: true },
  });

  const existing = await prisma.partFitment.findFirst({
    where: {
      skuId: sku.id,
      motorcycleGenerationId: app.motorcycleGenerationId,
      market: app.market,
    },
    select: { id: true },
  });

  const data = {
    skuId: sku.id,
    motorcycleBrandId: app.motorcycleBrandId,
    motorcycleModelFamilyId: app.motorcycleModelFamilyId,
    motorcycleVariantId: app.motorcycleVariantId,
    motorcycleGenerationId: app.motorcycleGenerationId,
    market: app.market,
    fitmentType: "NOT_APPLICABLE",
    confidence: 100,
    note: app.rawNotes,
    applicationType: null,
    safetyCritical: false,
    catalogConfidence: null,
    primaryApplicationId: app.id,
  };

  if (existing) {
    return prisma.partFitment.update({ where: { id: existing.id }, data, select: { id: true } });
  }
  return prisma.partFitment.create({ data, select: { id: true } });
}

export async function approveAndPromoteCatalogApplication(
  prisma: PrismaClient,
  applicationId: string
): Promise<{ skuId: string | null; fitmentId: string | null }> {
  await prisma.partCatalogApplication.update({
    where: { id: applicationId },
    data: { reviewStatus: "MANUAL_APPROVED" },
  });
  return promoteCatalogApplication(prisma, applicationId);
}
