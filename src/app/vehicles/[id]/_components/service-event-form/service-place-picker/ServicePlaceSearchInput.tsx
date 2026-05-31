"use client";

import type { ServicePlaceSearchMode } from "@mototwin/types";
import { FIELD_IN_STACK, FOCUS_RING, SERVICE_EVENT_PARTS_UI } from "../styles";

type Props = {
  query: string;
  mode: ServicePlaceSearchMode;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onModeChange: (value: ServicePlaceSearchMode) => void;
  onSubmit: () => void;
};

const MODES: Array<{ value: ServicePlaceSearchMode; label: string }> = [
  { value: "AUTO", label: "Все" },
  { value: "ORGANIZATION", label: "Организации" },
  { value: "ADDRESS", label: "Адреса" },
];

export function ServicePlaceSearchInput({ query, mode, loading, onQueryChange, onModeChange, onSubmit }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onModeChange(item.value)}
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: mode === item.value ? SERVICE_EVENT_PARTS_UI.orange : SERVICE_EVENT_PARTS_UI.border,
              color: mode === item.value ? SERVICE_EVENT_PARTS_UI.text : SERVICE_EVENT_PARTS_UI.textMuted,
              backgroundColor:
                mode === item.value ? "rgba(255, 107, 0, 0.16)" : SERVICE_EVENT_PARTS_UI.surfaceElevated,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-stretch gap-2">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Название сервиса, адрес или свободный запрос…"
          className={`min-w-0 flex-1 ${FOCUS_RING}`}
          style={FIELD_IN_STACK}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-60"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.orange,
            backgroundColor: SERVICE_EVENT_PARTS_UI.orange,
            color: "#fff",
          }}
        >
          {loading ? "Поиск…" : "Найти"}
        </button>
      </div>
    </div>
  );
}
