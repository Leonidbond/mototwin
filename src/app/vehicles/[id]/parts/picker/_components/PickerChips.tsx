"use client";

import type { CSSProperties } from "react";
import { pickerColors } from "./picker-styles";

const chipBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.text,
  textAlign: "left",
  cursor: "pointer",
  transition: "border-color 0.12s ease, background-color 0.12s ease",
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  minHeight: 60,
};

const chipBaseInteractiveStyle: CSSProperties = {
  ...chipBaseStyle,
  outline: "none",
};

export function VehicleChip(props: {
  vehicleLabel: string;
  vehicleSubtitle: string;
  onClick?: () => void;
  imageUrl?: string | null;
}) {
  return (
    <button type="button" style={chipBaseInteractiveStyle} onClick={props.onClick}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          backgroundColor: pickerColors.surfaceSubtle,
          backgroundImage: props.imageUrl ? `url("${props.imageUrl}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: pickerColors.textMuted,
          fontWeight: 700,
        }}
        aria-hidden
      >
        {!props.imageUrl ? "🏍" : null}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pickerColors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {props.vehicleLabel}
        </div>
        <div style={{ fontSize: 12, color: pickerColors.textMuted, marginTop: 2 }}>
          {props.vehicleSubtitle}
        </div>
      </div>
      <ChevronDown />
    </button>
  );
}

export function NodeChip(props: {
  nodeName: string | null;
  nodePath: string | null;
  onClick?: () => void;
}) {
  const placeholder = !props.nodeName;
  return (
    <button type="button" style={chipBaseInteractiveStyle} onClick={props.onClick}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: pickerColors.surfaceSubtle,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: pickerColors.textMuted,
          fontSize: 18,
        }}
        aria-hidden
      >
        ⚙
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: pickerColors.textMuted, fontWeight: 600, letterSpacing: 0.4 }}>
          УЗЕЛ
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: placeholder ? pickerColors.textMuted : pickerColors.text, marginTop: 2 }}>
          {props.nodeName ?? "Выберите узел"}
        </div>
        {props.nodePath ? (
          <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {props.nodePath}
          </div>
        ) : null}
      </div>
      <ChevronDown />
    </button>
  );
}

export function ResetSelectionChip(props: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...chipBaseInteractiveStyle,
        justifyContent: "center",
        opacity: props.disabled ? 0.5 : 1,
        cursor: props.disabled ? "default" : "pointer",
        gap: 8,
      }}
    >
      <ResetIcon />
      <span style={{ fontSize: 13, fontWeight: 600, color: pickerColors.text }}>Сбросить выбор</span>
    </button>
  );
}

function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={pickerColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}
