"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface UserBlockPanelProps {
  userId: string;
  isBlocked: boolean;
  blockedAt: string | null;
  blockReason: string | null;
}

export function UserBlockPanel({ userId, isBlocked, blockedAt, blockReason }: UserBlockPanelProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();

  const actionLabel = isBlocked ? "Разблокировать пользователя" : "Заблокировать пользователя";
  const confirmLabel = isBlocked
    ? "Подтвердите разблокировку пользователя."
    : "Подтвердите блокировку пользователя.";

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Укажите причину минимум из 3 символов.");
      return;
    }
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            isBlocked: !isBlocked,
            reason: trimmed,
          }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Не удалось обновить статус пользователя.");
        }
        setReason("");
        setSaved(isBlocked ? "Пользователь разблокирован." : "Пользователь заблокирован.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обновить статус пользователя.");
      }
    });
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <h3 style={titleStyle}>Управление доступом</h3>
        <span style={isBlocked ? blockedBadgeStyle : activeBadgeStyle}>
          {isBlocked ? "Заблокирован" : "Активен"}
        </span>
      </div>
      {isBlocked ? (
        <div style={metaStyle}>
          Заблокирован: {blockedAt ? new Date(blockedAt).toLocaleString("ru-RU") : "дата не указана"}
          {blockReason ? ` · Причина: ${blockReason}` : ""}
        </div>
      ) : (
        <div style={metaStyle}>Пользователь может входить в приложение и API.</div>
      )}
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>{confirmLabel}</div>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Причина (audit log)"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={isBlocked ? successButtonStyle : dangerButtonStyle}
        >
          {pending ? "Сохраняем…" : actionLabel}
        </button>
      </div>
      {error ? <div style={errorStyle}>{error}</div> : null}
      {saved ? <div style={savedStyle}>{saved}</div> : null}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: productSemanticColors.textPrimary,
};

const metaStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: productSemanticColors.textSecondary,
};

const inputStyle: React.CSSProperties = {
  height: 34,
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  padding: "0 10px",
  fontSize: 12,
};

const dangerButtonStyle: React.CSSProperties = {
  height: 34,
  border: "none",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.error,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const successButtonStyle: React.CSSProperties = {
  ...dangerButtonStyle,
  backgroundColor: "#22C55E",
};

const errorStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#FCA5A5",
  fontSize: 12,
};

const savedStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#86EFAC",
  fontSize: 12,
};

const activeBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 999,
  padding: "4px 8px",
  color: "#86EFAC",
  backgroundColor: "rgba(34,197,94,0.14)",
};

const blockedBadgeStyle: React.CSSProperties = {
  ...activeBadgeStyle,
  color: "#F87171",
  backgroundColor: "rgba(248,113,113,0.14)",
};
