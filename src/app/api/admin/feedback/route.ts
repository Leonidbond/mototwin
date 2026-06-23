import { NextResponse } from "next/server";
import type { AdminFeedbackListFilters } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminFeedbackList } from "@/lib/admin-feedback";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const filters: AdminFeedbackListFilters = {
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      status: parseStatus(url.searchParams.get("status")),
      type: parseType(url.searchParams.get("type")),
      platform: parsePlatform(url.searchParams.get("platform")),
      pageKey: parseSearchParamText(url.searchParams.get("pageKey"), { max: 80 }) ?? undefined,
    };
    const page = parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 100_000, fallback: 1 });

    const list = await loadAdminFeedbackList({ filters, page });
    return NextResponse.json(list);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/feedback GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить обратную связь" }, { status: 500 });
  }
}

function parseStatus(value: string | null): AdminFeedbackListFilters["status"] {
  if (value === "NEW" || value === "IN_PROGRESS" || value === "RESOLVED" || value === "REJECTED") {
    return value;
  }
  return undefined;
}

function parseType(value: string | null): AdminFeedbackListFilters["type"] {
  if (value === "PROBLEM" || value === "IDEA" || value === "QUESTION") return value;
  return undefined;
}

function parsePlatform(value: string | null): AdminFeedbackListFilters["platform"] {
  if (value === "web" || value === "ios" || value === "android") return value;
  return undefined;
}
