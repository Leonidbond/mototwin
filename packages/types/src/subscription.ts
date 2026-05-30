import type { ServiceEventEntryMode } from "./service-event";

export type SubscriptionPlan = "FREE" | "RIDER" | "PRO";

export type NodeAccessLevel = "TOP_READ_ONLY" | "TOP_SELECTABLE" | "FULL_TREE";

export type SubscriptionCapabilities = {
  maxVehicles: number | null;
  nodeAccessLevel: NodeAccessLevel;
  canSelectTopNodeInServiceEvent: boolean;
  canSelectChildNode: boolean;
  maxVisibleServiceEvents: number | null;
  allowedEntryModes: ServiceEventEntryMode[];
  canCustomizeFavoriteNodes: boolean;
  defaultNodeViewAll: boolean;
};

export type SubscriptionCurrentResponse = {
  plan: SubscriptionPlan;
  status: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  capabilities: SubscriptionCapabilities;
};

export type UpdateSubscriptionPlanInput = {
  plan: SubscriptionPlan;
};

export type UpdateSubscriptionPlanResponse = SubscriptionCurrentResponse;
