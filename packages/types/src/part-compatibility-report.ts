import type { FitmentConfidenceStatus, FitmentReportResultWire, FitmentVoteTypeWire, TrustBadgeWire } from "./fitment-community";
import type { VehicleRideProfile } from "./vehicle";

/** Уровень уверенности для UI (спека §13): не ведущий сырой score. */
export type CompatibilityConfidenceTierWire = "high" | "medium" | "low";

export type PartCompatibilityStructuredSummaryWire = {
  catalogLineRu: string | null;
  hasExactVariantFit: boolean;
  hasModelYearFit: boolean;
  hasGenericNodeFit: boolean;
};

export type PartCompatibilityBreakdownWire = {
  directFitCount: number;
  fitWithModificationCount: number;
  partialFitCount: number;
  doesNotFitCount: number;
  oemReplacementCount: number;
  totalReports: number;
  /** Доли 0–100, сумма может отличаться от 100 из-за округления. */
  directFitPercent: number;
  fitWithModificationPercent: number;
  partialFitPercent: number;
  doesNotFitPercent: number;
  oemReplacementPercent: number;
};

export type PartCompatibilitySourcePriorityKindWire =
  | "structured_only"
  | "community_only"
  | "hybrid"
  | "conflict"
  | "insufficient_data";

export type PartCompatibilitySourcePriorityWire = {
  kind: PartCompatibilitySourcePriorityKindWire;
  titleRu: string;
  detailRu: string | null;
};

export type PartCompatibilityVoteAggregateWire = {
  voteType: FitmentVoteTypeWire;
  count: number;
};

export type PartCompatibilityEvidenceItemWire = {
  id: string;
  type: string;
  fileUrl: string;
};

export type PartCompatibilityRideProfileInsightWire = {
  headlineRu: string;
  topTags: Array<{ labelRu: string; count: number; percent: number }>;
  sampleSize: number;
};

export type PartCompatibilityServiceStatisticsWire = {
  /** Всего строк отчёта по связке (как в агрегате breakdown). */
  totalReportEntries: number;
  /** Уникальных авторов (createdByUserId). */
  uniqueAuthorCount: number;
  /** Записей сверх первой у того же автора = повторные отчёты / повторная установка. */
  repeatReportCount: number;
  /** Сколько авторов оставили больше одного отчёта по этой связке. */
  authorsWithMultipleEntriesCount: number;
  /** Средняя оценка 1–5 из поля rating; null если оценок нет. */
  averageRating: number | null;
  /** Сколько отчётов с заполненным rating. */
  ratedReportCount: number;
  /** Средний пробег в момент описания (installedAtMileage), по отчётам с полем. */
  averageInstalledAtMileageKm: number | null;
  maxInstalledAtMileageKm: number | null;
  /** Средняя дельта пробега между подряд идущими отчётами одного автора (оценка «пробег после установки»). */
  averageMileageAfterInstallKm: number | null;
  maxMileageAfterInstallKm: number | null;
  /** Сколько пар подряд отчётов одного автора дали валидную дельту. */
  mileageAfterInstallSamplePairs: number;
  reportsWithServiceEventCount: number;
};

export type PartCompatibilityReportItemWire = {
  id: string;
  /** PENDING — ещё не прошёл модерацию (или создан до авто-публикации). */
  moderationStatus: "PUBLISHED" | "PENDING" | "NEEDS_REVIEW" | "HIDDEN" | "REJECTED";
  fitmentResult: FitmentReportResultWire;
  installationStatus: string;
  modificationRequired: boolean;
  modificationDetails: string | null;
  comment: string | null;
  installedAtMileage: number | null;
  /** Оценка 1–5 в анкете отчёта; может быть null. */
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  createdByLabel: string;
  vehicleLabel: string | null;
  serviceEventId: string | null;
  /** Заголовок связанного сервисного события (если есть). */
  serviceEventTitle: string | null;
  /** Профиль езды, зафиксированный в отчёте (снимок или с мотоцикла на момент выдачи API). */
  rideProfileAtReport: VehicleRideProfile | null;
  votes: Array<{ voteType: FitmentVoteTypeWire }>;
  evidence: PartCompatibilityEvidenceItemWire[];
};

export type PartCompatibilityRelatedPartWire = {
  partMasterId: string;
  skuId: string;
  brandName: string;
  title: string;
  primaryPartNumber: string | null;
  summaryLineRu: string;
  communityStatus: FitmentConfidenceStatus | null;
  trustBadge: TrustBadgeWire;
};

export type PartCompatibilityVehicleWire = {
  id: string;
  nickname: string | null;
  brandName: string;
  modelFamilyName: string;
  variantName: string;
  generationName: string;
  modelYear: number | null;
  marketRegion: string | null;
};

export type PartCompatibilityNodeWire = {
  id: string;
  code: string;
  name: string;
  serviceGroup: string | null;
};

export type PartCompatibilityPartMasterWire = {
  id: string;
  brandName: string;
  title: string;
  sku: string;
};

export type PartCompatibilityConfidenceWire = {
  confidenceScore: number;
  reportCount: number;
  confirmationCount: number;
  rejectionCount: number;
  modificationCount: number;
  status: FitmentConfidenceStatus;
  isStaffVerified: boolean;
  tier: CompatibilityConfidenceTierWire;
  tierLabelRu: string;
};

/** Ответ GET /api/vehicles/[id]/part-compatibility-report (MVP). */
export type PartCompatibilityReportWire = {
  partMaster: PartCompatibilityPartMasterWire;
  node: PartCompatibilityNodeWire;
  vehicle: PartCompatibilityVehicleWire;
  motorcycleGenerationId: string;
  structured: PartCompatibilityStructuredSummaryWire;
  confidence: PartCompatibilityConfidenceWire | null;
  breakdown: PartCompatibilityBreakdownWire;
  smallSample: boolean;
  uniqueAuthorCount: number;
  /** §23 и учёт повторных отчётов одного владельца. */
  serviceStatistics: PartCompatibilityServiceStatisticsWire;
  /** §19: null если мало данных. */
  rideProfileInsight: PartCompatibilityRideProfileInsightWire | null;
  voteTotals: PartCompatibilityVoteAggregateWire[];
  sourcePriority: PartCompatibilitySourcePriorityWire;
  reports: PartCompatibilityReportItemWire[];
  relatedParts: PartCompatibilityRelatedPartWire[];
};
