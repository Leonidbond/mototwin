import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  PushChannelType,
  PushProvider,
  TopNodeStatus,
  type Notification,
  type NotificationDelivery,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email/notification-email";

const DAY_MS = 24 * 60 * 60 * 1000;

type NotificationWithDeliveries = Notification & {
  deliveries: NotificationDelivery[];
};

export const DEFAULT_USER_NOTIFICATION_SETTINGS = {
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: false,
  daysBeforeService: 14,
  kmBeforeService: 500,
  hoursBeforeService: 10,
  mileageStaleAfterDays: 14,
  engineHoursStaleAfterDays: 14,
  suppressWhenStored: true,
  weeklyDigestEnabled: true,
  weeklyDigestDay: 1,
  weeklyDigestHour: 9,
  quietHoursEnabled: false,
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
  timezone: "Europe/Moscow",
};

export async function getOrCreateUserNotificationSettings(userId: string) {
  return prisma.userNotificationSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...DEFAULT_USER_NOTIFICATION_SETTINGS,
    },
  });
}

export async function getOrCreateVehicleNotificationSettings(
  userId: string,
  vehicleId: string
) {
  return prisma.vehicleNotificationSettings.upsert({
    where: { vehicleId },
    update: {},
    create: {
      userId,
      vehicleId,
      useUserDefaults: true,
      notificationsEnabled: true,
      inAppEnabled: null,
      emailEnabled: null,
      pushEnabled: null,
      isStored: false,
    },
  });
}

export function serializeNotification(notification: NotificationWithDeliveries) {
  return {
    id: notification.id,
    userId: notification.userId,
    vehicleId: notification.vehicleId,
    nodeId: notification.nodeId,
    serviceRuleId: notification.serviceRuleId,
    type: notification.type,
    severity: notification.severity,
    status: notification.status,
    title: notification.title,
    body: notification.body,
    actionLabel: notification.actionLabel,
    actionUrl: notification.actionUrl,
    dueDate: notification.dueDate?.toISOString() ?? null,
    dueMileageKm: notification.dueMileageKm,
    dueEngineHours: notification.dueEngineHours,
    dedupeKey: notification.dedupeKey,
    periodBucket: notification.periodBucket,
    createdAt: notification.createdAt.toISOString(),
    seenAt: notification.seenAt?.toISOString() ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    snoozedUntil: notification.snoozedUntil?.toISOString() ?? null,
    resolvedAt: notification.resolvedAt?.toISOString() ?? null,
    dismissedAt: notification.dismissedAt?.toISOString() ?? null,
    deliveries: notification.deliveries.map((delivery) => ({
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      scheduledAt: delivery.scheduledAt?.toISOString() ?? null,
      sentAt: delivery.sentAt?.toISOString() ?? null,
      failedAt: delivery.failedAt?.toISOString() ?? null,
      errorCode: delivery.errorCode,
      errorMessage: delivery.errorMessage,
      providerMessageId: delivery.providerMessageId,
      attemptCount: delivery.attemptCount,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    })),
  };
}

function buildPeriodBucket(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function parseHoursAndMinutes(value: string | null): { h: number; m: number } | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function inQuietHours(
  now: Date,
  settings: {
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  }
): boolean {
  if (!settings.quietHoursEnabled) return false;
  const start = parseHoursAndMinutes(settings.quietHoursStart);
  const end = parseHoursAndMinutes(settings.quietHoursEnd);
  if (!start || !end) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.h * 60 + start.m;
  const endMinutes = end.h * 60 + end.m;

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  return minutes >= startMinutes || minutes < endMinutes;
}

function nextQuietHoursEnd(
  now: Date,
  settings: {
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  }
): Date {
  const end = parseHoursAndMinutes(settings.quietHoursEnd);
  if (!end) return new Date(now.getTime() + 60 * 60 * 1000);
  const candidate = new Date(now);
  candidate.setHours(end.h, end.m, 0, 0);
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

function determineChannels(args: {
  userSettings: Awaited<ReturnType<typeof getOrCreateUserNotificationSettings>>;
  vehicleSettings: Awaited<ReturnType<typeof getOrCreateVehicleNotificationSettings>> | null;
}) {
  const vehicle = args.vehicleSettings;
  const user = args.userSettings;
  const inAppEnabled = vehicle?.useUserDefaults
    ? user.inAppEnabled
    : vehicle?.inAppEnabled ?? user.inAppEnabled;
  const emailEnabled = vehicle?.useUserDefaults
    ? user.emailEnabled
    : vehicle?.emailEnabled ?? user.emailEnabled;
  const pushEnabled = vehicle?.useUserDefaults
    ? user.pushEnabled
    : vehicle?.pushEnabled ?? user.pushEnabled;

  const channels: NotificationChannel[] = [];
  if (inAppEnabled) channels.push(NotificationChannel.IN_APP);
  if (emailEnabled) channels.push(NotificationChannel.EMAIL);
  if (pushEnabled) {
    channels.push(NotificationChannel.PUSH_WEB, NotificationChannel.PUSH_MOBILE);
  }
  return channels;
}

async function upsertNotification(input: {
  userId: string;
  vehicleId?: string | null;
  nodeId?: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  dueDate?: Date | null;
  dueMileageKm?: number | null;
  dueEngineHours?: number | null;
  dedupeKey: string;
  channels: NotificationChannel[];
}) {
  const periodBucket = buildPeriodBucket(new Date());
  const notification = await prisma.notification.upsert({
    where: {
      userId_dedupeKey_periodBucket: {
        userId: input.userId,
        dedupeKey: input.dedupeKey,
        periodBucket,
      },
    },
    update: {
      vehicleId: input.vehicleId ?? null,
      nodeId: input.nodeId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      actionLabel: input.actionLabel ?? null,
      actionUrl: input.actionUrl ?? null,
      dueDate: input.dueDate ?? null,
      dueMileageKm: input.dueMileageKm ?? null,
      dueEngineHours: input.dueEngineHours ?? null,
      status: NotificationStatus.NEW,
      dismissedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
    },
    create: {
      userId: input.userId,
      vehicleId: input.vehicleId ?? null,
      nodeId: input.nodeId ?? null,
      type: input.type,
      severity: input.severity,
      status: NotificationStatus.NEW,
      title: input.title,
      body: input.body,
      actionLabel: input.actionLabel ?? null,
      actionUrl: input.actionUrl ?? null,
      dueDate: input.dueDate ?? null,
      dueMileageKm: input.dueMileageKm ?? null,
      dueEngineHours: input.dueEngineHours ?? null,
      dedupeKey: input.dedupeKey,
      periodBucket,
    },
  });

  for (const channel of input.channels) {
    const existingDelivery = await prisma.notificationDelivery.findFirst({
      where: {
        notificationId: notification.id,
        channel,
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
          channel,
          status: NotificationDeliveryStatus.PENDING,
        },
      });
    }
  }

  return notification.id;
}

async function createOverdueAndUpcomingNotifications(userId: string) {
  const userSettings = await getOrCreateUserNotificationSettings(userId);
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, trashedAt: null },
    select: {
      id: true,
      nickname: true,
      updatedAt: true,
      topNodeStates: {
        where: {
          status: {
            in: [TopNodeStatus.OVERDUE, TopNodeStatus.SOON],
          },
        },
        include: { node: { select: { id: true, name: true } } },
      },
    },
  });

  let createdCount = 0;
  for (const vehicle of vehicles) {
    const vehicleSettings = await getOrCreateVehicleNotificationSettings(userId, vehicle.id);
    if (!vehicleSettings.notificationsEnabled) {
      continue;
    }

    const channels = determineChannels({ userSettings, vehicleSettings });
    const vehicleName = vehicle.nickname?.trim() || "Мотоцикл";

    for (const topNodeState of vehicle.topNodeStates) {
      if (topNodeState.status === TopNodeStatus.OVERDUE) {
        const notificationId = await upsertNotification({
          userId,
          vehicleId: vehicle.id,
          nodeId: topNodeState.nodeId,
          type: NotificationType.SERVICE_OVERDUE,
          severity: NotificationSeverity.CRITICAL,
          title: "MotoTwin: обслуживание просрочено",
          body: `${vehicleName}: ${topNodeState.node.name} требует обслуживания.`,
          actionLabel: "Добавить ТО",
          actionUrl: `/vehicles/${vehicle.id}/service-events/new?nodeId=${topNodeState.nodeId}`,
          dedupeKey: `service_overdue:${vehicle.id}:${topNodeState.nodeId}`,
          channels,
        });
        if (notificationId) createdCount += 1;
      } else if (topNodeState.status === TopNodeStatus.SOON) {
        const notificationId = await upsertNotification({
          userId,
          vehicleId: vehicle.id,
          nodeId: topNodeState.nodeId,
          type: NotificationType.SERVICE_UPCOMING,
          severity: NotificationSeverity.WARNING,
          title: "Скоро обслуживание",
          body: `${vehicleName}: скоро потребуется обслуживание узла ${topNodeState.node.name}.`,
          actionLabel: "Открыть узел",
          actionUrl: `/vehicles/${vehicle.id}/nodes?nodeId=${encodeURIComponent(topNodeState.nodeId)}`,
          dedupeKey: `service_upcoming:${vehicle.id}:${topNodeState.nodeId}`,
          channels,
        });
        if (notificationId) createdCount += 1;
      }
    }

    const staleMileageDays = Math.floor((Date.now() - vehicle.updatedAt.getTime()) / DAY_MS);
    const staleThreshold =
      vehicleSettings.mileageStaleAfterDays ?? userSettings.mileageStaleAfterDays;
    if (staleMileageDays >= staleThreshold) {
      const notificationId = await upsertNotification({
        userId,
        vehicleId: vehicle.id,
        type: NotificationType.MILEAGE_UPDATE_REQUIRED,
        severity: NotificationSeverity.INFO,
        title: "Обновите пробег",
        body: `Пробег ${vehicleName} не обновлялся ${staleMileageDays} дн.`,
        actionLabel: "Обновить",
        actionUrl: `/vehicles/${vehicle.id}?openVehicleState=1&focus=mileage`,
        dedupeKey: `mileage_stale:${vehicle.id}`,
        channels,
      });
      if (notificationId) createdCount += 1;
    }
  }
  return createdCount;
}

async function markResolvedNotificationsForVehicle(userId: string, vehicleId: string) {
  const active = await prisma.notification.findMany({
    where: {
      userId,
      vehicleId,
      type: { in: [NotificationType.MILEAGE_UPDATE_REQUIRED, NotificationType.ENGINE_HOURS_UPDATE_REQUIRED] },
      status: {
        in: [NotificationStatus.NEW, NotificationStatus.SEEN, NotificationStatus.READ, NotificationStatus.SNOOZED],
      },
    },
    select: { id: true },
  });
  if (active.length === 0) return 0;
  await prisma.notification.updateMany({
    where: { id: { in: active.map((item) => item.id) } },
    data: {
      status: NotificationStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
  return active.length;
}

export async function recalculateNotificationsForUser(userId: string) {
  const createdCount = await createOverdueAndUpcomingNotifications(userId);
  await dispatchPendingNotificationDeliveriesForUser(userId);
  return createdCount;
}

export async function dispatchPendingNotificationDeliveriesForUser(userId: string) {
  const settings = await getOrCreateUserNotificationSettings(userId);
  const pendingDeliveries = await prisma.notificationDelivery.findMany({
    where: {
      OR: [
        { status: NotificationDeliveryStatus.PENDING },
        {
          status: NotificationDeliveryStatus.MUTED,
          scheduledAt: { lte: new Date() },
        },
      ],
      notification: { userId },
    },
    include: {
      notification: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const delivery of pendingDeliveries) {
    const now = new Date();
    try {
      if (delivery.channel === NotificationChannel.IN_APP) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: now,
            attemptCount: { increment: 1 },
            providerMessageId: `in-app:${delivery.id}`,
          },
        });
        continue;
      }

      if (
        (delivery.channel === NotificationChannel.PUSH_MOBILE ||
          delivery.channel === NotificationChannel.PUSH_WEB) &&
        inQuietHours(now, settings)
      ) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.MUTED,
            scheduledAt: nextQuietHoursEnd(now, settings),
            attemptCount: { increment: 1 },
            errorCode: "QUIET_HOURS",
          },
        });
        continue;
      }

      if (delivery.status === NotificationDeliveryStatus.MUTED && delivery.scheduledAt) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.PENDING,
            errorCode: null,
            errorMessage: null,
          },
        });
      }

      if (delivery.channel === NotificationChannel.PUSH_MOBILE) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: {
            userId,
            enabled: true,
            invalidatedAt: null,
            channelType: PushChannelType.MOBILE_PUSH,
            provider: PushProvider.EXPO,
          },
          select: { id: true, token: true },
        });
        if (subscriptions.length === 0) {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.SKIPPED,
              attemptCount: { increment: 1 },
              errorCode: "NO_ACTIVE_SUBSCRIPTIONS",
            },
          });
          continue;
        }

        const { sendExpoPushToSubscriptions } = await import("@/lib/push/send-expo-push");
        const pushResult = await sendExpoPushToSubscriptions({
          subscriptions,
          title: delivery.notification.title,
          body: delivery.notification.body,
          actionUrl: delivery.notification.actionUrl,
        });

        if (pushResult.sentCount === 0) {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.FAILED,
              failedAt: now,
              attemptCount: { increment: 1 },
              errorCode: "EXPO_PUSH_FAILED",
              errorMessage: pushResult.errors.join("; ") || "No valid Expo push tokens",
            },
          });
          continue;
        }

        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: now,
            attemptCount: { increment: 1 },
            providerMessageId: pushResult.messageIds.join(",") || `expo:${delivery.id}`,
            errorMessage: pushResult.failedCount > 0 ? pushResult.errors.join("; ") : null,
          },
        });
        console.info("[notifications] delivery.sent", {
          deliveryId: delivery.id,
          notificationId: delivery.notificationId,
          channel: delivery.channel,
          sentCount: pushResult.sentCount,
          failedCount: pushResult.failedCount,
        });
        continue;
      }

      if (delivery.channel === NotificationChannel.PUSH_WEB) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: {
            userId,
            enabled: true,
            invalidatedAt: null,
            channelType: PushChannelType.WEB_PUSH,
          },
          select: { id: true, endpoint: true },
        });
        if (subscriptions.length === 0) {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.SKIPPED,
              attemptCount: { increment: 1 },
              errorCode: "NO_ACTIVE_SUBSCRIPTIONS",
            },
          });
          continue;
        }
      }

      if (delivery.channel === NotificationChannel.EMAIL) {
        const recipient = delivery.notification.user.email?.trim();
        if (!recipient) {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: NotificationDeliveryStatus.SKIPPED,
              attemptCount: { increment: 1 },
              errorCode: "NO_RECIPIENT_EMAIL",
            },
          });
          continue;
        }

        const sent = await sendNotificationEmail({
          to: recipient,
          title: delivery.notification.title,
          body: delivery.notification.body,
          actionLabel: delivery.notification.actionLabel,
          actionUrl: delivery.notification.actionUrl,
        });

        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: now,
            attemptCount: { increment: 1 },
            providerMessageId: sent.messageId,
          },
        });
        console.info("[notifications] delivery.sent", {
          deliveryId: delivery.id,
          notificationId: delivery.notificationId,
          channel: delivery.channel,
        });
        continue;
      }

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          sentAt: now,
          attemptCount: { increment: 1 },
          providerMessageId: `${delivery.channel.toLowerCase()}:${delivery.id}`,
        },
      });
      console.info("[notifications] delivery.sent", {
        deliveryId: delivery.id,
        notificationId: delivery.notificationId,
        channel: delivery.channel,
      });
    } catch (error) {
      console.error("[notifications] delivery.failed", {
        deliveryId: delivery.id,
        notificationId: delivery.notificationId,
        channel: delivery.channel,
        error,
      });
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          failedAt: new Date(),
          errorCode: "DISPATCH_ERROR",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          attemptCount: { increment: 1 },
        },
      });
    }
  }
}

export async function listNotifications(input: {
  userId: string;
  status?: NotificationStatus;
  severity?: NotificationSeverity;
  includeResolved?: boolean;
  limit: number;
}) {
  const where: Prisma.NotificationWhereInput = {
    userId: input.userId,
    ...(input.includeResolved
      ? {}
      : {
          status: {
            notIn: [
              NotificationStatus.RESOLVED,
              NotificationStatus.DISMISSED,
              NotificationStatus.EXPIRED,
            ],
          },
        }),
  };
  if (input.status) where.status = input.status;
  if (input.severity) where.severity = input.severity;

  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: input.limit,
    }),
    prisma.notification.count({
      where: {
        userId: input.userId,
        status: { in: [NotificationStatus.NEW, NotificationStatus.SEEN] },
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

export async function transitionNotificationStatus(input: {
  userId: string;
  notificationId: string;
  status: NotificationStatus;
  snoozedUntil?: Date | null;
}) {
  const existing = await prisma.notification.findFirst({
    where: { id: input.notificationId, userId: input.userId },
    include: { deliveries: true },
  });
  if (!existing) return null;

  const now = new Date();
  const updated = await prisma.notification.update({
    where: { id: input.notificationId },
    data: {
      status: input.status,
      seenAt:
        input.status === NotificationStatus.SEEN || input.status === NotificationStatus.READ
          ? now
          : existing.seenAt,
      readAt: input.status === NotificationStatus.READ ? now : existing.readAt,
      dismissedAt: input.status === NotificationStatus.DISMISSED ? now : existing.dismissedAt,
      snoozedUntil:
        input.status === NotificationStatus.SNOOZED
          ? input.snoozedUntil ?? existing.snoozedUntil
          : existing.snoozedUntil,
    },
    include: { deliveries: true },
  });
  return updated;
}

export async function applyVehicleUsageUpdate(input: {
  userId: string;
  vehicleId: string;
  mileageKm?: number | null;
  engineHours?: number | null;
  source?: "MANUAL" | "SERVICE_EVENT" | "IMPORT" | "TELEMETRY";
  recalculateReminders?: boolean;
}) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, userId: input.userId, trashedAt: null },
    select: { id: true, odometer: true, engineHours: true },
  });
  if (!vehicle) return null;

  const updatedVehicle = await prisma.vehicle.update({
    where: { id: input.vehicleId },
    data: {
      odometer: input.mileageKm ?? vehicle.odometer,
      engineHours: input.engineHours ?? vehicle.engineHours,
    },
    select: {
      id: true,
      odometer: true,
      engineHours: true,
      updatedAt: true,
    },
  });

  await prisma.mileageHoursUpdateLog.create({
    data: {
      userId: input.userId,
      vehicleId: input.vehicleId,
      mileageKm: input.mileageKm ?? null,
      engineHours: input.engineHours ?? null,
      source: input.source ?? "MANUAL",
    },
  });

  const resolved = await markResolvedNotificationsForVehicle(input.userId, input.vehicleId);

  if (input.recalculateReminders) {
    await recalculateNotificationsForUser(input.userId);
  }

  return {
    vehicle: updatedVehicle,
    resolvedNotifications: resolved,
  };
}
