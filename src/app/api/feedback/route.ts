import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "../_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

// MT-SEC-068/069: strict schema + body cap. Free-text is length-bounded; the
// auto-context fields come from the client but `userId`/`userAgent` are
// overwritten server-side so a client cannot spoof them.
const submitFeedbackSchema = strictObject({
  type: z.enum(["PROBLEM", "IDEA", "QUESTION"]),
  message: boundedText({ min: 5, max: 5_000 }),
  pageKey: boundedText({ min: 1, max: 80 }),
  platform: z.enum(["web", "ios", "android"]),
  routePath: boundedText({ min: 1, max: 512 }),
  appVersion: boundedTextOptional({ max: 64 }),
  locale: boundedTextOptional({ max: 16 }),
  vehicleId: boundedTextOptional({ max: 64 }),
  // Client-provided UA is ignored in favor of the request header.
  userAgent: boundedTextOptional({ max: 512 }),
});

export async function POST(request: NextRequest) {
  try {
    // Auth required: anonymous feedback is not accepted (decision #1).
    const current = await getCurrentUserContext();

    const raw = await parseJsonBody<unknown>(request, { maxBytes: 16 * 1024 });
    const data = submitFeedbackSchema.parse(raw);

    const requestHeaders = await headers();
    const serverUserAgent = requestHeaders.get("user-agent") ?? null;

    const created = await prisma.feedback.create({
      data: {
        status: "NEW",
        type: data.type,
        message: data.message,
        pageKey: data.pageKey,
        platform: data.platform,
        routePath: data.routePath,
        appVersion: data.appVersion ?? null,
        locale: data.locale ?? null,
        vehicleId: data.vehicleId ?? null,
        userAgent: serverUserAgent,
        submittedByUserId: current.userId,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json(
      { id: created.id, createdAt: created.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("Failed to submit feedback:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
