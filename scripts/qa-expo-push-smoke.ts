/**
 * Send a test push via Expo Push API (no DB).
 *
 * Usage:
 *   EXPO_PUSH_TOKEN=ExponentPushToken[...] npx tsx scripts/qa-expo-push-smoke.ts
 */
import "dotenv/config";
import { Expo } from "expo-server-sdk";

async function main() {
  const token = process.env.EXPO_PUSH_TOKEN?.trim();
  if (!token) {
    console.error("Set EXPO_PUSH_TOKEN (from mobile app after «Подключить push»).");
    process.exit(1);
  }
  if (!Expo.isExpoPushToken(token)) {
    console.error("EXPO_PUSH_TOKEN is not a valid Expo push token.");
    process.exit(1);
  }

  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  const expo = new Expo(accessToken ? { accessToken } : undefined);

  const tickets = await expo.sendPushNotificationsAsync([
    {
      to: token,
      sound: "default",
      title: "MotoTwin push smoke test",
      body: "Если видите это уведомление — Expo Push работает.",
      data: { actionUrl: "/notifications" },
    },
  ]);

  console.info("[qa-expo-push] tickets", tickets);
  const failed = tickets.filter((t) => t.status === "error");
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[qa-expo-push] failed", error);
  process.exit(1);
});
