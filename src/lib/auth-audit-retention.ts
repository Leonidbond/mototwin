import { prisma } from "@/lib/prisma";

/** Default retention for {@link AuthAuditLog} rows (MT-SEC-055). */
export const AUTH_AUDIT_RETENTION_DAYS_DEFAULT = 90;

/** Failed `login.failure` events in window above this → suspicious (credential stuffing). */
export const AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD_DEFAULT = 10;

/** Sliding window for failed-login alerting (1 minute). */
export const AUTH_AUDIT_ALERT_WINDOW_MS_DEFAULT = 60_000;

export function resolveAuthAuditRetentionDays(): number {
  const raw = process.env.AUTH_AUDIT_RETENTION_DAYS?.trim();
  if (!raw) return AUTH_AUDIT_RETENTION_DAYS_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 7 || parsed > 365) {
    return AUTH_AUDIT_RETENTION_DAYS_DEFAULT;
  }
  return parsed;
}

export function resolveAuthAuditAlertThreshold(): number {
  const raw = process.env.AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD?.trim();
  if (!raw) return AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 3 || parsed > 1_000) {
    return AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD_DEFAULT;
  }
  return parsed;
}

export function resolveAuthAuditAlertWindowMs(): number {
  const raw = process.env.AUTH_AUDIT_ALERT_WINDOW_MS?.trim();
  if (!raw) return AUTH_AUDIT_ALERT_WINDOW_MS_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 10_000 || parsed > 3_600_000) {
    return AUTH_AUDIT_ALERT_WINDOW_MS_DEFAULT;
  }
  return parsed;
}

export async function purgeExpiredAuthAuditLogs(options?: {
  retentionDays?: number;
}): Promise<{ deletedCount: number; cutoffDate: Date; retentionDays: number }> {
  const retentionDays = options?.retentionDays ?? resolveAuthAuditRetentionDays();
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.authAuditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
  return { deletedCount: result.count, cutoffDate, retentionDays };
}

export type AuthAuditSuspiciousActivity = {
  kind: "ip" | "user";
  key: string;
  failedLoginCount: number;
  windowMs: number;
};

/**
 * Detect credential-stuffing patterns: many `login.failure` rows for the same IP
 * or user id inside a short sliding window.
 */
export async function findSuspiciousLoginFailures(options?: {
  windowMs?: number;
  threshold?: number;
}): Promise<AuthAuditSuspiciousActivity[]> {
  const windowMs = options?.windowMs ?? resolveAuthAuditAlertWindowMs();
  const threshold = options?.threshold ?? resolveAuthAuditAlertThreshold();
  const since = new Date(Date.now() - windowMs);

  const rows = await prisma.authAuditLog.findMany({
    where: {
      event: "login.failure",
      createdAt: { gte: since },
    },
    select: { userId: true, ip: true },
  });

  const byIp = new Map<string, number>();
  const byUser = new Map<string, number>();
  for (const row of rows) {
    if (row.ip) {
      byIp.set(row.ip, (byIp.get(row.ip) ?? 0) + 1);
    }
    if (row.userId) {
      byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + 1);
    }
  }

  const alerts: AuthAuditSuspiciousActivity[] = [];
  for (const [key, failedLoginCount] of byIp) {
    if (failedLoginCount >= threshold) {
      alerts.push({ kind: "ip", key, failedLoginCount, windowMs });
    }
  }
  for (const [key, failedLoginCount] of byUser) {
    if (failedLoginCount >= threshold) {
      alerts.push({ kind: "user", key, failedLoginCount, windowMs });
    }
  }
  return alerts.sort((a, b) => b.failedLoginCount - a.failedLoginCount);
}
