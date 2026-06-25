import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Stable dot-namespaced auth event ids (MT-SEC-054). */
export type AuthAuditEvent =
  | "login.success"
  | "login.failure"
  | "register.success"
  | "register.failure"
  | "password_reset.requested"
  | "password_reset.applied"
  | "password_reset.failure"
  | "refresh.rotated"
  | "refresh.invalid"
  | "oauth.login.success"
  | "oauth.linked"
  | "session.revoked"
  | "account.deleted"
  | "auth.rate_limited";

export interface LogAuthEventInput {
  event: AuthAuditEvent;
  /** Null/omitted when the user is unknown (failed login, invalid refresh). */
  userId?: string | null;
  /** Machine-readable reason — AuthServiceError.code, rate-limit bucket, etc. */
  reasonCode?: string | null;
  /** Structured context — client kind, OAuth provider, revoke cause. No secrets. */
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append a row to {@link AuthAuditLog}. Best-effort: failures are logged but
 * never break the calling auth flow.
 */
export async function logAuthEvent(input: LogAuthEventInput): Promise<void> {
  try {
    let ip = input.ip ?? null;
    let userAgent = input.userAgent ?? null;
    if (ip == null || userAgent == null) {
      try {
        const requestHeaders = await headers();
        ip =
          ip ??
          requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          requestHeaders.get("x-real-ip") ??
          null;
        userAgent = userAgent ?? requestHeaders.get("user-agent") ?? null;
      } catch {
        // Outside a request context (cron/scripts) — keep explicit overrides only.
      }
    }

    await prisma.authAuditLog.create({
      data: {
        userId: input.userId ?? null,
        event: input.event,
        reasonCode: input.reasonCode ?? null,
        metadata: toJson(input.metadata),
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("auth-audit: failed to record entry", input.event, error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
