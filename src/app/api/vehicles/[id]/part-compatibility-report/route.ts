import { NextRequest, NextResponse } from "next/server";
import type { FitmentReportModerationStatus } from "@prisma/client";
import type {
  FitmentReportResultWire,
  FitmentVoteTypeWire,
  PartCompatibilityReportWire,
  PartCompatibilityServiceStatisticsWire,
  VehicleRideProfile,
} from "@mototwin/types";
import {
  analyzeStructuredCatalogSignals,
  buildCompatibilityBreakdown,
  buildRideProfileCompatibilityInsight,
  compatibilityConfidenceTierLabelRu,
  deriveCompatibilityConfidenceTier,
  deriveDominantFitmentResult,
  deriveSourcePriority,
  getPickerFitmentShortLabelRu,
  parseVehicleRideProfileSnapshot,
} from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { getVehicleInCurrentContext } from "@/app/api/_shared/vehicle-context";
import { buildRecommendationsForNodeWithCommunity } from "@/lib/build-recommendations-for-node-with-community";
import { parseSearchParamText } from "@/lib/http/input-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const { searchParams } = new URL(request.url);
    // MT-SEC-071: cap ids before DB lookups.
    const nodeId = parseSearchParamText(searchParams.get("nodeId"), { max: 64 });
    const partMasterId = parseSearchParamText(searchParams.get("partMasterId"), { max: 64 });

    if (!nodeId || !partMasterId) {
      return NextResponse.json({ error: "Укажите nodeId и partMasterId." }, { status: 400 });
    }

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      nickname: true,
      motorcycleBrandId: true,
      motorcycleModelFamilyId: true,
      motorcycleVariantId: true,
      motorcycleGenerationId: true,
      motorcycleBrand: { select: { name: true } },
      motorcycleModelFamily: { select: { name: true } },
      motorcycleVariant: { select: { name: true } },
      motorcycleGeneration: {
        select: {
          name: true,
          yearFrom: true,
          marketRegion: true,
        },
      },
    });
    if (
      !vehicle?.motorcycleGenerationId ||
      !vehicle.motorcycleBrand ||
      !vehicle.motorcycleModelFamily ||
      !vehicle.motorcycleVariant ||
      !vehicle.motorcycleGeneration
    ) {
      return NextResponse.json(
        { error: "Мотоцикл не найден или без поколения." },
        { status: 404 }
      );
    }

    const motorcycleGenerationId = vehicle.motorcycleGenerationId;

    const visibleModerationStatuses: FitmentReportModerationStatus[] = ["PUBLISHED", "PENDING"];
    const reportWhereBase = {
      partMasterId,
      motorcycleGenerationId,
      nodeId,
      /** Показываем и ожидающие модерации — иначе свежий отчёт «пропадает» до ручного approve. */
      moderationStatus: { in: visibleModerationStatuses },
    };

    const [
      partMaster,
      node,
      confidence,
      skusForCatalog,
      groupedByResult,
      reportsRaw,
      voteGroups,
      byAuthorGroups,
      statsBasisRows,
    ] = await Promise.all([
      prisma.partMaster.findUnique({
        where: { id: partMasterId },
        select: { id: true, brandName: true, title: true, sku: true },
      }),
      prisma.node.findUnique({
        where: { id: nodeId },
        select: { id: true, code: true, name: true, serviceGroup: true },
      }),
      prisma.fitmentConfidence.findUnique({
        where: {
          partMasterId_motorcycleGenerationId_nodeId: {
            partMasterId,
            motorcycleGenerationId,
            nodeId,
          },
        },
      }),
      prisma.partSku.findMany({
        where: { partMasterId, isActive: true },
        select: {
          fitments: {
            select: {
              motorcycleBrandId: true,
              motorcycleModelFamilyId: true,
              motorcycleVariantId: true,
              motorcycleGenerationId: true,
              fitmentType: true,
            },
          },
        },
        take: 24,
      }),
      prisma.fitmentReport.groupBy({
        by: ["fitmentResult"],
        where: reportWhereBase,
        _count: { _all: true },
      }),
      prisma.fitmentReport.findMany({
        where: reportWhereBase,
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          votes: { select: { voteType: true } },
          evidence: { select: { id: true, type: true, fileUrl: true } },
          createdBy: { select: { displayName: true } },
          serviceEvent: { select: { id: true, title: true } },
          vehicle: {
            select: {
              nickname: true,
              motorcycleBrand: { select: { name: true } },
              motorcycleModelFamily: { select: { name: true } },
              rideProfile: {
                select: {
                  usageType: true,
                  ridingStyle: true,
                  loadType: true,
                  usageIntensity: true,
                },
              },
            },
          },
        },
      }),
      prisma.fitmentVote.groupBy({
        by: ["voteType"],
        where: {
          report: { is: reportWhereBase },
        },
        _count: { _all: true },
      }),
      prisma.fitmentReport.groupBy({
        by: ["createdByUserId"],
        where: reportWhereBase,
        _count: { _all: true },
      }),
      prisma.fitmentReport.findMany({
        where: reportWhereBase,
        select: {
          vehicleId: true,
          fitmentResult: true,
          createdByUserId: true,
          createdAt: true,
          installedAtMileage: true,
          rating: true,
          serviceEventId: true,
          rideProfileSnapshot: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!partMaster) {
      return NextResponse.json({ error: "Карточка детали не найдена." }, { status: 404 });
    }
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }

    const flatFitments = skusForCatalog.flatMap((s) => s.fitments);
    const structured = analyzeStructuredCatalogSignals(flatFitments, {
      motorcycleBrandId: vehicle.motorcycleBrandId,
      motorcycleModelFamilyId: vehicle.motorcycleModelFamilyId,
      motorcycleVariantId: vehicle.motorcycleVariantId,
      motorcycleGenerationId,
    });

    const counts: Partial<Record<FitmentReportResultWire, number>> = {};
    for (const row of groupedByResult) {
      counts[row.fitmentResult as FitmentReportResultWire] = row._count._all;
    }
    const breakdown = buildCompatibilityBreakdown(counts);
    const dominant = deriveDominantFitmentResult(breakdown);
    const sourcePriority = deriveSourcePriority({
      structured: {
        hasExactVariantFit: structured.hasExactVariantFit,
        hasModelYearFit: structured.hasModelYearFit,
        catalogLineRu: structured.catalogLineRu,
      },
      breakdown,
      dominant,
    });

    const smallSample = breakdown.totalReports > 0 && breakdown.totalReports < 3;
    const uniqueAuthorCount = byAuthorGroups.length;
    const serviceStatistics = computePartCompatibilityServiceStatistics(statsBasisRows, byAuthorGroups);

    const vehicleIdsForRideFallback = [
      ...new Set(statsBasisRows.filter((r) => r.rideProfileSnapshot == null).map((r) => r.vehicleId)),
    ];
    const rideFallbackRows =
      vehicleIdsForRideFallback.length === 0
        ? []
        : await prisma.rideProfile.findMany({
            where: { vehicleId: { in: vehicleIdsForRideFallback } },
            select: {
              vehicleId: true,
              usageType: true,
              ridingStyle: true,
              loadType: true,
              usageIntensity: true,
            },
          });
    const rideFallbackMap = new Map<string, VehicleRideProfile>();
    for (const rp of rideFallbackRows) {
      const parsed = parseVehicleRideProfileSnapshot({
        usageType: rp.usageType,
        ridingStyle: rp.ridingStyle,
        loadType: rp.loadType,
        usageIntensity: rp.usageIntensity,
      });
      if (parsed) {
        rideFallbackMap.set(rp.vehicleId, parsed);
      }
    }

    const rideProfileInsight = buildRideProfileCompatibilityInsight(
      statsBasisRows.map((r) => ({
        fitmentResult: r.fitmentResult as FitmentReportResultWire,
        rideProfile:
          parseVehicleRideProfileSnapshot(r.rideProfileSnapshot) ?? rideFallbackMap.get(r.vehicleId) ?? null,
      }))
    );

    const voteTotals = voteGroups.map((g) => ({
      voteType: g.voteType as FitmentVoteTypeWire,
      count: g._count._all,
    }));

    let confidenceBlock: PartCompatibilityReportWire["confidence"] = null;
    if (confidence) {
      const tier = deriveCompatibilityConfidenceTier({
        status: confidence.status,
        publishedReportTotal: breakdown.totalReports,
      });
      confidenceBlock = {
        confidenceScore: confidence.confidenceScore,
        reportCount: confidence.reportCount,
        confirmationCount: confidence.confirmationCount,
        rejectionCount: confidence.rejectionCount,
        modificationCount: confidence.modificationCount,
        status: confidence.status,
        isStaffVerified: confidence.isStaffVerified,
        tier,
        tierLabelRu: compatibilityConfidenceTierLabelRu(tier),
      };
    }

    const vehicleWire: PartCompatibilityReportWire["vehicle"] = {
      id: vehicle.id,
      nickname: vehicle.nickname,
      brandName: vehicle.motorcycleBrand.name,
      modelFamilyName: vehicle.motorcycleModelFamily.name,
      variantName: vehicle.motorcycleVariant.name,
      generationName: vehicle.motorcycleGeneration.name,
      modelYear: vehicle.motorcycleGeneration.yearFrom ?? null,
      marketRegion: vehicle.motorcycleGeneration.marketRegion
        ? String(vehicle.motorcycleGeneration.marketRegion)
        : null,
    };

    const reports = reportsRaw.map((r) => {
      const v = r.vehicle;
      const vehicleLabel = v
        ? v.nickname?.trim()
          ? `${v.nickname.trim()} · ${v.motorcycleBrand.name} ${v.motorcycleModelFamily.name}`
          : `${v.motorcycleBrand.name} ${v.motorcycleModelFamily.name}`
        : null;
      return {
        id: r.id,
        moderationStatus: r.moderationStatus,
        fitmentResult: r.fitmentResult as FitmentReportResultWire,
        installationStatus: r.installationStatus,
        modificationRequired: r.modificationRequired,
        modificationDetails: r.modificationDetails,
        comment: r.comment,
        installedAtMileage: r.installedAtMileage,
        rating: r.rating,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        createdByLabel: r.createdBy.displayName?.trim() || "Участник",
        vehicleLabel,
        serviceEventId: r.serviceEventId,
        serviceEventTitle: r.serviceEvent?.title?.trim() || null,
        rideProfileAtReport:
          parseVehicleRideProfileSnapshot(r.rideProfileSnapshot) ??
          (r.vehicle?.rideProfile
            ? parseVehicleRideProfileSnapshot({
                usageType: r.vehicle.rideProfile.usageType,
                ridingStyle: r.vehicle.rideProfile.ridingStyle,
                loadType: r.vehicle.rideProfile.loadType,
                usageIntensity: r.vehicle.rideProfile.usageIntensity,
              })
            : null),
        votes: r.votes.map((x) => ({ voteType: x.voteType as FitmentVoteTypeWire })),
        evidence: r.evidence.map((e) => ({
          id: e.id,
          type: e.type,
          fileUrl: e.fileUrl,
        })),
      };
    });

    let relatedParts: PartCompatibilityReportWire["relatedParts"] = [];
    try {
      const recs = await buildRecommendationsForNodeWithCommunity(
        prisma,
        {
          id: vehicle.id,
          motorcycleBrandId: vehicle.motorcycleBrandId,
          motorcycleModelFamilyId: vehicle.motorcycleModelFamilyId,
          motorcycleVariantId: vehicle.motorcycleVariantId,
          motorcycleGenerationId,
        },
        nodeId,
        { code: node.code, serviceGroup: node.serviceGroup }
      );
      relatedParts = recs
        .filter((rec) => rec.partMasterId && rec.partMasterId !== partMasterId)
        .slice(0, 12)
        .map((rec) => ({
          partMasterId: rec.partMasterId!,
          skuId: rec.skuId,
          brandName: rec.brandName,
          title: rec.canonicalName,
          primaryPartNumber: rec.partNumbers[0] ?? null,
          summaryLineRu: getPickerFitmentShortLabelRu(rec),
          communityStatus: rec.communityStatus,
          trustBadge: rec.trustBadge,
        }));
    } catch {
      relatedParts = [];
    }

    const payload: PartCompatibilityReportWire = {
      partMaster,
      node,
      vehicle: vehicleWire,
      motorcycleGenerationId,
      structured,
      confidence: confidenceBlock,
      breakdown,
      smallSample,
      uniqueAuthorCount,
      serviceStatistics,
      rideProfileInsight,
      voteTotals,
      sourcePriority,
      reports,
      relatedParts,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("part-compatibility-report GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить отчёт по совместимости." }, { status: 500 });
  }
}

function computePartCompatibilityServiceStatistics(
  rows: ReadonlyArray<{
    createdByUserId: string;
    createdAt: Date;
    installedAtMileage: number | null;
    rating: number | null;
    serviceEventId: string | null;
    vehicleId?: string;
    fitmentResult?: string;
    rideProfileSnapshot?: unknown;
  }>,
  authorGroups: ReadonlyArray<{ createdByUserId: string; _count: { _all: number } }>
): PartCompatibilityServiceStatisticsWire {
  const totalReportEntries = rows.length;
  const repeatReportCount = authorGroups.reduce((s, g) => s + Math.max(0, g._count._all - 1), 0);
  const authorsWithMultipleEntriesCount = authorGroups.filter((g) => g._count._all > 1).length;
  const uniqueAuthorCount = authorGroups.length;

  const ratings = rows
    .map((r) => r.rating)
    .filter((x): x is number => typeof x === "number" && x >= 1 && x <= 5);
  const averageRating =
    ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  const mileages = rows
    .map((r) => r.installedAtMileage)
    .filter((x): x is number => typeof x === "number" && x > 0);
  const averageInstalledAtMileageKm =
    mileages.length > 0 ? Math.round(mileages.reduce((a, b) => a + b, 0) / mileages.length) : null;
  const maxInstalledAtMileageKm = mileages.length > 0 ? Math.max(...mileages) : null;

  const byUser = new Map<string, Array<{ createdAt: Date; installedAtMileage: number | null }>>();
  for (const r of rows) {
    const list = byUser.get(r.createdByUserId) ?? [];
    list.push({ createdAt: r.createdAt, installedAtMileage: r.installedAtMileage });
    byUser.set(r.createdByUserId, list);
  }
  const deltas: number[] = [];
  for (const [, list] of byUser) {
    const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].installedAtMileage;
      const cur = sorted[i].installedAtMileage;
      if (prev != null && cur != null && cur >= prev) {
        deltas.push(cur - prev);
      }
    }
  }
  const mileageAfterInstallSamplePairs = deltas.length;
  const averageMileageAfterInstallKm =
    deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
  const maxMileageAfterInstallKm = deltas.length > 0 ? Math.max(...deltas) : null;

  const reportsWithServiceEventCount = rows.filter((r) => r.serviceEventId != null && r.serviceEventId !== "").length;

  const ratedReportCount = rows.filter((r) => typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5).length;

  return {
    totalReportEntries,
    uniqueAuthorCount,
    repeatReportCount,
    authorsWithMultipleEntriesCount,
    averageRating,
    ratedReportCount,
    averageInstalledAtMileageKm,
    maxInstalledAtMileageKm,
    averageMileageAfterInstallKm,
    maxMileageAfterInstallKm,
    mileageAfterInstallSamplePairs,
    reportsWithServiceEventCount,
  };
}
