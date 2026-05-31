"use client";

import type { ServicePlaceSearchResultItem } from "@mototwin/types";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

type Props = {
  results: ServicePlaceSearchResultItem[];
  selectedKey: string | null;
  onSelect: (item: ServicePlaceSearchResultItem) => void;
};

export function ServicePlaceResultsList({ results, selectedKey, onSelect }: Props) {
  if (results.length === 0) {
    return (
      <p className="text-xs" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
        Ничего не найдено. Выберите точку на карте или добавьте вручную.
      </p>
    );
  }

  return (
    <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
      {results.map((item, index) => {
        const key = `${item.provider}|${item.providerPlaceId ?? ""}|${item.address}|${index}`;
        const active = selectedKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-xl border px-3 py-2 text-left"
            style={{
              borderColor: active ? SERVICE_EVENT_PARTS_UI.orange : SERVICE_EVENT_PARTS_UI.border,
              backgroundColor: active ? "rgba(255, 107, 0, 0.15)" : SERVICE_EVENT_PARTS_UI.surfaceElevated,
            }}
          >
            <div className="text-xs font-semibold" style={{ color: SERVICE_EVENT_PARTS_UI.text }}>
              {item.title}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
              {item.address}
            </div>
          </button>
        );
      })}
    </div>
  );
}
