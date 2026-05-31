import { NextResponse } from "next/server";
import type {
  AdminUserListFilters,
  AdminRoleWire,
} from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminUserList } from "@/lib/admin-users";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    // MT-SEC-071: cap free-form search; multi-table ILIKE is expensive.
    const filters: AdminUserListFilters = {
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      plan: parsePlan(url.searchParams.get("plan")),
      hasVehicles: parseHasVehicles(url.searchParams.get("hasVehicles")),
      role: parseRole(url.searchParams.get("role")),
      status: parseStatus(url.searchParams.get("status")),
    };
    const page = parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 });
    const data = await loadAdminUserList({ filters, page });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/users:", error);
    return NextResponse.json({ error: "Не удалось загрузить пользователей" }, { status: 500 });
  }
}

function parsePlan(value: string | null): AdminUserListFilters["plan"] {
  if (value === "FREE" || value === "RIDER" || value === "PRO" || value === "all") return value;
  return undefined;
}

function parseHasVehicles(value: string | null): AdminUserListFilters["hasVehicles"] {
  if (value === "yes" || value === "no") return value;
  return undefined;
}

function parseRole(value: string | null): AdminUserListFilters["role"] {
  if (
    value === "SUPER_ADMIN" ||
    value === "CATALOG_MANAGER" ||
    value === "MODERATOR" ||
    value === "ANALYST" ||
    value === "all"
  ) {
    return value as AdminRoleWire | "all";
  }
  return undefined;
}

function parseStatus(value: string | null): AdminUserListFilters["status"] {
  if (value === "active" || value === "blocked" || value === "all") return value;
  return undefined;
}
