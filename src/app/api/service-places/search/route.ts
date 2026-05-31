import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchServicePlaces } from "@/lib/service-place-search";
import { strictObject } from "@/lib/http/input-validation";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";

const searchParamsSchema = strictObject({
  query: z.string().trim().min(1).max(200),
  mode: z.enum(["AUTO", "ADDRESS", "ORGANIZATION"]).default("AUTO"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await getCurrentUserContext();
    const parsed = searchParamsSchema.parse({
      query: request.nextUrl.searchParams.get("query"),
      mode: request.nextUrl.searchParams.get("mode") ?? "AUTO",
      latitude: request.nextUrl.searchParams.get("latitude") ?? undefined,
      longitude: request.nextUrl.searchParams.get("longitude") ?? undefined,
    });

    const result = await searchServicePlaces({
      query: parsed.query,
      mode: parsed.mode,
      centerLonLat:
        parsed.latitude != null && parsed.longitude != null ? [parsed.longitude, parsed.latitude] : undefined,
      referer:
        request.headers.get("referer")?.trim() ||
        (request.headers.get("origin")?.trim() ? `${request.headers.get("origin")?.trim()}/` : null),
    });

    return NextResponse.json({
      places: result.places,
      meta: {
        query: parsed.query,
        mode: parsed.mode,
        source: result.source,
      },
      warning: result.warning,
    });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) return currentUserContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to search service places" }, { status: 500 });
  }
}
