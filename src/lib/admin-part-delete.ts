import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AdminPartDeleteSkipWire,
} from "@mototwin/types";

type Tx = Prisma.TransactionClient;

const partMasterSelect = {
  id: true,
  brandName: true,
  sku: true,
  title: true,
  status: true,
  source: true,
} satisfies Prisma.PartMasterSelect;

export type PartMasterDeleteSnapshot = Prisma.PartMasterGetPayload<{
  select: typeof partMasterSelect;
}>;

async function deletePartMasterInTx(tx: Tx, partMasterId: string): Promise<PartMasterDeleteSnapshot> {
  const part = await tx.partMaster.findUnique({
    where: { id: partMasterId },
    select: partMasterSelect,
  });
  if (!part) {
    throw new Error("NOT_FOUND");
  }

  const skuRows = await tx.partSku.findMany({
    where: { partMasterId },
    select: { id: true },
  });
  const skuIds = skuRows.map((row) => row.id);

  if (skuIds.length > 0) {
    await tx.partWishlistItem.updateMany({
      where: { skuId: { in: skuIds } },
      data: { skuId: null },
    });

    try {
      await tx.partFitment.updateMany({
        where: { skuId: { in: skuIds }, primaryApplicationId: { not: null } },
        data: { primaryApplicationId: null },
      });
    } catch {
      // Older schemas without primaryApplicationId on PartFitment.
    }

    await tx.partOffer.deleteMany({ where: { skuId: { in: skuIds } } });
    await tx.partNumber.deleteMany({ where: { skuId: { in: skuIds } } });
    await tx.partSkuNodeLink.deleteMany({ where: { skuId: { in: skuIds } } });
    await tx.partFitment.deleteMany({ where: { skuId: { in: skuIds } } });
    await tx.partSku.deleteMany({ where: { id: { in: skuIds } } });
  }

  await tx.fitmentVote.deleteMany({ where: { report: { partMasterId } } });
  await tx.fitmentEvidence.deleteMany({ where: { report: { partMasterId } } });
  await tx.fitmentReport.deleteMany({ where: { partMasterId } });
  await tx.fitmentConfidence.deleteMany({ where: { partMasterId } });
  await tx.partMaster.delete({ where: { id: partMasterId } });

  return part;
}

export async function deletePartMasters(
  client: PrismaClient,
  ids: string[]
): Promise<{
  deleted: PartMasterDeleteSnapshot[];
  skipped: AdminPartDeleteSkipWire[];
}> {
  const uniqueIds = [...new Set(ids)];
  const deleted: PartMasterDeleteSnapshot[] = [];
  const skipped: AdminPartDeleteSkipWire[] = [];

  for (const id of uniqueIds) {
    try {
      const snapshot = await client.$transaction((tx) => deletePartMasterInTx(tx, id));
      deleted.push(snapshot);
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        skipped.push({ id, code: "NOT_FOUND", message: "Деталь не найдена" });
        continue;
      }
      skipped.push({
        id,
        code: "DELETE_FAILED",
        message: error instanceof Error ? error.message : "Не удалось удалить деталь",
      });
    }
  }

  return { deleted, skipped };
}