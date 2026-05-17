"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_CACHE_TAGS } from "@/lib/admin-cache";
import { requireAnyAdmin } from "@/lib/admin-auth";

/**
 * Server action that invalidates the admin cache for a given subroute.
 * Acceptable inputs:
 *   - "" (empty / undefined) → /admin
 *   - "users" or "/users" → /admin/users
 *
 * Also revalidates the dashboard cache tags so KPIs/aggregates re-fetch.
 */
export async function revalidateAdminAction(path?: string): Promise<void> {
  await requireAnyAdmin();
  const normalized = (path ?? "").replace(/^\/+/, "");
  const target = normalized ? `/admin/${normalized}` : "/admin";
  revalidatePath(target);
  // Refresh dashboard data sources eagerly even when called from a sub-page.
  for (const tag of Object.values(ADMIN_CACHE_TAGS)) {
    revalidateTag(tag, "max");
  }
}
