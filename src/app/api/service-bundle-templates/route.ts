import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Список глобальных шаблонов комплексного сервиса (для выбора в форме bundle).
 */
export async function GET() {
  try {
    const templates = await prisma.serviceBundleTemplate.findMany({
      orderBy: { title: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            node: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        isRegulationBased: t.isRegulationBased,
        items: t.items.map((it) => ({
          id: it.id,
          templateId: it.templateId,
          nodeId: it.nodeId,
          defaultActionType: it.defaultActionType,
          isRequired: it.isRequired,
          sortOrder: it.sortOrder,
          node: it.node,
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch service bundle templates:", error);
    return NextResponse.json({ error: "Failed to fetch service bundle templates" }, { status: 500 });
  }
}
