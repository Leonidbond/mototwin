CREATE TYPE "NotificationType" AS ENUM (
  'SERVICE_OVERDUE',
  'SERVICE_UPCOMING',
  'MILEAGE_UPDATE_REQUIRED',
  'ENGINE_HOURS_UPDATE_REQUIRED',
  'MISSING_SERVICE_DATA',
  'WEEKLY_DIGEST'
);

CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TYPE "NotificationStatus" AS ENUM (
  'NEW',
  'SEEN',
  'READ',
  'SNOOZED',
  'RESOLVED',
  'DISMISSED',
  'EXPIRED'
);

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH_WEB', 'PUSH_MOBILE');

CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'SKIPPED',
  'MUTED',
  'RATE_LIMITED'
);

CREATE TYPE "PushChannelType" AS ENUM ('WEB_PUSH', 'MOBILE_PUSH');

CREATE TYPE "PushProvider" AS ENUM ('WEBPUSH', 'EXPO', 'FCM', 'APNS');

CREATE TYPE "PushPlatform" AS ENUM ('WEB', 'IOS', 'ANDROID');

CREATE TYPE "UsageUpdateSource" AS ENUM ('MANUAL', 'SERVICE_EVENT', 'IMPORT', 'TELEMETRY');

CREATE TABLE "user_notification_settings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "daysBeforeService" INTEGER NOT NULL DEFAULT 14,
  "kmBeforeService" INTEGER NOT NULL DEFAULT 500,
  "hoursBeforeService" INTEGER NOT NULL DEFAULT 10,
  "mileageStaleAfterDays" INTEGER NOT NULL DEFAULT 14,
  "engineHoursStaleAfterDays" INTEGER NOT NULL DEFAULT 14,
  "suppressWhenStored" BOOLEAN NOT NULL DEFAULT true,
  "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
  "weeklyDigestDay" INTEGER NOT NULL DEFAULT 1,
  "weeklyDigestHour" INTEGER NOT NULL DEFAULT 9,
  "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_settings_userId_key"
  ON "user_notification_settings"("userId");

CREATE TABLE "vehicle_notification_settings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "useUserDefaults" BOOLEAN NOT NULL DEFAULT true,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "inAppEnabled" BOOLEAN,
  "emailEnabled" BOOLEAN,
  "pushEnabled" BOOLEAN,
  "isStored" BOOLEAN NOT NULL DEFAULT false,
  "storedUntil" TIMESTAMP(3),
  "daysBeforeService" INTEGER,
  "kmBeforeService" INTEGER,
  "hoursBeforeService" INTEGER,
  "mileageStaleAfterDays" INTEGER,
  "engineHoursStaleAfterDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vehicle_notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_notification_settings_vehicleId_key"
  ON "vehicle_notification_settings"("vehicleId");

CREATE INDEX "vehicle_notification_settings_userId_idx"
  ON "vehicle_notification_settings"("userId");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vehicleId" TEXT,
  "nodeId" TEXT,
  "serviceRuleId" TEXT,
  "type" "NotificationType" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'NEW',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionLabel" TEXT,
  "actionUrl" TEXT,
  "dueDate" TIMESTAMP(3),
  "dueMileageKm" INTEGER,
  "dueEngineHours" INTEGER,
  "dedupeKey" TEXT NOT NULL,
  "periodBucket" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seenAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_userId_dedupeKey_periodBucket_key"
  ON "notifications"("userId", "dedupeKey", "periodBucket");

CREATE INDEX "notifications_userId_status_idx"
  ON "notifications"("userId", "status");

CREATE INDEX "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

CREATE INDEX "notifications_userId_vehicleId_type_idx"
  ON "notifications"("userId", "vehicleId", "type");

CREATE INDEX "notifications_status_createdAt_idx"
  ON "notifications"("status", "createdAt");

CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "providerMessageId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_deliveries_notificationId_channel_idx"
  ON "notification_deliveries"("notificationId", "channel");

CREATE INDEX "notification_deliveries_status_scheduledAt_idx"
  ON "notification_deliveries"("status", "scheduledAt");

CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" "PushChannelType" NOT NULL,
  "provider" "PushProvider" NOT NULL,
  "platform" "PushPlatform" NOT NULL,
  "token" TEXT NOT NULL,
  "endpoint" TEXT,
  "p256dh" TEXT,
  "auth" TEXT,
  "userAgent" TEXT,
  "deviceId" TEXT,
  "deviceName" TEXT,
  "appVersion" TEXT,
  "osVersion" TEXT,
  "locale" TEXT,
  "timezone" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_userId_token_key"
  ON "push_subscriptions"("userId", "token");

CREATE INDEX "push_subscriptions_userId_enabled_idx"
  ON "push_subscriptions"("userId", "enabled");

CREATE INDEX "push_subscriptions_channelType_provider_platform_idx"
  ON "push_subscriptions"("channelType", "provider", "platform");

CREATE TABLE "mileage_hours_update_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "mileageKm" INTEGER,
  "engineHours" INTEGER,
  "source" "UsageUpdateSource" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mileage_hours_update_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mileage_hours_update_logs_userId_createdAt_idx"
  ON "mileage_hours_update_logs"("userId", "createdAt");

CREATE INDEX "mileage_hours_update_logs_vehicleId_createdAt_idx"
  ON "mileage_hours_update_logs"("vehicleId", "createdAt");

ALTER TABLE "user_notification_settings"
  ADD CONSTRAINT "user_notification_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_notification_settings"
  ADD CONSTRAINT "vehicle_notification_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_notification_settings"
  ADD CONSTRAINT "vehicle_notification_settings_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mileage_hours_update_logs"
  ADD CONSTRAINT "mileage_hours_update_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mileage_hours_update_logs"
  ADD CONSTRAINT "mileage_hours_update_logs_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
