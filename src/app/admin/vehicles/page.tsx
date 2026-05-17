import type { AdminVehicleListFilters, AdminVehicleSortKey } from "@mototwin/types";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminVehicleList } from "@/lib/admin-vehicles";
import { VehiclesTable } from "./_components/VehiclesTable";
import { prisma } from "@/lib/prisma";
import { ruAdmin } from "../_locales/ru";

interface AdminVehiclesPageProps {
  searchParams: Promise<{
    brandId?: string;
    modelId?: string;
    year?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AdminVehiclesPage({ searchParams }: AdminVehiclesPageProps) {
  const params = await searchParams;
  const filters: AdminVehicleListFilters = {
    brandId: params.brandId || undefined,
    modelId: params.modelId || undefined,
    year: parseInt(params.year ?? "", 10) || undefined,
    q: params.q || undefined,
    sort: parseSort(params.sort),
  };
  const page = Number(params.page ?? 1);

  const [self, list, brands, years] = await Promise.all([
    loadAdminSelf(),
    loadAdminVehicleList({ filters, page }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.modelVariant.findMany({
      orderBy: { year: "desc" },
      select: { year: true },
      distinct: ["year"],
    }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.vehicles} self={self}>
      <AdminFilterBar
        fields={[
          { key: "q", label: "Поиск", search: true, placeholder: "VIN, имя, никнейм" },
          {
            key: "brandId",
            label: "Бренд",
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          {
            key: "year",
            label: "Год",
            options: years.map((y) => ({ value: String(y.year), label: String(y.year) })),
          },
          {
            key: "sort",
            label: "Сортировка",
            options: [
              { value: "createdAtDesc", label: "Новые сначала" },
              { value: "lastActivityDesc", label: "По активности" },
              { value: "odometerDesc", label: "По пробегу" },
            ],
          },
        ]}
      />
      <VehiclesTable data={list} />
    </AdminPageChrome>
  );
}

function parseSort(value: string | undefined): AdminVehicleSortKey | undefined {
  if (value === "createdAtDesc" || value === "lastActivityDesc" || value === "odometerDesc") {
    return value;
  }
  return undefined;
}
