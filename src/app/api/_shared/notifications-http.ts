import { NotificationSeverity, NotificationStatus } from "@prisma/client";
import { z } from "zod";

export const notificationSettingsPatchSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    daysBeforeService: z.number().int().min(1).max(180).optional(),
    kmBeforeService: z.number().int().min(1).max(100_000).optional(),
    hoursBeforeService: z.number().int().min(1).max(10_000).optional(),
    mileageStaleAfterDays: z.number().int().min(1).max(365).optional(),
    engineHoursStaleAfterDays: z.number().int().min(1).max(365).optional(),
    suppressWhenStored: z.boolean().optional(),
    weeklyDigestEnabled: z.boolean().optional(),
    weeklyDigestDay: z.number().int().min(0).max(6).optional(),
    weeklyDigestHour: z.number().int().min(0).max(23).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    timezone: z.string().min(1).max(80).optional(),
  })
  .strict();

export const vehicleNotificationSettingsPatchSchema = z
  .object({
    useUserDefaults: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().nullable().optional(),
    emailEnabled: z.boolean().nullable().optional(),
    pushEnabled: z.boolean().nullable().optional(),
    isStored: z.boolean().optional(),
    storedUntil: z.coerce.date().nullable().optional(),
    daysBeforeService: z.number().int().min(1).max(180).nullable().optional(),
    kmBeforeService: z.number().int().min(1).max(100_000).nullable().optional(),
    hoursBeforeService: z.number().int().min(1).max(10_000).nullable().optional(),
    mileageStaleAfterDays: z.number().int().min(1).max(365).nullable().optional(),
    engineHoursStaleAfterDays: z.number().int().min(1).max(365).nullable().optional(),
  })
  .strict();

export const notificationSnoozeSchema = z
  .object({
    snoozedUntil: z.coerce.date(),
  })
  .strict();

export const usageUpdateSchema = z
  .object({
    mileageKm: z.number().int().min(0).nullable().optional(),
    engineHours: z.number().int().min(0).nullable().optional(),
    recalculateReminders: z.boolean().optional(),
  })
  .strict();

export const pushSubscriptionSchema = z
  .object({
    channelType: z.enum(["WEB_PUSH", "MOBILE_PUSH"]),
    provider: z.enum(["WEBPUSH", "EXPO", "FCM", "APNS"]),
    platform: z.enum(["WEB", "IOS", "ANDROID"]),
    token: z.string().min(4).max(4096),
    endpoint: z.string().max(4096).nullable().optional(),
    p256dh: z.string().max(4096).nullable().optional(),
    auth: z.string().max(4096).nullable().optional(),
    userAgent: z.string().max(1024).nullable().optional(),
    deviceId: z.string().max(256).nullable().optional(),
    deviceName: z.string().max(256).nullable().optional(),
    appVersion: z.string().max(64).nullable().optional(),
    osVersion: z.string().max(64).nullable().optional(),
    locale: z.string().max(64).nullable().optional(),
    timezone: z.string().max(80).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export function parseNotificationStatus(raw: string | null): NotificationStatus | undefined {
  if (!raw) return undefined;
  const values = Object.values(NotificationStatus);
  return values.includes(raw as NotificationStatus) ? (raw as NotificationStatus) : undefined;
}

export function parseNotificationSeverity(raw: string | null): NotificationSeverity | undefined {
  if (!raw) return undefined;
  const values = Object.values(NotificationSeverity);
  return values.includes(raw as NotificationSeverity) ? (raw as NotificationSeverity) : undefined;
}
