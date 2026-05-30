import type {
  ServiceEventEntryMode,
  SubscriptionCapabilities,
  SubscriptionPlan,
} from "@mototwin/types";

export const SUBSCRIPTION_CAPABILITIES: Record<SubscriptionPlan, SubscriptionCapabilities> = {
  FREE: {
    maxVehicles: 1,
    nodeAccessLevel: "TOP_READ_ONLY",
    canSelectTopNodeInServiceEvent: true,
    canSelectChildNode: false,
    maxVisibleServiceEvents: 10,
    allowedEntryModes: ["QUICK"],
    canCustomizeFavoriteNodes: false,
    defaultNodeViewAll: false,
  },
  RIDER: {
    maxVehicles: 3,
    nodeAccessLevel: "TOP_SELECTABLE",
    canSelectTopNodeInServiceEvent: true,
    canSelectChildNode: false,
    maxVisibleServiceEvents: null,
    allowedEntryModes: ["QUICK", "DETAILED"],
    canCustomizeFavoriteNodes: true,
    defaultNodeViewAll: false,
  },
  PRO: {
    maxVehicles: null,
    nodeAccessLevel: "FULL_TREE",
    canSelectTopNodeInServiceEvent: true,
    canSelectChildNode: true,
    maxVisibleServiceEvents: null,
    allowedEntryModes: ["QUICK", "DETAILED"],
    canCustomizeFavoriteNodes: true,
    defaultNodeViewAll: true,
  },
};

export function getSubscriptionCapabilities(plan: SubscriptionPlan): SubscriptionCapabilities {
  return SUBSCRIPTION_CAPABILITIES[plan];
}

export function canUseServiceEventEntryMode(
  capabilities: SubscriptionCapabilities,
  entryMode: ServiceEventEntryMode
): boolean {
  return capabilities.allowedEntryModes.includes(entryMode);
}

export function formatPlanLabelRu(plan: SubscriptionPlan): string {
  if (plan === "PRO") return "Pro тариф";
  if (plan === "RIDER") return "Rider тариф";
  return "Free тариф";
}

const PLAN_PRIORITY: Record<SubscriptionPlan, number> = {
  FREE: 0,
  RIDER: 1,
  PRO: 2,
};

export function isPlanAtLeast(current: SubscriptionPlan, required: SubscriptionPlan): boolean {
  return PLAN_PRIORITY[current] >= PLAN_PRIORITY[required];
}
