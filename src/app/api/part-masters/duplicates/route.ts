import { NextRequest, NextResponse } from "next/server";
import { buildPartMasterIdentity } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandName = searchParams.get("brandName")?.trim() ?? "";
    const sku = searchParams.get("sku")?.trim() ?? "";
    if (!brandName || !sku) {
      return NextResponse.json({ error: "Параметры brandName и sku обязательны." }, { status: 400 });
    }
    const { brandNormalized, normalizedSku } = buildPartMasterIdentity({ brandName, skuLabel: sku });

    const exact = await prisma.partMaster.findUnique({
      where: { normalizedSku_brandNormalized: { normalizedSku, brandNormalized } },
      select: {
        id: true,
        brandName: true,
        sku: true,
        title: true,
        status: true,
        source: true,
      },
    });

    const fuzzy = await prisma.partMaster.findMany({
      where: {
        OR: [
          { normalizedSku: { contains: normalizedSku.slice(0, Math.max(3, normalizedSku.length)) } },
          { sku: { contains: sku, mode: "insensitive" } },
        ],
        brandNormalized,
      },
      take: 8,
      select: {
        id: true,
        brandName: true,
        sku: true,
        title: true,
        status: true,
        source: true,
      },
    });

    const candidates = [];
    const seen = new Set<string>();
    if (exact) {
      candidates.push(exact);
      seen.add(exact.id);
    }
    for (const row of fuzzy) {
      if (!seen.has(row.id)) {
        candidates.push(row);
        seen.add(row.id);
      }
    }

    return NextResponse.json({
      normalizedSku,
      brandNormalized,
      candidates,
    });
  } catch (error) {
    console.error("part-masters duplicates:", error);
    return NextResponse.json({ error: "Не удалось выполнить поиск дублей." }, { status: 500 });
  }
}
