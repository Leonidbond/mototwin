"use client";

import { ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH, ADD_SERVICE_EVENT_SERVICE_NOTE_MAX_LENGTH } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues, ServiceBundleTemplateWire, ServicePerformedBy } from "@mototwin/types";
import { type RefObject, type CSSProperties, type ReactNode } from "react";
import {
  FIELD_IN_STACK,
  FOCUS_RING,
  LABEL_STYLE,
  PRIMARY_ACTION_BG_TINT,
} from "../styles";

const PERFORMER_OPTIONS: Array<{
  key: ServicePerformedBy;
  label: string;
  icon: ReactNode;
}> = [
  {
    key: "SELF",
    label: "Сам",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 20c0-3.5 2.5-5 6-5s6 1.5 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "SERVICE",
    label: "Сервис",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.6-3.6a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-3.6 3.6zM2 20l8.2-8.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "OTHER",
    label: "Другое",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

function performerStyle(active: boolean): CSSProperties {
  return active
    ? {
        borderColor: productSemanticColors.primaryAction,
        backgroundColor: PRIMARY_ACTION_BG_TINT,
        color: productSemanticColors.textPrimary,
      }
    : {
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.cardSubtle,
        color: productSemanticColors.textSecondary,
      };
}

function TemplateSelectField({
  bundleTemplates,
  bundleTemplatesLoadError,
  selectedBundleTemplateId,
  onSelectBundleTemplate,
  onOpenTemplateContents,
  onApplyTemplate,
  templateLabel,
  hintBelow,
}: {
  bundleTemplates: ServiceBundleTemplateWire[];
  bundleTemplatesLoadError: string;
  selectedBundleTemplateId: string;
  onSelectBundleTemplate: (id: string) => void;
  onOpenTemplateContents: () => void;
  onApplyTemplate: (templateId: string) => void;
  templateLabel: string;
  hintBelow?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-h-[18px] items-center justify-between gap-2 sm:gap-3">
        <span className="min-w-0 text-xs font-medium leading-none" style={LABEL_STYLE}>
          {templateLabel}
        </span>
        <button
          type="button"
          disabled={!selectedBundleTemplateId}
          onClick={onOpenTemplateContents}
          className="inline-flex shrink-0 items-center text-xs font-semibold leading-none underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: productSemanticColors.primaryAction }}
        >
          Смотреть состав
        </button>
      </div>
      <div className="relative">
        <select
          value={selectedBundleTemplateId}
          onChange={(e) => {
            const id = e.target.value;
            onSelectBundleTemplate(id);
            if (id) {
              onApplyTemplate(id);
            }
          }}
          style={{
            ...FIELD_IN_STACK,
            colorScheme: "dark",
            appearance: "none",
            paddingRight: "2.25rem",
          }}
          className={FOCUS_RING}
        >
          <option value="">— не выбран —</option>
          {bundleTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: productSemanticColors.textMuted }}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {hintBelow ? (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
          {hintBelow}
        </p>
      ) : null}
      {bundleTemplatesLoadError ? (
        <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
          {bundleTemplatesLoadError}
        </p>
      ) : null}
    </div>
  );
}

export type BasicInfoPrimaryFieldsProps = {
  /** Показывать блок выбора шаблона (создание / не редактирование). */
  showTemplate: boolean;
  form: AddServiceEventFormValues;
  bundleTemplates: ServiceBundleTemplateWire[];
  bundleTemplatesLoadError: string;
  selectedBundleTemplateId: string;
  onSelectBundleTemplate: (id: string) => void;
  onOpenTemplateContents: () => void;
  onApplyTemplate: (templateId: string) => void;
  eventDateDisplay: string;
  onEventDateDisplayChange: (next: string) => void;
  onEventDateBlur: () => void;
  odometerInputMax?: number | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
  commentTextareaRef: RefObject<HTMLTextAreaElement | null>;
};

/**
 * Основные поля карточки «Основная информация» — **одинаковый порядок** для BASIC и ADVANCED
 * (как в подробном режиме): шаблон → название → дата/пробег/моточасы → исполнитель → …
 */
export function BasicInfoPrimaryFields({
  showTemplate,
  form,
  bundleTemplates,
  bundleTemplatesLoadError,
  selectedBundleTemplateId,
  onSelectBundleTemplate,
  onOpenTemplateContents,
  onApplyTemplate,
  eventDateDisplay,
  onEventDateDisplayChange,
  onEventDateBlur,
  odometerInputMax,
  onPatch,
  commentTextareaRef,
}: BasicInfoPrimaryFieldsProps) {
  const isBasicMode = form.mode === "BASIC";

  return (
    <>
      {showTemplate ? (
        <div className="mt-3">
          <TemplateSelectField
            bundleTemplates={bundleTemplates}
            bundleTemplatesLoadError={bundleTemplatesLoadError}
            selectedBundleTemplateId={selectedBundleTemplateId}
            onSelectBundleTemplate={onSelectBundleTemplate}
            onOpenTemplateContents={onOpenTemplateContents}
            onApplyTemplate={onApplyTemplate}
            templateLabel="Шаблон сервисного события"
            hintBelow={
              isBasicMode
                ? "Подставит узлы и примерные суммы — всё можно изменить."
                : undefined
            }
          />
        </div>
      ) : null}

      <label className="mt-3 flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
          Название события
        </span>
        <input
          value={form.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="ТО 10 000 км"
          style={FIELD_IN_STACK}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <div
        className="mt-3"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem" }}
      >
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Дата
          </span>
          <div className="relative w-full">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={eventDateDisplay}
              onChange={(e) => onEventDateDisplayChange(e.target.value)}
              onBlur={onEventDateBlur}
              placeholder="ДД.ММ.ГГГГ"
              style={{ ...FIELD_IN_STACK, paddingLeft: "2.25rem" }}
              className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
            />
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: productSemanticColors.textMuted }}
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Пробег, км
          </span>
          <input
            value={form.odometer}
            onChange={(e) => onPatch({ odometer: e.target.value })}
            inputMode="numeric"
            max={odometerInputMax ?? undefined}
            style={FIELD_IN_STACK}
            className={FOCUS_RING}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Моточасы
          </span>
          <input
            value={form.engineHours}
            onChange={(e) => onPatch({ engineHours: e.target.value })}
            inputMode="numeric"
            placeholder="—"
            style={FIELD_IN_STACK}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
        </label>
      </div>

      <p className="mt-3 text-xs font-medium leading-none" style={LABEL_STYLE}>
        Исполнитель
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {PERFORMER_OPTIONS.map(({ key, label, icon }) => {
          const active = form.performedBy === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPatch({ performedBy: key })}
              className="flex min-w-[6rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:opacity-95"
              style={performerStyle(active)}
            >
              <span style={{ color: active ? productSemanticColors.primaryAction : productSemanticColors.textMuted }}>
                {icon}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {isBasicMode || form.performedBy === "SERVICE" ? (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            {isBasicMode ? "Название сервиса (опционально)" : "Сервис (необязательно)"}
          </span>
          <input
            value={form.serviceProviderNote}
            maxLength={ADD_SERVICE_EVENT_SERVICE_NOTE_MAX_LENGTH}
            onChange={(e) => onPatch({ serviceProviderNote: e.target.value })}
            placeholder={
              isBasicMode ? "Например, MotoService" : "Название сервиса, телефон, адрес…"
            }
            style={FIELD_IN_STACK}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
        </label>
      ) : null}

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="flex min-h-[18px] items-center justify-between gap-2 leading-none">
          <span className="text-xs font-medium" style={LABEL_STYLE}>
            Комментарий
          </span>
          <span className="shrink-0 text-[10px] font-medium tabular-nums" style={{ color: productSemanticColors.textMuted }}>
            {`${form.comment.length}/${ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH}`}
          </span>
        </span>
        <textarea
          ref={commentTextareaRef}
          value={form.comment}
          maxLength={ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH}
          onChange={(e) => onPatch({ comment: e.target.value })}
          placeholder="Любые заметки об этом обслуживании…"
          style={{ ...FIELD_IN_STACK, minHeight: "4rem" }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING} resize-none`}
        />
      </label>
    </>
  );
}
