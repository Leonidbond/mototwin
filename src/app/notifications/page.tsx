"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { NotificationItemWire } from "@mototwin/types";
import { Button, Card } from "@/components/ui";
import { registerWebPushSubscription } from "@/lib/web-push-registration";

const notificationsApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function toneBySeverity(severity: NotificationItemWire["severity"]) {
  if (severity === "CRITICAL") return productSemanticColors.error;
  if (severity === "WARNING") return productSemanticColors.primaryAction;
  return productSemanticColors.textSecondary;
}

function snoozeUntilIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** Legacy mileage URLs pointed at Expo-only `/state`; normalize for web navigation. */
function resolveNotificationActionHref(actionUrl: string): string {
  const stateMatch = actionUrl.match(/^\/vehicles\/([^/?]+)\/state(?:\?(.*))?$/);
  if (!stateMatch) {
    return actionUrl;
  }
  const [, vehicleId, query = ""] = stateMatch;
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  next.set("openVehicleState", "1");
  const focus = params.get("focus");
  if (focus) {
    next.set("focus", focus);
  }
  return `/vehicles/${vehicleId}?${next.toString()}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItemWire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectingPush, setIsConnectingPush] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await notificationsApi.getNotifications({ limit: 100, includeResolved: true });
      setNotifications(res.notifications ?? []);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить уведомления.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = useMemo(
    () => notifications.filter((item) => item.status === "NEW" || item.status === "SEEN").length,
    [notifications]
  );

  async function mutate(
    itemId: string,
    action: "read" | "seen" | "dismiss" | "snooze7" | "snooze30"
  ) {
    try {
      setInfo("");
      if (action === "read") {
        await notificationsApi.markNotificationRead(itemId);
      } else if (action === "seen") {
        await notificationsApi.markNotificationSeen(itemId);
      } else if (action === "dismiss") {
        await notificationsApi.dismissNotification(itemId);
      } else {
        await notificationsApi.snoozeNotification(itemId, {
          snoozedUntil: snoozeUntilIso(action === "snooze7" ? 7 : 30),
        });
      }
      await load();
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось обновить уведомление.");
    }
  }

  async function connectWebPush() {
    setIsConnectingPush(true);
    setInfo("");
    setError("");
    try {
      const result = await registerWebPushSubscription((input) =>
        notificationsApi.upsertPushSubscription(input)
      );
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      await notificationsApi.updateNotificationSettings({ pushEnabled: true });
      setInfo("Push подключён для этого браузера.");
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось подключить push.");
    } finally {
      setIsConnectingPush(false);
    }
  }

  const openAction = useCallback(
    (item: NotificationItemWire) => {
      const raw = item.actionUrl?.trim();
      if (!raw?.startsWith("/")) {
        return;
      }
      void mutate(item.id, "seen");
      router.push(resolveNotificationActionHref(raw));
    },
    [router]
  );

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: productSemanticColors.canvas,
        padding: "16px 24px",
        display: "grid",
        gap: 12,
      }}
    >
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: productSemanticColors.textPrimary }}>Оповещения</h1>
            <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted }}>
              Непрочитанных: {unread}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => void connectWebPush()} disabled={isConnectingPush}>
              {isConnectingPush ? "Подключение…" : "Подключить push"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsRefreshing(true);
                void notificationsApi.recalculateNotifications().then(load).catch((requestError) => {
                  console.error(requestError);
                  setError("Не удалось пересчитать уведомления.");
                  setIsRefreshing(false);
                });
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Обновление..." : "Пересчитать"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card style={{ borderColor: productSemanticColors.errorBorder }}>
          <p style={{ margin: 0, color: productSemanticColors.error }}>{error}</p>
        </Card>
      ) : null}

      {info ? (
        <Card>
          <p style={{ margin: 0, color: productSemanticColors.textSecondary }}>{info}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <p style={{ margin: 0, color: productSemanticColors.textMuted }}>Загрузка уведомлений...</p>
        </Card>
      ) : null}

      {!isLoading && notifications.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: productSemanticColors.textMuted }}>
            Все спокойно. Просроченных работ и срочных напоминаний нет.
          </p>
        </Card>
      ) : null}

      {notifications.map((item) => (
        <Card key={item.id}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  color: toneBySeverity(item.severity),
                  fontWeight: 700,
                }}
              >
                {item.severity} · {item.status}
              </span>
              <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
                {new Date(item.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
            <div>
              <p style={{ margin: 0, color: productSemanticColors.textPrimary, fontWeight: 700 }}>
                {item.title}
              </p>
              <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted }}>{item.body}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.actionUrl ? (
                <Button variant="primary" onClick={() => openAction(item)}>
                  {item.actionLabel ?? "Открыть"}
                </Button>
              ) : null}
              {item.status === "NEW" ? (
                <Button variant="secondary" onClick={() => void mutate(item.id, "seen")}>
                  Просмотрено
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => void mutate(item.id, "read")}>
                Прочитано
              </Button>
              <Button variant="ghost" onClick={() => void mutate(item.id, "snooze7")}>
                Отложить 7 дн.
              </Button>
              <Button variant="ghost" onClick={() => void mutate(item.id, "snooze30")}>
                Отложить 30 дн.
              </Button>
              <Button variant="ghost" onClick={() => void mutate(item.id, "dismiss")}>
                Скрыть
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </main>
  );
}
