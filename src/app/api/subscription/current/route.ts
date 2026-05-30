import { NextResponse } from "next/server";
import type { SubscriptionCurrentResponse } from "@mototwin/types";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { getOrCreateUserSubscription, isTrialActive } from "@/lib/subscription/resolve-plan";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const response: SubscriptionCurrentResponse = {
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      isTrialActive: isTrialActive(subscription.trialEndsAt),
      capabilities: getCapabilities(subscription.plan),
    };
    return NextResponse.json(response);
  } catch (error) {
    const ctxError = toCurrentUserContextErrorResponse(error);
    if (ctxError) return ctxError;
    console.error("Failed to load current subscription:", error);
    return NextResponse.json({ error: "Failed to load current subscription" }, { status: 500 });
  }
}
