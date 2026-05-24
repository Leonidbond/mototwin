import type { Prisma } from "@prisma/client";
import type {
  AdminVehicleListFilters,
  AdminVehicleListItemWire,
  AdminVehicleListResponse,
  AdminVehicleSortKey,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

export async function loadAdminVehicleList(params: {
  filters?: AdminVehicleListFilters;
  page?: number;
  pageSize?: number;
}): Promise<AdminVehicleListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.VehicleWhereInput = { trashedAt: null };
  if (filters.motorcycleBrandId) where.motorcycleBrandId = filters.motorcycleBrandId;
  if (filters.motorcycleModelFamilyId)
    where.motorcycleModelFamilyId = filters.motorcycleModelFamilyId;
  if (filters.motorcycleVariantId)
    where.motorcycleVariantId = filters.motorcycleVariantId;
  if (filters.motorcycleGenerationId)
    where.motorcycleGenerationId = filters.motorcycleGenerationId;
  if (filters.year) {
    where.motorcycleGeneration = {
      is: {
        OR: [
          { yearFrom: filters.year },
          { AND: [{ yearFrom: { lte: filters.year } }, { yearTo: { gte: filters.year } }] },
        ],
      },
    };
  }
  if (filters.q) {
    where.OR = [
      { vin: { contains: filters.q, mode: "insensitive" } },
      { nickname: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.VehicleOrderByWithRelationInput = orderByForSort(filters.sort);

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      take: pageSize,
      skip,
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        motorcycleBrand: { select: { name: true } },
        motorcycleModelFamily: { select: { name: true } },
        motorcycleVariant: { select: { name: true } },
        motorcycleGeneration: {
          select: { name: true, yearFrom: true },
        },
        _count: { select: { serviceEvents: true } },
      },
    }),
  ]);

  const vehicleIds = vehicles.map((v) => v.id);
  const lastService = vehicleIds.length
    ? await prisma.serviceEvent.groupBy({
        by: ["vehicleId"],
        where: { vehicleId: { in: vehicleIds } },
        _max: { eventDate: true },
      })
    : [];
  const lastServiceByVehicle = new Map(
    lastService.map((row) => [row.vehicleId, row._max.eventDate ?? null])
  );

  const items: AdminVehicleListItemWire[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    ownerLabel: vehicle.user.displayName ?? vehicle.user.email ?? "—",
    ownerId: vehicle.user.id,
    brandLabel: vehicle.motorcycleBrand.name,
    modelFamilyLabel: vehicle.motorcycleModelFamily.name,
    variantLabel: vehicle.motorcycleVariant.name,
    generationLabel: vehicle.motorcycleGeneration.name,
    year: vehicle.motorcycleGeneration.yearFrom,
    nickname: vehicle.nickname,
    vinLast: vehicle.vin ? vehicle.vin.slice(-6) : null,
    odometer: vehicle.odometer,
    engineHours: vehicle.engineHours,
    createdAt: vehicle.createdAt.toISOString(),
    lastServiceAt: lastServiceByVehicle.get(vehicle.id)?.toISOString() ?? null,
    serviceEventCount: vehicle._count.serviceEvents,
  }));

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

function orderByForSort(sort: AdminVehicleSortKey | undefined): Prisma.VehicleOrderByWithRelationInput {
  switch (sort) {
    case "odometerDesc":
      return { odometer: "desc" };
    case "lastActivityDesc":
      return { updatedAt: "desc" };
    case "createdAtDesc":
    default:
      return { createdAt: "desc" };
  }
}
