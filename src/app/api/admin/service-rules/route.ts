import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

const postSchema = strictObject({
  nodeId: z.string().min(1),
  intervalKm: z.number().int().min(0).nullable().optional(),
  intervalHours: z.number().int().min(0).nullable().optional(),
  intervalDays: z.number().int().min(0).nullable().optional(),
  triggerMode: z.enum(["WHICHEVER_COMES_FIRST", "ANY", "ALL"]).optional(),
  warningKm: z.number().int().min(0).nullable().optional(),
  warningHours: z.number().int().min(0).nullable().optional(),
  warningDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAnyAdmin();
    const [rules, serviceNodes] = await Promise.all([
      prisma.nodeMaintenanceRule.findMany({
        orderBy: { updatedAt: "desc" },
        take: 500,
        include: {
          node: { select: { id: true, code: true, name: true, level: true } },
        },
      }),
      prisma.node.findMany({
        where: { isActive: true, isServiceRelevant: true },
        select: { id: true, code: true, name: true, level: true },
        orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
      }),
    ]);
    const ruleNodeIds = new Set(rules.map((rule) => rule.nodeId));
    return NextResponse.json({
      rules: rules.map((rule) => ({
        id: rule.id,
        nodeId: rule.nodeId,
        nodeCode: rule.node.code,
        nodeName: rule.node.name,
        nodeLevel: rule.node.level,
        intervalKm: rule.intervalKm,
        intervalHours: rule.intervalHours,
        intervalDays: rule.intervalDays,
        triggerMode: rule.triggerMode,
        warningKm: rule.warningKm,
        warningHours: rule.warningHours,
        warningDays: rule.warningDays,
        isActive: rule.isActive,
        updatedAt: rule.updatedAt.toISOString(),
      })),
      serviceNodes: serviceNodes.map((node) => ({
        id: node.id,
        code: node.code,
        name: node.name,
        level: node.level,
        hasRule: ruleNodeIds.has(node.id),
      })),
    });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/service-rules GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить регламенты" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAnyAdmin();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const body = postSchema.parse(raw);

    const node = await prisma.node.findFirst({
      where: { id: body.nodeId, isActive: true, isServiceRelevant: true },
      select: { id: true, code: true, name: true },
    });
    if (!node) {
      return NextResponse.json({ error: "Узел не найден или не поддерживает регламент" }, { status: 404 });
    }

    const existing = await prisma.nodeMaintenanceRule.findUnique({
      where: { nodeId: body.nodeId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Для этого узла уже есть регламент. Отредактируйте его в списке." },
        { status: 409 }
      );
    }

    const hasInterval =
      body.intervalKm != null || body.intervalHours != null || body.intervalDays != null;
    if (!hasInterval) {
      return NextResponse.json(
        { error: "Укажите хотя бы один интервал: км, моточасы или дни" },
        { status: 400 }
      );
    }

    const rule = await prisma.nodeMaintenanceRule.create({
      data: {
        nodeId: body.nodeId,
        intervalKm: body.intervalKm ?? null,
        intervalHours: body.intervalHours ?? null,
        intervalDays: body.intervalDays ?? null,
        triggerMode: body.triggerMode ?? "WHICHEVER_COMES_FIRST",
        warningKm: body.warningKm ?? null,
        warningHours: body.warningHours ?? null,
        warningDays: body.warningDays ?? null,
        isActive: body.isActive ?? true,
      },
      include: { node: { select: { code: true, name: true } } },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    console.error("admin/service-rules POST:", error);
    return NextResponse.json({ error: "Не удалось создать регламент" }, { status: 500 });
  }
}
