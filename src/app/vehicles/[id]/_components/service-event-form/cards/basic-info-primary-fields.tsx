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
  SERVICE_EVENT_PARTS_UI,
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
        borderColor: SERVICE_EVENT_PARTS_UI.orange,
        backgroundColor: PRIMARY_ACTION_BG_TINT,
        color: SERVICE_EVENT_PARTS_UI.text,
      }
    : {
        borderColor: SERVICE_EVENT_PARTS_UI.border,
        backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
        color: SERVICE_EVENT_PARTS_UI.textMuted,
      };
}

function RequiredMark() {
  return <span style={{ color: SERVICE_EVENT_PARTS_UI.orange }}>*</span>;
}

function requiredFieldStyle(isMissing: boolean): CSSProperties {
  return {
    ...FIELD_IN_STACK,
    borderColor: isMissing ? SERVICE_EVENT_PARTS_UI.orange : FIELD_IN_STACK.borderColor,
    boxShadow: isMissing ? "0 0 0 1px rgba(255, 107, 0, 0.26)" : undefined,
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
}: {
  bundleTemplates: ServiceBundleTemplateWire[];
  bundleTemplatesLoadError: string;
  selectedBundleTemplateId: string;
  onSelectBundleTemplate: (id: string) => void;
  onOpenTemplateContents: () => void;
  onApplyTemplate: (templateId: string) => void;
  templateLabel: ReactNode;
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
          className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none outline-none transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
            color: SERVICE_EVENT_PARTS_UI.textMuted,
          }}
          aria-label="Смотреть состав шаблона"
          title="Смотреть состав шаблона"
        >
          ?
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
          style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle }}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
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
  eventDateMaxYmd?: string;
  odometerInputMax?: number | null;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
  currentVehicleOdometer: number | null;
  currentVehicleEngineHours: number | null;
  vehicleStateSaving: boolean;
  vehicleStateError: string;
  vehicleStateSuccess: string;
  onOdometerBlur: () => void;
  onEngineHoursBlur: () => void;
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
  eventDateMaxYmd,
  odometerInputMax,
  onPatch,
  currentVehicleOdometer,
  currentVehicleEngineHours,
  vehicleStateSaving,
  vehicleStateError,
  vehicleStateSuccess,
  onOdometerBlur,
  onEngineHoursBlur,
  commentTextareaRef,
}: BasicInfoPrimaryFieldsProps) {
  const isBasicMode = form.mode === "BASIC";
  const titleMissing = form.title.trim() === "";
  const dateMissing = form.eventDate.trim() === "";
  const odometerMissing = form.odometer.trim() === "";

  return (
    <>
      <div
        className="mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: showTemplate ? "repeat(auto-fit, minmax(180px, 1fr))" : "minmax(0, 1fr)",
          gap: "0.75rem",
        }}
      >
        <label
          className="flex min-w-0 flex-col gap-1.5"
          style={showTemplate ? undefined : { gridColumn: "1 / -1" }}
        >
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Название события <RequiredMark />
          </span>
          <input
            value={form.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="ТО 10 000 км"
            aria-required="true"
            style={requiredFieldStyle(titleMissing)}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
        </label>

        {showTemplate ? (
          <TemplateSelectField
            bundleTemplates={bundleTemplates}
            bundleTemplatesLoadError={bundleTemplatesLoadError}
            selectedBundleTemplateId={selectedBundleTemplateId}
            onSelectBundleTemplate={onSelectBundleTemplate}
            onOpenTemplateContents={onOpenTemplateContents}
            onApplyTemplate={onApplyTemplate}
            templateLabel={
              <>
                Шаблон <span style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle, fontWeight: 400 }}>(опционально)</span>
              </>
            }
          />
        ) : null}
      </div>

      <div
        className="mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "0.5rem",
        }}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Дата <RequiredMark />
          </span>
          <div className="relative w-full">
            <input
              type="date"
              autoComplete="off"
              value={form.eventDate}
              onChange={(e) => onPatch({ eventDate: e.target.value })}
              max={eventDateMaxYmd}
              aria-required="true"
              style={{ ...requiredFieldStyle(dateMissing), colorScheme: "dark" }}
              className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Пробег, км <RequiredMark />
          </span>
          <input
            value={form.odometer}
            onChange={(e) => onPatch({ odometer: e.target.value })}
            onBlur={onOdometerBlur}
            inputMode="numeric"
            max={odometerInputMax ?? undefined}
            aria-required="true"
            style={requiredFieldStyle(odometerMissing)}
            className={FOCUS_RING}
          />
          <span className="text-[11px] font-medium leading-none" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Текущий: {currentVehicleOdometer != null ? `${currentVehicleOdometer} км` : "не указан"}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Моточасы
          </span>
          <input
            value={form.engineHours}
            onChange={(e) => onPatch({ engineHours: e.target.value })}
            onBlur={onEngineHoursBlur}
            inputMode="numeric"
            placeholder="—"
            style={FIELD_IN_STACK}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
          <span className="text-[11px] font-medium leading-none" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Текущие: {currentVehicleEngineHours != null ? `${currentVehicleEngineHours} ч` : "не указаны"}
          </span>
        </div>
        {vehicleStateSaving || vehicleStateError || vehicleStateSuccess ? (
          <p
            className="text-[11px]"
            style={{
              gridColumn: "1 / -1",
              color: vehicleStateError
                ? productSemanticColors.error
                : vehicleStateSuccess
                  ? SERVICE_EVENT_PARTS_UI.orange
                  : SERVICE_EVENT_PARTS_UI.textMuted,
            }}
          >
            {vehicleStateError || vehicleStateSuccess || "Обновляем текущие показатели…"}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-xs font-medium leading-none" style={LABEL_STYLE}>
        Исполнитель
      </p>
      <div
        className="mt-1.5"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: "0.5rem" }}
      >
        {PERFORMER_OPTIONS.map(({ key, label, icon }) => {
          const active = form.performedBy === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPatch({ performedBy: key })}
              className="flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:opacity-95"
              style={performerStyle(active)}
            >
              <span style={{ color: active ? SERVICE_EVENT_PARTS_UI.orange : SERVICE_EVENT_PARTS_UI.textSubtle }}>
                {icon}
              </span>
              <span className="min-w-0 truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {form.performedBy === "SERVICE" ? (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            {isBasicMode ? (
              <>
                Название сервиса{" "}
                <span style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle, fontWeight: 400 }}>
                  (опционально)
                </span>
              </>
            ) : (
              <>
                Сервис{" "}
                <span style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle, fontWeight: 400 }}>
                  (необязательно)
                </span>
              </>
            )}
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
        <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
          Комментарий
        </span>
        <textarea
          ref={commentTextareaRef}
          value={form.comment}
          maxLength={ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH}
          onChange={(e) => onPatch({ comment: e.target.value })}
          placeholder="Любые заметки об этом обслуживании…"
          style={{ ...FIELD_IN_STACK, minHeight: "5rem" }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING} resize-none`}
        />
      </label>
    </>
  );
}
