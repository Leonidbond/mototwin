import {
  SUBSCRIPTION_CAPABILITIES,
  getSubscriptionCapabilities,
  isPlanAtLeast,
} from "@mototwin/domain";
import type { SubscriptionCapabilities, SubscriptionPlan } from "@mototwin/types";

export { SUBSCRIPTION_CAPABILITIES };

export function getCapabilities(plan: SubscriptionPlan): SubscriptionCapabilities {
  return getSubscriptionCapabilities(plan);
}

export function meetsPlan(actual: SubscriptionPlan, required: SubscriptionPlan): boolean {
  return isPlanAtLeast(actual, required);
}
