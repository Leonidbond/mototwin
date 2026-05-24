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
    motorcycleBrandId?: string;
    motorcycleModelFamilyId?: string;
    motorcycleVariantId?: string;
    motorcycleGenerationId?: string;
    year?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AdminVehiclesPage({ searchParams }: AdminVehiclesPageProps) {
  const params = await searchParams;
  const filters: AdminVehicleListFilters = {
    motorcycleBrandId: params.motorcycleBrandId || undefined,
    motorcycleModelFamilyId: params.motorcycleModelFamilyId || undefined,
    motorcycleVariantId: params.motorcycleVariantId || undefined,
    motorcycleGenerationId: params.motorcycleGenerationId || undefined,
    year: parseInt(params.year ?? "", 10) || undefined,
    q: params.q || undefined,
    sort: parseSort(params.sort),
  };
  const page = Number(params.page ?? 1);

  const [self, list, brands, yearRows] = await Promise.all([
    loadAdminSelf(),
    loadAdminVehicleList({ filters, page }),
    prisma.motorcycleBrand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.motorcycleGeneration.findMany({
      orderBy: { yearFrom: "desc" },
      select: { yearFrom: true },
      distinct: ["yearFrom"],
    }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.vehicles} self={self}>
      <AdminFilterBar
        fields={[
          { key: "q", label: "Поиск", search: true, placeholder: "VIN, имя, никнейм" },
          {
            key: "motorcycleBrandId",
            label: "Бренд",
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          {
            key: "year",
            label: "Год",
            options: yearRows.map((y) => ({
              value: String(y.yearFrom),
              label: String(y.yearFrom),
            })),
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
