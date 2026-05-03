import type { CSSProperties } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";

export const pickerColors = {
  canvas: productSemanticColors.canvas,
  surface: productSemanticColors.card,
  surfaceMuted: productSemanticColors.cardMuted,
  surfaceSubtle: productSemanticColors.cardSubtle,
  border: productSemanticColors.border,
  borderStrong: productSemanticColors.borderStrong,
  text: productSemanticColors.textPrimary,
  textMuted: productSemanticColors.textMuted,
  textSecondary: productSemanticColors.textSecondary,
  primary: productSemanticColors.primaryAction,
  onPrimary: productSemanticColors.onPrimaryAction,
  successStrong: productSemanticColors.successStrong,
  successText: productSemanticColors.successText,
  warning: "#FFC400",
  info: "#36A3FF",
  error: productSemanticColors.error,
  overlay: productSemanticColors.overlayModal,
};

export const pickerCardStyle: CSSProperties = {
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  borderRadius: 18,
  padding: 16,
};

export const pickerSectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: pickerColors.text,
  letterSpacing: -0.2,
};

export const pickerSectionSubtitleStyle: CSSProperties = {
  fontSize: 13,
  color: pickerColors.textMuted,
  marginTop: 4,
};

export const merchandiseAccentColor: Record<
  "BEST_FIT" | "BEST_VALUE" | "FOR_YOUR_RIDE",
  string
> = {
  BEST_FIT: pickerColors.primary,
  BEST_VALUE: "#FFC400",
  FOR_YOUR_RIDE: "#36A3FF",
};
