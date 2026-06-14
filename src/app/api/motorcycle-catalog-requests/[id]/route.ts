import { NextResponse } from "next/server";
import type { MotorcycleCatalogRequestWire } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { toMotorcycleCatalogRequestWire } from "@/lib/motorcycle-catalog-request-wire";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userCtx = await getCurrentUserContext();
    const { id } = await context.params;
    const row = await prisma.motorcycleCatalogRequest.findFirst({
      where: { id, submittedByUserId: userCtx.userId },
      include: {
        motorcycleBrand: { select: { id: true, name: true } },
        motorcycleModelFamily: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, displayName: true, email: true } },
        _count: { select: { vehicles: true } },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Заявка не найдена." }, { status: 404 });
    }
    const payload: { request: MotorcycleCatalogRequestWire } = {
      request: toMotorcycleCatalogRequestWire(row),
    };
    return NextResponse.json(payload);
  } catch (error) {
    const authError = toCurrentUserContextErrorResponse(error);
    if (authError) return authError;
    console.error("GET /api/motorcycle-catalog-requests/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить заявку." }, { status: 500 });
  }
}
