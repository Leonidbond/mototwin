import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface LogAdminActionInput {
  actorId: string;
  /** Stable dot-namespaced id, e.g. "fitment.publish", "support.change". */
  action: string;
  /** Prisma model name (PascalCase): "PartMaster", "FitmentReport". */
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  importBatchId?: string;
}

/**
 * Append a row to {@link AdminAuditLog}. Best-effort: failures are logged but
 * never break the calling mutation.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const requestHeaders = await headers();
    const ip =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      null;
    const userAgent = requestHeaders.get("user-agent") ?? null;
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: toJson(input.before),
        after: toJson(input.after),
        reason: input.reason ?? null,
        importBatchId: input.importBatchId ?? null,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("admin-audit: failed to record entry", input.action, error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
