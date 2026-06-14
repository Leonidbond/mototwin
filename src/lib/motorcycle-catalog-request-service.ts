import type { MotorcycleCatalogRequest, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  resolveCatalogRequestFields,
  upsertCatalogFromResolvedFields,
  type CatalogRequestResolvedFields,
} from "@/lib/motorcycle-catalog-request-approve";
import { notifyCatalogRequestDecision } from "@/lib/catalog-request-notifications";
import { createCatalogRequestSchema } from "@/lib/motorcycle-catalog-request-validation";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export class CatalogRequestAlreadyExistsError extends Error {
  readonly generationId: string;

  constructor(generationId: string) {
    super("Такая модель уже есть в каталоге — выберите её из списка.");
    this.name = "CatalogRequestAlreadyExistsError";
    this.generationId = generationId;
  }
}

export class CatalogRequestValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CatalogRequestValidationError";
    this.status = status;
  }
}

type CreateCatalogRequestBody = z.infer<typeof createCatalogRequestSchema>;

const catalogRequestInclude = {
  motorcycleBrand: { select: { id: true, name: true } },
  motorcycleModelFamily: { select: { id: true, name: true } },
  submittedBy: { select: { id: true, displayName: true, email: true } },
  _count: { select: { vehicles: true } },
} as const;

async function resolveVariantName(
  variantId: string | null,
  variantName: string | null
): Promise<string> {
  if (variantName?.trim()) {
    return variantName.trim();
  }
  if (!variantId) {
    throw new CatalogRequestValidationError("Укажите модификацию или выберите из списка.");
  }
  const variant = await prisma.motorcycleVariant.findUnique({
    where: { id: variantId },
    select: { name: true },
  });
  if (!variant) {
    throw new CatalogRequestValidationError("Модификация не найдена.", 404);
  }
  return variant.name;
}

export async function createMotorcycleCatalogRequestForUser(input: {
  userId: string;
  body: CreateCatalogRequestBody;
  tx?: TxClient;
}): Promise<{ request: MotorcycleCatalogRequest; isNew: boolean }> {
  const db = input.tx ?? prisma;
  const brandId = input.body.motorcycleBrandId?.trim() || null;
  const familyId = input.body.motorcycleModelFamilyId?.trim() || null;
  const brandName = input.body.brandName?.trim() || null;
  const familyName = input.body.familyName?.trim() || null;
  const variantId = input.body.motorcycleVariantId?.trim() || null;
  const variantName = await resolveVariantName(variantId, input.body.variantName?.trim() || null);
  const yearFrom = input.body.yearFrom;
  const yearTo = input.body.yearTo ?? null;

  if (brandId) {
    const brand = await db.motorcycleBrand.findFirst({
      where: { id: brandId, isCatalogPlaceholder: false },
    });
    if (!brand) {
      throw new CatalogRequestValidationError("Марка не найдена.", 404);
    }
  }

  if (familyId) {
    const family = await db.motorcycleModelFamily.findFirst({
      where: {
        id: familyId,
        ...(brandId ? { brandId } : {}),
      },
      include: { brand: { select: { isCatalogPlaceholder: true } } },
    });
    if (!family || family.brand.isCatalogPlaceholder) {
      throw new CatalogRequestValidationError("Модель не найдена.", 404);
    }
  }

  if (variantId) {
    const variant = await db.motorcycleVariant.findFirst({
      where: {
        id: variantId,
        ...(familyId ? { familyId } : {}),
      },
    });
    if (!variant) {
      throw new CatalogRequestValidationError("Модификация не найдена.", 404);
    }
  }

  const duplicatePending = await db.motorcycleCatalogRequest.findFirst({
    where: {
      submittedByUserId: input.userId,
      status: "PENDING",
      variantName: { equals: variantName, mode: "insensitive" },
      yearFrom,
      yearTo,
      ...(brandId ? { motorcycleBrandId: brandId } : {}),
      ...(familyId ? { motorcycleModelFamilyId: familyId } : {}),
      ...(brandName ? { brandName: { equals: brandName, mode: "insensitive" } } : {}),
      ...(familyName ? { familyName: { equals: familyName, mode: "insensitive" } } : {}),
    },
  });
  if (duplicatePending) {
    return { request: duplicatePending, isNew: false };
  }

  const resolvedBrandName =
    brandName ??
    (brandId
      ? (
          await db.motorcycleBrand.findUnique({
            where: { id: brandId },
            select: { name: true },
          })
        )?.name ?? null
      : null);
  const resolvedFamilyName =
    familyName ??
    (familyId
      ? (
          await db.motorcycleModelFamily.findUnique({
            where: { id: familyId },
            select: { name: true },
          })
        )?.name ?? null
      : null);

  if (resolvedBrandName && resolvedFamilyName) {
    const existingGeneration = await db.motorcycleGeneration.findFirst({
      where: {
        yearFrom,
        yearTo,
        variant: {
          name: { equals: variantName, mode: "insensitive" },
          family: {
            name: { equals: resolvedFamilyName, mode: "insensitive" },
            brand: {
              name: { equals: resolvedBrandName, mode: "insensitive" },
              isCatalogPlaceholder: false,
            },
          },
        },
      },
      select: { id: true },
    });
    if (existingGeneration) {
      throw new CatalogRequestAlreadyExistsError(existingGeneration.id);
    }
  }

  const request = await db.motorcycleCatalogRequest.create({
    data: {
      submittedByUserId: input.userId,
      motorcycleBrandId: brandId,
      motorcycleModelFamilyId: familyId,
      brandName,
      familyName,
      variantName,
      yearFrom,
      yearTo,
      userComment: input.body.userComment?.trim() || null,
      resolvedBrandName,
      resolvedFamilyName,
      resolvedVariantName: variantName,
      resolvedYearFrom: yearFrom,
      resolvedYearTo: yearTo,
    },
  });

  return { request, isNew: true };
}

export async function approveMotorcycleCatalogRequest(input: {
  requestId: string;
  reviewerUserId: string;
  overrides?: Partial<CatalogRequestResolvedFields>;
  moderationComment?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.motorcycleCatalogRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) {
      throw new Error("NOT_FOUND");
    }
    if (request.status !== "PENDING") {
      throw new Error("NOT_PENDING");
    }

    const fields = resolveCatalogRequestFields(request, input.overrides);
    const { generation } = await upsertCatalogFromResolvedFields(
      tx as TxClient,
      request,
      input.overrides
    );

    await tx.motorcycleCatalogRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        resolvedBrandName: fields.brandName,
        resolvedFamilyName: fields.familyName,
        resolvedVariantName: fields.variantName,
        resolvedYearFrom: fields.yearFrom,
        resolvedYearTo: fields.yearTo,
        moderationComment: input.moderationComment?.trim() || null,
        resolvedGenerationId: generation.id,
        reviewedByUserId: input.reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    const vehicles = await tx.vehicle.updateMany({
      where: { pendingCatalogRequestId: request.id },
      data: {
        motorcycleBrandId: generation.variant.family.brand.id,
        motorcycleModelFamilyId: generation.variant.family.id,
        motorcycleVariantId: generation.variant.id,
        motorcycleGenerationId: generation.id,
        pendingCatalogRequestId: null,
      },
    });

    return {
      request,
      fields,
      generationId: generation.id,
      vehicleCount: vehicles.count,
    };
  });

  await notifyCatalogRequestDecision({
    userId: result.request.submittedByUserId,
    requestId: result.request.id,
    decision: "APPROVED",
    brandName: result.fields.brandName,
    familyName: result.fields.familyName,
    variantName: result.fields.variantName,
    moderationComment: input.moderationComment,
  });

  return result;
}

export async function rejectMotorcycleCatalogRequest(input: {
  requestId: string;
  reviewerUserId: string;
  moderationComment: string;
}) {
  const comment = input.moderationComment.trim();
  if (!comment) {
    throw new Error("COMMENT_REQUIRED");
  }

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.motorcycleCatalogRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) {
      throw new Error("NOT_FOUND");
    }
    if (request.status !== "PENDING") {
      throw new Error("NOT_PENDING");
    }

    const updated = await tx.motorcycleCatalogRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        moderationComment: comment,
        reviewedByUserId: input.reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    return updated;
  });

  const display = resolveCatalogRequestFields(result);

  await notifyCatalogRequestDecision({
    userId: result.submittedByUserId,
    requestId: result.id,
    decision: "REJECTED",
    brandName: display.brandName,
    familyName: display.familyName,
    variantName: display.variantName,
    moderationComment: comment,
  });

  return result;
}

export async function saveMotorcycleCatalogRequestDraft(input: {
  requestId: string;
  overrides: Partial<CatalogRequestResolvedFields>;
  moderationComment?: string;
}) {
  const request = await prisma.motorcycleCatalogRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!request || request.status !== "PENDING") {
    throw new Error("NOT_FOUND");
  }

  const fields = resolveCatalogRequestFields(request, input.overrides);

  return prisma.motorcycleCatalogRequest.update({
    where: { id: input.requestId },
    data: {
      resolvedBrandName: fields.brandName,
      resolvedFamilyName: fields.familyName,
      resolvedVariantName: fields.variantName,
      resolvedYearFrom: fields.yearFrom,
      resolvedYearTo: fields.yearTo,
      moderationComment: input.moderationComment?.trim() || request.moderationComment,
    },
  });
}

export { catalogRequestInclude };
