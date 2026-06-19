import type { AdminPartListFilters, AdminPartStatusWire } from "@mototwin/types";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminPartList } from "@/lib/admin-parts";
import { canMutate } from "@/lib/admin-auth";
import { PartsTable } from "./_components/PartsTable";
import { CreatePartButton } from "./_components/CreatePartButton";
import { ruAdmin } from "../_locales/ru";

const STATUSES: AdminPartStatusWire[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"];

interface AdminCatalogPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    brand?: string;
    source?: string;
    page?: string;
  }>;
}

export default async function AdminCatalogPage({ searchParams }: AdminCatalogPageProps) {
  const params = await searchParams;
  const filters: AdminPartListFilters = {
    q: params.q || undefined,
    status: STATUSES.includes(params.status as AdminPartStatusWire)
      ? (params.status as AdminPartStatusWire)
      : undefined,
    brand: params.brand || undefined,
    source: params.source === "ADMIN" || params.source === "USER" ? params.source : undefined,
  };
  const page = Number(params.page ?? 1);

  const [self, list] = await Promise.all([
    loadAdminSelf(),
    loadAdminPartList({ filters, page }),
  ]);

  return (
    <AdminPageChrome
      title={ruAdmin.nav.catalog}
      self={self}
      rightSlot={<CreatePartButton canMutate={canMutate(self.role)} />}
    >
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>
        <a href="/admin/catalog/staging">Staging каталога (parts-staging.csv)</a>
      </p>
      <AdminFilterBar
        fields={[
          { key: "q", label: "Поиск", search: true, placeholder: "Бренд, SKU или alias" },
          {
            key: "status",
            label: "Статус",
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            key: "source",
            label: "Источник",
            options: [
              { value: "ADMIN", label: "Каталог" },
              { value: "USER", label: "От пользователя" },
            ],
          },
        ]}
      />
      <PartsTable data={list} />
    </AdminPageChrome>
  );
}
