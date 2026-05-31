/**
 * MT-SEC-055: AuthAuditLog retention + failed-login alerting.
 *
 * Usage:
 *   npx tsx scripts/cron-auth-audit-retention.ts              # purge + alerts
 *   npx tsx scripts/cron-auth-audit-retention.ts --purge-only   # daily cron
 *   npx tsx scripts/cron-auth-audit-retention.ts --alerts-only  # every 5 min
 *
 * Env (optional):
 *   AUTH_AUDIT_RETENTION_DAYS — default 90
 *   AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD — default 10
 *   AUTH_AUDIT_ALERT_WINDOW_MS — default 60000 (1 min)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  findSuspiciousLoginFailures,
  purgeExpiredAuthAuditLogs,
  resolveAuthAuditAlertThreshold,
  resolveAuthAuditAlertWindowMs,
  resolveAuthAuditRetentionDays,
} from "../src/lib/auth-audit-retention";

const args = new Set(process.argv.slice(2));
const purgeOnly = args.has("--purge-only");
const alertsOnly = args.has("--alerts-only");
const runPurge = !alertsOnly;
const runAlerts = !purgeOnly;

async function main() {
  if (runPurge) {
    const retentionDays = resolveAuthAuditRetentionDays();
    const { deletedCount, cutoffDate } = await purgeExpiredAuthAuditLogs({ retentionDays });
    console.info(
      "[cron:auth-audit] purge",
      JSON.stringify({
        deletedCount,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
      })
    );
  }

  if (runAlerts) {
    const windowMs = resolveAuthAuditAlertWindowMs();
    const threshold = resolveAuthAuditAlertThreshold();
    const alerts = await findSuspiciousLoginFailures({ windowMs, threshold });
    if (alerts.length === 0) {
      console.info("[cron:auth-audit] alerts none", JSON.stringify({ windowMs, threshold }));
    } else {
      for (const alert of alerts) {
        console.warn(
          "[auth-audit:alert] suspicious login.failure burst",
          JSON.stringify(alert)
        );
      }
    }
  }
}

main()
  .catch((error) => {
    console.error("[cron:auth-audit] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
