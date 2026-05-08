"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues } from "@mototwin/types";
import type { CSSProperties, ReactNode } from "react";

export type AdditionalCardFastProps = {
  form: AddServiceEventFormValues;
  editingServiceEventId: string | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
};

function buttonStyle(active: boolean, disabled?: boolean): CSSProperties {
  if (disabled) {
    return {
      borderColor: productSemanticColors.border,
      backgroundColor: productSemanticColors.cardMuted,
      color: productSemanticColors.textMuted,
      cursor: "not-allowed",
    };
  }
  if (active) {
    return {
      borderColor: productSemanticColors.primaryAction,
      backgroundColor: "rgba(249, 115, 22, 0.10)",
      color: productSemanticColors.textPrimary,
    };
  }
  return {
    borderColor: productSemanticColors.border,
    backgroundColor: productSemanticColors.cardMuted,
    color: productSemanticColors.textSecondary,
  };
}

function ActionButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-95 disabled:hover:opacity-100 sm:min-h-[42px] sm:gap-2 sm:px-3.5 sm:text-[13px]"
      style={buttonStyle(active, disabled)}
    >
      <span style={{ color: active ? productSemanticColors.primaryAction : productSemanticColors.textMuted }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function AdditionalCardFast({ form, editingServiceEventId, onPatch }: AdditionalCardFastProps) {
  const locked =
    Boolean(editingServiceEventId) &&
    (form.attachReceiptRequested || form.attachFileRequested);

  return (
    <div
      className="w-full rounded-xl border px-4 py-2.5 sm:px-4"
      style={{
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.cardMuted,
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: productSemanticColors.textMeta }}
      >
        Дополнительно
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <ActionButton
          active={form.attachReceiptRequested}
          disabled={locked}
          onClick={() => onPatch({ attachReceiptRequested: !form.attachReceiptRequested })}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h3l1.5-2h7L17 7h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
          label="Добавить фото / чек"
        />
        <ActionButton
          active={form.attachFileRequested}
          disabled={locked}
          onClick={() => onPatch({ attachFileRequested: !form.attachFileRequested })}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 11V7a4 4 0 118 0v4M6 19h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
          label="Прикрепить файл"
        />
        <ActionButton
          active={false}
          disabled
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 12a8 8 0 0114.9-3M20 12a8 8 0 01-14.9 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          label="Повторить событие"
        />
      </div>
    </div>
  );
}
