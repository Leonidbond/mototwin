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

/**
 * Status semantic tokens calibrated for a dark UI surface.
 * Backgrounds are muted tints of the accent hue, borders and foregrounds
 * stay bright enough to read over `productSemanticColors.card`.
 */
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
    background: "#0A2518",
    foreground: "#4ADE80",
    border: "#16A34A",
    accent: "#16A34A",
  },
  SOON: {
    background: "#261B00",
    foreground: "#FBBC1F",
    border: "#D97706",
    accent: "#D97706",
  },
  OVERDUE: {
    background: "#280E0E",
    foreground: "#FC6868",
    border: "#DC2626",
    accent: "#DC2626",
  },
  RECENTLY_REPLACED: {
    background: "#0F1E3A",
    foreground: "#93C5FD",
    border: "#3B82F6",
    accent: "#3B82F6",
  },
  UNKNOWN: {
    background: "#1A2028",
    foreground: "#9AA7B4",
    border: "#2E3947",
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
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/**
 * Typography scale shared between web and Expo.
 * `fontSize` / `lineHeight` are in px (RN interprets them as density-independent
 * pixels); `weight` is a standard CSS/RN weight value as a string.
 */
export const typeScale = {
  display: { fontSize: 36, lineHeight: 44, weight: "700" },
  h1: { fontSize: 28, lineHeight: 36, weight: "700" },
  h2: { fontSize: 22, lineHeight: 30, weight: "600" },
  h3: { fontSize: 18, lineHeight: 26, weight: "600" },
  /** Garage vehicle card title — design ref ~22px semi-bold */
  cardTitle: { fontSize: 22, lineHeight: 30, weight: "600" },
  body: { fontSize: 15, lineHeight: 22, weight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: "600" },
  caption: { fontSize: 13, lineHeight: 18, weight: "400" },
  overline: { fontSize: 11, lineHeight: 14, weight: "600" },
} as const;

export type TypeScale = typeof typeScale;
export type TypeScaleKey = keyof TypeScale;

/**
 * Shared MotoTwin surfaces and text — DARK theme.
 * Prefer these over ad hoc hex so both clients stay visually aligned.
 * Light theme will be reintroduced in a follow-up wave.
 */
/**
 * Dark garage palette aligned with design reference
 * `images/examples/garage web.png` (canvas ≈ rgb(8,13,18) → #080D12).
 */
export const productSemanticColors = {
  canvas: "#080D12",
  card: "#11161D",
  cardMuted: "#161C24",
  cardSubtle: "#0C1018",
  chipBackground: "#1A2230",
  border: "#1E2D3D",
  borderStrong: "#2E3E52",
  divider: "#141920",
  textPrimary: "#F4F6FA",
  textSecondary: "#AAB4C0",
  textMuted: "#8B95A5",
  textTertiary: "#6A737F",
  textMeta: "#9CA6B4",
  /** Text on light surfaces (e.g. white filter chips), not on accent CTA. */
  textInverse: "#080D12",
  /** Primary CTA fill — bright orange from garage web/mobile reference. */
  primaryAction: "#F97316",
  /** Text / spinners on `primaryAction` surfaces. */
  onPrimaryAction: "#FFFFFF",
  successStrong: "#22C55E",
  /** Inline success banner (e.g. service event saved) — aligned with dark surface. */
  successSurface: "#0E2A1F",
  successBorder: "#14532D",
  successText: "#6EE7B7",
  error: "#F87171",
  errorSurface: "#2A1010",
  errorBorder: "#7F1D1D",
  validationErrorBorder: "#EF4444",
  indigoSoftBorder: "#3730A3",
  indigoSoftBg: "#1E1B4B",
  timelineServiceBorder: "#6366F1",
  timelineServiceFill: "#1E1B4B",
  timelineStateBorder: "#6F7B88",
  timelineStateFill: "#1A2028",
  serviceBadgeBg: "#2E1065",
  serviceBadgeText: "#C4B5FD",
  shadow: "#000000",
  /** Modal / bottom-sheet scrim. */
  overlayModal: "rgba(0,0,0,0.65)",
} as const;

export type ProductSemanticColors = typeof productSemanticColors;
