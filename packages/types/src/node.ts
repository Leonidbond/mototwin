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
