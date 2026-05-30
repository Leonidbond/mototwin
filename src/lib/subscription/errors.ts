import { NextResponse } from "next/server";
import type { SubscriptionPlan } from "@mototwin/types";

export type SubscriptionErrorCode =
  | "VEHICLE_LIMIT_REACHED"
  | "SERVICE_EVENT_MODE_NOT_ALLOWED"
  | "NODE_SELECTION_NOT_ALLOWED"
  | "CHILD_NODE_REQUIRES_PRO";

export function subscriptionErrorResponse(input: {
  code: SubscriptionErrorCode;
  message: string;
  requiredPlan?: SubscriptionPlan;
}) {
  return NextResponse.json(
    {
      error: input.message,
      code: input.code,
      message: input.message,
      requiredPlan: input.requiredPlan ?? null,
    },
    { status: 403 }
  );
}
