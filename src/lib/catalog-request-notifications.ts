import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserNotificationSettings } from "@/lib/notifications";

function buildPeriodBucket(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function notifyCatalogRequestDecision(input: {
  userId: string;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  brandName: string;
  familyName: string;
  variantName: string;
  moderationComment?: string;
}) {
  const userSettings = await getOrCreateUserNotificationSettings(input.userId);
  const modelLabel = `${input.brandName} ${input.familyName} ${input.variantName}`.trim();
  const isApproved = input.decision === "APPROVED";
  const type: NotificationType = isApproved
    ? NotificationType.CATALOG_REQUEST_APPROVED
    : NotificationType.CATALOG_REQUEST_REJECTED;

  const title = isApproved
    ? "Модель добавлена в каталог"
    : "Заявка на модель отклонена";
  const body = isApproved
    ? `Модель ${modelLabel} одобрена и доступна в каталоге.`
    : `Заявка на ${modelLabel} отклонена.${input.moderationComment ? ` Причина: ${input.moderationComment}` : ""}`;

  const dedupeKey = `catalog-request:${input.requestId}:${input.decision.toLowerCase()}`;
  const periodBucket = buildPeriodBucket(new Date());

  const notification = await prisma.notification.upsert({
    where: {
      userId_dedupeKey_periodBucket: {
        userId: input.userId,
        dedupeKey,
        periodBucket,
      },
    },
    update: {
      type,
      severity: isApproved ? NotificationSeverity.INFO : NotificationSeverity.WARNING,
      title,
      body,
      actionLabel: isApproved ? "Открыть гараж" : "Подать заявку снова",
      actionUrl: isApproved ? "/garage" : "/onboarding",
      status: NotificationStatus.NEW,
      dismissedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
    },
    create: {
      userId: input.userId,
      type,
      severity: isApproved ? NotificationSeverity.INFO : NotificationSeverity.WARNING,
      status: NotificationStatus.NEW,
      title,
      body,
      actionLabel: isApproved ? "Открыть гараж" : "Подать заявку снова",
      actionUrl: isApproved ? "/garage" : "/onboarding",
      dedupeKey,
      periodBucket,
    },
  });

  if (userSettings.inAppEnabled) {
    const existingDelivery = await prisma.notificationDelivery.findFirst({
      where: {
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: {
          in: [
            NotificationDeliveryStatus.PENDING,
            NotificationDeliveryStatus.SENT,
            NotificationDeliveryStatus.MUTED,
          ],
        },
      },
      select: { id: true },
    });
    if (!existingDelivery) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
          attemptCount: 1,
          providerMessageId: `in-app:catalog-request:${notification.id}`,
        },
      });
    }
  }
}
