"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { NotificationItemWire } from "@mototwin/types";
import { Button, Card } from "@/components/ui";

const notificationsApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function toneBySeverity(severity: NotificationItemWire["severity"]) {
  if (severity === "CRITICAL") return productSemanticColors.error;
  if (severity === "WARNING") return productSemanticColors.primaryAction;
  return productSemanticColors.textSecondary;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItemWire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  async function mutate(itemId: string, action: "read" | "dismiss") {
    try {
      if (action === "read") {
        await notificationsApi.markNotificationRead(itemId);
      } else {
        await notificationsApi.dismissNotification(itemId);
      }
      await load();
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось обновить уведомление.");
    }
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: productSemanticColors.textPrimary }}>Оповещения</h1>
            <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted }}>
              Непрочитанных: {unread}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setIsRefreshing(true);
              void notificationsApi.recalculateNotifications().then(load).catch((error) => {
                console.error(error);
                setError("Не удалось пересчитать уведомления.");
                setIsRefreshing(false);
              });
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Обновление..." : "Пересчитать"}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card style={{ borderColor: productSemanticColors.errorBorder }}>
          <p style={{ margin: 0, color: productSemanticColors.error }}>{error}</p>
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
                {item.severity}
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
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={() => void mutate(item.id, "read")}>
                Прочитано
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
