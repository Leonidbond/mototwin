"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues } from "@mototwin/types";
import { performedByLabelRu } from "../utils";

export type PreviewOverlayProps = {
  open: boolean;
  form: AddServiceEventFormValues;
  totalLabel: string | null;
  onClose: () => void;
};

export function PreviewOverlay({ open, form, totalLabel, onClose }: PreviewOverlayProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-5 shadow-2xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textPrimary,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Предпросмотр сервисного события"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">Предпросмотр</h3>
          <button
            type="button"
            aria-label="Закрыть предпросмотр"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textPrimary }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Название" value={form.title.trim() || "—"} />
          <Row label="Режим" value={form.mode === "BASIC" ? "Быстрый режим" : "Подробно"} />
          <Row label="Дата" value={form.eventDate.trim() || "—"} />
          <Row label="Пробег" value={form.odometer.trim() || "—"} />
          <Row label="Исполнитель" value={performedByLabelRu(form.performedBy)} />
          {form.serviceProviderNote.trim() ? (
            <Row label="Сервис" value={form.serviceProviderNote.trim()} />
          ) : null}
          {form.attachReceiptRequested || form.attachFileRequested ? (
            <Row label="Вложения" value="Отмечено в записи" />
          ) : null}
          <Row label="Узлов" value={String(form.items.length)} />
          {totalLabel ? (
            <div
              className="flex justify-between gap-4 border-t pt-2"
              style={{ borderTopColor: productSemanticColors.border }}
            >
              <dt className="font-semibold">Итого</dt>
              <dd className="font-semibold" style={{ color: productSemanticColors.primaryAction }}>
                {totalLabel}
              </dd>
            </div>
          ) : null}
          {form.nextReminderEnabled ? (
            <div className="border-t pt-2 text-xs" style={{ borderTopColor: productSemanticColors.border }}>
              <p className="font-semibold" style={{ color: productSemanticColors.textMeta }}>
                Напоминание о следующем ТО
              </p>
              <p className="mt-1" style={{ color: productSemanticColors.textSecondary }}>
                {[
                  form.nextReminderDate.trim() ? `дата ${form.nextReminderDate}` : null,
                  form.nextReminderOdometer.trim() ? `пробег ${form.nextReminderOdometer}` : null,
                  form.nextReminderEngineHours.trim() ? `моточасы ${form.nextReminderEngineHours}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
          ) : null}
          {form.comment.trim() ? (
            <div className="border-t pt-2" style={{ borderTopColor: productSemanticColors.border }}>
              <p className="text-xs font-semibold" style={{ color: productSemanticColors.textMeta }}>
                Комментарий
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs" style={{ color: productSemanticColors.textSecondary }}>
                {form.comment.trim()}
              </p>
            </div>
          ) : null}
        </dl>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition hover:opacity-90"
            style={{
              backgroundColor: productSemanticColors.primaryAction,
              color: productSemanticColors.onPrimaryAction,
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: productSemanticColors.textSecondary }}>{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}
