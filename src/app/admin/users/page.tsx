import type { AdminUserListFilters } from "@mototwin/types";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminUserList } from "@/lib/admin-users";
import { UsersTable } from "./_components/UsersTable";
import { ruAdmin } from "../_locales/ru";

interface AdminUsersPageProps {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    hasVehicles?: string;
    role?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const filters: AdminUserListFilters = {
    q: params.q || undefined,
    plan: parsePlan(params.plan),
    hasVehicles: parseHasVehicles(params.hasVehicles),
    role: parseRole(params.role),
  };
  const page = Number(params.page ?? 1);

  const [self, list] = await Promise.all([
    loadAdminSelf(),
    loadAdminUserList({ filters, page }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.users} self={self}>
      <AdminFilterBar
        fields={[
          { key: "q", label: "Поиск", search: true, placeholder: "Имя или email" },
          {
            key: "plan",
            label: "План",
            options: [
              { value: "FREE", label: "FREE" },
              { value: "PRO", label: "PRO" },
            ],
          },
          {
            key: "hasVehicles",
            label: "Мотоциклы",
            options: [
              { value: "yes", label: "С мотоциклами" },
              { value: "no", label: "Без мотоциклов" },
            ],
          },
          {
            key: "role",
            label: "Роль в админке",
            options: [
              { value: "SUPER_ADMIN", label: "Super Admin" },
              { value: "CATALOG_MANAGER", label: "Catalog Manager" },
              { value: "MODERATOR", label: "Moderator" },
              { value: "ANALYST", label: "Analyst" },
            ],
          },
        ]}
      />
      <UsersTable data={list} />
    </AdminPageChrome>
  );
}

function parsePlan(value: string | undefined): AdminUserListFilters["plan"] {
  if (value === "FREE" || value === "PRO" || value === "all") return value;
  return undefined;
}
function parseHasVehicles(value: string | undefined): AdminUserListFilters["hasVehicles"] {
  if (value === "yes" || value === "no") return value;
  return undefined;
}
function parseRole(value: string | undefined): AdminUserListFilters["role"] {
  if (
    value === "SUPER_ADMIN" ||
    value === "CATALOG_MANAGER" ||
    value === "MODERATOR" ||
    value === "ANALYST" ||
    value === "all"
  ) {
    return value as AdminUserListFilters["role"];
  }
  return undefined;
}
