import type { PlanType, SubscriptionStatus } from "@prisma/client";
import type { SubscriptionPlan } from "@mototwin/types";
import { prisma } from "@/lib/prisma";

export type UserSubscriptionSnapshot = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
};

function planFromDb(planType: PlanType): SubscriptionPlan {
  if (planType === "PRO") return "PRO";
  if (planType === "RIDER") return "RIDER";
  return "FREE";
}

export function isTrialActive(trialEndsAt: Date | null): boolean {
  return Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now());
}

export async function getOrCreateUserSubscription(userId: string): Promise<UserSubscriptionSnapshot> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { planType: true, status: true, trialEndsAt: true },
  });
  if (existing) {
    return {
      plan: planFromDb(existing.planType),
      status: existing.status,
      trialEndsAt: existing.trialEndsAt ?? null,
    };
  }

  const created = await prisma.subscription.create({
    data: {
      userId,
      planType: "FREE",
      status: "ACTIVE",
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { planType: true, status: true, trialEndsAt: true },
  });
  return {
    plan: planFromDb(created.planType),
    status: created.status,
    trialEndsAt: created.trialEndsAt ?? null,
  };
}
