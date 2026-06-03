"use client";

import { useCallback, useEffect, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { UserNotificationSettingsWire } from "@mototwin/types";
import { Button } from "@/components/ui";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function ToggleRow(props: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        cursor: props.disabled ? "default" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      <span>
        <span style={{ display: "block", color: productSemanticColors.textPrimary, fontWeight: 600 }}>
          {props.label}
        </span>
        {props.hint ? (
          <span style={{ display: "block", marginTop: 4, color: productSemanticColors.textMuted, fontSize: 13 }}>
            {props.hint}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
    </label>
  );
}

export function NotificationSettingsSection() {
  const [settings, setSettings] = useState<UserNotificationSettingsWire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.getNotificationSettings();
      setSettings(res.settings);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить настройки уведомлений.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(partial: Partial<UserNotificationSettingsWire>) {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    setIsSaving(true);
    setSavedMessage("");
    setError("");
    try {
      const res = await api.updateNotificationSettings(partial);
      setSettings(res.settings);
      setSavedMessage("Сохранено");
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось сохранить настройки.");
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p style={{ margin: 0, color: productSemanticColors.textMuted }}>Загрузка настроек уведомлений…</p>;
  }

  if (!settings) {
    return error ? <p style={{ margin: 0, color: productSemanticColors.error }}>{error}</p> : null;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, color: productSemanticColors.textPrimary, fontSize: 18, fontWeight: 700 }}>
          Уведомления
        </h2>
        <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted, fontSize: 14 }}>
          Каналы доставки и пороги напоминаний по обслуживанию.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <ToggleRow
          label="В приложении"
          checked={settings.inAppEnabled}
          disabled={isSaving}
          onChange={(inAppEnabled) => void patch({ inAppEnabled })}
        />
        <ToggleRow
          label="Email"
          hint="Письма отправляются, когда канал включён на сервере."
          checked={settings.emailEnabled}
          disabled={isSaving}
          onChange={(emailEnabled) => void patch({ emailEnabled })}
        />
        <ToggleRow
          label="Push"
          checked={settings.pushEnabled}
          disabled={isSaving}
          onChange={(pushEnabled) => void patch({ pushEnabled })}
        />
        <ToggleRow
          label="Еженедельная сводка"
          checked={settings.weeklyDigestEnabled}
          disabled={isSaving}
          onChange={(weeklyDigestEnabled) => void patch({ weeklyDigestEnabled })}
        />
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
            За сколько дней
          </span>
          <input
            type="number"
            min={0}
            max={365}
            value={settings.daysBeforeService}
            disabled={isSaving}
            onChange={(e) => {
              const daysBeforeService = Number(e.target.value);
              if (Number.isFinite(daysBeforeService)) {
                void patch({ daysBeforeService });
              }
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${productSemanticColors.border}` }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: productSemanticColors.textPrimary }}>
            За сколько км
          </span>
          <input
            type="number"
            min={0}
            max={50000}
            value={settings.kmBeforeService}
            disabled={isSaving}
            onChange={(e) => {
              const kmBeforeService = Number(e.target.value);
              if (Number.isFinite(kmBeforeService)) {
                void patch({ kmBeforeService });
              }
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${productSemanticColors.border}` }}
          />
        </label>
      </div>

      {error ? <p style={{ margin: 0, color: productSemanticColors.error }}>{error}</p> : null}
      {savedMessage ? (
        <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>{savedMessage}</p>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => void load()} disabled={isSaving}>
        Обновить
      </Button>
    </div>
  );
}
