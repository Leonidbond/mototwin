import type { Prisma } from "@prisma/client";
import type {
  AdminAuditLogEntryWire,
  AdminAuditLogListResponse,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 50;

interface Filters {
  actorId?: string;
  action?: string;
  entityType?: string;
}

export async function loadAdminAuditLog(params: {
  filters?: Filters;
  page?: number;
  pageSize?: number;
}): Promise<AdminAuditLogListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = { contains: filters.action };
  if (filters.entityType) where.entityType = filters.entityType;

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { displayName: true, email: true } } },
    }),
  ]);

  const items: AdminAuditLogEntryWire[] = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actorLabel: row.actor?.displayName ?? row.actor?.email ?? "—",
    actorId: row.actorId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
    importBatchId: row.importBatchId,
    ip: row.ip,
  }));

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}
