"use client";

import type { AddServiceEventFormValues } from "@mototwin/types";
import type { CSSProperties, ReactNode } from "react";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

export type AdditionalCardFastProps = {
  form: AddServiceEventFormValues;
  editingServiceEventId: string | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
  onRepeat?: () => void;
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

export function AdditionalCardFast({ editingServiceEventId, onRepeat }: AdditionalCardFastProps) {
  if (!editingServiceEventId || !onRepeat) {
    return null;
  }

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
          active={false}
          onClick={onRepeat}
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
