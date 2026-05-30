import type { ReactNode } from "react";
import type { SubscriptionPlan } from "@mototwin/types";
import { isPlanAtLeast } from "@mototwin/domain";
import { SubscriptionLock } from "./SubscriptionLock";

type FeatureGateProps = {
  currentPlan: SubscriptionPlan;
  requiredPlan: Exclude<SubscriptionPlan, "FREE">;
  title: string;
  description: string;
  children: ReactNode;
};

export function FeatureGate({
  currentPlan,
  requiredPlan,
  title,
  description,
  children,
}: FeatureGateProps) {
  if (!isPlanAtLeast(currentPlan, requiredPlan)) {
    return (
      <SubscriptionLock
        title={title}
        description={description}
        requiredPlan={requiredPlan}
      />
    );
  }
  return <>{children}</>;
}
