import { productSemanticColors } from "@mototwin/design-tokens";
import type { CSSProperties } from "react";

export const FIELD_BASE: CSSProperties = {
  marginTop: 6,
  width: "100%",
  borderRadius: "10px",
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textPrimary,
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
  color: productSemanticColors.textMeta,
  fontSize: "0.75rem",
  letterSpacing: "0.01em",
  fontWeight: 500,
};

export const FOCUS_RING =
  "focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[rgba(249,115,22,0.28)]";

export const PRIMARY_ACTION_BG_TINT = "rgba(249, 115, 22, 0.10)";
export const PRIMARY_ACTION_BG_TINT_STRONG = "rgba(249, 115, 22, 0.16)";

export const SECTION_CARD_STYLE: CSSProperties = {
  backgroundColor: productSemanticColors.cardMuted,
  borderColor: productSemanticColors.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: "16px 18px",
};

export const SECTION_CARD_DENSE_STYLE: CSSProperties = {
  ...SECTION_CARD_STYLE,
  padding: "14px 16px",
  borderRadius: 14,
};

export function sectionTitleStyle(): CSSProperties {
  return {
    color: productSemanticColors.textPrimary,
    fontSize: "0.9375rem",
    fontWeight: 600,
    letterSpacing: "-0.005em",
  };
}
