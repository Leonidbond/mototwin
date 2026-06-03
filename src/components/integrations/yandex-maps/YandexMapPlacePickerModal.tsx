"use client";

import { Map, Placemark, YMaps } from "@iminside/react-yandex-maps";
import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getYandexMapsApiKey } from "./config";
import { geocodeCoordinates } from "./geocode-client";
import { withOrgLabel } from "./map-place-utils";
import type { YandexMapPlace } from "./types";
import { useMapPlaceCandidates } from "./use-map-place-candidates";

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

export type YandexMapPlacePickerModalProps = {
  open: boolean;
  onClose: () => void;
  initialPlace?: YandexMapPlace | null;
  onConfirm: (place: YandexMapPlace) => void;
  title?: string;
  /** Must be above parent overlays (e.g. ServicePlacePicker uses z-[90]). */
  overlayZIndex?: number;
  /** Встроенная панель внутри другого диалога — без второго оверлея и кнопок «Отмена/Выбрать». */
  embedded?: boolean;
  /** Скрыть строку поиска (поиск снаружи, в ServicePlacePicker). */
  hideSearch?: boolean;
  /** Метки из внешнего поиска родителя. */
  markerPlaces?: YandexMapPlace[];
  /** Вызывается при каждом выборе точки во встроенном режиме. */
  onPlaceChange?: (place: YandexMapPlace) => void;
};

type AnyEvent = { get: (key: string) => unknown };

type AnyMap = {
  setCenter: (coords: [number, number], zoom?: number) => void;
  getCenter?: () => number[];
};

export function YandexMapPlacePickerModal({
  open,
  onClose,
  initialPlace,
  onConfirm,
  title = "Место установки",
  overlayZIndex = 100,
  embedded = false,
  hideSearch = false,
  markerPlaces,
  onPlaceChange,
}: YandexMapPlacePickerModalProps) {
  const apiKey = getYandexMapsApiKey();
  const mapRef = useRef<AnyMap | null>(null);
  const searchInFlightRef = useRef<string | null>(null);

  const [draft, setDraft] = useState<YandexMapPlace | null>(initialPlace ?? null);
  const [resolvingCoords, setResolvingCoords] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");

  const {
    candidates,
    loading: candidatesLoading,
    hint: candidatesHint,
    error: candidatesError,
    loadNearCoords,
    loadByQuery,
    clearCandidates,
    setError: setCandidatesError,
  } = useMapPlaceCandidates();

  const loadError = candidatesError;

  useEffect(() => {
    if (!open && !embedded) return;
    if (!embedded) {
      setDraft(initialPlace ?? null);
      clearCandidates();
      setMapSearchQuery("");
      setResolvingCoords(false);
      searchInFlightRef.current = null;
      return;
    }
    if (initialPlace) setDraft(initialPlace);
  }, [open, initialPlace, embedded, clearCandidates]);

  const displayPlaces = useMemo(
    () => (candidates.length > 0 ? candidates : (markerPlaces ?? [])),
    [candidates, markerPlaces]
  );

  useEffect(() => {
    if (!embedded) return;
    clearCandidates();
    if (!markerPlaces?.length) return;
    mapRef.current?.setCenter([markerPlaces[0].lat, markerPlaces[0].lng], 14);
  }, [embedded, markerPlaces, clearCandidates]);

  const applyPlace = useCallback(
    (place: YandexMapPlace) => {
      const normalized = withOrgLabel(place);
      setDraft(normalized);
      setCandidatesError("");
      mapRef.current?.setCenter([normalized.lat, normalized.lng], 16);
      onPlaceChange?.(normalized);
    },
    [onPlaceChange, setCandidatesError]
  );

  const resolveAndApplyCoords = useCallback(
    async (lat: number, lng: number) => {
      setResolvingCoords(true);
      setCandidatesError("");
      try {
        const { place } = await geocodeCoordinates(lat, lng);
        applyPlace(place);
      } catch {
        applyPlace({
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
        });
      } finally {
        setResolvingCoords(false);
      }
    },
    [applyPlace, setCandidatesError]
  );

  const handleMapBackgroundClick = useCallback(
    async (lat: number, lng: number) => {
      const outcome = await loadNearCoords(lat, lng);
      if (outcome.kind === "single") {
        applyPlace(outcome.place);
        return;
      }
      if (outcome.kind === "multiple") {
        return;
      }
      await resolveAndApplyCoords(lat, lng);
    },
    [loadNearCoords, applyPlace, resolveAndApplyCoords]
  );

  const handleMapClick = useCallback(
    (event: AnyEvent) => {
      const coords = event.get("coords") as [number, number] | undefined;
      if (!coords || coords.length < 2) return;
      const map = mapRef.current;
      const target = event.get("target");
      if (map && target && target !== map) return;
      void handleMapBackgroundClick(coords[0], coords[1]);
    },
    [handleMapBackgroundClick]
  );

  const handleMapInstance = useCallback((map: unknown) => {
    mapRef.current = map as AnyMap;
  }, []);

  const runMapSearch = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) return;
      if (searchInFlightRef.current === query) return;
      searchInFlightRef.current = query;
      try {
        const center = mapRef.current?.getCenter?.();
        const centerLonLat =
          center && center.length >= 2
            ? ([Number(center[1]), Number(center[0])] as [number, number])
            : undefined;
        const places = await loadByQuery(query, centerLonLat);
        const first = places[0];
        if (first) {
          mapRef.current?.setCenter([first.lat, first.lng], 14);
        }
      } finally {
        searchInFlightRef.current = null;
      }
    },
    [loadByQuery]
  );

  const submitMapSearch = useCallback(() => {
    void runMapSearch(mapSearchQuery);
  }, [mapSearchQuery, runMapSearch]);

  useEffect(() => {
    if (!candidates.length) return;
    const first = candidates[0];
    mapRef.current?.setCenter([first.lat, first.lng], 14);
  }, [candidates]);

  if (!open && !embedded) return null;

  const center: [number, number] = initialPlace ? [initialPlace.lat, initialPlace.lng] : DEFAULT_CENTER;
  const zoom = initialPlace ? 16 : embedded ? 16 : 10;

  const panelBody = (
    <div className={embedded ? "flex flex-col gap-3" : "flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4"}>
      {apiKey ? (
        <>
          {!hideSearch ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
                Поиск организации или адреса
              </label>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitMapSearch();
                    }
                  }}
                  placeholder="Например: мотосервис, Москва"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: productSemanticColors.border,
                    backgroundColor: productSemanticColors.cardSubtle,
                    color: productSemanticColors.textPrimary,
                  }}
                />
                <button
                  type="button"
                  disabled={candidatesLoading || !mapSearchQuery.trim()}
                  onClick={submitMapSearch}
                  className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    backgroundColor: productSemanticColors.primaryAction,
                    color: productSemanticColors.onPrimaryAction,
                  }}
                >
                  {candidatesLoading ? "…" : "Найти"}
                </button>
              </div>
            </div>
          ) : null}

          {displayPlaces.length > 0 ? (
            <div
              className="max-h-32 overflow-auto rounded-xl border"
              style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.cardSubtle }}
            >
              {displayPlaces.map((place, i) => (
                <button
                  key={`${place.lat}:${place.lng}:${place.providerPlaceId ?? ""}:${i}`}
                  type="button"
                  onClick={() => applyPlace(place)}
                  className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0"
                  style={{
                    borderBottomColor: productSemanticColors.border,
                    color: productSemanticColors.textPrimary,
                    backgroundColor:
                      draft?.lat === place.lat && draft?.lng === place.lng
                        ? productSemanticColors.card
                        : undefined,
                  }}
                >
                  {place.label ?? place.address}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: productSemanticColors.border }}
          >
            {embedded ? (
              <p className="m-0 px-3 py-2 text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
                Кликните на карту — покажем организации рядом. Выберите маркер или строку в списке.
              </p>
            ) : null}
            <YMaps query={{ apikey: apiKey, lang: "ru_RU", load: "package.full" }}>
              <Map
                instanceRef={handleMapInstance as (value: unknown) => void}
                onClick={handleMapClick as (...args: unknown[]) => unknown}
                defaultState={{ center, zoom }}
                width="100%"
                height={embedded ? "280px" : "360px"}
                defaultOptions={{
                  suppressMapOpenBlock: false,
                  yandexMapDisablePoiInteractivity: true,
                }}
                options={{
                  suppressMapOpenBlock: false,
                  yandexMapDisablePoiInteractivity: true,
                }}
              >
                {displayPlaces.map((place, i) => (
                  <Placemark
                    key={`search-${place.lat}:${place.lng}:${place.providerPlaceId ?? ""}:${i}`}
                    geometry={[place.lat, place.lng]}
                    properties={{
                      balloonContent: place.label ?? place.address,
                      hintContent: place.label ?? place.address,
                      iconContent: String(i + 1),
                    }}
                    options={{ preset: "islands#blueCircleDotIcon" }}
                    onClick={() => applyPlace(place)}
                  />
                ))}
                {draft ? (
                  <Placemark
                    geometry={[draft.lat, draft.lng]}
                    properties={{
                      balloonContent: draft.label ?? draft.address,
                      hintContent: draft.label ?? draft.address,
                    }}
                    options={{ preset: "islands#redDotIcon" }}
                  />
                ) : null}
              </Map>
            </YMaps>
          </div>

          {resolvingCoords ? (
            <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
              Определяем адрес…
            </p>
          ) : null}

          {candidatesLoading ? (
            <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
              Поиск…
            </p>
          ) : null}

          {candidatesHint && !loadError ? (
            <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
              {candidatesHint}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs" style={{ color: productSemanticColors.error }}>
          Не задан <code>NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в .env — карта недоступна.
        </p>
      )}

      {loadError ? (
        <p className="text-xs" style={{ color: productSemanticColors.error }}>
          {loadError}
        </p>
      ) : null}

      {!embedded && draft ? (
        <p className="text-xs leading-snug" style={{ color: productSemanticColors.textSecondary }}>
          <span style={{ color: productSemanticColors.textMuted }}>Выбрано: </span>
          {draft.label ?? draft.address}
        </p>
      ) : null}

      {!embedded && !draft ? (
        <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
          Место не выбрано — кликните на карте или выберите из результатов
        </p>
      ) : null}

      {!embedded ? (
        <PickerFooter
          onClose={onClose}
          onConfirm={() => draft && onConfirm(draft)}
          confirmDisabled={!draft || resolvingCoords}
        />
      ) : null}
    </div>
  );

  if (embedded) return panelBody;

  return (
    <PickerOverlayShell title={title} onClose={onClose} overlayZIndex={overlayZIndex}>
      {panelBody}
    </PickerOverlayShell>
  );
}

function PickerOverlayShell({
  title,
  onClose,
  overlayZIndex,
  children,
}: {
  title: string;
  onClose: () => void;
  overlayZIndex: number;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ zIndex: overlayZIndex, backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(720px,92vh)] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textPrimary,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderBottomColor: productSemanticColors.border }}
        >
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg leading-none transition hover:opacity-90"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.cardSubtle,
              color: productSemanticColors.textSecondary,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PickerFooter({
  onClose,
  onConfirm,
  confirmDisabled,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
}) {
  return (
    <div className="mt-1 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
        style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textSecondary }}
      >
        Отмена
      </button>
      <button
        type="button"
        disabled={confirmDisabled}
        onClick={onConfirm}
        className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: productSemanticColors.primaryAction,
          color: productSemanticColors.onPrimaryAction,
        }}
      >
        Выбрать
      </button>
    </div>
  );
}
