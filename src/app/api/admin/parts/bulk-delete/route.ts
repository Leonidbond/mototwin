import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { deletePartMasters } from "@/lib/admin-part-delete";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

const BulkDeleteSchema = strictObject({
  ids: z.array(z.string().min(1).max(64)).min(1).max(50),
  reason: z.string().min(3).max(500),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const body = await parseJsonBody<unknown>(request, { maxBytes: 16 * 1024 });
    const parsed = BulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const { deleted, skipped } = await deletePartMasters(prisma, parsed.data.ids);

    if (deleted.length > 0) {
      await logAdminAction({
        actorId: ctx.userId,
        action: deleted.length === 1 ? "part.delete" : "part.bulk_delete",
        entityType: "PartMaster",
        entityId: deleted[0]!.id,
        before: {
          requestedIds: parsed.data.ids,
          deleted: deleted.map((row) => ({
            id: row.id,
            brandName: row.brandName,
            sku: row.sku,
            title: row.title,
          })),
          skipped,
        },
        after: { deletedIds: deleted.map((row) => row.id) },
        reason: parsed.data.reason,
      });

      revalidatePath("/admin/catalog");
      for (const row of deleted) {
        revalidatePath(`/admin/catalog/${row.id}`);
      }
    }

    return NextResponse.json({
      deleted: deleted.map((row) => row.id),
      skipped,
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/bulk-delete POST:", error);
    return NextResponse.json({ error: "Не удалось удалить детали" }, { status: 500 });
  }
}
