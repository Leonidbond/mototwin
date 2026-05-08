"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import { SERVICE_EVENT_PARTS_UI, sectionTitleStyle } from "../styles";

export type BundleHeaderProps = {
  sectionNumber: number;
  selectedUnitsCount: number;
  hasFreeNodes: boolean;
  showInstallableButton: boolean;
  installableCount: number;
  onAddNode: () => void;
  onOpenInstallable: () => void;
};

export function BundleHeader({
  sectionNumber,
  selectedUnitsCount,
  hasFreeNodes,
  showInstallableButton,
  installableCount,
  onAddNode,
  onOpenInstallable,
}: BundleHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="leading-tight" style={sectionTitleStyle()}>
          {`${sectionNumber}. Узлы и работы`}
        </h3>
        <p
          className="mt-1 text-[11px] font-medium leading-none"
          style={{
            color: SERVICE_EVENT_PARTS_UI.textMuted,
          }}
        >
          {`Выбрано узлов: ${selectedUnitsCount}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showInstallableButton ? (
          <button
            type="button"
            onClick={onOpenInstallable}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition hover:opacity-90"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
              color: SERVICE_EVENT_PARTS_UI.text,
            }}
            aria-label="Готово к установке"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M12 5v14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <span>Готово к установке</span>
            {installableCount > 0 ? (
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{
                  backgroundColor: SERVICE_EVENT_PARTS_UI.orange,
                  color: productSemanticColors.onPrimaryAction,
                }}
              >
                {installableCount}
              </span>
            ) : null}
          </button>
        ) : null}
        {hasFreeNodes ? (
          <button
            type="button"
            onClick={onAddNode}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition hover:opacity-90"
            style={{
              borderColor: SERVICE_EVENT_PARTS_UI.orange,
              color: SERVICE_EVENT_PARTS_UI.orange,
              backgroundColor: "transparent",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <span>Добавить узел</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
