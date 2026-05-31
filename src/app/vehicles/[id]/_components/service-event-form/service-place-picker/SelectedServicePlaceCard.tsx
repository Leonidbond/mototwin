"use client";

import type { ServicePlaceDraft } from "./types";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

type Props = {
  place: ServicePlaceDraft;
  onClear: () => void;
};

export function SelectedServicePlaceCard({ place, onClear }: Props) {
  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: SERVICE_EVENT_PARTS_UI.borderSubtle,
        backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: SERVICE_EVENT_PARTS_UI.text }}>
            {place.title}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            {place.address}
          </p>
          {place.latitude != null && place.longitude != null ? (
            <p className="mt-1 text-[10px]" style={{ color: SERVICE_EVENT_PARTS_UI.textSubtle }}>
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border px-2 py-1 text-[11px] font-semibold"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            color: SERVICE_EVENT_PARTS_UI.textMuted,
          }}
        >
          Очистить
        </button>
      </div>
    </div>
  );
}
