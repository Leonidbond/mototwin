import type { NodeStatus, StatusSemanticKey } from "@mototwin/types";

export const statusTextLabelsRu: Record<NodeStatus, string> = {
  OVERDUE: "Просрочено",
  SOON: "Скоро",
  OK: "ОК",
  RECENTLY_REPLACED: "Недавно заменено",
};

export const statusBadgeLabelsEn: Record<NodeStatus, string> = {
  OK: "OK",
  SOON: "Soon",
  OVERDUE: "Overdue",
  RECENTLY_REPLACED: "Recently replaced",
};

export const statusSemanticTokens: Record<
  StatusSemanticKey,
  {
    background: string;
    foreground: string;
    border: string;
    accent: string;
  }
> = {
  OK: {
    background: "#D1FAE5",
    foreground: "#065F46",
    border: "#16A34A",
    accent: "#16A34A",
  },
  SOON: {
    background: "#FEF3C7",
    foreground: "#92400E",
    border: "#F59E0B",
    accent: "#FDE68A",
  },
  OVERDUE: {
    background: "#FEE2E2",
    foreground: "#991B1B",
    border: "#DC2626",
    accent: "#FECACA",
  },
  RECENTLY_REPLACED: {
    background: "#DBEAFE",
    foreground: "#1E40AF",
    border: "#2563EB",
    accent: "#60A5FA",
  },
  UNKNOWN: {
    background: "#F3F4F6",
    foreground: "#6B7280",
    border: "#D1D5DB",
    accent: "transparent",
  },
};

export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radiusScale = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/**
 * Shared MotoTwin surfaces and text (web + Expo).
 * Prefer these over ad hoc hex so both clients stay visually aligned.
 */
export const productSemanticColors = {
  canvas: "#F7F7F7",
  card: "#FFFFFF",
  cardMuted: "#FAFAFA",
  cardSubtle: "#F9FAFB",
  chipBackground: "#FCFCFD",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textTertiary: "#9CA3AF",
  textMeta: "#374151",
  textInverse: "#FFFFFF",
  primaryAction: "#111827",
  successStrong: "#059669",
  error: "#B91C1C",
  errorSurface: "#FEF2F2",
  errorBorder: "#FECACA",
  validationErrorBorder: "#DC2626",
  indigoSoftBorder: "#A5B4FC",
  indigoSoftBg: "#EEF2FF",
  timelineServiceBorder: "#4F46E5",
  timelineServiceFill: "#E0E7FF",
  timelineStateBorder: "#9CA3AF",
  timelineStateFill: "#F3F4F6",
  serviceBadgeBg: "#EDE9FE",
  serviceBadgeText: "#6D28D9",
  shadow: "#000000",
  /** Modal / bottom-sheet scrim */
  overlayModal: "rgba(0,0,0,0.45)",
} as const;

export type ProductSemanticColors = typeof productSemanticColors;
