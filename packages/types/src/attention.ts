import type { NodeStatus, StatusSemanticKey } from "./status";

/** Statuses included in the «Требует внимания» list. */
export type AttentionEffectiveStatus = Extract<NodeStatus, "OVERDUE" | "SOON">;

/** Worst-case status for coloring the attention entry control. */
export type AttentionActionSeverity = "neutral" | "OVERDUE" | "SOON";
export type AttentionSnoozeFilter = "all" | "unsnoozed" | "snoozed";

/** Alias for garage / compact indicators (same values as {@link AttentionActionSeverity}). */
export type AttentionSeverity = AttentionActionSeverity;

export type AttentionActionViewModel = {
  severity: AttentionActionSeverity;
  totalCount: number;
  /** Key into `statusSemanticTokens` (`UNKNOWN` when neutral / empty). */
  semanticKey: StatusSemanticKey;
};

/** Compact garage-card chip: same severity priority as vehicle detail «Требует внимания». */
export type GarageAttentionIndicatorViewModel = {
  /** Hide when no attention items (or API omitted summary). */
  isVisible: boolean;
  totalCount: number;
  severity: AttentionSeverity;
  semanticKey: StatusSemanticKey;
};

export type AttentionItemViewModel = {
  nodeId: string;
  code: string;
  name: string;
  /** Top-level tree root name under which this node lives; omitted in UI when redundant. */
  topLevelParentName: string | null;
  effectiveStatus: AttentionEffectiveStatus;
  statusLabelRu: string;
  shortExplanation: string | null;
  canAddServiceEvent: boolean;
  /** Same rule as node tree: full explanation modal when `statusExplanation` is present. */
  canOpenStatusExplanation: boolean;
};

export type AttentionStatusGroupViewModel = {
  status: AttentionEffectiveStatus;
  sectionTitleRu: string;
  items: AttentionItemViewModel[];
};

export type AttentionSummaryViewModel = {
  totalCount: number;
  overdueCount: number;
  soonCount: number;
  items: AttentionItemViewModel[];
  overdueItems: AttentionItemViewModel[];
  soonItems: AttentionItemViewModel[];
  groups: AttentionStatusGroupViewModel[];
};

export type NodeSnoozeOption = "7d" | "30d" | "clear";

export type NodeSnoozeState = {
  vehicleId: string;
  nodeId: string;
  snoozeUntilIso: string | null;
};
