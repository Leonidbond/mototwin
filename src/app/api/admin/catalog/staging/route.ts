import { NextResponse } from "next/server";
import type { ReviewStatus } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadCatalogStagingList } from "@/lib/admin-catalog-staging";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

const REVIEW_STATUSES: ReviewStatus[] = [
  "NEW",
  "NEEDS_REVIEW",
  "MANUAL_APPROVED",
  "REJECTED",
  "DUPLICATE",
  "NOT_APPLICABLE",
];

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const reviewStatus = url.searchParams.get("reviewStatus");
    const data = await loadCatalogStagingList({
      reviewStatus: REVIEW_STATUSES.includes(reviewStatus as ReviewStatus)
        ? (reviewStatus as ReviewStatus)
        : undefined,
      brand: parseSearchParamText(url.searchParams.get("brand"), { max: 120 }) ?? undefined,
      nodeCode: parseSearchParamText(url.searchParams.get("nodeCode"), { max: 120 }) ?? undefined,
      importBatch: parseSearchParamText(url.searchParams.get("importBatch"), { max: 120 }) ?? undefined,
      page: parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 }),
    });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/catalog/staging:", error);
    return NextResponse.json({ error: "Не удалось загрузить staging" }, { status: 500 });
  }
}
