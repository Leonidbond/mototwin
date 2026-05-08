import type { CSSProperties } from "react";

export const SERVICE_EVENT_PARTS_UI = {
  canvas: "#070b10",
  surface: "#0d141c",
  surfaceElevated: "#101720",
  surfaceControl: "#0b1118",
  border: "#1f2937",
  borderSubtle: "#253140",
  orange: "#ff6b00",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
  textSubtle: "#6b7280",
} as const;

export const FIELD_BASE: CSSProperties = {
  marginTop: 6,
  width: "100%",
  borderRadius: "10px",
  border: `1px solid ${SERVICE_EVENT_PARTS_UI.border}`,
  backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceControl,
  color: SERVICE_EVENT_PARTS_UI.text,
  padding: "10px 12px",
  fontSize: "0.875rem",
  lineHeight: 1.4,
  outline: "none",
};

/** Поле под явной подписью: без отступа сверху (отступ задаёт `gap` у колонки `label`). */
export const FIELD_IN_STACK: CSSProperties = {
  ...FIELD_BASE,
  marginTop: 0,
};

export const LABEL_STYLE: CSSProperties = {
  color: SERVICE_EVENT_PARTS_UI.textMuted,
  fontSize: "0.75rem",
  letterSpacing: "0.01em",
  fontWeight: 500,
};

export const FOCUS_RING =
  "focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[rgba(249,115,22,0.28)]";

export const PRIMARY_ACTION_BG_TINT = "rgba(255, 107, 0, 0.10)";
export const PRIMARY_ACTION_BG_TINT_STRONG = "rgba(255, 107, 0, 0.16)";

export const SECTION_CARD_STYLE: CSSProperties = {
  backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
  borderColor: SERVICE_EVENT_PARTS_UI.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: "18px 20px",
};

export const SECTION_CARD_DENSE_STYLE: CSSProperties = {
  ...SECTION_CARD_STYLE,
  padding: "14px 16px",
  borderRadius: 14,
};

export function sectionTitleStyle(): CSSProperties {
  return {
    color: SERVICE_EVENT_PARTS_UI.text,
    fontSize: "0.9375rem",
    fontWeight: 600,
    letterSpacing: "-0.005em",
  };
}
