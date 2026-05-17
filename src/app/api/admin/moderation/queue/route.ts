import { NextResponse } from "next/server";
import type { AdminModerationQueueKey } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminModerationQueue } from "@/lib/admin-moderation";

const VALID: AdminModerationQueueKey[] = [
  "pendingMasters",
  "pendingReports",
  "needsReviewReports",
  "safetyCriticalReports",
  "hiddenReports",
  "rejectedReports",
  "mixedFitments",
];

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const queueParam = url.searchParams.get("queue") ?? "pendingReports";
    const queue = (VALID.includes(queueParam as AdminModerationQueueKey)
      ? queueParam
      : "pendingReports") as AdminModerationQueueKey;
    const data = await loadAdminModerationQueue(queue);
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/moderation/queue:", error);
    return NextResponse.json({ error: "Не удалось загрузить очередь" }, { status: 500 });
  }
}
