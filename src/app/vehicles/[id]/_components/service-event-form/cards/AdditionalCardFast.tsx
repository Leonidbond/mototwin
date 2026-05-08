"use client";

import type { AddServiceEventFormValues } from "@mototwin/types";
import type { CSSProperties, ReactNode } from "react";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

export type AdditionalCardFastProps = {
  form: AddServiceEventFormValues;
  editingServiceEventId: string | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
};

function buttonStyle(active: boolean, disabled?: boolean): CSSProperties {
  if (disabled) {
    return {
      borderColor: SERVICE_EVENT_PARTS_UI.border,
      backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
      color: SERVICE_EVENT_PARTS_UI.textSubtle,
      cursor: "not-allowed",
    };
  }
  if (active) {
    return {
      borderColor: SERVICE_EVENT_PARTS_UI.orange,
      backgroundColor: "rgba(255, 107, 0, 0.10)",
      color: SERVICE_EVENT_PARTS_UI.text,
    };
  }
  return {
    borderColor: SERVICE_EVENT_PARTS_UI.border,
    backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
    color: SERVICE_EVENT_PARTS_UI.textMuted,
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
      className="flex min-h-[40px] min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition hover:opacity-95 disabled:hover:opacity-100 sm:min-h-[42px] sm:gap-2 sm:px-3 sm:text-[13px]"
      style={buttonStyle(active, disabled)}
    >
      <span className="shrink-0" style={{ color: active ? SERVICE_EVENT_PARTS_UI.orange : SERVICE_EVENT_PARTS_UI.textSubtle }}>
        {icon}
      </span>
      <span className="min-w-0 text-center leading-tight">{label}</span>
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
        backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
        borderColor: SERVICE_EVENT_PARTS_UI.border,
      }}
    >
      <p
        className="text-xs font-medium"
        style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
      >
        Дополнительно
      </p>
      <div
        className="mt-2"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem" }}
      >
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
