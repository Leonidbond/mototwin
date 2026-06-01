"use client";

import { useMemo, useState } from "react";
import { isYandexMapsConfigured, YandexMapPlacePickerModal } from "@/components/integrations/yandex-maps";
import type { ServicePlaceDraft } from "./types";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

type Props = {
  selected: ServicePlaceDraft | null;
  onSelect: (place: ServicePlaceDraft) => void;
};

export function ServicePlaceMap({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const mapsAvailable = isYandexMapsConfigured();
  const initialPlace = useMemo(() => {
    if (!selected?.latitude || !selected?.longitude) return null;
    return {
      address: selected.address,
      lat: selected.latitude,
      lng: selected.longitude,
    };
  }, [selected]);

  if (!mapsAvailable) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border px-3 py-2 text-xs font-semibold"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
      >
        Выбрать на карте
      </button>
      <YandexMapPlacePickerModal
        open={open}
        onClose={() => setOpen(false)}
        initialPlace={initialPlace}
        title="Выбор места сервиса"
        overlayZIndex={120}
        onConfirm={(place) => {
          onSelect({
            provider: "YANDEX",
            providerPlaceId: null,
            type: "ADDRESS",
            title: place.address,
            address: place.address,
            latitude: place.lat,
            longitude: place.lng,
            category: null,
            contact: null,
            metadata: null,
          });
          setOpen(false);
        }}
      />
    </>
  );
}
