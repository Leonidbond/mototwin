"use client";

import { useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import type { AddServiceEventFormValues, ServicePlaceSnapshot } from "@mototwin/types";
import { SERVICE_EVENT_PARTS_UI } from "../styles";
import { ServicePlaceSearchInput } from "./ServicePlaceSearchInput";
import { ServicePlaceResultsList } from "./ServicePlaceResultsList";
import { ServicePlaceMap } from "./ServicePlaceMap";
import { SelectedServicePlaceCard } from "./SelectedServicePlaceCard";
import { ManualServicePlaceForm } from "./ManualServicePlaceForm";
import type { ServicePlaceDraft } from "./types";
import { toSnapshot } from "./types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type Props = {
  open: boolean;
  initialAddress: string;
  initialLat: string;
  initialLng: string;
  onClose: () => void;
  onApply: (patch: Partial<AddServiceEventFormValues>) => void;
};

function keyFromPlace(place: ServicePlaceDraft | null): string | null {
  if (!place) return null;
  return `${place.provider}|${place.providerPlaceId ?? ""}|${place.address}|${place.latitude ?? ""}|${place.longitude ?? ""}`;
}

export function ServicePlacePicker({ open, initialAddress, initialLat, initialLng, onClose, onApply }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"AUTO" | "ADDRESS" | "ORGANIZATION">("AUTO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [results, setResults] = useState<ServicePlaceDraft[]>([]);
  const [selected, setSelected] = useState<ServicePlaceDraft | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const selectedKey = useMemo(() => keyFromPlace(selected), [selected]);

  if (!open) return null;

  const runSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.searchServicePlaces({ query, mode });
      setResults(res.places);
      setWarning(res.warning ?? "");
      if (res.places.length > 0) setSelected(res.places[0]);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Не удалось выполнить поиск.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const persistSelection = async (place: ServicePlaceDraft): Promise<{ id: string; snapshot: ServicePlaceSnapshot }> => {
    const res = await api.createServicePlace({
      provider: place.provider,
      providerPlaceId: place.providerPlaceId ?? null,
      type: place.type,
      title: place.title,
      address: place.address,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      category: place.category ?? null,
      contact: place.contact ?? null,
      metadata: place.metadata ?? null,
    });
    return { id: res.place.id, snapshot: res.snapshot };
  };

  const applySelected = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      setError("");
      const persisted = await persistSelection(selected);
      onApply({
        installLocationAddress: selected.address,
        installLocationLat: selected.latitude != null ? String(selected.latitude) : "",
        installLocationLng: selected.longitude != null ? String(selected.longitude) : "",
        servicePlaceId: persisted.id,
        servicePlaceSnapshot: persisted.snapshot,
      });
      onClose();
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Не удалось сохранить место.");
    } finally {
      setLoading(false);
    }
  };

  const applyManual = async () => {
    const draft: ServicePlaceDraft = {
      provider: "CUSTOM",
      providerPlaceId: null,
      type: "CUSTOM",
      title: manualTitle.trim(),
      address: manualAddress.trim(),
      latitude: null,
      longitude: null,
      category: null,
      contact: null,
      metadata: null,
    };
    if (!draft.title || !draft.address) return;
    try {
      setLoading(true);
      setError("");
      const persisted = await persistSelection(draft);
      onApply({
        installLocationAddress: draft.address,
        installLocationLat: "",
        installLocationLng: "",
        servicePlaceId: persisted.id,
        servicePlaceSnapshot: toSnapshot({ ...draft, id: persisted.id }),
      });
      onClose();
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Не удалось сохранить место.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border p-4"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Выбор места сервиса</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: SERVICE_EVENT_PARTS_UI.border }}
          >
            Закрыть
          </button>
        </div>

        <ServicePlaceSearchInput
          query={query}
          mode={mode}
          loading={loading}
          onQueryChange={setQuery}
          onModeChange={setMode}
          onSubmit={() => void runSearch()}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <ServicePlaceMap
            selected={selected}
            onSelect={(place) => {
              setSelected(place);
              setResults((prev) => [place, ...prev]);
            }}
          />
          {(initialAddress || initialLat || initialLng) && !selected ? (
            <button
              type="button"
              onClick={() =>
                setSelected({
                  provider: "CUSTOM",
                  providerPlaceId: null,
                  type: "CUSTOM",
                  title: initialAddress || "Текущее место",
                  address: initialAddress || "Без адреса",
                  latitude: Number.isFinite(Number(initialLat)) ? Number(initialLat) : null,
                  longitude: Number.isFinite(Number(initialLng)) ? Number(initialLng) : null,
                  category: null,
                  contact: null,
                  metadata: null,
                })
              }
              className="rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: SERVICE_EVENT_PARTS_UI.border,
                backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
                color: SERVICE_EVENT_PARTS_UI.textMuted,
              }}
            >
              Использовать текущее значение
            </button>
          ) : null}
        </div>

        {warning ? (
          <p className="mt-2 text-xs" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            {warning}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        ) : null}

        <div className="mt-3">
          <ServicePlaceResultsList
            results={results}
            selectedKey={selectedKey}
            onSelect={(item) => setSelected(item)}
          />
        </div>

        {selected ? (
          <div className="mt-3 space-y-2">
            <SelectedServicePlaceCard place={selected} onClear={() => setSelected(null)} />
            <button
              type="button"
              onClick={() => void applySelected()}
              disabled={loading}
              className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-60"
              style={{
                borderColor: SERVICE_EVENT_PARTS_UI.orange,
                backgroundColor: SERVICE_EVENT_PARTS_UI.orange,
                color: "#fff",
              }}
            >
              Применить выбранное место
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <ManualServicePlaceForm
            title={manualTitle}
            address={manualAddress}
            onTitleChange={setManualTitle}
            onAddressChange={setManualAddress}
            onConfirm={() => void applyManual()}
          />
        </div>
      </div>
    </div>
  );
}
