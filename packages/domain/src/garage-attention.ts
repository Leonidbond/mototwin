import type {
  AttentionSummaryViewModel,
  GarageAttentionIndicatorViewModel,
  GarageAttentionSummaryWire,
  NodeTreeItem,
} from "@mototwin/types";
import {
  buildAttentionActionViewModel,
  buildAttentionSummaryFromNodeTree,
  getAttentionActionSeverity,
  getAttentionItemsFromNodeTree,
  sortAttentionItemsByPriority,
} from "./attention";

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

const GARAGE_ATTENTION_PREVIEW_LIMIT = 2;

export type GarageAttentionIconKey =
  | "brakes"
  | "brakes_front_pads"
  | "chain_sprockets"
  | "engine_cooling"
  | "lubrication"
  | "suspension"
  | "tires"
  | "tires_rear";

/** Map node code to a top-node icon key for garage card preview rows. */
export function resolveGarageAttentionIconKey(nodeCode: string): GarageAttentionIconKey {
  const code = nodeCode.toLowerCase();
  if (code.includes("tire") && code.includes("rear")) return "tires_rear";
  if (code.includes("tire")) return "tires";
  if (code.includes("brake") && code.includes("pad")) return "brakes_front_pads";
  if (code.includes("brake")) return "brakes";
  if (code.includes("chain") || code.includes("sprocket")) return "chain_sprockets";
  if (code.includes("susp")) return "suspension";
  if (code.includes("lubric") || code.includes("oil")) return "lubrication";
  if (code.includes("cool") || code.includes("engine")) return "engine_cooling";
  return "lubrication";
}

/** Full garage attention payload: counts + top nodes for card preview. */
export function buildGarageAttentionSummaryFromNodeTree(
  roots: NodeTreeItem[],
  maxItems = GARAGE_ATTENTION_PREVIEW_LIMIT
): GarageAttentionSummaryWire {
  const summary = buildAttentionSummaryFromNodeTree(roots);
  const items = sortAttentionItemsByPriority(getAttentionItemsFromNodeTree(roots))
    .slice(0, maxItems)
    .map((item) => ({
      nodeId: item.nodeId,
      code: item.code,
      name: item.name,
      effectiveStatus: item.effectiveStatus,
      statusLabelRu: item.statusLabelRu,
      subtitle: (item.shortExplanation?.trim() || item.statusLabelRu),
    }));

  return {
    totalCount: summary.totalCount,
    overdueCount: summary.overdueCount,
    soonCount: summary.soonCount,
    items,
  };
}
