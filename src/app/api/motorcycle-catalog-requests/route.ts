import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  CreateMotorcycleCatalogRequestResponse,
  MotorcycleCatalogRequestsResponse,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { ensureCatalogPlaceholder } from "@/lib/motorcycle-catalog-placeholder";
import { createCatalogRequestSchema } from "@/lib/motorcycle-catalog-request-validation";
import {
  CatalogRequestAlreadyExistsError,
  CatalogRequestValidationError,
  catalogRequestInclude,
  createMotorcycleCatalogRequestForUser,
} from "@/lib/motorcycle-catalog-request-service";
import { toMotorcycleCatalogRequestWire } from "@/lib/motorcycle-catalog-request-wire";

export async function GET() {
  try {
    const userCtx = await getCurrentUserContext();
    const rows = await prisma.motorcycleCatalogRequest.findMany({
      where: { submittedByUserId: userCtx.userId },
      orderBy: { createdAt: "desc" },
      include: catalogRequestInclude,
    });
    const payload: MotorcycleCatalogRequestsResponse = {
      requests: rows.map(toMotorcycleCatalogRequestWire),
    };
    return NextResponse.json(payload);
  } catch (error) {
    const authError = toCurrentUserContextErrorResponse(error);
    if (authError) return authError;
    console.error("GET /api/motorcycle-catalog-requests:", error);
    return NextResponse.json({ error: "Не удалось загрузить заявки." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const body = createCatalogRequestSchema.parse(raw);

    const { request: created, isNew } = await createMotorcycleCatalogRequestForUser({
      userId: userCtx.userId,
      body,
    });

    const placeholder = await ensureCatalogPlaceholder(prisma);
    const row = await prisma.motorcycleCatalogRequest.findUniqueOrThrow({
      where: { id: created.id },
      include: catalogRequestInclude,
    });

    const payload: CreateMotorcycleCatalogRequestResponse = {
      request: toMotorcycleCatalogRequestWire(row),
      placeholderGenerationId: placeholder.generationId,
    };
    return NextResponse.json(payload, { status: isNew ? 201 : 200 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const authError = toCurrentUserContextErrorResponse(error);
    if (authError) return authError;
    if (error instanceof CatalogRequestAlreadyExistsError) {
      return NextResponse.json(
        { error: error.message, generationId: error.generationId },
        { status: 409 }
      );
    }
    if (error instanceof CatalogRequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("POST /api/motorcycle-catalog-requests:", error);
    return NextResponse.json({ error: "Не удалось создать заявку." }, { status: 500 });
  }
}
