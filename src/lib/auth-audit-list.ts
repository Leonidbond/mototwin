import type { Prisma } from "@prisma/client";
import type { AuthAuditLogListResponse } from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 50;

type Filters = {
  userId?: string;
  event?: string;
};

export async function loadAuthAuditLog(params: {
  filters?: Filters;
  page?: number;
  pageSize?: number;
}): Promise<AuthAuditLogListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.AuthAuditLogWhereInput = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.event) where.event = { contains: filters.event };

  const [total, rows] = await Promise.all([
    prisma.authAuditLog.count({ where }),
    prisma.authAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { displayName: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      userId: row.userId,
      userLabel: row.user?.displayName ?? row.user?.email ?? (row.userId ? "—" : "неизвестен"),
      event: row.event,
      reasonCode: row.reasonCode,
      metadata: row.metadata,
      ip: row.ip,
      userAgent: row.userAgent,
    })),
  };
}
