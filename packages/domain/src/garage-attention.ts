import type {
  AttentionSummaryViewModel,
  GarageAttentionIndicatorViewModel,
} from "@mototwin/types";
import { buildAttentionActionViewModel, getAttentionActionSeverity } from "./attention";

/** Alias for call sites that think in terms of raw status counts (same as `getAttentionActionSeverity`). */
export function getAttentionSeverityFromStatuses(
  summary: Pick<AttentionSummaryViewModel, "overdueCount" | "soonCount" | "totalCount">
): GarageAttentionIndicatorViewModel["severity"] {
  return getAttentionActionSeverity(summary);
}

/**
 * Garage list chip next to the motorcycle name.
 * `summary` comes from GET /api/garage `attentionSummary`; missing → hidden indicator.
 */
export function buildGarageAttentionIndicatorViewModel(
  summary:
    | Pick<AttentionSummaryViewModel, "totalCount" | "overdueCount" | "soonCount">
    | null
    | undefined
): GarageAttentionIndicatorViewModel {
  if (!summary || summary.totalCount <= 0) {
    return {
      isVisible: false,
      totalCount: 0,
      severity: "neutral",
      semanticKey: "UNKNOWN",
    };
  }
  const action = buildAttentionActionViewModel(summary);
  return {
    isVisible: true,
    totalCount: summary.totalCount,
    severity: action.severity,
    semanticKey: action.semanticKey,
  };
}
