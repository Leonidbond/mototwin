import { NextResponse } from "next/server";
import type { AdminFeedbackExportFilters } from "@mototwin/types";
import { getPageHelpTitle } from "@mototwin/domain";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { buildFeedbackWhere } from "@/lib/admin-feedback";
import { prisma } from "@/lib/prisma";
import { parseSearchParamText } from "@/lib/http/input-validation";

const MAX_EXPORT_ROWS = 10_000;

/**
 * Export feedback as NDJSON (one JSON object per line) for offline / AI
 * processing (decision #4). Supports the same filters as the list plus a
 * `ids` selection and a created-at date range.
 */
export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);

    const idsRaw = url.searchParams.get("ids");
    const ids = idsRaw
      ? idsRaw.split(",").map((value) => value.trim()).filter(Boolean).slice(0, MAX_EXPORT_ROWS)
      : undefined;

    const filters: AdminFeedbackExportFilters = {
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      status: parseStatus(url.searchParams.get("status")),
      type: parseType(url.searchParams.get("type")),
      platform: parsePlatform(url.searchParams.get("platform")),
      pageKey: parseSearchParamText(url.searchParams.get("pageKey"), { max: 80 }) ?? undefined,
      dateFrom: parseSearchParamText(url.searchParams.get("dateFrom"), { max: 40 }) ?? undefined,
      dateTo: parseSearchParamText(url.searchParams.get("dateTo"), { max: 40 }) ?? undefined,
      ids,
    };

    const where = buildFeedbackWhere(filters);
    const rows = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT_ROWS,
      select: {
        id: true,
        createdAt: true,
        type: true,
        status: true,
        pageKey: true,
        platform: true,
        routePath: true,
        message: true,
        appVersion: true,
        locale: true,
        vehicleId: true,
        submittedByUserId: true,
      },
    });

    const ndjson = rows
      .map((row) =>
        JSON.stringify({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          type: row.type,
          status: row.status,
          page: getPageHelpTitle(row.pageKey),
          pageKey: row.pageKey,
          platform: row.platform,
          routePath: row.routePath,
          message: row.message,
          appVersion: row.appVersion,
          locale: row.locale,
          vehicleId: row.vehicleId,
          userId: row.submittedByUserId,
        })
      )
      .join("\n");

    const fileName = `feedback-${new Date().toISOString().slice(0, 10)}.ndjson`;

    return new NextResponse(ndjson, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/feedback/export GET:", error);
    return NextResponse.json({ error: "Не удалось экспортировать обращения" }, { status: 500 });
  }
}

function parseStatus(value: string | null): AdminFeedbackExportFilters["status"] {
  if (value === "NEW" || value === "IN_PROGRESS" || value === "RESOLVED" || value === "REJECTED") {
    return value;
  }
  return undefined;
}

function parseType(value: string | null): AdminFeedbackExportFilters["type"] {
  if (value === "PROBLEM" || value === "IDEA" || value === "QUESTION") return value;
  return undefined;
}

function parsePlatform(value: string | null): AdminFeedbackExportFilters["platform"] {
  if (value === "web" || value === "ios" || value === "android") return value;
  return undefined;
}
