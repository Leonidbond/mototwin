"use client";

import {
  isYandexMapsConfigured,
} from "@/components/integrations/yandex-maps";
import type { AddServiceEventFormValues } from "@mototwin/types";
import { useState } from "react";
import { FIELD_IN_STACK, FOCUS_RING, LABEL_STYLE, SERVICE_EVENT_PARTS_UI } from "../styles";
import { ServicePlacePicker } from "../service-place-picker";

const INSTALL_LOCATION_MAX_LENGTH = 500;

export type InstallLocationFieldProps = {
  form: AddServiceEventFormValues;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
};

export function InstallLocationField({ form, onPatch }: InstallLocationFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mapsAvailable = isYandexMapsConfigured();

  const clearLocation = () => {
    onPatch({
      installLocationAddress: "",
      installLocationLat: "",
      installLocationLng: "",
      servicePlaceId: "",
      servicePlaceSnapshot: null,
    });
  };

  return (
    <>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
          Место установки{" "}
          <span style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle, fontWeight: 400 }}>
            (опционально)
          </span>
        </span>
        <div className="flex items-stretch gap-2">
          <input
            value={form.installLocationAddress}
            maxLength={INSTALL_LOCATION_MAX_LENGTH}
            onChange={(e) =>
              onPatch({
                installLocationAddress: e.target.value,
                servicePlaceId: "",
                servicePlaceSnapshot: null,
              })
            }
            placeholder="Название сервиса или адрес…"
            style={FIELD_IN_STACK}
            className={`min-w-0 flex-1 [&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
          {mapsAvailable ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:opacity-95"
              style={{
                borderColor: SERVICE_EVENT_PARTS_UI.border,
                backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
                color: SERVICE_EVENT_PARTS_UI.text,
              }}
              aria-label="Выбрать место на Яндекс.Картах"
              title="Найти сервис или адрес на карте"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="hidden sm:inline">На карте</span>
            </button>
          ) : null}
          {form.installLocationAddress.trim() ? (
            <button
              type="button"
              onClick={clearLocation}
              className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border text-sm transition hover:opacity-95"
              style={{
                borderColor: SERVICE_EVENT_PARTS_UI.border,
                color: SERVICE_EVENT_PARTS_UI.textMuted,
                backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
              }}
              aria-label="Очистить место установки"
              title="Очистить"
            >
              ×
            </button>
          ) : null}
        </div>
        {form.installLocationLat.trim() && form.installLocationLng.trim() ? (
          <span className="text-[11px] font-medium tabular-nums leading-none" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Координаты: {form.installLocationLat}, {form.installLocationLng}
          </span>
        ) : null}
        {!mapsAvailable ? (
          <span className="text-[11px] leading-snug" style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle }}>
            Для выбора на карте добавьте{" "}
            <code className="text-[10px]">NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в `.env`.
          </span>
        ) : null}
      </label>

      <ServicePlacePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialAddress={form.installLocationAddress}
        initialLat={form.installLocationLat}
        initialLng={form.installLocationLng}
        onApply={(patch) =>
          onPatch({
            ...patch,
            installLocationAddress: (patch.installLocationAddress ?? "").slice(0, INSTALL_LOCATION_MAX_LENGTH),
          })
        }
      />
    </>
  );
}
