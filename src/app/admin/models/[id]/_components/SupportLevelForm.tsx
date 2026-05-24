"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminSupportLevel } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ruAdmin } from "../../../_locales/ru";

const OPTIONS: AdminSupportLevel[] = [
  "MVP_CORE",
  "MVP_CORE_LEGACY",
  "COMMUNITY_SUPPORT",
  "EARLY_BETA",
  "NO_FITMENT_DATA_YET",
];

interface SupportLevelFormProps {
  motorcycleGenerationId: string;
  current: AdminSupportLevel;
  override: AdminSupportLevel | null;
  reasonHint: string | null;
  /** Whether the current admin can mutate (e.g. analyst cannot). */
  canMutate: boolean;
}

export function SupportLevelForm({
  motorcycleGenerationId,
  current,
  override,
  reasonHint,
  canMutate,
}: SupportLevelFormProps) {
  const router = useRouter();
  const [supportLevel, setSupportLevel] = useState<AdminSupportLevel | "">(override ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canMutate) return;
    if (reason.trim().length < 3) {
      setError("Укажите краткое обоснование");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/models/${motorcycleGenerationId}/support-level`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            supportLevel: supportLevel === "" ? null : supportLevel,
            reason: reason.trim(),
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось сохранить");
          return;
        }
        setReason("");
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Изменить support level</h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: productSemanticColors.textMuted }}>
          Текущее значение:{" "}
          <strong style={{ color: productSemanticColors.textPrimary }}>
            {ruAdmin.support[current]}
          </strong>
          {override ? " (вручную)" : " (по данным)"}
        </p>
        {reasonHint ? (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: productSemanticColors.textMuted }}>
            Прошлое обоснование: <em>{reasonHint}</em>
          </p>
        ) : null}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: productSemanticColors.textMuted }}>
          Override
        </span>
        <select
          value={supportLevel}
          onChange={(event) => setSupportLevel(event.target.value as AdminSupportLevel | "")}
          disabled={!canMutate}
          style={selectStyle}
        >
          <option value="">— Снять override (использовать вычисленный) —</option>
          {OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {ruAdmin.support[opt]}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: productSemanticColors.textMuted }}>
          Обоснование (записывается в Audit log)
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Например: завершили fitment-аудит модели, готовы повысить уровень"
          disabled={!canMutate}
          rows={3}
          style={textareaStyle}
        />
      </label>

      {error ? (
        <div
          style={{
            color: "#FCA5A5",
            backgroundColor: "rgba(248,113,113,0.10)",
            border: `1px solid rgba(248,113,113,0.30)`,
            padding: "8px 10px",
            borderRadius: radiusScale.sm,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={!canMutate || pending} style={primaryButton}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {savedAt ? (
          <span style={{ fontSize: 12, color: "#86EFAC" }}>Сохранено в {savedAt}</span>
        ) : null}
        {!canMutate ? (
          <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            Недостаточно прав для изменения
          </span>
        ) : null}
      </div>
    </form>
  );
}

const selectStyle: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  padding: "10px 12px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
  minHeight: 70,
};

const primaryButton: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
