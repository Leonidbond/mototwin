import type {
  AdminModerationCountsWire,
  AdminModerationInspectorWire,
  AdminModerationItemWire,
  AdminModerationListResponse,
  AdminModerationQueueKey,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const SAFETY_GROUPS = ["BRAKES", "FRONT_SUSPENSION", "REAR_SUSPENSION"] as const;
const QUEUE_TAKE = 50;

export async function loadAdminModerationCounts(): Promise<AdminModerationCountsWire> {
  const [
    pendingMasters,
    pendingReports,
    needsReviewReports,
    safetyCriticalReports,
    hiddenReports,
    rejectedReports,
    mixedFitments,
  ] = await Promise.all([
    prisma.partMaster.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.fitmentReport.count({ where: { moderationStatus: "PENDING" } }),
    prisma.fitmentReport.count({ where: { moderationStatus: "NEEDS_REVIEW" } }),
    prisma.fitmentReport.count({
      where: {
        moderationStatus: "PENDING",
        node: { serviceGroup: { in: [...SAFETY_GROUPS] } },
      },
    }),
    prisma.fitmentReport.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.fitmentReport.count({ where: { moderationStatus: "REJECTED" } }),
    prisma.fitmentConfidence.count({ where: { status: "MIXED_REPORTS" } }),
  ]);

  return {
    pendingMasters,
    pendingReports,
    needsReviewReports,
    safetyCriticalReports,
    hiddenReports,
    rejectedReports,
    mixedFitments,
  };
}

export async function loadAdminModerationQueue(
  queue: AdminModerationQueueKey
): Promise<AdminModerationListResponse> {
  const counts = await loadAdminModerationCounts();
  const items = await loadQueueItems(queue);
  return { queue, counts, items };
}

async function loadQueueItems(queue: AdminModerationQueueKey): Promise<AdminModerationItemWire[]> {
  switch (queue) {
    case "pendingMasters": {
      const rows = await prisma.partMaster.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { createdAt: "desc" },
        take: QUEUE_TAKE,
        select: {
          id: true,
          brandName: true,
          sku: true,
          title: true,
          source: true,
          createdAt: true,
        },
      });
      return rows.map((row) => ({
        id: row.id,
        kind: "PART_MASTER",
        title: `${row.brandName} ${row.sku}`,
        subtitle: row.title,
        status: "PENDING_REVIEW",
        badges: [row.source === "USER" ? "От пользователя" : "Каталог"],
        createdAt: row.createdAt.toISOString(),
      }));
    }
    case "pendingReports":
    case "safetyCriticalReports":
    case "needsReviewReports":
    case "hiddenReports":
    case "rejectedReports": {
      const where =
        queue === "pendingReports"
          ? { moderationStatus: "PENDING" as const }
          : queue === "safetyCriticalReports"
          ? {
              moderationStatus: "PENDING" as const,
              node: { serviceGroup: { in: [...SAFETY_GROUPS] } },
            }
          : queue === "needsReviewReports"
          ? { moderationStatus: "NEEDS_REVIEW" as const }
          : queue === "hiddenReports"
          ? { moderationStatus: "HIDDEN" as const }
          : { moderationStatus: "REJECTED" as const };
      const rows = await prisma.fitmentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: QUEUE_TAKE,
        include: {
          partMaster: { select: { brandName: true, sku: true, title: true } },
          node: { select: { name: true, serviceGroup: true } },
          motorcycleGeneration: {
            include: {
              variant: { include: { family: { include: { brand: true } } } },
            },
          },
        },
      });
      return rows.map((row) => {
        const part = row.partMaster
          ? `${row.partMaster.brandName} ${row.partMaster.sku}`
          : "—";
        const safety =
          row.node && (SAFETY_GROUPS as readonly string[]).includes(row.node.serviceGroup ?? "");
        const gen = row.motorcycleGeneration;
        return {
          id: row.id,
          kind: "FITMENT_REPORT",
          title: part,
          subtitle: `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name} ${gen.name} · ${row.node?.name ?? "—"} · ${row.fitmentResult}`,
          status: row.moderationStatus,
          badges: safety ? ["Safety"] : [],
          createdAt: row.createdAt.toISOString(),
        };
      });
    }
    case "mixedFitments": {
      const rows = await prisma.fitmentConfidence.findMany({
        where: { status: "MIXED_REPORTS" },
        orderBy: { reportCount: "desc" },
        take: QUEUE_TAKE,
        include: {
          partMaster: { select: { brandName: true, sku: true, title: true } },
          motorcycleGeneration: {
            include: {
              variant: { include: { family: { include: { brand: true } } } },
            },
          },
          node: { select: { name: true } },
        },
      });
      return rows.map((row) => {
        const gen = row.motorcycleGeneration;
        return {
          id: row.id,
          kind: "FITMENT_CONFIDENCE",
          title: `${row.partMaster.brandName} ${row.partMaster.sku}`,
          subtitle: `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name} ${gen.name} · ${row.node.name}`,
          status: row.status,
          badges: [`${row.reportCount} reports`],
          createdAt: row.lastRecalculatedAt.toISOString(),
        };
      });
    }
    default:
      return [];
  }
}

export async function loadModerationInspector(
  kind: "PART_MASTER" | "FITMENT_REPORT" | "FITMENT_CONFIDENCE",
  id: string
): Promise<AdminModerationInspectorWire | null> {
  if (kind === "PART_MASTER") {
    const part = await prisma.partMaster.findUnique({
      where: { id },
      include: { _count: { select: { fitmentReports: true, aliases: true } } },
    });
    if (!part) return null;
    return {
      id: part.id,
      kind: "PART_MASTER",
      heading: `${part.brandName} ${part.sku}`,
      subheading: part.title,
      status: part.status,
      fields: [
        { label: "Категория", value: part.subcategory ?? "—" },
        { label: "Источник", value: part.source === "ADMIN" ? "Каталог" : "От пользователя" },
        { label: "Aliases", value: String(part._count.aliases) },
        { label: "Reports", value: String(part._count.fitmentReports) },
        { label: "Создан", value: part.createdAt.toISOString().slice(0, 10) },
      ],
      notes: part.description,
      actions:
        part.status === "PENDING_REVIEW"
          ? [
              { id: "approve", label: "Одобрить (ACTIVE)", tone: "primary" },
              { id: "reject", label: "Отклонить", tone: "danger" },
            ]
          : [],
      links: [{ label: "Открыть карточку", href: `/admin/catalog/${part.id}` }],
    };
  }
  if (kind === "FITMENT_REPORT") {
    const report = await prisma.fitmentReport.findUnique({
      where: { id },
      include: {
        partMaster: true,
        node: true,
        motorcycleGeneration: {
          include: {
            variant: { include: { family: { include: { brand: true } } } },
          },
        },
        createdBy: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!report) return null;
    const partLabel = report.partMaster
      ? `${report.partMaster.brandName} ${report.partMaster.sku}`
      : "—";
    const actions: AdminModerationInspectorWire["actions"] = [];
    if (report.moderationStatus !== "PUBLISHED") {
      actions.push({ id: "publish", label: "Опубликовать", tone: "primary" });
    }
    if (report.moderationStatus !== "NEEDS_REVIEW") {
      actions.push({ id: "needs_review", label: "На проверку", tone: "neutral" });
    }
    if (report.moderationStatus !== "HIDDEN") {
      actions.push({ id: "hide", label: "Скрыть", tone: "neutral" });
    }
    if (report.moderationStatus !== "REJECTED") {
      actions.push({ id: "reject", label: "Отклонить", tone: "danger" });
    }

    const gen = report.motorcycleGeneration;
    return {
      id: report.id,
      kind: "FITMENT_REPORT",
      heading: partLabel,
      subheading: `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name} ${gen.name}`,
      status: report.moderationStatus,
      fields: [
        { label: "Узел", value: report.node?.name ?? "—" },
        { label: "Fitment", value: report.fitmentResult },
        { label: "Установка", value: report.installationStatus },
        {
          label: "Автор",
          value: report.createdBy?.displayName ?? report.createdBy?.email ?? "—",
        },
        { label: "Создан", value: report.createdAt.toISOString().slice(0, 10) },
      ],
      notes: report.comment,
      actions,
      links: [
        { label: "Деталь", href: `/admin/catalog/${report.partMasterId}` },
        { label: "Модель", href: `/admin/models/${report.motorcycleGenerationId}` },
        ...(report.createdBy
          ? [{ label: "Пользователь", href: `/admin/users/${report.createdBy.id}` }]
          : []),
      ],
    };
  }
  if (kind === "FITMENT_CONFIDENCE") {
    const fc = await prisma.fitmentConfidence.findUnique({
      where: { id },
      include: {
        partMaster: true,
        motorcycleGeneration: {
          include: {
            variant: { include: { family: { include: { brand: true } } } },
          },
        },
        node: true,
      },
    });
    if (!fc) return null;
    const gen = fc.motorcycleGeneration;
    return {
      id: fc.id,
      kind: "FITMENT_CONFIDENCE",
      heading: `${fc.partMaster.brandName} ${fc.partMaster.sku}`,
      subheading: `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name} ${gen.name} · ${fc.node.name}`,
      status: fc.status,
      fields: [
        { label: "Reports", value: String(fc.reportCount) },
        { label: "Confirmations", value: String(fc.confirmationCount) },
        { label: "Confidence", value: `${fc.confidenceScore}/100` },
        { label: "Обновлено", value: fc.lastRecalculatedAt.toISOString().slice(0, 16) },
      ],
      notes: null,
      actions: [
        { id: "verify", label: "Verified by MotoTwin", tone: "primary" },
        { id: "community_confirm", label: "Community confirmed", tone: "neutral" },
      ],
      links: [
        { label: "Деталь", href: `/admin/catalog/${fc.partMasterId}` },
        { label: "Модель", href: `/admin/models/${fc.motorcycleGenerationId}` },
      ],
    };
  }
  return null;
}
