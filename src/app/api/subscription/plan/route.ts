import { NextResponse } from "next/server";
import { z } from "zod";
import type { SubscriptionPlan, UpdateSubscriptionPlanResponse } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { isTrialActive } from "@/lib/subscription/resolve-plan";

const patchPlanSchema = strictObject({
  plan: z.enum(["FREE", "RIDER", "PRO"]),
});

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const body = patchPlanSchema.parse(raw);

    const updated = await prisma.subscription.upsert({
      where: { userId: currentUser.userId },
      update: {
        planType: body.plan,
      },
      create: {
        userId: currentUser.userId,
        planType: body.plan,
        status: "ACTIVE",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        planType: true,
        status: true,
        trialEndsAt: true,
      },
    });

    const response: UpdateSubscriptionPlanResponse = {
      plan: updated.planType as SubscriptionPlan,
      status: updated.status,
      trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
      isTrialActive: isTrialActive(updated.trialEndsAt ?? null),
      capabilities: getCapabilities(updated.planType as SubscriptionPlan),
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxError = toCurrentUserContextErrorResponse(error);
    if (ctxError) return ctxError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("Failed to update subscription plan:", error);
    return NextResponse.json({ error: "Failed to update subscription plan" }, { status: 500 });
  }
}
