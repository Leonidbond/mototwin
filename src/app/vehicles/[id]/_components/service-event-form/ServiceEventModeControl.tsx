"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { CSSProperties } from "react";

const BASIC_MODE_LABEL = "Быстро";
const BASIC_MODE_SUBTITLE = "Просто отметить обслуживание";
const DETAILED_MODE_LABEL = "Подробно";
const DETAILED_MODE_SUBTITLE = "С деталями и запчастями";

export type ServiceEventModeControlProps = {
  isBasic: boolean;
  onSelectBasic: () => void;
  onSelectDetailed: () => void;
  /**
   * `tiles` — крупные плитки (модалки / плотный десктоп).
   * `segmented` — одна строка, компактный переключатель под заголовком страницы.
   */
  variant?: "tiles" | "segmented";
};

function tileStyle(active: boolean): CSSProperties {
  if (active) {
    return {
      borderColor: productSemanticColors.primaryAction,
      backgroundColor: "rgba(249, 115, 22, 0.08)",
      boxShadow: `0 0 0 1px ${productSemanticColors.primaryAction}`,
    };
  }
  return {
    borderColor: productSemanticColors.border,
    backgroundColor: productSemanticColors.cardSubtle,
  };
}

function segmentStyle(active: boolean): CSSProperties {
  if (active) {
    return {
      backgroundColor: "rgba(249, 115, 22, 0.16)",
      color: productSemanticColors.textPrimary,
      boxShadow: `inset 0 0 0 1px ${productSemanticColors.primaryAction}`,
    };
  }
  return {
    backgroundColor: "transparent",
    color: productSemanticColors.textSecondary,
  };
}

export function ServiceEventModeControl({
  isBasic,
  onSelectBasic,
  onSelectDetailed,
  variant = "tiles",
}: ServiceEventModeControlProps) {
  if (variant === "segmented") {
    return (
      <div
        className="flex w-full max-w-lg rounded-lg border p-0.5 sm:max-w-xl"
        style={{
          borderColor: productSemanticColors.border,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
        role="group"
        aria-label="Режим ввода"
      >
        <button
          type="button"
          onClick={onSelectBasic}
          className="flex min-h-[58px] min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left tracking-tight transition hover:opacity-95 sm:min-h-[60px] sm:gap-2.5 sm:px-3"
          style={segmentStyle(isBasic)}
          aria-pressed={isBasic}
          title={BASIC_MODE_SUBTITLE}
        >
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              color: isBasic ? productSemanticColors.primaryAction : productSemanticColors.textMuted,
              backgroundColor: isBasic ? "rgba(249, 115, 22, 0.15)" : productSemanticColors.cardMuted,
            }}
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"
                fill="currentColor"
                opacity={isBasic ? 1 : 0.65}
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block"
              style={{
                color: isBasic ? productSemanticColors.textPrimary : productSemanticColors.textSecondary,
                fontSize: 16,
                fontWeight: 800,
                lineHeight: "18px",
              }}
            >
              {BASIC_MODE_LABEL}
            </span>
            <span
              className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                color: productSemanticColors.textSecondary,
                fontSize: 10,
                fontWeight: 500,
                lineHeight: "12px",
              }}
            >
              {BASIC_MODE_SUBTITLE}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onSelectDetailed}
          className="flex min-h-[58px] min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left tracking-tight transition hover:opacity-95 sm:min-h-[60px] sm:gap-2.5 sm:px-3"
          style={segmentStyle(!isBasic)}
          aria-pressed={!isBasic}
          title={DETAILED_MODE_SUBTITLE}
        >
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              color: !isBasic ? productSemanticColors.primaryAction : productSemanticColors.textMuted,
              backgroundColor: !isBasic ? "rgba(249, 115, 22, 0.15)" : productSemanticColors.cardMuted,
            }}
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block"
              style={{
                color: !isBasic ? productSemanticColors.textPrimary : productSemanticColors.textSecondary,
                fontSize: 16,
                fontWeight: 800,
                lineHeight: "18px",
              }}
            >
              {DETAILED_MODE_LABEL}
            </span>
            <span
              className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                color: productSemanticColors.textSecondary,
                fontSize: 10,
                fontWeight: 500,
                lineHeight: "12px",
              }}
            >
              {DETAILED_MODE_SUBTITLE}
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="grid w-full max-w-md shrink-0 grid-cols-2 gap-2 sm:max-w-lg sm:gap-3"
      role="group"
      aria-label="Режим ввода"
    >
      <button
        type="button"
        onClick={onSelectBasic}
        className="flex min-h-[4.5rem] items-start gap-2.5 rounded-2xl border-2 p-3 text-left transition hover:opacity-95 sm:min-h-[4.75rem] sm:gap-3 sm:p-3.5"
        style={tileStyle(isBasic)}
        aria-pressed={isBasic}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: isBasic ? productSemanticColors.primaryAction : productSemanticColors.textMuted,
            backgroundColor: isBasic ? "rgba(249, 115, 22, 0.15)" : productSemanticColors.cardMuted,
          }}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"
              fill="currentColor"
              opacity={isBasic ? 1 : 0.65}
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-sm font-bold leading-tight sm:text-[15px]"
            style={{ color: productSemanticColors.textPrimary }}
          >
            {BASIC_MODE_LABEL}
          </span>
          <span
            className="mt-1 block text-[11px] leading-snug sm:text-xs"
            style={{ color: productSemanticColors.textSecondary }}
          >
            {BASIC_MODE_SUBTITLE}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onSelectDetailed}
        className="flex min-h-[4.5rem] items-start gap-2.5 rounded-2xl border-2 p-3 text-left transition hover:opacity-95 sm:min-h-[4.75rem] sm:gap-3 sm:p-3.5"
        style={tileStyle(!isBasic)}
        aria-pressed={!isBasic}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: !isBasic ? productSemanticColors.primaryAction : productSemanticColors.textMuted,
            backgroundColor: !isBasic ? "rgba(249, 115, 22, 0.15)" : productSemanticColors.cardMuted,
          }}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-sm font-bold leading-tight sm:text-[15px]"
            style={{ color: productSemanticColors.textPrimary }}
          >
            {DETAILED_MODE_LABEL}
          </span>
          <span
            className="mt-1 block text-[11px] leading-snug sm:text-xs"
            style={{ color: productSemanticColors.textSecondary }}
          >
            {DETAILED_MODE_SUBTITLE}
          </span>
        </span>
      </button>
    </div>
  );
}
