"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues } from "@mototwin/types";
import type { CSSProperties, ReactNode } from "react";
import { FIELD_BASE, FOCUS_RING, LABEL_STYLE, SECTION_CARD_STYLE, sectionTitleStyle } from "../styles";

export type AdditionalCardExtendedProps = {
  sectionNumber: number;
  form: AddServiceEventFormValues;
  editingServiceEventId: string | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
};

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        backgroundColor: checked ? productSemanticColors.primaryAction : productSemanticColors.cardSubtle,
        border: `1px solid ${checked ? productSemanticColors.primaryAction : productSemanticColors.border}`,
      }}
    >
      <span
        className="block h-[16px] w-[16px] rounded-full transition"
        style={{
          backgroundColor: checked ? productSemanticColors.onPrimaryAction : productSemanticColors.textMuted,
          transform: checked ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

function Row({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: productSemanticColors.cardSubtle,
          color: productSemanticColors.textSecondary,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-semibold leading-tight"
          style={{ color: productSemanticColors.textPrimary }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className="mt-0.5 text-[11px] leading-snug"
            style={{ color: productSemanticColors.textMuted }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const dividerStyle: CSSProperties = {
  borderTopColor: productSemanticColors.border,
};

export function AdditionalCardExtended({
  sectionNumber,
  form,
  editingServiceEventId,
  onPatch,
}: AdditionalCardExtendedProps) {
  const locked =
    Boolean(editingServiceEventId) &&
    (form.attachReceiptRequested || form.attachFileRequested || form.nextReminderEnabled);

  return (
    <div style={SECTION_CARD_STYLE}>
      <h3 style={sectionTitleStyle()}>
        {`${sectionNumber}. Дополнительно`}
      </h3>

      {locked ? (
        <p
          className="mt-3 rounded-lg border px-3 py-2 text-[11px] leading-snug"
          style={{
            color: productSemanticColors.textMuted,
            borderColor: productSemanticColors.border,
            backgroundColor: productSemanticColors.cardSubtle,
          }}
        >
          В записи уже есть отметки о вложениях или напоминании — изменение будет доступно позже.
        </p>
      ) : (
        <div className="mt-2 divide-y" style={{ borderColor: productSemanticColors.border }}>
          <Row
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h3l1.5-2h7L17 7h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            }
            title="Прикрепить фото / чек"
            subtitle="Добавить фотографии или чек по обслуживанию"
          >
            <ToggleSwitch
              checked={form.attachReceiptRequested}
              onChange={(next) => onPatch({ attachReceiptRequested: next })}
              label="Прикрепить фото / чек"
            />
          </Row>
          <div style={dividerStyle} />
          <Row
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 6v12M9 9l3-3 3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            }
            title="Напомнить о следующем обслуживании"
            subtitle="Создать напоминание по регламенту"
          >
            <ToggleSwitch
              checked={form.nextReminderEnabled}
              onChange={(next) => onPatch({ nextReminderEnabled: next })}
              label="Напомнить о следующем обслуживании"
            />
          </Row>

          {form.nextReminderEnabled ? (
            <div className="mt-3 space-y-3 pt-3" style={dividerStyle}>
              <label className="block text-xs font-medium" style={LABEL_STYLE}>
                Дата следующего ТО (по регламенту)
                <input
                  type="date"
                  value={form.nextReminderDate}
                  onChange={(e) => onPatch({ nextReminderDate: e.target.value })}
                  style={{ ...FIELD_BASE, colorScheme: "dark" }}
                  className={FOCUS_RING}
                />
              </label>
              <label className="block text-xs font-medium" style={LABEL_STYLE}>
                Пробег для напоминания, км
                <input
                  value={form.nextReminderOdometer}
                  onChange={(e) => onPatch({ nextReminderOdometer: e.target.value })}
                  inputMode="numeric"
                  placeholder="—"
                  style={FIELD_BASE}
                  className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
                />
              </label>
              <label className="block text-xs font-medium" style={LABEL_STYLE}>
                Моточасы для напоминания
                <input
                  value={form.nextReminderEngineHours}
                  onChange={(e) => onPatch({ nextReminderEngineHours: e.target.value })}
                  inputMode="numeric"
                  placeholder="—"
                  style={FIELD_BASE}
                  className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
                />
              </label>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
