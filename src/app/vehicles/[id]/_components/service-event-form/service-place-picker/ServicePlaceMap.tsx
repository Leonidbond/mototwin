"use client";

import { useMemo } from "react";
import { isYandexMapsConfigured, YandexMapPlacePickerModal, type YandexMapPlace } from "@/components/integrations/yandex-maps";
import type { ServicePlaceDraft } from "./types";

type Props = {
  selected: ServicePlaceDraft | null;
  markerPlaces: YandexMapPlace[];
  onSelect: (place: ServicePlaceDraft) => void;
};

function toMapPlace(place: ServicePlaceDraft): YandexMapPlace | null {
  if (place.latitude == null || place.longitude == null) return null;
  return {
    address: place.address,
    lat: place.latitude,
    lng: place.longitude,
    label: place.title || undefined,
    providerPlaceId: place.providerPlaceId ?? null,
  };
}

function toServicePlaceDraft(place: YandexMapPlace): ServicePlaceDraft {
  return {
    provider: "YANDEX",
    providerPlaceId: place.providerPlaceId ?? null,
    type: "ORGANIZATION",
    title: place.label?.trim() || place.address,
    address: place.address,
    latitude: place.lat,
    longitude: place.lng,
    category: null,
    contact: null,
    metadata: null,
  };
}

export function ServicePlaceMap({ selected, markerPlaces, onSelect }: Props) {
  const mapsAvailable = isYandexMapsConfigured();
  const initialPlace = useMemo(() => (selected ? toMapPlace(selected) : null), [selected]);

  if (!mapsAvailable) return null;

  return (
    <YandexMapPlacePickerModal
      embedded
      open
      hideSearch
      markerPlaces={markerPlaces}
      initialPlace={initialPlace}
      title="Выбор места сервиса"
      onClose={() => {}}
      onConfirm={(place) => onSelect(toServicePlaceDraft(place))}
      onPlaceChange={(place) => onSelect(toServicePlaceDraft(place))}
    />
  );
}
