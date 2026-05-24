/**
 * Wire types and DTOs for the MotoTwin admin panel.
 * Web routes under `src/app/api/admin/*` and `src/app/admin/*` consume these.
 *
 * Keep the surface narrow and JSON-friendly: admin pages are server-rendered
 * and stream view models down to client components.
 */

export type AdminRoleWire =
  | "SUPER_ADMIN"
  | "CATALOG_MANAGER"
  | "MODERATOR"
  | "ANALYST";

/** Stable URL keys for the admin sidebar (and breadcrumbs / palette). */
export type AdminSectionKey =
  | "dashboard"
  | "reports"
  | "users"
  | "vehicles"
  | "models"
  | "catalog"
  | "fitment"
  | "moderation"
  | "imports"
  | "service-rules"
  | "dictionaries"
  | "notifications"
  | "subscriptions"
  | "audit"
  | "settings";

export type AdminPeriodKey = "1d" | "7d" | "14d" | "30d" | "90d" | "custom";

export interface AdminPeriodValue {
  key: AdminPeriodKey;
  /** ISO timestamps; for non-custom periods the server resolves these. */
  from?: string;
  to?: string;
}

/** Shape of a sparkline series for a KPI card (small SVG without axes). */
export interface AdminSparklinePoint {
  /** ISO date or bucket label. */
  t: string;
  v: number;
}

export type AdminKpiTone =
  | "orange"
  | "blue"
  | "gray"
  | "yellow"
  | "green"
  | "red"
  | "violet";

export type AdminDeltaDirection = "up" | "down" | "flat";

export interface AdminKpiCardWire {
  id: string;
  label: string;
  value: number;
  /** Pretty value override (e.g. "18 420"). */
  valueLabel?: string;
  delta: number;
  deltaPct?: number;
  deltaDirection: AdminDeltaDirection;
  /** "+326 за 7 дней" — period-aware caption. */
  deltaLabel: string;
  tone: AdminKpiTone;
  iconKey: string;
  sparkline: AdminSparklinePoint[];
}

export interface AdminDashboardKpisResponse {
  generatedAt: string;
  period: AdminPeriodValue;
  cards: AdminKpiCardWire[];
}

export type AdminWorkQueueTabKey =
  | "all"
  | "new-parts"
  | "fitment"
  | "conflicts"
  | "safety";

export type AdminWorkQueuePriority = "low" | "normal" | "high" | "critical";

export type AdminWorkQueueStatusKey =
  | "pending"
  | "safety-critical"
  | "mixed-reports"
  | "low-confidence"
  | "verified"
  | "community"
  | "rejected";

export interface AdminWorkQueueRowWire {
  id: string;
  /** "fitment" | "part-master" | "conflict". */
  kind: string;
  priority: AdminWorkQueuePriority;
  partLabel: string;
  /** Foreign label (e.g. "BMW R 1250 GS"). */
  modelLabel: string;
  nodeLabel: string;
  statusKey: AdminWorkQueueStatusKey;
  statusLabel: string;
  confirmations: number;
  /** Where the action button leads. */
  reviewHref: string;
  detailsHref: string;
}

export interface AdminWorkQueueResponse {
  generatedAt: string;
  totals: Record<AdminWorkQueueTabKey, number>;
  rows: AdminWorkQueueRowWire[];
  /** Returned tab; mirrors the request. */
  tab: AdminWorkQueueTabKey;
}

export type AdminSupportLevel =
  | "FULL_SUPPORT"
  | "COMMUNITY_SUPPORT"
  | "EARLY_BETA"
  | "NO_DATA"
  | "UNSUPPORTED";

export interface AdminFastestModelRowWire {
  rank: number;
  modelVariantId: string;
  brandLabel: string;
  modelLabel: string;
  garageCount: number;
  garageDelta: number;
  activeOwners: number;
  activeOwnersDelta: number;
  reports: number;
  reportsDelta: number;
  supportLevel: AdminSupportLevel;
}

export interface AdminFastestModelsResponse {
  generatedAt: string;
  rows: AdminFastestModelRowWire[];
}

export type AdminProblemAreaKind =
  | "low-verified-coverage"
  | "conflicting-fitment"
  | "missing-service-rules"
  | "duplicate-skus";

export interface AdminProblemAreaCardWire {
  id: string;
  kind: AdminProblemAreaKind;
  title: string;
  description: string;
  recommendation: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface AdminProblemAreasResponse {
  generatedAt: string;
  cards: AdminProblemAreaCardWire[];
}

export interface AdminFitmentQualitySliceWire {
  key:
    | "verified"
    | "community"
    | "modification"
    | "mixed"
    | "low"
    | "rejected";
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface AdminFitmentQualityResponse {
  generatedAt: string;
  total: number;
  slices: AdminFitmentQualitySliceWire[];
}

export interface AdminCatalogCoverageCellWire {
  brandKey: string;
  percent: number;
}

export interface AdminCatalogCoverageRowWire {
  /** Узел / категория, e.g. "Масло", "Тормоза". */
  label: string;
  cells: AdminCatalogCoverageCellWire[];
}

export interface AdminCatalogCoverageResponse {
  generatedAt: string;
  brands: { key: string; label: string }[];
  rows: AdminCatalogCoverageRowWire[];
}

export interface AdminActivityPointWire {
  /** ISO date — bucket. */
  t: string;
  newVehicles: number;
  serviceEvents: number;
  fitmentReports: number;
}

export interface AdminActivityResponse {
  generatedAt: string;
  period: AdminPeriodValue;
  points: AdminActivityPointWire[];
}

export type AdminAlertKey =
  | "moderation-pending"
  | "fitment-pending"
  | "conflicts"
  | "safety-critical"
  | "import-errors"
  | "service-rules";

export interface AdminAlertWire {
  key: AdminAlertKey;
  label: string;
  count: number;
  href: string;
}

export interface AdminAlertsResponse {
  generatedAt: string;
  total: number;
  items: AdminAlertWire[];
}

export type AdminSearchEntityKind =
  | "user"
  | "vehicle"
  | "model"
  | "part"
  | "fitment-report";

export interface AdminSearchHitWire {
  kind: AdminSearchEntityKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface AdminSearchGroupWire {
  kind: AdminSearchEntityKind;
  label: string;
  hits: AdminSearchHitWire[];
}

export interface AdminSearchResponse {
  query: string;
  groups: AdminSearchGroupWire[];
  totalHits: number;
}

/** Identity of the currently logged-in admin (for header / settings). */
export interface AdminSelfWire {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AdminRoleWire;
  isModerator: boolean;
}

export type AdminUserPlanFilter = "FREE" | "PRO" | "all";

export interface AdminUserListFilters {
  q?: string;
  plan?: AdminUserPlanFilter;
  hasVehicles?: "yes" | "no";
  role?: AdminRoleWire | "all";
  status?: "active" | "blocked" | "all";
}

export interface AdminUserListItemWire {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  isBlocked: boolean;
  blockedAt: string | null;
  blockReason: string | null;
  isModerator: boolean;
  adminRole: AdminRoleWire | null;
  plan: "FREE" | "PRO" | null;
  vehicleCount: number;
  fitmentReportCount: number;
  expenseCount: number;
  lastActivityAt: string | null;
}

export interface AdminUserListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminUserListItemWire[];
}

export interface AdminUserDetailWire {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  blockedAt: string | null;
  blockReason: string | null;
  isModerator: boolean;
  adminRole: AdminRoleWire | null;
  plan: "FREE" | "PRO" | null;
  planStatus: string | null;
  vehicleCount: number;
  fitmentReportCount: number;
  expenseCount: number;
  fitmentVoteCount: number;
  serviceEventCount: number;
  garages: Array<{ id: string; title: string; vehicleCount: number }>;
  recentVehicles: Array<{
    id: string;
    brandLabel: string;
    modelLabel: string;
    year: number;
    nickname: string | null;
    odometer: number;
    createdAt: string;
  }>;
  recentFitmentReports: Array<{
    id: string;
    partLabel: string;
    nodeLabel: string;
    moderationStatus: string;
    createdAt: string;
  }>;
  recentServiceEvents: Array<{
    id: string;
    eventDate: string;
    nodeLabel: string;
    title: string | null;
    odometer: number;
  }>;
}

export type AdminVehicleSortKey =
  | "createdAtDesc"
  | "lastActivityDesc"
  | "odometerDesc";

export interface AdminVehicleListFilters {
  brandId?: string;
  modelId?: string;
  year?: number;
  q?: string;
  sort?: AdminVehicleSortKey;
}

export interface AdminVehicleListItemWire {
  id: string;
  ownerLabel: string;
  ownerId: string;
  brandLabel: string;
  modelLabel: string;
  year: number;
  versionName: string;
  nickname: string | null;
  vinLast: string | null;
  odometer: number;
  engineHours: number | null;
  createdAt: string;
  lastServiceAt: string | null;
  serviceEventCount: number;
}

export interface AdminVehicleListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminVehicleListItemWire[];
}

export interface AdminModelListItemWire {
  modelVariantId: string;
  brandLabel: string;
  brandId: string;
  modelLabel: string;
  modelId: string;
  year: number;
  versionName: string;
  garageCount: number;
  reportsCount: number;
  verifiedCount: number;
  conflictsCount: number;
  supportLevel: AdminSupportLevel;
  supportLevelOverride: AdminSupportLevel | null;
}

export interface AdminModelSupportSummaryWire {
  full: number;
  community: number;
  earlyBeta: number;
  noData: number;
}

export interface AdminModelListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: AdminModelSupportSummaryWire;
  items: AdminModelListItemWire[];
}

export interface AdminModelDetailWire {
  modelVariantId: string;
  brandLabel: string;
  modelLabel: string;
  year: number;
  versionName: string;
  generation: string | null;
  market: string | null;
  engineType: string | null;
  coolingType: string | null;
  wheelSizes: string | null;
  brakeSystem: string | null;
  chainPitch: string | null;
  stockSprockets: string | null;
  supportLevel: AdminSupportLevel;
  supportLevelOverride: AdminSupportLevel | null;
  supportLevelReason: string | null;
  garageCount: number;
  reportsCount: number;
  verifiedCount: number;
  conflictsCount: number;
  /** Coverage by node — verified/community vs total reports. */
  nodeCoverage: Array<{
    nodeId: string;
    nodeLabel: string;
    verified: number;
    reports: number;
    conflicts: number;
  }>;
}

export interface AdminUpdateSupportLevelPayload {
  supportLevel: AdminSupportLevel | null;
  reason: string;
}

export type AdminPartStatusWire =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "MERGED"
  | "REJECTED";

export interface AdminPartListFilters {
  q?: string;
  status?: AdminPartStatusWire;
  brand?: string;
  source?: "ADMIN" | "USER";
}

export interface AdminPartListItemWire {
  id: string;
  brandName: string;
  sku: string;
  title: string;
  subcategory: string | null;
  status: AdminPartStatusWire;
  source: "ADMIN" | "USER";
  aliasCount: number;
  reportsCount: number;
  verifiedCount: number;
  conflictsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPartListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminPartListItemWire[];
}

export interface AdminPartAliasWire {
  id: string;
  alias: string;
  source: string | null;
  createdAt: string;
}

export interface AdminPartFitmentSummaryWire {
  modelVariantId: string;
  brandLabel: string;
  modelLabel: string;
  year: number;
  status: string;
  reportCount: number;
  confidenceScore: number;
}

export interface AdminPartReportSummaryWire {
  id: string;
  modelLabel: string;
  nodeLabel: string;
  fitmentResult: string;
  moderationStatus: string;
  createdAt: string;
}

export interface AdminPartDetailWire {
  id: string;
  brandName: string;
  sku: string;
  title: string;
  subcategory: string | null;
  description: string | null;
  imageUrl: string | null;
  status: AdminPartStatusWire;
  source: "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
  reportsCount: number;
  verifiedCount: number;
  conflictsCount: number;
  aliases: AdminPartAliasWire[];
  fitments: AdminPartFitmentSummaryWire[];
  recentReports: AdminPartReportSummaryWire[];
  duplicates: Array<{
    id: string;
    brandName: string;
    sku: string;
    title: string;
    score: number;
  }>;
}

export interface AdminPartCreatePayload {
  brandName: string;
  sku: string;
  title: string;
  subcategory?: string;
  description?: string;
  imageUrl?: string;
  status?: AdminPartStatusWire;
}

export interface AdminPartUpdatePayload {
  brandName?: string;
  sku?: string;
  title?: string;
  subcategory?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status?: AdminPartStatusWire;
}

export interface AdminPartMergePayload {
  /** Master that will swallow the duplicates. */
  intoPartMasterId: string;
  reason: string;
}

export type AdminModerationQueueKey =
  | "pendingMasters"
  | "pendingReports"
  | "needsReviewReports"
  | "safetyCriticalReports"
  | "hiddenReports"
  | "rejectedReports"
  | "mixedFitments";

export interface AdminModerationCountsWire {
  pendingMasters: number;
  pendingReports: number;
  needsReviewReports: number;
  safetyCriticalReports: number;
  hiddenReports: number;
  rejectedReports: number;
  mixedFitments: number;
}

export interface AdminModerationItemWire {
  id: string;
  kind: "PART_MASTER" | "FITMENT_REPORT" | "FITMENT_CONFIDENCE";
  title: string;
  subtitle: string | null;
  status: string;
  badges: string[];
  createdAt: string;
}

export interface AdminModerationListResponse {
  queue: AdminModerationQueueKey;
  counts: AdminModerationCountsWire;
  items: AdminModerationItemWire[];
}

export interface AdminModerationInspectorWire {
  id: string;
  kind: "PART_MASTER" | "FITMENT_REPORT" | "FITMENT_CONFIDENCE";
  heading: string;
  subheading: string;
  status: string;
  fields: Array<{ label: string; value: string }>;
  notes: string | null;
  actions: Array<{ id: string; label: string; tone?: "primary" | "danger" | "neutral" }>;
  links: Array<{ label: string; href: string }>;
}

export interface AdminFitmentMatrixCellWire {
  brandLabel: string;
  brandId: string;
  nodeLabel: string;
  nodeId: string;
  verified: number;
  reports: number;
  conflicts: number;
}

export interface AdminFitmentMatrixResponse {
  brands: Array<{ id: string; label: string }>;
  nodes: Array<{ id: string; label: string }>;
  cells: AdminFitmentMatrixCellWire[];
}

export type AdminImportBatchTypeWire =
  | "PARTS"
  | "PART_ALIASES"
  | "FITMENT_RULES"
  | "SERVICE_RULES"
  | "MODELS"
  | "CONFIGURATIONS"
  | "OEM_CROSS";

export type AdminImportBatchStatusWire =
  | "DRAFT"
  | "VALIDATING"
  | "READY"
  | "IMPORTING"
  | "COMMITTED"
  | "ROLLED_BACK"
  | "FAILED";

export interface AdminImportBatchSummaryWire {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: number;
}

export interface AdminImportBatchListItemWire {
  id: string;
  type: AdminImportBatchTypeWire;
  status: AdminImportBatchStatusWire;
  fileName: string;
  createdAt: string;
  committedAt: string | null;
  createdByLabel: string;
  summary: AdminImportBatchSummaryWire;
}

export interface AdminImportBatchListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminImportBatchListItemWire[];
}

export interface AdminImportBatchRowWire {
  id: string;
  rowIndex: number;
  raw: Record<string, string>;
  action: "create" | "update" | "skip" | "conflict" | null;
  status: "ok" | "warning" | "error";
  errorMessage: string | null;
  mappedEntityId: string | null;
}

export interface AdminImportBatchDetailWire {
  id: string;
  type: AdminImportBatchTypeWire;
  status: AdminImportBatchStatusWire;
  fileName: string;
  createdAt: string;
  dryRunAt: string | null;
  committedAt: string | null;
  rolledBackAt: string | null;
  createdByLabel: string;
  summary: AdminImportBatchSummaryWire;
  rows: AdminImportBatchRowWire[];
}

export interface AdminAuditLogEntryWire {
  id: string;
  createdAt: string;
  actorLabel: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  importBatchId: string | null;
  ip: string | null;
}

export interface AdminAuditLogListResponse {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminAuditLogEntryWire[];
}

export interface AdminBrandRefRow {
  id: string;
  name: string;
  slug: string;
  modelCount: number;
}

export interface AdminNodeRefRow {
  id: string;
  code: string;
  name: string;
  level: number;
  serviceGroup: string | null;
  isActive: boolean;
  isMvpVisible: boolean;
}

export interface AdminTeamMemberWire {
  id: string;
  email: string | null;
  displayName: string | null;
  adminRole: AdminRoleWire | null;
  isModerator: boolean;
  createdAt: string;
}

export interface AdminUpdateTeamRolePayload {
  userId: string;
  adminRole: AdminRoleWire | null;
  reason: string;
}

export interface AdminUpdateUserBlockPayload {
  isBlocked: boolean;
  reason: string;
}
