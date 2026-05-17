/**
 * API smoke для системы оповещений.
 *
 * Требует:
 * - запущенный Next dev server на BASE_URL (по умолчанию http://127.0.0.1:3000)
 * - сид БД (`npm run db:seed`)
 *
 * Запуск:
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/qa-notifications-smoke.ts
 */
import "dotenv/config";
import { DEV_USER_HEADER_NAME } from "@mototwin/types";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEV_USER = process.env.DEV_USER_EMAIL ?? "demo@mototwin.local";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, init: RequestInit = {}) {
  const url = `${BASE.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set(DEV_USER_HEADER_NAME, DEV_USER);
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}\n${JSON.stringify(body)}`);
  }
  return body as Record<string, unknown>;
}

async function main() {
  console.log(`notifications smoke: ${BASE} as ${DEV_USER}`);

  const settings = await request("/api/notification-settings");
  assert(settings.settings, "notification settings payload missing");

  await request("/api/notifications/recalculate", { method: "POST" });

  const list = await request("/api/notifications?limit=20");
  const notifications = (list.notifications as Array<{ id: string }> | undefined) ?? [];
  assert(Array.isArray(notifications), "notifications payload missing");

  if (notifications[0]?.id) {
    await request(`/api/notifications/${notifications[0].id}/seen`, { method: "PATCH" });
    await request(`/api/notifications/${notifications[0].id}/read`, { method: "PATCH" });
  }
  if (notifications[1]?.id) {
    await request(`/api/notifications/${notifications[1].id}/dismiss`, { method: "PATCH" });
  }

  await request("/api/push-subscriptions", {
    method: "POST",
    body: JSON.stringify({
      channelType: "MOBILE_PUSH",
      provider: "EXPO",
      platform: "ANDROID",
      token: "ExponentPushToken[smoke-test]",
      deviceName: "QA Device",
      appVersion: "0.1.0",
    }),
  });

  await request("/api/push-subscriptions/test", { method: "POST" });

  console.log(`notifications smoke ok, checked ${notifications.length} notifications`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
