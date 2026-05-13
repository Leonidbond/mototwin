import type { PrismaClient } from "@prisma/client";
import { normalizePartNumber } from "@mototwin/domain";

/**
 * After a service event with line-item SKU text, suggest creating a community fitment report
 * when matching catalog rows exist.
 */
export async function buildSuggestFitmentReportPayload(
  prisma: PrismaClient,
  input: {
    vehicleId: string;
    serviceEventId: string;
    items: Array<{ nodeId: string; sku: string | null }>;
  }
): Promise<{
  serviceEventId: string;
  suggestions: Array<{ nodeId: string; skuId: string | null; partMasterId: string | null; label: string }>;
} | null> {
  const suggestions: Array<{ nodeId: string; skuId: string | null; partMasterId: string | null; label: string }> =
    [];
  for (const item of input.items) {
    const skuText = item.sku?.trim();
    if (!skuText) {
      continue;
    }
    const normalized = normalizePartNumber(skuText);
    const skuRow = await prisma.partSku.findFirst({
      where: {
        isActive: true,
        OR: [
          { partNumbers: { some: { normalizedNumber: normalized } } },
          { partNumbers: { some: { number: { equals: skuText, mode: "insensitive" } } } },
          { seedKey: { equals: skuText, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        partMasterId: true,
        canonicalName: true,
        brandName: true,
      },
    });
    if (!skuRow?.partMasterId) {
      continue;
    }
    suggestions.push({
      nodeId: item.nodeId,
      skuId: skuRow.id,
      partMasterId: skuRow.partMasterId,
      label: `${skuRow.brandName} — ${skuRow.canonicalName}`,
    });
  }
  if (suggestions.length === 0) {
    return null;
  }
  return { serviceEventId: input.serviceEventId, suggestions };
}
