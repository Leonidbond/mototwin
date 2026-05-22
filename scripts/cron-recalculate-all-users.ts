/**
 * Recalculate in-app notifications for every user (VPS cron).
 *
 * Usage:
 *   npx tsx scripts/cron-recalculate-all-users.ts
 *
 * Requires DATABASE_URL in environment (.env).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  dispatchPendingNotificationDeliveriesForUser,
  recalculateNotificationsForUser,
} from "../src/lib/notifications";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  let processed = 0;
  for (const user of users) {
    await recalculateNotificationsForUser(user.id);
    await dispatchPendingNotificationDeliveriesForUser(user.id);
    processed += 1;
    console.info("[cron] notifications", { userId: user.id, email: user.email });
  }

  console.info(`[cron] done, users=${processed}`);
}

main()
  .catch((error) => {
    console.error("[cron] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
