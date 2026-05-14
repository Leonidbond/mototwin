"use client";

import { useEffect, useState } from "react";
import {
  advancedServiceKitSnapshotFromPickerLines,
  stripAddServiceEventFormValuesForUserTemplate,
} from "@mototwin/domain";
import type { CreateUserServiceEventFormTemplateBody, PartSkuViewModel } from "@mototwin/types";
import { pickerColors } from "./picker-styles";

export type UserKitSaveLine = {
  nodeId: string | null;
  sku: PartSkuViewModel;
  quantity: number;
};

export function UserKitSaveModal(props: {
  open: boolean;
  onClose: () => void;
  /** Название комплекта (префилл из первой строки или «Мой комплект»). */
  initialTitle: string;
  lines: UserKitSaveLine[];
  onSubmit: (body: CreateUserServiceEventFormTemplateBody) => Promise<unknown>;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [includeInPicker, setIncludeInPicker] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (props.open) {
      setName(props.initialTitle.trim() || "Мой комплект");
      setIncludeInPicker(true);
      setErr("");
      setBusy(false);
    }
  }, [props.open, props.initialTitle]);

  const handleSubmit = async () => {
    if (props.lines.length === 0) {
      setErr("Добавьте в корзину хотя бы одну деталь с привязкой к узлу.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const snap = advancedServiceKitSnapshotFromPickerLines({
        title: name.trim() || "Мой комплект",
        lines: props.lines.map((l) => ({
          nodeId: l.nodeId,
          sku: l.sku,
          quantity: l.quantity,
        })),
      });
      if (!snap) {
        setErr("Не удалось собрать комплект: у позиций должен быть узел (или primaryNode у SKU).");
        return;
      }
      const stripped = stripAddServiceEventFormValuesForUserTemplate(snap);
      await props.onSubmit({
        baseTitle: name.trim() || null,
        formSnapshot: stripped,
        includeInPartPicker: includeInPicker,
      });
      props.onSuccess();
      props.onClose();
    } catch (e) {
      setErr(
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Не удалось сохранить комплект."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!props.open) {
    return null;
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(3, 7, 18, 0.72)",
      }}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !busy) {
          props.onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Сохранить комплект"
        style={{
          width: "min(440px, calc(100vw - 32px))",
          borderRadius: 16,
          border: `1px solid ${pickerColors.border}`,
          backgroundColor: pickerColors.surface,
          color: pickerColors.text,
          padding: 16,
          boxSizing: "border-box",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Сохранить как комплект</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: pickerColors.textMuted, lineHeight: 1.45 }}>
          Комплект появится в разделе «Мои комплекты» и как шаблон подробного режима в журнале
          обслуживания.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, fontSize: 12 }}>
          <span style={{ fontWeight: 700 }}>Название</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            disabled={busy}
            style={{
              borderRadius: 10,
              border: `1px solid ${pickerColors.border}`,
              backgroundColor: pickerColors.surfaceMuted,
              color: pickerColors.text,
              padding: "10px 12px",
              fontSize: 14,
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 12,
            fontSize: 12,
            cursor: busy ? "default" : "pointer",
            color: pickerColors.textMuted,
          }}
        >
          <input
            type="checkbox"
            checked={includeInPicker}
            onChange={(e) => setIncludeInPicker(e.target.checked)}
            disabled={busy}
            style={{ marginTop: 2 }}
          />
          <span>Показывать в подборе деталей как комплект обслуживания</span>
        </label>

        <p style={{ margin: "10px 0 0", fontSize: 11, color: pickerColors.textMuted }}>
          Позиций в комплекте: {props.lines.length}
        </p>

        {err ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#f87171" }}>{err}</p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => !busy && props.onClose()}
            disabled={busy}
            style={{
              borderRadius: 10,
              border: `1px solid ${pickerColors.border}`,
              background: "transparent",
              color: pickerColors.text,
              padding: "8px 14px",
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || props.lines.length === 0}
            style={{
              borderRadius: 10,
              border: "none",
              backgroundColor: pickerColors.primary,
              color: pickerColors.onPrimary,
              padding: "8px 16px",
              fontWeight: 800,
              cursor: busy || props.lines.length === 0 ? "default" : "pointer",
              opacity: busy || props.lines.length === 0 ? 0.55 : 1,
            }}
          >
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
