import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { strictObject } from "@/lib/http/input-validation";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { buildServicePlaceSnapshot, servicePlaceRowToDto } from "@/lib/service-place";

const createServicePlaceSchema = strictObject({
  provider: z.string().trim().min(1).max(40),
  providerPlaceId: z.string().trim().min(1).max(200).nullable().optional(),
  type: z.enum(["ORGANIZATION", "ADDRESS", "CUSTOM"]),
  title: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  contact: strictObject({
    phone: z.string().trim().max(80).nullable().optional(),
    url: z.string().trim().max(400).nullable().optional(),
  })
    .nullable()
    .optional(),
  metadata: z.unknown().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserContext();
    const body = createServicePlaceSchema.parse(await parseJsonBody<unknown>(request, { maxBytes: 64 * 1024 }));
    const providerPlaceId = body.providerPlaceId?.trim() || null;

    let place = providerPlaceId
      ? await prisma.servicePlace.findFirst({
          where: {
            userId: currentUser.userId,
            provider: body.provider,
            providerPlaceId,
          },
        })
      : null;

    if (!place) {
      place = await prisma.servicePlace.create({
        data: {
          userId: currentUser.userId,
          provider: body.provider,
          providerPlaceId,
          type: body.type,
          title: body.title,
          address: body.address,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          category: body.category ?? null,
          contactPhone: body.contact?.phone ?? null,
          contactUrl: body.contact?.url ?? null,
          metadata: (body.metadata ?? null) as Prisma.InputJsonValue,
        },
      });
    }

    const dto = servicePlaceRowToDto(place);
    return NextResponse.json({
      place: dto,
      snapshot: buildServicePlaceSnapshot(dto),
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) return currentUserContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create service place" }, { status: 500 });
  }
}
