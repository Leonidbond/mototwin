import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";

let expoClient: Expo | null = null;

function getExpoClient(): Expo {
  if (!expoClient) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    expoClient = new Expo(accessToken ? { accessToken } : undefined);
  }
  return expoClient;
}

export function isExpoPushConfigured(): boolean {
  return true;
}

export type ExpoPushSendResult = {
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  messageIds: string[];
  errors: string[];
};

export async function sendExpoPushToSubscriptions(input: {
  subscriptions: Array<{ id: string; token: string }>;
  title: string;
  body: string;
  actionUrl?: string | null;
}): Promise<ExpoPushSendResult> {
  const expo = getExpoClient();
  const messages: ExpoPushMessage[] = [];
  const subscriptionByToken = new Map<string, string>();

  for (const sub of input.subscriptions) {
    const token = sub.token.trim();
    if (!Expo.isExpoPushToken(token)) {
      continue;
    }
    subscriptionByToken.set(token, sub.id);
    messages.push({
      to: token,
      sound: "default",
      title: input.title,
      body: input.body,
      data: input.actionUrl?.trim() ? { actionUrl: input.actionUrl.trim() } : undefined,
    });
  }

  const result: ExpoPushSendResult = {
    sentCount: 0,
    failedCount: 0,
    skippedCount: input.subscriptions.length - messages.length,
    messageIds: [],
    errors: [],
  };

  if (messages.length === 0) {
    return result;
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (error) {
      result.failedCount += chunk.length;
      result.errors.push(error instanceof Error ? error.message : "Expo push send failed");
    }
  }

  const invalidatedSubscriptionIds: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = messages[i]?.to;
    if (!ticket || typeof token !== "string") continue;

    if (ticket.status === "ok") {
      result.sentCount += 1;
      if (ticket.id) result.messageIds.push(ticket.id);
      continue;
    }

    result.failedCount += 1;
    const errorCode = ticket.details?.error ?? ticket.message ?? "UNKNOWN";
    result.errors.push(String(errorCode));

    if (errorCode === "DeviceNotRegistered") {
      const subId = subscriptionByToken.get(token);
      if (subId) invalidatedSubscriptionIds.push(subId);
    }
  }

  if (invalidatedSubscriptionIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: invalidatedSubscriptionIds } },
      data: { invalidatedAt: new Date(), enabled: false },
    });
  }

  return result;
}
