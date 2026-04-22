import type { NodeStatus } from "./status";

export type TopNodeStateItem = {
  id: string;
  status: NodeStatus | null;
  note: string | null;
  updatedAt: string | null;
  node: {
    id: string;
    code: string;
    name: string;
    level: number;
    displayOrder: number;
  };
};

export type NodeStatusExplanation = {
  reasonShort: string | null;
  reasonDetailed: string | null;
  triggerMode: string | null;
  current: {
    odometer: number | null;
    engineHours: number | null;
    date: string;
  };
  lastService: {
    eventDate: string | null;
    odometer: number | null;
    engineHours: number | null;
  } | null;
  rule: {
    intervalKm: number | null;
    intervalHours: number | null;
    intervalDays: number | null;
    warningKm: number | null;
    warningHours: number | null;
    warningDays: number | null;
  } | null;
  usage: {
    elapsedKm: number | null;
    elapsedHours: number | null;
    elapsedDays: number | null;
    remainingKm: number | null;
    remainingHours: number | null;
    remainingDays: number | null;
  } | null;
  triggeredBy: "km" | "hours" | "days" | null;
};

export type NodeTreeItem = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  status: NodeStatus | null;
  directStatus: NodeStatus | null;
  computedStatus: NodeStatus | null;
  effectiveStatus: NodeStatus | null;
  statusExplanation: NodeStatusExplanation | null;
  note: string | null;
  updatedAt: string | null;
  children: NodeTreeItem[];
};

export type NodePathItem = string;

export type SelectedNodePath = NodePathItem[];

export type FlattenedNodeSelectOption = {
  id: string;
  parentId: string | null;
  name: string;
  level: number;
  hasChildren: boolean;
  path: SelectedNodePath;
};

export type CascadedNodeSelectionState = {
  path: SelectedNodePath;
  levels: NodeTreeItem[][];
};

/** Same payload as API; alias for documentation / future display fields. */
export type NodeStatusExplanationViewModel = NodeStatusExplanation;

/** Actions derived from tree rules (e.g. only leaves may add service events). */
export type NodeTreeActionViewModel = {
  addServiceEventAvailable: boolean;
};

/** One segment of a selection path with display metadata. */
export type NodePathItemViewModel = {
  id: string;
  code: string;
  name: string;
  level: number;
};

/**
 * Flattened option for cascaded pickers; alias of the existing select option type.
 */
export type NodeTreeSelectionOption = FlattenedNodeSelectOption;

export type NodeTreeItemViewModel = {
  id: string;
  code: string;
  name: string;
  level: number;
  displayOrder: number;
  status: NodeStatus | null;
  directStatus: NodeStatus | null;
  computedStatus: NodeStatus | null;
  effectiveStatus: NodeStatus | null;
  /** Russian status label (primary display for status). */
  statusLabel: string | null;
  /** Short EN badge text (compact EN chip; prefer `statusLabel` for user-facing parity). */
  statusBadgeLabel: string | null;
  /** `statusExplanation.reasonShort` when the API provided it (any depth). */
  shortExplanationLabel: string | null;
  hasChildren: boolean;
  canAddServiceEvent: boolean;
  children: NodeTreeItemViewModel[];
  statusExplanation: NodeStatusExplanationViewModel | null;
  actions: NodeTreeActionViewModel;
};

export type NodeTreeMaintenanceModeState = "default" | "maintenance_plan";

export type NodeMaintenancePlanSummaryViewModel = {
  overdueCount: number;
  soonCount: number;
  plannedLaterCount: number;
  scheduledLeafCount: number;
};

export type NodeMaintenancePlanViewModel = {
  nodeId: string;
  shortText: string | null;
  dueLines: string[];
  lastServiceLine: string | null;
  ruleIntervalLine: string | null;
  parentSummary: NodeMaintenancePlanSummaryViewModel | null;
  hasMeaningfulData: boolean;
};

export type TopLevelNodeSummaryViewModel = {
  nodeId: string;
  nodeName: string;
  effectiveStatus: NodeStatus | null;
  statusLabel: string | null;
  shortExplanationLabel: string | null;
  maintenanceSummaryLine: string | null;
};

export type NodeSubtreeModalViewModel = {
  rootNodeId: string;
  rootNodeName: string;
  effectiveStatus: NodeStatus | null;
  statusLabel: string | null;
  shortExplanationLabel: string | null;
  maintenanceSummaryLine: string | null;
  childNodes: NodeTreeItemViewModel[];
  isLeafRoot: boolean;
};

export type NodeTreeSearchOptions = {
  query: string;
  limit?: number;
  minQueryLength?: number;
};

export type NodeTreeSearchResultViewModel = {
  nodeId: string;
  topLevelNodeId: string;
  nodeName: string;
  nodeCode: string;
  pathLabel: string;
  effectiveStatus: NodeStatus | null;
  statusLabel: string | null;
  shortExplanationLabel: string | null;
  isLeaf: boolean;
  ancestorIds: string[];
};

export type NodeTreeSearchActionKey = "open" | "service_log" | "buy";

export type NodeTreeSearchActionViewModel = {
  key: NodeTreeSearchActionKey;
  label: string;
};

export type MvpServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  displayOrder: number;
};

export type MvpServiceNodeGroup = {
  code: string;
  name: string;
  nodes: MvpServiceNodeItem[];
};

export type TopServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  displayOrder: number;
  serviceGroup: string | null;
  topNodeOrder: number | null;
};

export type TopNodeOverviewGroupKey =
  | "engine"
  | "brakes"
  | "tires"
  | "chain"
  | "electrics"
  | "suspension";

export type TopNodeOverviewCard = {
  key: TopNodeOverviewGroupKey;
  title: string;
  status: NodeStatus | null;
  statusLabel: string;
  details: string;
  nodeCodes: string[];
};
