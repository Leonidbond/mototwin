/**
 * Server-side data loaders for the admin dashboard.
 * The matching `/api/admin/dashboard/*` routes also call these helpers, so
 * tests and SSR share the same code path.
 */
import type { FitmentConfidenceStatus } from "@prisma/client";
import type {
  AdminActivityResponse,
  AdminAlertWire,
  AdminAlertsResponse,
  AdminCatalogCoverageResponse,
  AdminCatalogCoverageRowWire,
  AdminDashboardKpisResponse,
  AdminFastestModelRowWire,
  AdminFastestModelsResponse,
  AdminFitmentQualityResponse,
  AdminFitmentQualitySliceWire,
  AdminKpiCardWire,
  AdminKpiTone,
  AdminPeriodKey,
  AdminProblemAreaCardWire,
  AdminProblemAreasResponse,
  AdminSparklinePoint,
  AdminSupportLevel,
  AdminWorkQueueResponse,
  AdminWorkQueueRowWire,
  AdminWorkQueueStatusKey,
  AdminWorkQueueTabKey,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_DEFAULT_PERIOD,
  bucketsForPeriod,
  resolvePeriod,
} from "@/lib/admin-period";

const SAFETY_GROUPS = ["BRAKES", "FRONT_SUSPENSION", "REAR_SUSPENSION"];

export async function loadKpis(periodKey: AdminPeriodKey = ADMIN_DEFAULT_PERIOD): Promise<AdminDashboardKpisResponse> {
  const now = new Date();
  const period = resolvePeriod(periodKey, now);
  const buckets = bucketsForPeriod(periodKey, now);

  const cards = await Promise.all(KPI_SPECS.map((spec) => buildKpiCard(spec, { period, buckets })));
  return {
    generatedAt: now.toISOString(),
    period: { key: periodKey, from: period.from, to: period.to },
    cards,
  };
}

export async function loadWorkQueue(
  tab: AdminWorkQueueTabKey = "all",
  limit = 8
): Promise<AdminWorkQueueResponse> {
  const [pendingMastersTotal, pendingCatalogRequestsTotal, pendingReportsTotal, conflictsTotal, safetyTotal] =
    await Promise.all([
    prisma.partMaster.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.motorcycleCatalogRequest.count({ where: { status: "PENDING" } }),
    prisma.fitmentReport.count({ where: { moderationStatus: "PENDING" } }),
    prisma.fitmentConfidence.count({ where: { status: "MIXED_REPORTS" } }),
    prisma.fitmentReport.count({
      where: {
        moderationStatus: "PENDING",
        node: { serviceGroup: { in: SAFETY_GROUPS } },
      },
    }),
  ]);

  const totals: AdminWorkQueueResponse["totals"] = {
    all: pendingMastersTotal + pendingCatalogRequestsTotal + pendingReportsTotal + conflictsTotal + safetyTotal,
    "new-parts": pendingMastersTotal,
    fitment: pendingReportsTotal,
    conflicts: conflictsTotal,
    safety: safetyTotal,
  };

  const wantPartMasters = tab === "all" || tab === "new-parts";
  const wantReports = tab === "all" || tab === "fitment" || tab === "safety";
  const wantConflicts = tab === "all" || tab === "conflicts";

  const rows: AdminWorkQueueRowWire[] = [];

  if (wantPartMasters) {
    const masters = await prisma.partMaster.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: tab === "new-parts" ? limit : Math.ceil(limit / 4),
      select: { id: true, brandName: true, sku: true, title: true },
    });
    for (const master of masters) {
      rows.push({
        id: `pm-${master.id}`,
        kind: "part-master",
        priority: "normal",
        partLabel: `${master.brandName} ${master.sku}`,
        modelLabel: master.title,
        nodeLabel: "—",
        statusKey: "pending",
        statusLabel: "Pending",
        confirmations: 0,
        reviewHref: `/admin/moderation?focus=pm-${master.id}`,
        detailsHref: `/admin/catalog/${master.id}`,
      });
    }

    if (tab === "all") {
      const catalogRequests = await prisma.motorcycleCatalogRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: Math.ceil(limit / 4),
        include: {
          motorcycleBrand: { select: { name: true } },
          motorcycleModelFamily: { select: { name: true } },
        },
      });
      for (const request of catalogRequests) {
        const brand = request.brandName ?? request.motorcycleBrand?.name ?? "—";
        const family = request.familyName ?? request.motorcycleModelFamily?.name ?? "—";
        rows.push({
          id: `cr-${request.id}`,
          kind: "part-master",
          priority: "high",
          partLabel: `${brand} ${family} ${request.variantName}`.trim(),
          modelLabel: `${request.yearFrom}${request.yearTo ? `–${request.yearTo}` : "–"}`,
          nodeLabel: "Заявка на модель",
          statusKey: "pending",
          statusLabel: "Catalog request",
          confirmations: 0,
          reviewHref: `/admin/moderation?queue=pendingCatalogRequests`,
          detailsHref: `/admin/moderation?queue=pendingCatalogRequests`,
        });
      }
    }
  }

  if (wantReports) {
    const safetyOnly = tab === "safety";
    const reports = await prisma.fitmentReport.findMany({
      where: {
        moderationStatus: "PENDING",
        ...(safetyOnly ? { node: { serviceGroup: { in: SAFETY_GROUPS } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: safetyOnly || tab === "fitment" ? limit : Math.ceil(limit / 3),
      include: {
        partMaster: { select: { id: true, brandName: true, sku: true, title: true } },
        motorcycleGeneration: {
          select: {
            id: true,
            name: true,
            variant: {
              select: {
                name: true,
                family: {
                  select: { name: true, brand: { select: { name: true } } },
                },
              },
            },
          },
        },
        node: { select: { id: true, code: true, name: true, serviceGroup: true } },
      },
    });
    const reportIds = reports.map((r) => r.id);
    const voteCounts = reportIds.length
      ? await prisma.fitmentVote.groupBy({
          by: ["reportId"],
          where: { reportId: { in: reportIds } },
          _count: { _all: true },
        })
      : [];
    const voteByReport = new Map(voteCounts.map((vc) => [vc.reportId, vc._count._all]));
    for (const report of reports) {
      const isSafety = report.node?.serviceGroup
        ? SAFETY_GROUPS.includes(report.node.serviceGroup)
        : false;
      const statusKey: AdminWorkQueueStatusKey = isSafety ? "safety-critical" : "pending";
      const partLabel = report.partMaster
        ? `${report.partMaster.brandName} ${report.partMaster.sku}`
        : "—";
      const gen = report.motorcycleGeneration;
      const modelLabel = gen
        ? `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name}`.trim()
        : "—";
      rows.push({
        id: `fr-${report.id}`,
        kind: "fitment",
        priority: isSafety ? "critical" : "high",
        partLabel,
        modelLabel,
        nodeLabel: report.node?.name ?? "—",
        statusKey,
        statusLabel: statusKey,
        confirmations: voteByReport.get(report.id) ?? 0,
        reviewHref: `/admin/moderation?focus=fr-${report.id}`,
        detailsHref: `/admin/moderation?focus=fr-${report.id}`,
      });
    }
  }

  if (wantConflicts) {
    const conflicts = await prisma.fitmentConfidence.findMany({
      where: { status: "MIXED_REPORTS" },
      orderBy: { lastRecalculatedAt: "desc" },
      take: tab === "conflicts" ? limit : Math.ceil(limit / 3),
      include: {
        partMaster: { select: { id: true, brandName: true, sku: true, title: true } },
        motorcycleGeneration: {
          select: {
            id: true,
            name: true,
            variant: {
              select: {
                name: true,
                family: {
                  select: { name: true, brand: { select: { name: true } } },
                },
              },
            },
          },
        },
        node: { select: { id: true, code: true, name: true } },
      },
    });
    for (const conflict of conflicts) {
      const gen = conflict.motorcycleGeneration;
      rows.push({
        id: `cf-${conflict.id}`,
        kind: "conflict",
        priority: "high",
        partLabel: conflict.partMaster
          ? `${conflict.partMaster.brandName} ${conflict.partMaster.sku}`
          : "—",
        modelLabel: gen
          ? `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name}`.trim()
          : "—",
        nodeLabel: conflict.node?.name ?? "—",
        statusKey: "mixed-reports",
        statusLabel: "Mixed reports",
        confirmations: conflict.reportCount,
        reviewHref: `/admin/moderation?queue=mixedFitments`,
        detailsHref: `/admin/moderation?queue=mixedFitments`,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totals,
    rows: rows.slice(0, limit),
    tab,
  };
}

export async function loadFastestGrowingModels(
  periodKey: AdminPeriodKey = ADMIN_DEFAULT_PERIOD
): Promise<AdminFastestModelsResponse> {
  const period = resolvePeriod(periodKey);
  const generations = await prisma.motorcycleGeneration.findMany({
    take: 200,
    include: {
      variant: { include: { family: { include: { brand: true } } } },
      vehicles: { select: { id: true, userId: true, createdAt: true } },
      fitmentReports: { select: { id: true, createdAt: true } },
      fitmentConfidences: { select: { status: true } },
    },
  });

  const rows = generations
    .map((generation) => {
      const garageCount = generation.vehicles.length;
      const garageDeltaCount = generation.vehicles.filter(
        (v) => v.createdAt && v.createdAt >= period.fromDate
      ).length;
      const activeOwners = new Set(
        generation.vehicles
          .filter((v) => v.createdAt && v.createdAt >= period.fromDate)
          .map((v) => v.userId)
      ).size;
      const reports = generation.fitmentReports.length;
      const reportsDelta = generation.fitmentReports.filter(
        (r) => r.createdAt >= period.fromDate
      ).length;
      const supportLevel = inferSupportLevel({
        garageCount,
        reports,
        verified: generation.fitmentConfidences.filter(
          (fc) => fc.status === "VERIFIED_BY_MOTOTWIN"
        ).length,
        mixed: generation.fitmentConfidences.filter((fc) => fc.status === "MIXED_REPORTS").length,
      });
      return {
        motorcycleGenerationId: generation.id,
        brandLabel: generation.variant.family.brand.name,
        modelFamilyLabel: generation.variant.family.name,
        variantLabel: generation.variant.name,
        generationLabel: generation.name,
        garageCount,
        garageDelta: percentDelta(garageCount, garageDeltaCount),
        activeOwners,
        activeOwnersDelta: garageDeltaCount > 0 ? percentDelta(garageCount, activeOwners) : 0,
        reports,
        reportsDelta: percentDelta(reports, reportsDelta),
        supportLevel,
        score: garageDeltaCount * 3 + reportsDelta * 2 + activeOwners,
      };
    })
    .filter((row) => row.score > 0 || row.garageCount > 0)
    .sort((a, b) => b.score - a.score || b.garageCount - a.garageCount)
    .slice(0, 5)
    .map<AdminFastestModelRowWire>((row, idx) => ({
      rank: idx + 1,
      motorcycleGenerationId: row.motorcycleGenerationId,
      brandLabel: row.brandLabel,
      modelFamilyLabel: row.modelFamilyLabel,
      variantLabel: row.variantLabel,
      generationLabel: row.generationLabel,
      garageCount: row.garageCount,
      garageDelta: row.garageDelta,
      activeOwners: row.activeOwners,
      activeOwnersDelta: row.activeOwnersDelta,
      reports: row.reports,
      reportsDelta: row.reportsDelta,
      supportLevel: row.supportLevel,
    }));

  return { generatedAt: new Date().toISOString(), rows };
}

export async function loadProblemAreas(): Promise<AdminProblemAreasResponse> {
  const cards: AdminProblemAreaCardWire[] = [];

  const lowVerifiedCandidates = await prisma.motorcycleGeneration.findMany({
    take: 50,
    include: {
      variant: { include: { family: { include: { brand: true } } } },
      vehicles: { select: { id: true } },
      fitmentConfidences: { select: { status: true } },
    },
  });
  for (const generation of lowVerifiedCandidates) {
    const verified = generation.fitmentConfidences.filter(
      (fc) => fc.status === "VERIFIED_BY_MOTOTWIN"
    ).length;
    if (generation.vehicles.length >= 5 && verified <= 1) {
      cards.push({
        id: `low-verified-${generation.id}`,
        kind: "low-verified-coverage",
        title: `${generation.variant.family.brand.name} ${generation.variant.family.name} ${generation.variant.name} ${generation.name}`,
        description: `${generation.vehicles.length} пользователей в гаражах, подтверждено деталей: ${verified}`,
        recommendation: "Добавить базовые детали и проверить топ-категории",
        ctaLabel: "Добавить детали",
        ctaHref: `/admin/models/${generation.id}`,
      });
      if (cards.length >= 2) break;
    }
  }

  const conflictAggregates = await prisma.fitmentConfidence.findMany({
    where: { status: "MIXED_REPORTS" },
    orderBy: { reportCount: "desc" },
    take: 5,
    include: {
      motorcycleGeneration: {
        include: {
          variant: { include: { family: { include: { brand: true } } } },
        },
      },
      node: true,
    },
  });
  for (const conflict of conflictAggregates) {
    const gen = conflict.motorcycleGeneration;
    cards.push({
      id: `conflict-${conflict.id}`,
      kind: "conflicting-fitment",
      title: `${gen.variant.family.brand.name} ${gen.variant.family.name} ${gen.variant.name} ${gen.name}`,
      description: `${conflict.reportCount} конфликтующих отчетов · ${conflict.node.name}`,
      recommendation: "Ручная модерация safety-critical категорий",
      ctaLabel: "Проверить конфликты",
      ctaHref: `/admin/moderation?queue=mixedFitments`,
    });
    if (cards.length >= 4) break;
  }

  if (cards.length < 3) {
    const generationsWithoutRules = await prisma.motorcycleGeneration.findMany({
      take: 6,
      include: {
        variant: { include: { family: { include: { brand: true } } } },
        vehicles: { select: { id: true } },
      },
    });
    for (const generation of generationsWithoutRules) {
      if (generation.vehicles.length >= 1) {
        cards.push({
          id: `no-rules-${generation.id}`,
          kind: "missing-service-rules",
          title: `${generation.variant.family.brand.name} ${generation.variant.family.name} ${generation.variant.name} ${generation.name}`,
          description: "Нет регламентов ТО для этой модели",
          recommendation: "Создать service rules",
          ctaLabel: "Создать правило",
          ctaHref: `/admin/service-rules/new?motorcycleGenerationId=${generation.id}`,
        });
        if (cards.length >= 4) break;
      }
    }
  }

  return { generatedAt: new Date().toISOString(), cards: cards.slice(0, 4) };
}

export async function loadFitmentQuality(): Promise<AdminFitmentQualityResponse> {
  const SLICES: Array<{
    key: AdminFitmentQualitySliceWire["key"];
    label: string;
    status: FitmentConfidenceStatus;
    color: string;
  }> = [
    { key: "verified", label: "Verified by MotoTwin", status: "VERIFIED_BY_MOTOTWIN", color: "#22C55E" },
    { key: "community", label: "Community confirmed", status: "COMMUNITY_CONFIRMED", color: "#60A5FA" },
    { key: "modification", label: "Fits with modification", status: "FITS_WITH_MODIFICATION", color: "#A78BFA" },
    { key: "mixed", label: "Mixed reports", status: "MIXED_REPORTS", color: "#FBBF24" },
    { key: "low", label: "Low confidence", status: "LOW_CONFIDENCE", color: "#F97316" },
    { key: "rejected", label: "Rejected", status: "REJECTED_LIKELY_INCOMPATIBLE", color: "#F87171" },
  ];
  const groups = await prisma.fitmentConfidence.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts = new Map<FitmentConfidenceStatus, number>();
  for (const g of groups) counts.set(g.status, g._count._all);
  const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  const slices: AdminFitmentQualitySliceWire[] = SLICES.map((def) => {
    const count = counts.get(def.status) ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { key: def.key, label: def.label, count, percent, color: def.color };
  });
  return { generatedAt: new Date().toISOString(), total, slices };
}

export async function loadCatalogCoverage(): Promise<AdminCatalogCoverageResponse> {
  const NODE_DEFS = [
    { label: "Масло", serviceGroup: "ENGINE", nodeNamePattern: "Маслофильтр" },
    { label: "Тормоза", serviceGroup: "BRAKES" },
    { label: "Цепь", serviceGroup: "DRIVE" },
    { label: "Шины", serviceGroup: "WHEELS" },
    { label: "Подвеска", serviceGroup: "FRONT_SUSPENSION" },
  ];

  const brandRows = await prisma.motorcycleBrand.findMany({
    orderBy: { name: "asc" },
    take: 4,
    select: { id: true, name: true, slug: true },
  });
  const brandKeys = brandRows.map((b) => ({ key: b.slug, label: b.name }));

  const rows: AdminCatalogCoverageRowWire[] = [];
  for (const def of NODE_DEFS) {
    const cells = await Promise.all(
      brandRows.map(async (brand) => {
        const generations = await prisma.motorcycleGeneration.findMany({
          where: { variant: { is: { family: { is: { brandId: brand.id } } } } },
          select: { id: true },
        });
        if (generations.length === 0) return { brandKey: brand.slug, percent: 0 };
        const generationIds = generations.map((g) => g.id);
        const verified = await prisma.fitmentConfidence.count({
          where: {
            motorcycleGenerationId: { in: generationIds },
            status: { in: ["VERIFIED_BY_MOTOTWIN", "COMMUNITY_CONFIRMED"] },
            node: {
              OR: [
                { serviceGroup: def.serviceGroup },
                ...(def.nodeNamePattern
                  ? [{ name: { contains: def.nodeNamePattern, mode: "insensitive" as const } }]
                  : []),
              ],
            },
          },
        });
        const percent = Math.min(100, Math.round((verified / generations.length) * 100));
        return { brandKey: brand.slug, percent };
      })
    );
    rows.push({ label: def.label, cells });
  }

  return { generatedAt: new Date().toISOString(), brands: brandKeys, rows };
}

export async function loadActivity(periodKey: AdminPeriodKey = ADMIN_DEFAULT_PERIOD): Promise<AdminActivityResponse> {
  const now = new Date();
  const period = resolvePeriod(periodKey, now);
  const buckets = bucketsForPeriod(periodKey, now);
  const startDate = buckets[0];
  const endDate = new Date(buckets[buckets.length - 1]);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const [vehicles, events, reports] = await Promise.all([
    prisma.vehicle.findMany({
      where: { createdAt: { gte: startDate, lt: endDate }, trashedAt: null },
      select: { createdAt: true },
    }),
    prisma.serviceEvent.findMany({
      where: { eventDate: { gte: startDate, lt: endDate } },
      select: { eventDate: true },
    }),
    prisma.fitmentReport.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
      select: { createdAt: true },
    }),
  ]);

  const vehicleCounts = countByBucket(buckets, vehicles, "createdAt");
  const eventCounts = countByBucket(buckets, events, "eventDate");
  const reportCounts = countByBucket(buckets, reports, "createdAt");

  return {
    generatedAt: now.toISOString(),
    period: { key: periodKey, from: period.from, to: period.to },
    points: buckets.map((bucket, idx) => ({
      t: bucket.toISOString(),
      newVehicles: vehicleCounts[idx],
      serviceEvents: eventCounts[idx],
      fitmentReports: reportCounts[idx],
    })),
  };
}

export async function loadAlerts(): Promise<AdminAlertsResponse> {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const [moderationPending, fitmentPending, conflicts, safety, importErrors] = await Promise.all([
    prisma.partMaster.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.fitmentReport.count({ where: { moderationStatus: "PENDING" } }),
    prisma.fitmentConfidence.count({ where: { status: "MIXED_REPORTS" } }),
    prisma.fitmentReport.count({
      where: {
        moderationStatus: "PENDING",
        node: { serviceGroup: { in: SAFETY_GROUPS } },
      },
    }),
    prisma.importBatchRow.count({
      where: { status: "error", batch: { createdAt: { gte: yesterday } } },
    }),
  ]);

  const items: AdminAlertWire[] = [
    { key: "moderation-pending", label: "Pending parts", count: moderationPending, href: "/admin/moderation?tab=new-parts" },
    { key: "fitment-pending", label: "Pending fitment", count: fitmentPending, href: "/admin/moderation?tab=fitment" },
    { key: "conflicts", label: "Conflicts", count: conflicts, href: "/admin/moderation?queue=mixedFitments" },
    { key: "safety-critical", label: "Safety-critical", count: safety, href: "/admin/moderation?tab=safety" },
    { key: "import-errors", label: "Import errors", count: importErrors, href: "/admin/imports" },
  ];

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return { generatedAt: new Date().toISOString(), total, items };
}

type KpiSpec = {
  id: string;
  label: string;
  tone: AdminKpiTone;
  iconKey: string;
  buildBuckets: (params: { from: Date; to: Date; buckets: Date[] }) => Promise<number[]>;
  buildTotals: (params: { from: Date; to: Date }) => Promise<{ current: number; previous: number }>;
};

type ResolvedPeriod = ReturnType<typeof resolvePeriod>;

const KPI_SPECS: KpiSpec[] = [
  {
    id: "users",
    label: "Пользователи",
    tone: "orange",
    iconKey: "Users",
    buildBuckets: ({ buckets }) => bucketDailyCount("user", "createdAt", buckets),
    buildTotals: async ({ from }) => {
      const total = await prisma.user.count();
      const newInPeriod = await prisma.user.count({ where: { createdAt: { gte: from } } });
      return { current: total, previous: total - newInPeriod };
    },
  },
  {
    id: "vehicles",
    label: "Мотоциклы в гаражах",
    tone: "blue",
    iconKey: "Bike",
    buildBuckets: ({ buckets }) =>
      bucketDailyCount("vehicle", "createdAt", buckets, { trashedAt: null }),
    buildTotals: async ({ from }) => {
      const total = await prisma.vehicle.count({ where: { trashedAt: null } });
      const newInPeriod = await prisma.vehicle.count({
        where: { trashedAt: null, createdAt: { gte: from } },
      });
      return { current: total, previous: total - newInPeriod };
    },
  },
  {
    id: "newFitmentReports",
    label: "Новые fitment-отчеты",
    tone: "gray",
    iconKey: "FileText",
    buildBuckets: ({ buckets }) => bucketDailyCount("fitmentReport", "createdAt", buckets),
    buildTotals: async ({ from }) => {
      const inPeriod = await prisma.fitmentReport.count({
        where: { createdAt: { gte: from } },
      });
      const previousFrom = previousWindowStart(from);
      const previousPeriod = await prisma.fitmentReport.count({
        where: { createdAt: { gte: previousFrom, lt: from } },
      });
      return { current: inPeriod, previous: previousPeriod };
    },
  },
  {
    id: "moderationPending",
    label: "Ожидают модерации",
    tone: "yellow",
    iconKey: "AlertTriangle",
    buildBuckets: ({ buckets }) =>
      bucketDailyCount("fitmentReport", "createdAt", buckets, {
        moderationStatus: "PENDING",
      }),
    buildTotals: async ({ from }) => {
      const totalPending = await prisma.fitmentReport.count({
        where: { moderationStatus: "PENDING" },
      });
      const newPending = await prisma.fitmentReport.count({
        where: { moderationStatus: "PENDING", createdAt: { gte: from } },
      });
      return { current: totalPending, previous: totalPending - newPending };
    },
  },
  {
    id: "verifiedParts",
    label: "Verified детали",
    tone: "green",
    iconKey: "ShieldCheck",
    buildBuckets: ({ buckets }) =>
      bucketDailyCount("fitmentConfidence", "lastRecalculatedAt", buckets, {
        status: "VERIFIED_BY_MOTOTWIN",
      }),
    buildTotals: async ({ from }) => {
      const totalVerified = await prisma.fitmentConfidence.count({
        where: { status: "VERIFIED_BY_MOTOTWIN" },
      });
      const recentlyVerified = await prisma.fitmentConfidence.count({
        where: { status: "VERIFIED_BY_MOTOTWIN", lastRecalculatedAt: { gte: from } },
      });
      return { current: totalVerified, previous: totalVerified - recentlyVerified };
    },
  },
  {
    id: "conflicts",
    label: "Конфликты совместимости",
    tone: "red",
    iconKey: "XOctagon",
    buildBuckets: ({ buckets }) =>
      bucketDailyCount("fitmentConfidence", "lastRecalculatedAt", buckets, {
        status: "MIXED_REPORTS",
      }),
    buildTotals: async () => {
      const total = await prisma.fitmentConfidence.count({
        where: { status: "MIXED_REPORTS" },
      });
      return { current: total, previous: total };
    },
  },
];

async function buildKpiCard(
  spec: KpiSpec,
  params: { period: ResolvedPeriod; buckets: Date[] }
): Promise<AdminKpiCardWire> {
  const [totals, points] = await Promise.all([
    spec.buildTotals({ from: params.period.fromDate, to: params.period.toDate }),
    spec.buildBuckets({
      from: params.period.fromDate,
      to: params.period.toDate,
      buckets: params.buckets,
    }),
  ]);
  const sparkline: AdminSparklinePoint[] = params.buckets.map((bucket, idx) => ({
    t: bucket.toISOString(),
    v: points[idx] ?? 0,
  }));
  const delta = totals.current - totals.previous;
  const deltaPct =
    totals.previous === 0 ? (totals.current > 0 ? 100 : 0) : (delta / totals.previous) * 100;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const deltaLabel = formatDeltaLabel(delta);
  return {
    id: spec.id,
    label: spec.label,
    value: totals.current,
    valueLabel: undefined,
    delta,
    deltaPct,
    deltaDirection: direction,
    deltaLabel,
    tone: spec.tone,
    iconKey: spec.iconKey,
    sparkline,
  };
}

async function bucketDailyCount(
  delegateName: "user" | "vehicle" | "fitmentReport" | "fitmentConfidence" | "partMaster",
  field: string,
  buckets: Date[],
  whereExtra: Record<string, unknown> = {}
): Promise<number[]> {
  if (buckets.length === 0) return [];
  const start = buckets[0];
  const end = new Date(buckets[buckets.length - 1]);
  end.setUTCDate(end.getUTCDate() + 1);
  const where = { ...whereExtra, [field]: { gte: start, lt: end } } as Record<string, unknown>;
  const delegate = (
    prisma as unknown as Record<
      string,
      { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> }
    >
  )[delegateName];
  const rows = (await delegate.findMany({ where, select: { [field]: true } })) as Array<
    Record<string, unknown>
  >;
  const counts = new Array(buckets.length).fill(0);
  for (const row of rows) {
    const value = row[field];
    if (!(value instanceof Date)) continue;
    const idx = bucketIndex(buckets, value);
    if (idx >= 0) counts[idx] += 1;
  }
  return counts;
}

function bucketIndex(buckets: Date[], at: Date): number {
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (at.getTime() >= buckets[i].getTime()) return i;
  }
  return -1;
}

function previousWindowStart(from: Date): Date {
  const ms = Date.now() - from.getTime();
  return new Date(from.getTime() - ms);
}

function formatDeltaLabel(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  const value = new Intl.NumberFormat("ru-RU").format(delta);
  return `${sign}${value} за период`;
}

function countByBucket<T extends Record<string, unknown>>(
  buckets: Date[],
  rows: T[],
  field: keyof T
): number[] {
  const counts = new Array(buckets.length).fill(0);
  for (const row of rows) {
    const value = row[field];
    if (!(value instanceof Date)) continue;
    for (let i = buckets.length - 1; i >= 0; i -= 1) {
      if (value.getTime() >= buckets[i].getTime()) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}

function percentDelta(total: number, delta: number): number {
  if (total === 0 || delta === 0) return 0;
  return Math.round((delta / total) * 100);
}

function inferSupportLevel(stats: {
  garageCount: number;
  reports: number;
  verified: number;
  mixed: number;
}): AdminSupportLevel {
  if (stats.verified >= 5 && stats.mixed === 0 && stats.garageCount >= 100) return "MVP_CORE";
  if (stats.verified >= 1 || stats.reports >= 10) return "COMMUNITY_SUPPORT";
  if (stats.reports >= 1 || stats.garageCount >= 5) return "EARLY_BETA";
  if (stats.garageCount === 0) return "NO_FITMENT_DATA_YET";
  return "EARLY_BETA";
}
