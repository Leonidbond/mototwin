import type { Prisma, AdminRole, PlanType } from "@prisma/client";
import type {
  AdminRoleWire,
  AdminUserDetailWire,
  AdminUserListFilters,
  AdminUserListItemWire,
  AdminUserListResponse,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

export async function loadAdminUserList(params: {
  filters?: AdminUserListFilters;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};
  if (filters.q) {
    where.OR = [
      { email: { contains: filters.q, mode: "insensitive" } },
      { displayName: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.role && filters.role !== "all") {
    where.adminRole = filters.role as AdminRole;
  }
  if (filters.plan && filters.plan !== "all") {
    where.subscription = { is: { planType: filters.plan as PlanType } };
  }
  if (filters.hasVehicles === "yes") {
    where.vehicles = { some: { trashedAt: null } };
  } else if (filters.hasVehicles === "no") {
    where.vehicles = { none: { trashedAt: null } };
  }
  if (filters.status === "blocked") {
    where.isBlocked = true;
  } else if (filters.status === "active") {
    where.isBlocked = false;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
        isModerator: true,
        adminRole: true,
        subscription: { select: { planType: true } },
        _count: {
          select: {
            vehicles: { where: { trashedAt: null } },
            fitmentReportsCreated: true,
            mileageHoursUpdateLogs: true,
          },
        },
      },
    }),
  ]);

  const userIds = users.map((u) => u.id);

  const expensesGrouped = userIds.length
    ? await prisma.expenseItem.groupBy({
        by: ["vehicleId"],
        where: { vehicle: { userId: { in: userIds } } },
        _count: { _all: true },
      })
    : [];
  const expensesByUser = new Map<string, number>();
  if (expensesGrouped.length > 0) {
    const vehicleOwners = await prisma.vehicle.findMany({
      where: { id: { in: expensesGrouped.map((g) => g.vehicleId) } },
      select: { id: true, userId: true },
    });
    const ownerByVehicle = new Map(vehicleOwners.map((v) => [v.id, v.userId]));
    for (const group of expensesGrouped) {
      const ownerId = ownerByVehicle.get(group.vehicleId);
      if (!ownerId) continue;
      expensesByUser.set(ownerId, (expensesByUser.get(ownerId) ?? 0) + group._count._all);
    }
  }

  const lastActivity = userIds.length
    ? await prisma.mileageHoursUpdateLog.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _max: { createdAt: true },
      })
    : [];
  const lastActivityByUser = new Map(
    lastActivity.map((row) => [row.userId, row._max.createdAt ?? null])
  );

  const items: AdminUserListItemWire[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    isBlocked: user.isBlocked,
    blockedAt: user.blockedAt?.toISOString() ?? null,
    blockReason: user.blockReason,
    isModerator: user.isModerator,
    adminRole: (user.adminRole as AdminRoleWire | null) ?? null,
    plan: (user.subscription?.planType as "FREE" | "RIDER" | "PRO" | null) ?? null,
    vehicleCount: user._count.vehicles,
    fitmentReportCount: user._count.fitmentReportsCreated,
    expenseCount: expensesByUser.get(user.id) ?? 0,
    lastActivityAt: lastActivityByUser.get(user.id)?.toISOString() ?? null,
  }));

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

export async function loadAdminUserDetail(userId: string): Promise<AdminUserDetailWire | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      garages: {
        select: {
          id: true,
          title: true,
          _count: { select: { vehicles: { where: { trashedAt: null } } } },
        },
      },
      vehicles: {
        where: { trashedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          motorcycleBrand: { select: { name: true } },
          motorcycleModelFamily: { select: { name: true } },
          motorcycleVariant: { select: { name: true } },
          motorcycleGeneration: { select: { yearFrom: true, name: true } },
        },
      },
      fitmentReportsCreated: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          partMaster: { select: { brandName: true, sku: true } },
          node: { select: { name: true } },
        },
      },
      _count: {
        select: {
          vehicles: { where: { trashedAt: null } },
          fitmentReportsCreated: true,
          fitmentVotes: true,
        },
      },
    },
  });
  if (!user) return null;

  const expenseCount = await prisma.expenseItem.count({
    where: { vehicle: { userId: user.id } },
  });
  const serviceEventCount = await prisma.serviceEvent.count({
    where: { vehicle: { userId: user.id } },
  });
  const recentEvents = await prisma.serviceEvent.findMany({
    where: { vehicle: { userId: user.id } },
    orderBy: { eventDate: "desc" },
    take: 5,
    include: { node: { select: { name: true } } },
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    isBlocked: user.isBlocked,
    blockedAt: user.blockedAt?.toISOString() ?? null,
    blockReason: user.blockReason,
    isModerator: user.isModerator,
    adminRole: (user.adminRole as AdminRoleWire | null) ?? null,
    plan: (user.subscription?.planType as "FREE" | "RIDER" | "PRO" | null) ?? null,
    planStatus: user.subscription?.status ?? null,
    vehicleCount: user._count.vehicles,
    fitmentReportCount: user._count.fitmentReportsCreated,
    fitmentVoteCount: user._count.fitmentVotes,
    expenseCount,
    serviceEventCount,
    garages: user.garages.map((g) => ({
      id: g.id,
      title: g.title,
      vehicleCount: g._count.vehicles,
    })),
    recentVehicles: user.vehicles.map((v) => ({
      id: v.id,
      brandLabel: v.motorcycleBrand.name,
      modelLabel: `${v.motorcycleModelFamily.name} ${v.motorcycleVariant.name}`.trim(),
      year: v.motorcycleGeneration.yearFrom,
      nickname: v.nickname,
      odometer: v.odometer,
      createdAt: v.createdAt.toISOString(),
    })),
    recentFitmentReports: user.fitmentReportsCreated.map((r) => ({
      id: r.id,
      partLabel: r.partMaster ? `${r.partMaster.brandName} ${r.partMaster.sku}` : "—",
      nodeLabel: r.node?.name ?? "—",
      moderationStatus: r.moderationStatus,
      createdAt: r.createdAt.toISOString(),
    })),
    recentServiceEvents: recentEvents.map((e) => ({
      id: e.id,
      eventDate: e.eventDate.toISOString(),
      nodeLabel: e.node?.name ?? "—",
      title: e.title,
      odometer: e.odometer,
    })),
  };
}
