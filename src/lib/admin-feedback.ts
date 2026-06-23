import type { Prisma } from "@prisma/client";
import type {
  AdminFeedbackDetailWire,
  AdminFeedbackListFilters,
  AdminFeedbackListItemWire,
  AdminFeedbackListResponse,
  FeedbackPlatformWire,
  FeedbackStatusWire,
  FeedbackTypeWire,
} from "@mototwin/types";
import { getPageHelpTitle } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

function authorLabel(user: { displayName: string | null; email: string | null } | null): string | null {
  if (!user) return null;
  return user.displayName ?? user.email ?? null;
}

/** Build a Prisma where-clause shared by list and export. */
export function buildFeedbackWhere(
  filters: AdminFeedbackListFilters & { ids?: string[]; dateFrom?: string; dateTo?: string }
): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {};
  if (filters.q) {
    where.message = { contains: filters.q, mode: "insensitive" };
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status as FeedbackStatusWire;
  }
  if (filters.type && filters.type !== "all") {
    where.type = filters.type as FeedbackTypeWire;
  }
  if (filters.platform && filters.platform !== "all") {
    where.platform = filters.platform as FeedbackPlatformWire;
  }
  if (filters.pageKey && filters.pageKey !== "all") {
    where.pageKey = filters.pageKey;
  }
  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: filters.ids };
  }
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    where.createdAt = createdAt;
  }
  return where;
}

export async function loadAdminFeedbackList(params: {
  filters?: AdminFeedbackListFilters;
  page?: number;
  pageSize?: number;
}): Promise<AdminFeedbackListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * pageSize;
  const where = buildFeedbackWhere(filters);

  const [total, rows] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
      select: {
        id: true,
        status: true,
        type: true,
        message: true,
        pageKey: true,
        platform: true,
        routePath: true,
        createdAt: true,
        submittedByUserId: true,
        submittedBy: { select: { displayName: true, email: true } },
      },
    }),
  ]);

  const items: AdminFeedbackListItemWire[] = rows.map((row) => ({
    id: row.id,
    status: row.status as FeedbackStatusWire,
    type: row.type as FeedbackTypeWire,
    message: row.message,
    pageKey: row.pageKey,
    pageTitle: getPageHelpTitle(row.pageKey),
    platform: row.platform,
    routePath: row.routePath,
    createdAt: row.createdAt.toISOString(),
    authorId: row.submittedByUserId,
    authorLabel: authorLabel(row.submittedBy),
  }));

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

export async function loadAdminFeedbackDetail(id: string): Promise<AdminFeedbackDetailWire | null> {
  const row = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      type: true,
      message: true,
      pageKey: true,
      platform: true,
      routePath: true,
      appVersion: true,
      locale: true,
      vehicleId: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
      adminNote: true,
      reviewedAt: true,
      submittedByUserId: true,
      submittedBy: { select: { displayName: true, email: true } },
      reviewedBy: { select: { displayName: true, email: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    status: row.status as FeedbackStatusWire,
    type: row.type as FeedbackTypeWire,
    message: row.message,
    pageKey: row.pageKey,
    pageTitle: getPageHelpTitle(row.pageKey),
    platform: row.platform,
    routePath: row.routePath,
    appVersion: row.appVersion,
    locale: row.locale,
    vehicleId: row.vehicleId,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    authorId: row.submittedByUserId,
    authorLabel: authorLabel(row.submittedBy),
    authorEmail: row.submittedBy?.email ?? null,
    adminNote: row.adminNote,
    reviewedByLabel: authorLabel(row.reviewedBy),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}
