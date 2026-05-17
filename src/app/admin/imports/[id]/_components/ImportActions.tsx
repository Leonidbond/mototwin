"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminImportBatchDetailWire,
  AdminImportBatchSummaryWire,
} from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface ImportActionsProps {
  batch: AdminImportBatchDetailWire;
  canCommit: boolean;
  canRollback: boolean;
}

export function ImportActions({ batch, canCommit, canRollback }: ImportActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const callAction = (
    action: "dry-run" | "commit" | "rollback",
    confirmText?: string
  ) => {
    if (confirmText && !confirm(confirmText)) return;
    setError(null);
    setPendingAction(action);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/imports/${batch.id}/${action}`, {
          method: "POST",
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Действие не выполнено");
          return;
        }
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const isDryRunable =
    batch.status === "DRAFT" || batch.status === "READY" || batch.status === "FAILED";
  const isCommitable = batch.status === "READY" && canCommit;
  const isRollbackable = batch.status === "COMMITTED" && canRollback;

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Действия</h3>
      <SummaryStrip summary={batch.summary} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => callAction("dry-run")}
          disabled={!isDryRunable || pendingAction !== null}
          style={primaryButton}
        >
          {pendingAction === "dry-run" ? "Проверяем…" : "Запустить dry-run"}
        </button>
        <button
          type="button"
          onClick={() => callAction("commit", "Применить импорт ко всем валидным строкам?")}
          disabled={!isCommitable || pendingAction !== null}
          style={isCommitable ? primaryButton : neutralButton}
        >
          {pendingAction === "commit" ? "Применяем…" : "Зафиксировать"}
        </button>
        <button
          type="button"
          onClick={() =>
            callAction("rollback", "Откатить импорт? Будут удалены созданные сущности без зависимостей.")
          }
          disabled={!isRollbackable || pendingAction !== null}
          style={isRollbackable ? dangerButton : neutralButton}
        >
          {pendingAction === "rollback" ? "Откатываем…" : "Откатить"}
        </button>
      </div>
      {error ? <div style={errorBox}>{error}</div> : null}
      <p style={{ margin: 0, fontSize: 12, color: productSemanticColors.textMuted }}>
        Dry-run только проверяет данные. Commit применяет изменения. Rollback удаляет
        созданные импортом записи (если на них нет зависимостей).
      </p>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: AdminImportBatchSummaryWire }) {
  const items: Array<{ label: string; value: number; tone?: "warn" | "danger" | "ok" }> = [
    { label: "Всего", value: summary.total },
    { label: "Создано", value: summary.created, tone: "ok" },
    { label: "Обновлено", value: summary.updated, tone: "ok" },
    { label: "Пропущено", value: summary.skipped, tone: "warn" },
    { label: "Конфликты", value: summary.conflicts, tone: "warn" },
    { label: "Ошибки", value: summary.errors, tone: "danger" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            backgroundColor: productSemanticColors.cardSubtle,
            border: `1px solid ${productSemanticColors.border}`,
            borderRadius: radiusScale.sm,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, color: productSemanticColors.textMuted, fontWeight: 600 }}>
            {item.label}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 18,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color:
                item.tone === "danger"
                  ? "#FCA5A5"
                  : item.tone === "warn"
                  ? "#FBBF24"
                  : item.tone === "ok"
                  ? "#86EFAC"
                  : productSemanticColors.textPrimary,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const baseButton: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
};

const neutralButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textMuted,
  border: `1px solid ${productSemanticColors.border}`,
};

const dangerButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: "rgba(248,113,113,0.18)",
  color: "#FCA5A5",
  border: `1px solid rgba(248,113,113,0.30)`,
};

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};
