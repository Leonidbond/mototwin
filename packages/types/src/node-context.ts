import type { NodeMaintenancePlanViewModel } from "./node";
import type { NodeStatus } from "./status";

export type NodeContextActionKey =
  | "journal"
  | "add_service_event"
  | "add_wishlist"
  | "add_kit"
  | "open_status_explanation";

export type NodeContextActionViewModel = {
  key: NodeContextActionKey;
  label: string;
};

export type NodeContextServiceEventSummary = {
  id: string;
  eventDate: string;
  serviceType: string;
  odometer: number;
  costAmount: number | null;
  currency: string | null;
  costLabelRu: string | null;
};

export type NodeContextRecommendationSummary = {
  skuId: string;
  canonicalName: string;
  brandName: string;
  recommendationLabel: string;
  compatibilityWarning: string | null;
};

export type NodeContextServiceKitSummary = {
  code: string;
  title: string;
  description: string;
  itemCount: number;
};

export type NodeContextViewModel = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  pathLabel: string;
  isLeaf: boolean;
  effectiveStatus: NodeStatus | null;
  statusLabel: string | null;
  shortExplanationLabel: string | null;
  maintenancePlan: NodeMaintenancePlanViewModel | null;
  recentServiceEvents: NodeContextServiceEventSummary[];
  recommendations: NodeContextRecommendationSummary[];
  serviceKits: NodeContextServiceKitSummary[];
  actions: NodeContextActionViewModel[];
};
