"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { getYandexMapsApiKey } from "./config";
import { loadYandexMapsApi } from "./load-yandex-maps-api";
import type { YandexMapPlace } from "./types";

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

export type YandexMapPlacePickerModalProps = {
  open: boolean;
  onClose: () => void;
  initialPlace?: YandexMapPlace | null;
  onConfirm: (place: YandexMapPlace) => void;
  title?: string;
};

export function YandexMapPlacePickerModal({
  open,
  onClose,
  initialPlace,
  onConfirm,
  title = "Выбор места на карте",
}: YandexMapPlacePickerModalProps) {
  const searchInputId = useId();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<ymaps.Map | null>(null);
  const suggestRef = useRef<ymaps.SuggestView | null>(null);

  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<YandexMapPlace | null>(initialPlace ?? null);

  const setPlacemark = useCallback((coords: [number, number], address: string) => {
    const map = mapRef.current;
    if (!map) return;
    map.geoObjects.removeAll();
    const mark = new ymaps.Placemark(coords, { balloonContent: address, hintContent: address });
    map.geoObjects.add(mark);
    map.setCenter(coords, 15);
  }, []);

  const resolveCoordsToPlace = useCallback(
    async (coords: [number, number]) => {
      const res = await ymaps.geocode(coords);
      const geo = res.geoObjects.get(0);
      const address =
        geo?.getAddressLine() ||
        geo?.properties.get("text") ||
        `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
      const place: YandexMapPlace = { address, lat: coords[0], lng: coords[1] };
      setDraft(place);
      setPlacemark(coords, address);
      setLoadError("");
    },
    [setPlacemark]
  );

  const resolveQueryToPlace = useCallback(
    async (query: string) => {
      const res = await ymaps.geocode(query);
      const geo = res.geoObjects.get(0);
      if (!geo) {
        setLoadError("Адрес не найден. Уточните запрос или укажите точку на карте.");
        return;
      }
      const coords = geo.geometry.getCoordinates() as [number, number];
      const address = geo.getAddressLine() || query;
      const place: YandexMapPlace = { address, lat: coords[0], lng: coords[1] };
      setDraft(place);
      setLoadError("");
      setPlacemark(coords, address);
    },
    [setPlacemark]
  );

  useEffect(() => {
    if (!open) return;
    setDraft(initialPlace ?? null);
    setLoadError("");
  }, [open, initialPlace]);

  useEffect(() => {
    if (!open) return;

    const apiKey = getYandexMapsApiKey();
    if (!apiKey) {
      setLoadError("Не задан NEXT_PUBLIC_YANDEX_MAPS_API_KEY — карта недоступна.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    void loadYandexMapsApi(apiKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        const initialCenter: [number, number] = initialPlace
          ? [initialPlace.lat, initialPlace.lng]
          : DEFAULT_CENTER;
        const initialZoom = initialPlace ? 15 : 10;

        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: initialCenter, zoom: initialZoom },
          { suppressMapOpenBlock: true }
        );
        mapRef.current = map;

        map.events.add("click", (event) => {
          const coords = event.get("coords") as [number, number];
          void resolveCoordsToPlace(coords).catch(() => {
            setLoadError("Не удалось определить адрес по координатам.");
          });
        });

        const searchEl = document.getElementById(searchInputId);
        if (searchEl) {
          const suggest = new ymaps.SuggestView(searchEl, { results: 6 });
          suggest.events.add("select", (event) => {
            const item = event.get("item") as { value?: string };
            const value = item?.value?.trim();
            if (!value) return;
            void resolveQueryToPlace(value).catch(() => {
              setLoadError("Не удалось найти выбранный адрес.");
            });
          });
          suggestRef.current = suggest;
        }

        if (initialPlace) {
          setPlacemark([initialPlace.lat, initialPlace.lng], initialPlace.address);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Не удалось загрузить карту.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      suggestRef.current?.destroy();
      suggestRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [open, searchInputId, initialPlace, resolveCoordsToPlace, resolveQueryToPlace, setPlacemark]);

  if (!open) {
    return null;
  }

  const apiConfigured = getYandexMapsApiKey() != null;

  return (
    <PickerOverlayShell title={title} onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        {apiConfigured ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
                Поиск адреса
              </span>
              <input
                id={searchInputId}
                type="text"
                defaultValue={draft?.address ?? ""}
                placeholder="Город, улица, сервис…"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: productSemanticColors.border,
                  backgroundColor: productSemanticColors.cardSubtle,
                  color: productSemanticColors.textPrimary,
                }}
              />
            </label>
            <p className="text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
              Выберите подсказку или кликните по карте, чтобы поставить метку.
            </p>
            <MapFrame loading={loading} mapContainerRef={mapContainerRef} />
          </>
        ) : null}

        {loadError ? (
          <p className="text-xs" style={{ color: productSemanticColors.error }}>
            {loadError}
          </p>
        ) : null}

        {draft ? (
          <p className="text-xs leading-snug" style={{ color: productSemanticColors.textSecondary }}>
            {draft.address}
            <span className="tabular-nums" style={{ color: productSemanticColors.textMuted }}>
              {" "}
              · {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            </span>
          </p>
        ) : (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Метка не выбрана
          </p>
        )}

        <PickerFooter onClose={onClose} onConfirm={() => draft && onConfirm(draft)} confirmDisabled={!draft} />
      </div>
    </PickerOverlayShell>
  );
}

function PickerOverlayShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <PickerDialog title={title} onClose={onClose}>
        {children}
      </PickerDialog>
    </div>
  );
}

function PickerDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
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
  );
}

function MapFrame({
  loading,
  mapContainerRef,
}: {
  loading: boolean;
  mapContainerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-xl border sm:min-h-[320px]">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        style={{ backgroundColor: productSemanticColors.cardSubtle }}
      />
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm"
          style={{ color: productSemanticColors.textMuted }}
        >
          Загрузка карты…
        </div>
      ) : null}
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
        style={{
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textSecondary,
        }}
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
