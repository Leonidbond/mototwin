import { NextRequest, NextResponse } from "next/server";
import { buildPartMasterIdentity } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { parseSearchParamText } from "@/lib/http/input-validation";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // MT-SEC-073: previously unauthenticated → DoS via heavy fuzzy DB queries.
    const userCtx = await getCurrentUserContext();
    const decision = rateLimit({
      bucket: "part-master-duplicates",
      request,
      limit: 60,
      windowMs: 60_000,
      extraKey: userCtx.userId,
    });
    if (!decision.allowed) {
      return rateLimit429(decision);
    }
    const { searchParams } = new URL(request.url);
    // MT-SEC-072: bound input lengths before LIKE/contains hits the DB.
    const brandName = parseSearchParamText(searchParams.get("brandName"), { max: 120 }) ?? "";
    const sku = parseSearchParamText(searchParams.get("sku"), { max: 100 }) ?? "";
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
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("part-masters duplicates:", error);
    return NextResponse.json({ error: "Не удалось выполнить поиск дублей." }, { status: 500 });
  }
}
