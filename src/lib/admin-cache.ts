/**
 * Tag conventions for admin dashboard cache keys.
 *
 * The values are passed to `revalidateTag` from a future Refresh button to
 * invalidate the server cache without redeploying.
 */
export const ADMIN_CACHE_TAGS = {
  dashboardKpis: "admin:dashboard:kpis",
  dashboardWorkQueue: "admin:dashboard:work-queue",
  dashboardFastestModels: "admin:dashboard:fastest-models",
  dashboardProblemAreas: "admin:dashboard:problem-areas",
  dashboardFitmentQuality: "admin:dashboard:fitment-quality",
  dashboardCatalogCoverage: "admin:dashboard:catalog-coverage",
  dashboardActivity: "admin:dashboard:activity",
  dashboardAlerts: "admin:dashboard:alerts",
} as const;

export const ADMIN_CACHE_REVALIDATE = {
  /** Light KPI snapshots — refresh frequently. */
  fast: 60,
  /** Heavy aggregations (coverage, problem areas). */
  slow: 300,
} as const;
