"use client";

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function registerWebPushSubscription(
  upsert: (input: {
    channelType: "WEB_PUSH";
    provider: "WEBPUSH";
    platform: "WEB";
    token: string;
    userAgent?: string | null;
    timezone?: string | null;
    locale?: string | null;
  }) => Promise<unknown>
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "Браузер не поддерживает уведомления." };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "Разрешите уведомления в браузере." };
  }

  await upsert({
    channelType: "WEB_PUSH",
    provider: "WEBPUSH",
    platform: "WEB",
    token: randomToken(),
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  });

  return { ok: true };
}
