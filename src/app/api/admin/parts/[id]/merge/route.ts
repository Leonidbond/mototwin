import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";

const MergeSchema = z.object({
  intoPartMasterId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

/**
 * Merge `[id]` (the duplicate) **into** `intoPartMasterId` (the survivor).
 *
 * - Re-points fitment reports / confidences / SKUs / aliases to the survivor.
 * - Adds the duplicate's SKU as an alias on the survivor.
 * - Marks the duplicate `MERGED`.
 *
 * Mutating action — reserved for SUPER_ADMIN / CATALOG_MANAGER.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = MergeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    if (parsed.data.intoPartMasterId === id) {
      return NextResponse.json({ error: "Нельзя сливать в саму себя" }, { status: 400 });
    }

    const [duplicate, survivor] = await Promise.all([
      prisma.partMaster.findUnique({ where: { id } }),
      prisma.partMaster.findUnique({ where: { id: parsed.data.intoPartMasterId } }),
    ]);
    if (!duplicate || !survivor) {
      return NextResponse.json({ error: "Деталь не найдена" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.fitmentReport.updateMany({
        where: { partMasterId: duplicate.id },
        data: { partMasterId: survivor.id },
      });

      const dupConfidences = await tx.fitmentConfidence.findMany({
        where: { partMasterId: duplicate.id },
        select: { modelVariantId: true, nodeId: true, reportCount: true, confirmationCount: true },
      });
      for (const fc of dupConfidences) {
        await tx.fitmentConfidence.upsert({
          where: {
            partMasterId_modelVariantId_nodeId: {
              partMasterId: survivor.id,
              modelVariantId: fc.modelVariantId,
              nodeId: fc.nodeId,
            },
          },
          create: {
            partMasterId: survivor.id,
            modelVariantId: fc.modelVariantId,
            nodeId: fc.nodeId,
            reportCount: fc.reportCount,
            confirmationCount: fc.confirmationCount,
          },
          update: {
            reportCount: { increment: fc.reportCount },
            confirmationCount: { increment: fc.confirmationCount },
          },
        });
      }
      await tx.fitmentConfidence.deleteMany({ where: { partMasterId: duplicate.id } });

      await tx.partSku.updateMany({
        where: { partMasterId: duplicate.id },
        data: { partMasterId: survivor.id },
      });

      const dupAliases = await tx.partAlias.findMany({ where: { partMasterId: duplicate.id } });
      for (const alias of dupAliases) {
        await tx.partAlias.upsert({
          where: {
            partMasterId_normalized: {
              partMasterId: survivor.id,
              normalized: alias.normalized,
            },
          },
          create: {
            partMasterId: survivor.id,
            alias: alias.alias,
            normalized: alias.normalized,
            source: alias.source,
          },
          update: {},
        });
      }
      await tx.partAlias.deleteMany({ where: { partMasterId: duplicate.id } });

      const survivorOwnAlias = await tx.partAlias.findUnique({
        where: {
          partMasterId_normalized: {
            partMasterId: survivor.id,
            normalized: duplicate.normalizedSku,
          },
        },
      });
      if (!survivorOwnAlias) {
        await tx.partAlias.create({
          data: {
            partMasterId: survivor.id,
            alias: `${duplicate.brandName} ${duplicate.sku}`,
            normalized: duplicate.normalizedSku,
            source: "merge",
          },
        });
      }

      await tx.partMaster.update({
        where: { id: duplicate.id },
        data: { status: "MERGED" },
      });
    });

    await logAdminAction({
      actorId: ctx.userId,
      action: "part.merge",
      entityType: "PartMaster",
      entityId: duplicate.id,
      before: { duplicate, survivorId: survivor.id },
      after: { survivorId: survivor.id, status: "MERGED" },
      reason: parsed.data.reason,
    });

    revalidatePath("/admin/catalog");
    revalidatePath(`/admin/catalog/${duplicate.id}`);
    revalidatePath(`/admin/catalog/${survivor.id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/[id]/merge POST:", error);
    return NextResponse.json({ error: "Не удалось выполнить merge" }, { status: 500 });
  }
}
