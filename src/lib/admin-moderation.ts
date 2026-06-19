import type {
  AdminModerationCountsWire,
  AdminModerationInspectorWire,
  AdminModerationItemWire,
  AdminModerationListResponse,
  AdminModerationQueueKey,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { getCatalogRequestEditableFields } from "@/lib/motorcycle-catalog-request-wire";

const SAFETY_GROUPS = ["BRAKES", "FRONT_SUSPENSION", "REAR_SUSPENSION"] as const;
const QUEUE_TAKE = 50;

export async function loadAdminModerationCounts(): Promise<AdminModerationCountsWire> {
  const [
    pendingMasters,
    pendingCatalogRequests,
    rejectedCatalogRequests,
    pendingReports,
    needsReviewReports,
    safetyCriticalReports,
    hiddenReports,
    rejectedReports,
    mixedFitments,
    stagingApplications,
  ] = await Promise.all([
    prisma.partMaster.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.motorcycleCatalogRequest.count({ where: { status: "PENDING" } }),
    prisma.motorcycleCatalogRequest.count({ where: { status: "REJECTED" } }),
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
    prisma.partCatalogApplication.count({
      where: { reviewStatus: { in: ["NEW", "NEEDS_REVIEW"] } },
    }),
  ]);

  return {
    pendingMasters,
    pendingCatalogRequests,
    rejectedCatalogRequests,
    pendingReports,
    needsReviewReports,
    safetyCriticalReports,
    hiddenReports,
    rejectedReports,
    mixedFitments,
    stagingApplications,
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
    case "pendingCatalogRequests":
    case "rejectedCatalogRequests": {
      const rows = await prisma.motorcycleCatalogRequest.findMany({
        where: {
          status: queue === "pendingCatalogRequests" ? "PENDING" : "REJECTED",
        },
        orderBy: { createdAt: "desc" },
        take: QUEUE_TAKE,
        include: {
          motorcycleBrand: { select: { name: true } },
          motorcycleModelFamily: { select: { name: true } },
          submittedBy: { select: { displayName: true, email: true } },
          _count: { select: { vehicles: true } },
        },
      });
      return rows.map((row) => {
        const brand = row.brandName ?? row.motorcycleBrand?.name ?? "—";
        const family = row.familyName ?? row.motorcycleModelFamily?.name ?? "—";
        const author =
          row.submittedBy?.displayName ?? row.submittedBy?.email ?? "Пользователь";
        return {
          id: row.id,
          kind: "CATALOG_REQUEST",
          title: `${brand} ${family} ${row.variantName}`.trim(),
          subtitle: `${row.yearFrom}${row.yearTo ? `–${row.yearTo}` : "–"} · ${author}`,
          status: row.status,
          badges: [
            row._count.vehicles > 0 ? `${row._count.vehicles} мото` : "Без мото",
          ],
          createdAt: row.createdAt.toISOString(),
        };
      });
    }
    case "stagingApplications": {
      const rows = await prisma.partCatalogApplication.findMany({
        where: { reviewStatus: { in: ["NEW", "NEEDS_REVIEW"] } },
        orderBy: { updatedAt: "desc" },
        take: QUEUE_TAKE,
        include: { node: { select: { code: true, name: true } } },
      });
      return rows.map((row) => ({
        id: row.id,
        kind: "STAGING_APPLICATION",
        title: `${row.brand} ${row.partNumber || row.partName}`,
        subtitle: `${row.modelFamily} · ${row.node.name} (${row.node.code})`,
        status: row.reviewStatus,
        badges: [row.confidence, row.market, row.safetyCritical ? "Safety" : ""].filter(Boolean),
        createdAt: row.updatedAt.toISOString(),
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
  kind:
    | "PART_MASTER"
    | "FITMENT_REPORT"
    | "FITMENT_CONFIDENCE"
    | "CATALOG_REQUEST"
    | "STAGING_APPLICATION",
  id: string
): Promise<AdminModerationInspectorWire | null> {
  if (kind === "STAGING_APPLICATION") {
    const row = await prisma.partCatalogApplication.findUnique({
      where: { id },
      include: { node: true, source: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      kind: "STAGING_APPLICATION",
      heading: `${row.brand} ${row.partNumber || row.partName}`,
      subheading: `${row.node.code} · ${row.reviewStatus}`,
      status: row.reviewStatus,
      fields: [
        { label: "Confidence", value: row.confidence },
        { label: "Market", value: row.market },
        { label: "Source", value: `${row.source.sourceType} (${row.source.sourceRegion})` },
        { label: "EPC", value: row.diagramPosition ? `поз. ${row.diagramPosition}` : "—" },
        { label: "Batch", value: row.importBatch },
      ],
      notes: row.rawNotes,
      actions: [],
      links: [{ label: "Открыть staging", href: `/admin/catalog/staging/${row.id}` }],
    };
  }
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
  if (kind === "CATALOG_REQUEST") {
    const request = await prisma.motorcycleCatalogRequest.findUnique({
      where: { id },
      include: {
        motorcycleBrand: { select: { id: true, name: true } },
        motorcycleModelFamily: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, displayName: true, email: true } },
        vehicles: {
          select: { id: true, nickname: true },
          take: 10,
        },
        _count: { select: { vehicles: true } },
      },
    });
    if (!request) return null;

    const editable = getCatalogRequestEditableFields(request);
    const author =
      request.submittedBy?.displayName ?? request.submittedBy?.email ?? "—";

    const actions: AdminModerationInspectorWire["actions"] = [];
    if (request.status === "PENDING") {
      actions.push({ id: "approve", label: "Одобрить", tone: "primary" });
      actions.push({ id: "reject", label: "Отклонить", tone: "danger" });
    }

    return {
      id: request.id,
      kind: "CATALOG_REQUEST",
      heading: `${editable.brandName} ${editable.familyName} ${editable.variantName}`.trim(),
      subheading: `${editable.yearFrom}${editable.yearTo ? `–${editable.yearTo}` : "–"}`,
      status: request.status,
      fields: [
        { label: "Автор", value: author },
        {
          label: "Выбрано из каталога",
          value: [
            request.motorcycleBrand?.name,
            request.motorcycleModelFamily?.name,
          ]
            .filter(Boolean)
            .join(" / ") || "—",
        },
        { label: "Мото в гараже", value: String(request._count.vehicles) },
        { label: "Создана", value: request.createdAt.toISOString().slice(0, 10) },
      ],
      editableFields:
        request.status === "PENDING"
          ? [
              { key: "brandName", label: "Марка", value: editable.brandName, inputType: "text" },
              {
                key: "familyName",
                label: "Модель (семейство)",
                value: editable.familyName,
                inputType: "text",
              },
              {
                key: "variantName",
                label: "Модификация",
                value: editable.variantName,
                inputType: "text",
              },
              {
                key: "yearFrom",
                label: "Год от",
                value: String(editable.yearFrom),
                inputType: "number",
              },
              {
                key: "yearTo",
                label: "Год до",
                value: editable.yearTo != null ? String(editable.yearTo) : "",
                inputType: "number",
              },
              {
                key: "moderationComment",
                label: "Комментарий модератора",
                value: request.moderationComment ?? "",
                inputType: "text",
              },
            ]
          : undefined,
      notes: request.userComment,
      actions,
      links: [
        ...(request.submittedBy
          ? [{ label: "Пользователь", href: `/admin/users/${request.submittedBy.id}` }]
          : []),
        ...request.vehicles.map((vehicle) => ({
          label: vehicle.nickname?.trim() || `Мото ${vehicle.id.slice(0, 6)}`,
          href: `/admin/vehicles?query=${vehicle.id}`,
        })),
      ],
    };
  }
  return null;
}
