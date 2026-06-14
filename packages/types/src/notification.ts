export type NotificationTypeWire =
  | "SERVICE_OVERDUE"
  | "SERVICE_UPCOMING"
  | "MILEAGE_UPDATE_REQUIRED"
  | "ENGINE_HOURS_UPDATE_REQUIRED"
  | "MISSING_SERVICE_DATA"
  | "WEEKLY_DIGEST"
  | "CATALOG_REQUEST_APPROVED"
  | "CATALOG_REQUEST_REJECTED";

export type NotificationSeverityWire = "INFO" | "WARNING" | "CRITICAL";

export type NotificationStatusWire =
  | "NEW"
  | "SEEN"
  | "READ"
  | "SNOOZED"
  | "RESOLVED"
  | "DISMISSED"
  | "EXPIRED";

export type NotificationChannelWire = "IN_APP" | "EMAIL" | "PUSH_WEB" | "PUSH_MOBILE";

export type NotificationDeliveryStatusWire =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "MUTED"
  | "RATE_LIMITED";

export type PushChannelTypeWire = "WEB_PUSH" | "MOBILE_PUSH";
export type PushProviderWire = "WEBPUSH" | "EXPO" | "FCM" | "APNS";
export type PushPlatformWire = "WEB" | "IOS" | "ANDROID";

export type UserNotificationSettingsWire = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  daysBeforeService: number;
  kmBeforeService: number;
  hoursBeforeService: number;
  mileageStaleAfterDays: number;
  engineHoursStaleAfterDays: number;
  suppressWhenStored: boolean;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

export type UserNotificationSettingsPatch = Partial<UserNotificationSettingsWire>;

export type VehicleNotificationSettingsWire = {
  useUserDefaults: boolean;
  notificationsEnabled: boolean;
  inAppEnabled: boolean | null;
  emailEnabled: boolean | null;
  pushEnabled: boolean | null;
  isStored: boolean;
  storedUntil: string | null;
  daysBeforeService: number | null;
  kmBeforeService: number | null;
  hoursBeforeService: number | null;
  mileageStaleAfterDays: number | null;
  engineHoursStaleAfterDays: number | null;
};

export type VehicleNotificationSettingsPatch = Partial<VehicleNotificationSettingsWire>;

export type NotificationDeliveryWire = {
  id: string;
  channel: NotificationChannelWire;
  status: NotificationDeliveryStatusWire;
  scheduledAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
};

export type NotificationItemWire = {
  id: string;
  userId: string;
  vehicleId: string | null;
  nodeId: string | null;
  serviceRuleId: string | null;
  type: NotificationTypeWire;
  severity: NotificationSeverityWire;
  status: NotificationStatusWire;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  dueDate: string | null;
  dueMileageKm: number | null;
  dueEngineHours: number | null;
  dedupeKey: string;
  periodBucket: string;
  createdAt: string;
  seenAt: string | null;
  readAt: string | null;
  snoozedUntil: string | null;
  resolvedAt: string | null;
  dismissedAt: string | null;
  deliveries: NotificationDeliveryWire[];
};

export type NotificationsListResponse = {
  notifications: NotificationItemWire[];
  unreadCount: number;
};

export type PushSubscriptionWire = {
  id: string;
  channelType: PushChannelTypeWire;
  provider: PushProviderWire;
  platform: PushPlatformWire;
  token: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  userAgent: string | null;
  deviceId: string | null;
  deviceName: string | null;
  appVersion: string | null;
  osVersion: string | null;
  locale: string | null;
  timezone: string | null;
  enabled: boolean;
  lastSeenAt: string;
  invalidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertPushSubscriptionPayload = {
  channelType: PushChannelTypeWire;
  provider: PushProviderWire;
  platform: PushPlatformWire;
  token: string;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  locale?: string | null;
  timezone?: string | null;
  enabled?: boolean;
};

export type NotificationSnoozePayload = {
  snoozedUntil: string;
};

export type UsageUpdatePayload = {
  mileageKm?: number | null;
  engineHours?: number | null;
  recalculateReminders?: boolean;
};
