import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePartNumber } from "@mototwin/domain";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

const CreateAliasSchema = z
  .object({
    alias: z.string().min(1).max(80),
    source: z.string().max(40).optional(),
  })
  .strict();

const DeleteAliasSchema = z.object({ aliasId: z.string().min(1).max(64) }).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const { id } = await context.params;
    const body = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const parsed = CreateAliasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const normalized = normalizePartNumber(parsed.data.alias);
    if (!normalized) {
      return NextResponse.json({ error: "Неверный alias" }, { status: 400 });
    }
    const created = await prisma.partAlias.upsert({
      where: { partMasterId_normalized: { partMasterId: id, normalized } },
      update: { alias: parsed.data.alias, source: parsed.data.source ?? "admin" },
      create: {
        partMasterId: id,
        alias: parsed.data.alias,
        normalized,
        source: parsed.data.source ?? "admin",
      },
    });
    await logAdminAction({
      actorId: ctx.userId,
      action: "part.alias.add",
      entityType: "PartMaster",
      entityId: id,
      after: { aliasId: created.id, alias: created.alias },
    });
    return NextResponse.json(created);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/[id]/aliases POST:", error);
    return NextResponse.json({ error: "Не удалось добавить alias" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const { id } = await context.params;
    const body = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const parsed = DeleteAliasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Не указан aliasId" }, { status: 400 });
    }
    const deleted = await prisma.partAlias.delete({
      where: { id: parsed.data.aliasId },
    });
    await logAdminAction({
      actorId: ctx.userId,
      action: "part.alias.delete",
      entityType: "PartMaster",
      entityId: id,
      before: { aliasId: deleted.id, alias: deleted.alias },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/[id]/aliases DELETE:", error);
    return NextResponse.json({ error: "Не удалось удалить alias" }, { status: 500 });
  }
}
