"use client";

import { FIELD_IN_STACK, SERVICE_EVENT_PARTS_UI } from "../styles";

type Props = {
  title: string;
  address: string;
  onTitleChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onConfirm: () => void;
};

export function ManualServicePlaceForm({ title, address, onTitleChange, onAddressChange, onConfirm }: Props) {
  return (
    <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: SERVICE_EVENT_PARTS_UI.border }}>
      <p className="text-xs font-semibold" style={{ color: SERVICE_EVENT_PARTS_UI.text }}>
        Ввести вручную
      </p>
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Название места (например: Garage 13)"
        style={FIELD_IN_STACK}
      />
      <input
        value={address}
        onChange={(event) => onAddressChange(event.target.value)}
        placeholder="Адрес"
        style={FIELD_IN_STACK}
      />
      <button
        type="button"
        onClick={onConfirm}
        disabled={!title.trim() || !address.trim()}
        className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
      >
        Выбрать вручную
      </button>
    </div>
  );
}
