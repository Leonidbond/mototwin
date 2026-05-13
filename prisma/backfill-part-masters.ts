import type { PrismaClient } from "@prisma/client";
import { buildPartMasterIdentity, resolvePartMasterSkuLabel } from "@mototwin/domain";

/**
 * Ensures every {@link PartSku} has a {@link PartMaster} (admin-seeded identity).
 * Safe to run multiple times (idempotent for already-linked SKUs).
 */
export async function backfillPartMastersFromSkus(prisma: PrismaClient): Promise<{ created: number; linked: number }> {
  const skus = await prisma.partSku.findMany({
    where: { partMasterId: null },
    include: { partNumbers: { orderBy: { createdAt: "asc" as const }, take: 1 } },
  });
  let created = 0;
  let linked = 0;
  for (const sku of skus) {
    const skuLabel = resolvePartMasterSkuLabel({
      seedKey: sku.seedKey,
      canonicalName: sku.canonicalName,
      firstPartNumber: sku.partNumbers[0]?.number ?? null,
    });
    const { brandNormalized, normalizedSku } = buildPartMasterIdentity({
      brandName: sku.brandName,
      skuLabel,
    });

    const existing = await prisma.partMaster.findUnique({
      where: {
        normalizedSku_brandNormalized: { normalizedSku, brandNormalized },
      },
      select: { id: true },
    });
    const masterId =
      existing?.id ??
      (
        await prisma.partMaster.create({
          data: {
            brandName: sku.brandName.trim(),
            brandNormalized,
            sku: skuLabel,
            normalizedSku,
            title: sku.canonicalName.trim(),
            subcategory: sku.category?.trim() || null,
            description: sku.description?.trim() || null,
            source: "ADMIN",
            status: "ACTIVE",
            aliasesJson: [],
          },
          select: { id: true },
        })
      ).id;
    if (!existing) {
      created += 1;
    }
    await prisma.partSku.update({
      where: { id: sku.id },
      data: { partMasterId: masterId },
    });
    linked += 1;
  }
  return { created, linked };
}
